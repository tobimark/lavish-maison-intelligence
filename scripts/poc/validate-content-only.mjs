#!/usr/bin/env node
/*
 * Content-only input validator (NV-001).
 *
 * Reads the ten author JSON files unchanged, validates them with the
 * main-control content-only schema, checks manifest/media hashes, runs the
 * shared POC-003 reducer over the discovery/analysis event prefix and compares
 * the expected checkpoints. Pending MP4/poster assets are accepted only by
 * this profile and are reported as mediaStatus=deferred.
 *
 * Usage:
 *   node scripts/poc/validate-content-only.mjs --dir <scenario-version-dir> --report <path>
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020Import from 'ajv/dist/2020.js';
import addFormatsImport from 'ajv-formats';
import { validateSemantics } from '../../apps/web/demo/poc/validation/semantic-rules.mjs';

register(new URL('../../apps/web/demo/poc/replay/node-loader.mjs', import.meta.url));
const { adaptContentOnlyPackage } = await import('../../apps/web/demo/poc/domain/content-only.ts');
const { compareCheckpointProjections } = await import('../../apps/web/demo/poc/replay/checkpoint.ts');

const Ajv2020 = Ajv2020Import.default ?? Ajv2020Import;
const addFormats = addFormatsImport.default ?? addFormatsImport;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCHEMA = path.join(ROOT, 'contracts', 'poc', 'content-only.schema.json');
const NAMES = ['brand', 'discovery', 'analysis', 'script', 'video', 'delivery', 'events', 'assets', 'expected'];

const args = process.argv.slice(2);
function arg(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}
const dir = arg('--dir');
const reportPath = arg('--report');
if (!dir) {
  console.error('Usage: node scripts/poc/validate-content-only.mjs --dir <scenario-version-dir> [--report <path>]');
  process.exit(2);
}
const absoluteDir = path.resolve(process.cwd(), dir);
if (!existsSync(absoluteDir)) {
  console.error(`Scenario directory not found: ${absoluteDir}`);
  process.exit(2);
}
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
function issue(code, file, pointer, message) {
  return { code, file, jsonPointer: pointer, message };
}

const files = {};
const errors = [];
for (const name of ['manifest', ...NAMES]) {
  const full = path.join(absoluteDir, `${name}.json`);
  if (!existsSync(full)) {
    errors.push(issue('MISSING_FILE', `${name}.json`, '', `Required content-only file is missing: ${name}.json`));
    continue;
  }
  try {
    files[name] = JSON.parse(readFileSync(full, 'utf8'));
  } catch (error) {
    errors.push(issue('JSON_INVALID', `${name}.json`, '', error instanceof Error ? error.message : String(error)));
  }
}
const extraJson = readdirSync(absoluteDir).filter((entry) => entry.endsWith('.json') && entry !== 'manifest.json' && !NAMES.map((name) => `${name}.json`).includes(entry));
if (extraJson.length) errors.push(issue('UNEXPECTED_FILE', extraJson[0], '', `Unexpected JSON file(s): ${extraJson.join(', ')}`));

const schema = JSON.parse(readFileSync(SCHEMA, 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
if (!validate(files)) {
  for (const error of validate.errors ?? []) {
    errors.push(issue('SCHEMA_INVALID', 'content-only', error.instancePath || '/', error.message ?? 'schema failure'));
  }
}

let packageHash = null;
if (files.manifest) {
  const manifestBytes = readFileSync(path.join(absoluteDir, 'manifest.json'));
  packageHash = sha256(manifestBytes);
  const listed = Array.isArray(files.manifest.files) ? files.manifest.files : [];
  for (const name of NAMES) {
    const entry = listed.find((candidate) => candidate.path === `${name}.json`);
    if (!entry) {
      errors.push(issue('MANIFEST_ENTRY_MISSING', 'manifest.json', `/files`, `Manifest does not bind ${name}.json`));
      continue;
    }
    const full = path.join(absoluteDir, `${name}.json`);
    if (!existsSync(full)) continue;
    const bytes = readFileSync(full);
    if (entry.bytes !== bytes.length) errors.push(issue('FILE_BYTES_MISMATCH', `${name}.json`, '/bytes', `Expected ${entry.bytes}, actual ${bytes.length}`));
    if (entry.sha256 !== sha256(bytes)) errors.push(issue('FILE_HASH_MISMATCH', `${name}.json`, '/sha256', 'Manifest hash does not match actual bytes.'));
  }
  if (listed.length !== NAMES.length) errors.push(issue('MANIFEST_FILE_COUNT', 'manifest.json', '/files', `Expected ${NAMES.length} bound files, found ${listed.length}.`));
}

let realMedia = 0;
let pendingMedia = 0;
if (files.assets?.data?.assets) {
  for (const asset of files.assets.data.assets) {
    const real = typeof asset.bytes === 'number' && typeof asset.sha256 === 'string';
    if (!real) {
      pendingMedia += 1;
      if (asset.kind !== 'video' && asset.kind !== 'poster') {
        errors.push(issue('PENDING_ASSET_KIND', 'assets.json', `/${asset.id}`, `Pending asset ${asset.id} must be video/poster.`));
      }
      continue;
    }
    realMedia += 1;
    const basename = String(asset.uri).split('/').pop();
    const candidates = [path.join(absoluteDir, 'media', basename), path.join(ROOT, 'apps', 'web', 'public', asset.uri.replace(/^\//, ''))];
    const actualPath = candidates.find((candidate) => existsSync(candidate));
    if (!actualPath) {
      errors.push(issue('MEDIA_MISSING', 'assets.json', `/${asset.id}/uri`, `Actual media file missing for ${asset.uri}`));
      continue;
    }
    const bytes = readFileSync(actualPath);
    if (bytes.length !== asset.bytes) errors.push(issue('MEDIA_BYTES_MISMATCH', 'assets.json', `/${asset.id}/bytes`, `Expected ${asset.bytes}, actual ${bytes.length}`));
    if (sha256(bytes) !== asset.sha256) errors.push(issue('MEDIA_HASH_MISMATCH', 'assets.json', `/${asset.id}/sha256`, 'Media SHA-256 mismatch.'));
  }
}

let l2Errors = [];
let staticL3Errors = [];
let prefixStatus = 'not_run';
let checkpointIssues = [];
let analysisPrefix = 0;
let adapted = null;
if (files.manifest && files.brand && files.discovery && files.analysis && files.script && files.video && files.delivery && files.events && files.assets && files.expected) {
  const semantics = validateSemantics(files);
  l2Errors = [...semantics.l2Errors];
  staticL3Errors = [...semantics.l3Errors];
  try {
    adapted = adaptContentOnlyPackage(files);
    const events = files.events.data.events;
    const analysisCompleted = events.find((event) => event.stage === 'analysis' && event.type === 'stage.completed');
    analysisPrefix = analysisCompleted?.sequence ?? 0;
    if (analysisPrefix > 0) {
      const prefixEvents = events.filter((event) => event.sequence <= analysisPrefix);
      const prefixCheckpoints = files.expected.data.checkpoints.filter((checkpoint) => checkpoint.cursorSequence <= analysisPrefix);
      const comparison = compareCheckpointProjections(adapted, prefixEvents, prefixCheckpoints);
      checkpointIssues = comparison.issues;
      if (!comparison.ok) {
        for (const problem of comparison.issues) {
          l2Errors.push(issue('CHECKPOINT_PROJECTION_MISMATCH', 'expected.json', `/data/checkpoints`, `cursor ${problem.cursorSequence} ${problem.path}: ${problem.message}`));
        }
      }
      prefixStatus = comparison.ok ? 'pass' : 'fail';
    } else {
      prefixStatus = 'fail';
      l2Errors.push(issue('ANALYSIS_PREFIX_MISSING', 'events.json', '/data/events', 'No analysis stage.completed event found.'));
    }
  } catch (error) {
    prefixStatus = 'fail';
    l2Errors.push(issue('CONTENT_PACKAGE_ADAPT_FAILED', 'manifest.json', '/', error instanceof Error ? error.message : String(error)));
  }
}

const allErrors = [...errors, ...l2Errors, ...staticL3Errors];
const layers = [
  { name: 'L1', status: errors.length ? 'fail' : 'pass' },
  { name: 'L2', status: l2Errors.length ? 'fail' : 'pass' },
  { name: 'L3', status: staticL3Errors.length || prefixStatus !== 'pass' ? 'fail' : 'pass' },
  { name: 'L4', status: errors.some((entry) => entry.code.includes('MEDIA') || entry.code.includes('FILE') || entry.code.includes('MANIFEST')) ? 'fail' : 'pass' },
];
const report = {
  schemaVersion: '1.0.0',
  profile: 'content_only',
  mode: 'mock',
  checkedAt: new Date().toISOString(),
  scenarioId: files.manifest?.scenarioId ?? null,
  scenarioVersion: files.manifest?.scenarioVersion ?? null,
  packageHash,
  contentRunnable: allErrors.length === 0,
  mediaStatus: 'deferred',
  analysisPrefix,
  media: { realFiles: realMedia, pendingFiles: pendingMedia },
  layers,
  errors: allErrors,
  warnings: [
    'Pending MP4/poster are allowed only as deferred media; no video playback/download is claimed.',
    'Content authoring reviewStatus remains pending; content acceptance is a main-control gate.',
  ],
};
if (reportPath) {
  const full = path.resolve(process.cwd(), reportPath);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}
console.log(`Content-only: ${report.scenarioId ?? '(unknown)'} ${report.scenarioVersion ?? ''}`);
console.log(`Package hash: ${packageHash ?? '(not computed)'}`);
console.log(`Layers: ${layers.map((layer) => `${layer.name}=${layer.status}`).join(' ')}`);
console.log(`Analysis prefix: ${analysisPrefix}; checkpoints: ${checkpointIssues.length === 0 && prefixStatus === 'pass' ? 'pass' : prefixStatus}`);
console.log(`Content runnable: ${report.contentRunnable}; media=${realMedia} real / ${pendingMedia} pending`);
if (allErrors.length) {
  for (const error of allErrors) console.log(`- [${error.code}] ${error.file}${error.jsonPointer}: ${error.message}`);
  process.exit(1);
}
