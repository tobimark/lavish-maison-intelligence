#!/usr/bin/env node
/*
 * POC-001 scenario validator.
 *
 * Standard JSON Schema 2020-12 validation (Ajv) + ten-file assembly + semantic
 * checks (L1/L2/L4 and the static part of L3). The checkpoint projection
 * comparison (POC-005 reducer) and real media decoding (POC-002) stay NOT_RUN;
 * `runnable` can therefore never become true in POC-001.
 *
 * Usage:
 *   node scripts/poc/validate-scenario.mjs --dir <scenario-version-dir> [--strict]
 *        [--report <path>] [--media-report <path>]
 *   node scripts/poc/validate-scenario.mjs --catalog <catalog.json> [--strict]
 *        [--report <path>]
 *
 * Exit codes: 0 requested layers pass; 1 validation failure (or --strict with a
 * required layer not_run); 2 usage / IO / environment error.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020Import from 'ajv/dist/2020.js';
import addFormatsImport from 'ajv-formats';

import {
  DATA_FILE_NAMES,
  FILE_NAMES,
  SCENARIO_IDS,
  SCHEMA_VERSION,
  SLUG_BY_SCENARIO,
  asArray,
  asString,
  compareCheckpointProjection,
  detectContractDefects,
  isObject,
  validateSemantics,
} from '../../apps/web/demo/poc/validation/semantic-rules.mjs';

// POC-005 bridge: the CLI imports the same authoritative TypeScript reducer
// used by the browser/API tests. The loader transpiles it in memory; no output
// is written and only the validator process uses this hook.
register(new URL('../../apps/web/demo/poc/replay/node-loader.mjs', import.meta.url));

const Ajv2020 = Ajv2020Import.default ?? Ajv2020Import;
const addFormats = addFormatsImport.default ?? addFormatsImport;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTRACTS_DIR = path.join(ROOT, 'contracts', 'poc');
const SCHEMA_FILE = path.join(CONTRACTS_DIR, 'scenario.schema.json');
const FILES_SCHEMA_DIR = path.join(CONTRACTS_DIR, 'files');
const MEDIA_ROOT = path.join(process.cwd(), 'apps', 'web', 'public', 'scenario-media');
const LAYER_NAMES = ['L1', 'L2', 'L3', 'L4', 'L5'];

const usage = `Usage:
  node scripts/poc/validate-scenario.mjs --dir <scenario-version-dir> [--strict] [--replay] [--report <path>] [--media-report <path>]
  node scripts/poc/validate-scenario.mjs --catalog <catalog.json> [--strict] [--report <path>]`;

function failUsage(message) {
  console.error(message);
  console.error(usage);
  process.exit(2);
}

function parseArgs(argv) {
  const options = { strict: false, replay: false, dir: null, catalog: null, report: null, mediaReport: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--strict') {
      options.strict = true;
      continue;
    }
    if (arg === '--replay') {
      options.replay = true;
      continue;
    }
    if (['--dir', '--catalog', '--report', '--media-report'].includes(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) failUsage(`${arg} requires a value.`);
      index += 1;
      if (arg === '--dir') options.dir = value;
      if (arg === '--catalog') options.catalog = value;
      if (arg === '--report') options.report = value;
      if (arg === '--media-report') options.mediaReport = value;
      continue;
    }
    failUsage(`Unknown argument: ${arg}`);
  }
  if (options.dir && options.catalog) failUsage('Use either --dir or --catalog, not both.');
  if (!options.dir && !options.catalog) failUsage('One of --dir or --catalog is required.');
  return options;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function dedupeErrors(errors) {
  const seen = new Set();
  const result = [];
  for (const error of errors) {
    const key = `${error.code}|${error.file}|${error.jsonPointer}|${error.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      code: String(error.code ?? 'VALIDATION_ERROR'),
      file: String(error.file ?? ''),
      jsonPointer: String(error.jsonPointer ?? ''),
      message: String(error.message ?? 'Validation failed.'),
    });
  }
  return result.sort((a, b) =>
    a.file === b.file
      ? a.jsonPointer === b.jsonPointer
        ? a.code.localeCompare(b.code)
        : a.jsonPointer.localeCompare(b.jsonPointer)
      : a.file.localeCompare(b.file),
  );
}

function layerStatus(name, errors, notRun = false) {
  if (errors.length) return { name, status: 'fail' };
  return { name, status: notRun ? 'not_run' : 'pass' };
}

function makeAjv() {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    allowUnionTypes: true,
    validateFormats: true,
  });
  addFormats(ajv);
  return ajv;
}

function ajvErrorsToIssues(fileName, errors) {
  return asArray(errors).map((error) => {
    let pointerPath = error.instancePath || '/';
    if (error.keyword === 'required' && error.params?.missingProperty) {
      pointerPath = `${error.instancePath || ''}/${error.params.missingProperty}`;
    } else if (error.keyword === 'additionalProperties' && error.params?.additionalProperty) {
      pointerPath = `${error.instancePath || ''}/${error.params.additionalProperty}`;
    }
    return issueFromValidation(
      'SCHEMA_INVALID',
      fileName,
      pointerPath,
      `${pointerPath} ${error.message ?? 'schema validation failed'}`,
    );
  });
}

function issueFromValidation(code, file, jsonPointer, message) {
  return {
    code,
    file,
    jsonPointer: jsonPointer || '',
    message,
  };
}

function readSchemaBundle() {
  const schemaBytes = readFileSync(SCHEMA_FILE);
  const schema = JSON.parse(schemaBytes.toString('utf8'));
  return { schema, schemaBytes };
}

function buildValidators(schema) {
  const ajv = makeAjv();
  ajv.addSchema(schema, schema.$id);
  const validators = new Map();
  for (const name of FILE_NAMES) {
    const wrapperFile = path.join(FILES_SCHEMA_DIR, `${name}.schema.json`);
    const wrapper = JSON.parse(readFileSync(wrapperFile, 'utf8'));
    ajv.addSchema(wrapper, wrapper.$id);
    const validator = ajv.getSchema(wrapper.$id);
    if (!validator) throw new Error(`Could not compile schema for ${name}.schema.json`);
    validators.set(name, validator);
  }
  return validators;
}

function readJsonFile(fullPath) {
  const bytes = readFileSync(fullPath);
  const text = bytes.toString('utf8');
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return { bytes, data: null, parseError: error instanceof Error ? error.message : String(error) };
  }
  return { bytes, data, parseError: null };
}

function loadScenarioDirectory(dir, validators, schema) {
  const errors = [];
  const warnings = [];
  const files = {};
  const fileBytes = {};
  const absoluteDir = path.resolve(process.cwd(), dir);
  if (!existsSync(absoluteDir) || !statSync(absoluteDir).isDirectory()) {
    console.error(`Scenario directory not found or not a directory: ${absoluteDir}`);
    process.exit(2);
  }

  const expectedFiles = FILE_NAMES.map((name) => `${name}.json`);
  let directoryEntries = [];
  try {
    directoryEntries = readdirSync(absoluteDir);
  } catch (error) {
    console.error(`Cannot read scenario directory ${absoluteDir}: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }

  for (const entry of directoryEntries) {
    if (entry.endsWith('.json') && !expectedFiles.includes(entry)) {
      errors.push(
        issueFromValidation('UNEXPECTED_FILE', entry, '', `Unexpected JSON file ${entry}; only the ten manifest-listed files are allowed.`),
      );
    }
  }

  for (const name of FILE_NAMES) {
    const fileName = `${name}.json`;
    const fullPath = path.join(absoluteDir, fileName);
    if (!existsSync(fullPath)) {
      errors.push(issueFromValidation('MISSING_FILE', fileName, '', `Required scenario file ${fileName} is missing.`));
      continue;
    }
    const loaded = readJsonFile(fullPath);
    fileBytes[name] = loaded.bytes;
    if (loaded.parseError) {
      errors.push(issueFromValidation('JSON_INVALID', fileName, '', `Invalid JSON: ${loaded.parseError}`));
      continue;
    }
    files[name] = loaded.data;
    const validator = validators.get(name);
    if (!validator) {
      errors.push(issueFromValidation('SCHEMA_MISSING', fileName, '', `No local schema registered for ${fileName}.`));
      continue;
    }
    if (!validator(loaded.data)) {
      errors.push(...ajvErrorsToIssues(fileName, validator.errors));
    }
  }

  const bundle = { ...files };
  const manifest = files.manifest;
  const packageHash = fileBytes.manifest ? sha256(fileBytes.manifest) : null;

  // Structural contract defects are reported as L1 failures; they are not
  // hidden and make the scenario un-runnable until main control fixes the
  // frozen schema.
  const contractDefects = detectContractDefects(schema);
  errors.push(...contractDefects);

  return { bundle, files, fileBytes, manifest, packageHash, l1Errors: errors, warnings, absoluteDir };
}

function validateManifestBindings(context) {
  const errors = [];
  const { manifest, absoluteDir, fileBytes } = context;
  if (!isObject(manifest)) return errors;
  const expectedPaths = DATA_FILE_NAMES.map((name) => `${name}.json`);
  const entries = asArray(manifest.files);
  const seen = new Set();
  for (const [index, entry] of entries.entries()) {
    const entryPath = asString(entry?.path);
    if (seen.has(entryPath)) {
      errors.push(issueFromValidation('MANIFEST_DUPLICATE_ENTRY', 'manifest.json', `/files/${index}/path`, `Duplicate manifest file entry ${entryPath}.`));
    }
    seen.add(entryPath);
    if (!expectedPaths.includes(entryPath)) {
      errors.push(issueFromValidation('MANIFEST_FILE_SET', 'manifest.json', `/files/${index}/path`, `Unexpected manifest file entry ${entryPath}.`));
      continue;
    }
    const name = entryPath.replace(/\.json$/, '');
    const actualBytes = fileBytes[name];
    if (!actualBytes) {
      errors.push(issueFromValidation('MISSING_FILE', entryPath, '', `Manifest lists ${entryPath} but the file was not read.`));
      continue;
    }
    if (entry?.bytes !== actualBytes.length) {
      errors.push(
        issueFromValidation(
          'FILE_BYTES_MISMATCH',
          'manifest.json',
          `/files/${index}/bytes`,
          `Manifest records ${entry?.bytes} bytes for ${entryPath}; actual file has ${actualBytes.length} bytes.`,
        ),
      );
    }
    const actualHash = sha256(actualBytes);
    if (entry?.sha256 !== actualHash) {
      errors.push(
        issueFromValidation(
          'FILE_HASH_MISMATCH',
          'manifest.json',
          `/files/${index}/sha256`,
          `Manifest records ${entry?.sha256} for ${entryPath}; actual SHA-256 is ${actualHash}.`,
        ),
      );
    }
  }
  for (const expectedPath of expectedPaths) {
    if (!seen.has(expectedPath)) {
      errors.push(issueFromValidation('MANIFEST_FILE_SET', 'manifest.json', '/files', `Manifest is missing the entry for ${expectedPath}.`));
    }
  }

  const dirName = path.basename(absoluteDir);
  const parentName = path.basename(path.dirname(absoluteDir));
  if (/^[0-9]+\.[0-9]+\.[0-9]+$/.test(dirName) && dirName !== manifest.scenarioVersion) {
    errors.push(
      issueFromValidation(
        'DIRECTORY_VERSION_MISMATCH',
        'manifest.json',
        '/scenarioVersion',
        `Directory ${dirName} does not match manifest.scenarioVersion ${manifest.scenarioVersion}.`,
      ),
    );
  }
  if (isObject(SLUG_BY_SCENARIO) && SCENARIO_IDS.includes(manifest.scenarioId) && parentName === SLUG_BY_SCENARIO[manifest.scenarioId]) {
    // Matching slug directory is expected; nothing to do.
  } else if (['scent-layering', 'luxury-gifting', 'oud-storytelling'].includes(parentName)) {
    errors.push(
      issueFromValidation(
        'DIRECTORY_SLUG_MISMATCH',
        'manifest.json',
        '/slug',
        `Directory slug ${parentName} does not match scenario ${manifest.scenarioId}.`,
      ),
    );
  }
  return errors;
}

function validateAssetFiles(context) {
  const errors = [];
  const { bundle } = context;
  const assets = asArray(bundle?.assets?.data?.assets);
  assets.forEach((asset, index) => {
    const uri = asString(asset?.uri);
    if (!uri.startsWith('/scenario-media/')) return;
    const relative = uri.slice('/scenario-media/'.length).split('/');
    const target = path.resolve(MEDIA_ROOT, ...relative);
    const mediaRootWithSeparator = MEDIA_ROOT.endsWith(path.sep) ? MEDIA_ROOT : `${MEDIA_ROOT}${path.sep}`;
    if (!target.startsWith(mediaRootWithSeparator)) {
      errors.push(issueFromValidation('PATH_TRAVERSAL', 'assets.json', `/data/assets/${index}/uri`, 'Asset path escapes the scenario-media root.'));
      return;
    }
    if (!existsSync(target) || !statSync(target).isFile()) {
      errors.push(
        issueFromValidation(
          'MEDIA_MISSING',
          'assets.json',
          `/data/assets/${index}/uri`,
          `Media file ${uri} does not exist under ${path.relative(process.cwd(), MEDIA_ROOT)}.`,
        ),
      );
      return;
    }
    const bytes = readFileSync(target);
    if (asset?.bytes !== bytes.length) {
      errors.push(
        issueFromValidation(
          'MEDIA_BYTES_MISMATCH',
          'assets.json',
          `/data/assets/${index}/bytes`,
          `Asset records ${asset?.bytes} bytes for ${uri}; actual file has ${bytes.length} bytes.`,
        ),
      );
    }
    const actualHash = sha256(bytes);
    if (asset?.sha256 !== actualHash) {
      errors.push(
        issueFromValidation(
          'MEDIA_HASH_MISMATCH',
          'assets.json',
          `/data/assets/${index}/sha256`,
          `Asset records ${asset?.sha256} for ${uri}; actual SHA-256 is ${actualHash}.`,
        ),
      );
    }
  });
  return errors;
}

function buildScenarioReport(context, semantic) {
  const l1Errors = dedupeErrors(context.l1Errors);
  const l2Errors = dedupeErrors(semantic.l2Errors);
  const l3Errors = dedupeErrors(semantic.l3Errors);
  const l4Errors = dedupeErrors([
    ...context.l4Errors,
    ...semantic.l4PathErrors,
    ...validateAssetFiles(context),
  ]);
  const errors = dedupeErrors([...l1Errors, ...l2Errors, ...l3Errors, ...l4Errors]);
  const warnings = [...context.warnings];

  const layers = [
    layerStatus('L1', l1Errors),
    layerStatus('L2', l2Errors),
    layerStatus('L3', l3Errors, true),
    layerStatus('L4', l4Errors),
  ];

  return {
    layers,
    errors,
    l1Errors,
    l2Errors,
    l3Errors,
    l4Errors,
    warnings,
    packageHash: context.packageHash ?? null,
  };
}

function mergeMediaReport(context, mediaReportPath) {
  if (!mediaReportPath) {
    return {
      status: 'not_run',
      errors: [],
      warnings: ['L5 media verification is NOT_RUN: no --media-report was supplied (POC-002 owns real HTTP/media checks).'],
    };
  }
  const mediaFullPath = path.resolve(process.cwd(), mediaReportPath);
  if (!existsSync(mediaFullPath)) {
    console.error(`Media report not found: ${mediaFullPath}`);
    process.exit(2);
  }
  let media;
  try {
    media = JSON.parse(readFileSync(mediaFullPath, 'utf8'));
  } catch (error) {
    console.error(`Cannot parse media report: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }
  const errors = [];
  const expectedHash = context.packageHash;
  if (media?.scenarioId !== context.manifest?.scenarioId) {
    errors.push(issueFromValidation('MEDIA_REPORT_MISMATCH', mediaReportPath, '/scenarioId', 'Media report scenarioId does not match the scenario being validated.'));
  }
  if (media?.scenarioVersion !== context.manifest?.scenarioVersion) {
    errors.push(issueFromValidation('MEDIA_REPORT_MISMATCH', mediaReportPath, '/scenarioVersion', 'Media report scenarioVersion does not match.'));
  }
  if (!expectedHash || media?.packageHash !== expectedHash) {
    errors.push(issueFromValidation('MEDIA_REPORT_MISMATCH', mediaReportPath, '/packageHash', 'Media report packageHash does not match the current manifest bytes.'));
  }
  const l5 = asArray(media?.layers).find((layer) => layer?.name === 'L5');
  if (l5?.status !== 'pass') {
    errors.push(
      issueFromValidation(
        'MEDIA_REPORT_NOT_PASS',
        mediaReportPath,
        '/layers',
        `Media report L5 must be pass for runnable scenarios, found ${JSON.stringify(l5?.status ?? 'missing')}.`,
      ),
    );
  }
  return {
    status: errors.length ? 'fail' : 'pass',
    errors,
    warnings: [],
  };
}

function writeReport(options, report) {
  if (!options.report) return;
  const fullPath = path.resolve(process.cwd(), options.report);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Report written to ${path.relative(process.cwd(), fullPath)}`);
}

function evaluateExit(options, layers) {
  const failed = layers.some((layer) => layer.status === 'fail');
  if (failed) return 1;
  if (options.strict) {
    const required = layers.filter((layer) => ['L1', 'L2', 'L3', 'L4'].includes(layer.name));
    if (required.some((layer) => layer.status !== 'pass')) return 1;
  }
  return 0;
}

function printScenarioSummary(report, exitCode) {
  console.log(`Scenario: ${report.scenarioId ?? '(unknown)'} ${report.scenarioVersion ?? ''}`);
  console.log(`Package hash: ${report.packageHash ?? '(not computed)'}`);
  console.log(`Layers: ${report.layers.map((layer) => `${layer.name}=${layer.status}`).join(' ')}`);
  console.log(`Runnable: ${report.runnable}`);
  if (report.errors.length) {
    console.log(`Errors (${report.errors.length}):`);
    for (const error of report.errors) {
      console.log(`- [${error.code}] ${error.file}${error.jsonPointer}: ${error.message}`);
    }
  }
  if (report.warnings.length) {
    console.log(`Warnings (${report.warnings.length}):`);
    for (const warning of report.warnings) console.log(`- ${warning}`);
  }
  console.log(`Exit ${exitCode}`);
}

async function compareProjectionAtCheckpoints(context) {
  const replay = await import('../../apps/web/demo/poc/replay/checkpoint.ts');
  const result = compareCheckpointProjection(context.bundle, (bundle, cursorSequence) =>
    replay.projectCheckpoint(bundle, bundle.events?.data?.events ?? [], cursorSequence),
  );
  const errors = (result.errors ?? []).map((error) => {
    const checkpointIndex = asArray(context.bundle?.expected?.data?.checkpoints).findIndex(
      (checkpoint) => checkpoint?.cursorSequence === error.cursorSequence,
    );
    const pointer =
      checkpointIndex >= 0
        ? `/data/checkpoints/${checkpointIndex}${error.path ? `/${String(error.path).replace(/^\//, '')}` : ''}`
        : '/data/checkpoints';
    return issueFromValidation(error.code ?? 'CHECKPOINT_PROJECTION_MISMATCH', 'expected.json', pointer, error.message ?? 'Checkpoint projection mismatch.');
  });
  return { ...result, errors };
}

async function runScenarioValidation(options) {
  const { schema } = readSchemaBundle();
  const validators = buildValidators(schema);
  const context = loadScenarioDirectory(options.dir, validators, schema);
  context.l4Errors = validateManifestBindings(context);

  const semantic = validateSemantics(context.bundle);
  context.warnings = semantic.warnings;
  const semanticReport = buildScenarioReport(context, semantic);
  const checkpointProjection = options.replay
    ? await compareProjectionAtCheckpoints(context)
    : { status: 'not_run', checked: 0, reason: 'POC-005 projector not requested; run with --replay to compare every expected checkpoint.', errors: [] };
  semanticReport.l3Errors = dedupeErrors([...semanticReport.l3Errors, ...checkpointProjection.errors]);
  semanticReport.errors = dedupeErrors([...semanticReport.errors, ...checkpointProjection.errors]);
  semanticReport.checkpointProjection = {
    status: checkpointProjection.status,
    checked: checkpointProjection.checked ?? 0,
    reason: checkpointProjection.reason ?? null,
  };
  const l3Layer = semanticReport.layers.find((layer) => layer.name === 'L3');
  if (l3Layer) {
    l3Layer.status = semanticReport.l3Errors.length ? 'fail' : checkpointProjection.status === 'pass' ? 'pass' : 'not_run';
  }
  const media = mergeMediaReport(context, options.mediaReport);

  const layers = [...semanticReport.layers, { name: 'L5', status: media.status }];
  const warnings = [
    ...new Set([
      ...semanticReport.warnings.filter(
        (warning) => !(options.replay && warning.includes('L3 checkpoint projection comparison is NOT_RUN')),
      ),
      ...(options.replay && checkpointProjection.status === 'pass'
        ? [`L3 checkpoint projection comparison passed via the POC-005 reducer for ${checkpointProjection.checked ?? 0} expected checkpoint(s).`]
        : []),
      ...media.warnings,
    ]),
  ];
  const contentReviewed = context.manifest?.authoring?.reviewStatus === 'reviewed';
  if (!contentReviewed) {
    warnings.push('Content reviewStatus is not reviewed; content acceptance is a main-control gate and cannot be inferred from schema validation.');
  }

  let runnable = layers.every((layer) => layer.status === 'pass') && contentReviewed;
  if (layers.find((layer) => layer.name === 'L3')?.status === 'not_run') runnable = false;

  const report = {
    schemaVersion: SCHEMA_VERSION,
    checkedAt: new Date().toISOString(),
    scope: 'scenario',
    scenarioId: context.manifest?.scenarioId ?? null,
    scenarioVersion: context.manifest?.scenarioVersion ?? null,
    packageHash: semanticReport.packageHash,
    layers,
    errors: dedupeErrors([...semanticReport.errors, ...media.errors]),
    warnings,
    runnable,
    checkpointProjection: semanticReport.checkpointProjection ?? null,
  };

  return report;
}

function validateCatalog(options) {
  const catalogPath = path.resolve(process.cwd(), options.catalog);
  if (!existsSync(catalogPath)) {
    console.error(`Catalog not found: ${catalogPath}`);
    process.exit(2);
  }
  let catalog;
  try {
    catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  } catch (error) {
    console.error(`Cannot parse catalog: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }

  const errors = [];
  const warnings = [];
  if (catalog?.schemaVersion !== SCHEMA_VERSION) {
    errors.push(issueFromValidation('CATALOG_SCHEMA_INVALID', path.basename(options.catalog), '/schemaVersion', `Expected schemaVersion ${SCHEMA_VERSION}.`));
  }
  const items = asArray(catalog?.items);
  const ids = items.map((item) => item?.scenarioId);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    errors.push(issueFromValidation('CATALOG_DUPLICATE_SCENARIO', path.basename(options.catalog), '/items', 'Catalog scenarioId values must be unique.'));
  }
  for (const scenarioId of SCENARIO_IDS) {
    if (!ids.includes(scenarioId)) {
      errors.push(issueFromValidation('CATALOG_ITEM_MISSING', path.basename(options.catalog), '/items', `Catalog must list ${scenarioId}.`));
    }
  }
  items.forEach((item, index) => {
    const readiness = item?.readiness;
    if (!['awaiting_content', 'invalid', 'ready'].includes(readiness)) {
      errors.push(issueFromValidation('CATALOG_READINESS_INVALID', path.basename(options.catalog), `/items/${index}/readiness`, `Invalid readiness ${JSON.stringify(readiness)}.`));
    }
    if (readiness === 'awaiting_content') {
      if (item?.scenarioVersion !== null || item?.packagePath !== null) {
        errors.push(
          issueFromValidation(
            'CATALOG_AWAITING_CONTENT_INVALID',
            path.basename(options.catalog),
            `/items/${index}`,
            'awaiting_content items must have scenarioVersion null and packagePath null.',
          ),
        );
      }
    }
    if (readiness === 'ready' && (typeof item?.packagePath !== 'string' || !item.packagePath)) {
      errors.push(issueFromValidation('CATALOG_READY_WITHOUT_PACKAGE', path.basename(options.catalog), `/items/${index}/packagePath`, 'ready items must provide a packagePath.'));
    }
  });

  const awaiting = items.filter((item) => item?.readiness === 'awaiting_content').length;
  const ready = items.filter((item) => item?.readiness === 'ready');
  warnings.push(
    `Catalog contains ${items.length} scenario(s): ${awaiting} awaiting_content, ${items.length - awaiting} other. awaiting_content is not a validation success and contributes 0 runnable packages.`,
  );
  if (!ready.length) {
    warnings.push('No package was validated by this catalog run: catalogs alone cannot make a scenario ready.');
  }

  // Ready packages must exist and carry a media-pass merged report before a
  // catalog run can ever claim runnable output. POC-001 deliberately does not
  // mark any scenario ready.
  errors.push(
    ...ready.flatMap((item, index) =>
      existsSync(path.resolve(process.cwd(), item.packagePath))
        ? []
        : [
            issueFromValidation(
              'CATALOG_PACKAGE_MISSING',
              path.basename(options.catalog),
              `/items/${items.indexOf(item)}/packagePath`,
              `ready packagePath ${item.packagePath} does not exist (checked item ${index}).`,
            ),
          ],
    ),
  );

  const layers = [
    layerStatus('L1', errors),
    { name: 'L2', status: 'not_run' },
    { name: 'L3', status: 'not_run' },
    { name: 'L4', status: 'not_run' },
    { name: 'L5', status: 'not_run' },
  ];

  const report = {
    schemaVersion: SCHEMA_VERSION,
    checkedAt: new Date().toISOString(),
    scope: 'catalog',
    scenarioId: null,
    scenarioVersion: null,
    packageHash: null,
    layers,
    errors: dedupeErrors(errors),
    warnings,
    runnable: false,
  };
  return report;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.mediaReport && options.catalog) {
    failUsage('--media-report only applies to --dir scenario validation.');
  }

  if (options.dir) {
    const report = await runScenarioValidation(options);
    const exitCode = evaluateExit(options, report.layers);
    writeReport(options, report);
    printScenarioSummary(report, exitCode);
    process.exit(exitCode);
  }

  const report = validateCatalog(options);
  const exitCode = evaluateExit(options, report.layers);
  writeReport(options, report);
  printScenarioSummary(report, exitCode);
  process.exit(exitCode);
}

await main();
