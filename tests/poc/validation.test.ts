import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import {
  SCENARIO_ID,
  SCENARIO_VERSION,
  SLUG,
  createFixture,
  serialize,
} from '../fixtures/poc/build-fixture';
import {
  compareCheckpointProjection,
  detectContractDefects,
  validateSemantics,
} from '../../apps/web/demo/poc/validation/semantic-rules.mjs';

const ROOT = process.cwd();
const CLI = path.join(ROOT, 'scripts', 'poc', 'validate-scenario.mjs');
const SCHEMA_FILE = path.join(ROOT, 'contracts', 'poc', 'scenario.schema.json');
const tempRoots: string[] = [];

afterEach(() => {
  while (tempRoots.length) {
    rmSync(tempRoots.pop()!, { recursive: true, force: true });
  }
});

type Fixture = {
  root: string;
  scenarioDir: string;
  mediaDir: string;
  files: Record<string, any>;
  media: Record<string, Buffer>;
};

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function refreshManifest(files: Record<string, any>): void {
  const listed = ['brand', 'discovery', 'analysis', 'script', 'video', 'delivery', 'events', 'assets', 'expected'];
  files['manifest.json'].files = listed.map((name) => {
    const buffer = Buffer.from(serialize(files[`${name}.json`]), 'utf8');
    return { path: `${name}.json`, bytes: buffer.length, sha256: sha256(buffer) };
  });
}

function makeFixtureWorkspace(mutator?: (files: Record<string, any>, media: Record<string, Buffer>) => void): Fixture {
  const fixture = createFixture();
  const files = fixture.files as Record<string, any>;
  const media = fixture.media;
  if (mutator) {
    mutator(files, media);
  }
  const root = mkdtempSync(path.join(tmpdir(), 'poc-001-'));
  tempRoots.push(root);
  const scenarioDir = path.join(root, 'scenarios', SLUG, SCENARIO_VERSION);
  const mediaDir = path.join(root, 'apps', 'web', 'public', 'scenario-media', SLUG, SCENARIO_VERSION);
  mkdirSync(scenarioDir, { recursive: true });
  mkdirSync(mediaDir, { recursive: true });
  for (const [name, value] of Object.entries(files)) {
    writeFileSync(path.join(scenarioDir, name), serialize(value));
  }
  for (const [name, bytes] of Object.entries(media)) {
    writeFileSync(path.join(mediaDir, name), bytes);
  }
  return { root, scenarioDir, mediaDir, files, media };
}

function runCli(args: string[], cwd: string) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 60_000 });
}

function readReport(root: string, name = 'report.json') {
  return JSON.parse(readFileSync(path.join(root, name), 'utf8'));
}

function bundleFromFiles(files: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(files).map(([name, value]) => [name.replace(/\.json$/, ''), value]),
  );
}

function issueCodes(report: any): string[] {
  return report.errors.map((error: any) => error.code);
}

function findIssue(report: any, code: string, file?: string) {
  return report.errors.find(
    (error: any) => error.code === code && (file === undefined || error.file === file),
  );
}

describe('POC-001 catalogue validation', () => {
  test('three awaiting_content scenarios are valid catalog entries but are not counted as validation success', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'poc-001-catalog-'));
    tempRoots.push(root);
    const result = runCli(
      ['--catalog', path.join(ROOT, 'scenarios', 'catalog.json'), '--report', 'catalog-report.json'],
      root,
    );
    expect(result.status).toBe(0);
    const report = readReport(root, 'catalog-report.json');
    expect(report.scope).toBe('catalog');
    expect(report.runnable).toBe(false);
    expect(report.layers.map((layer: any) => `${layer.name}:${layer.status}`)).toEqual([
      'L1:pass',
      'L2:not_run',
      'L3:not_run',
      'L4:not_run',
      'L5:not_run',
    ]);
    expect(report.errors).toEqual([]);
    expect(report.warnings.join(' ')).toContain('3 awaiting_content');
    expect(report.warnings.join(' ')).toContain('not a validation success');

    const strict = runCli(
      ['--catalog', path.join(ROOT, 'scenarios', 'catalog.json'), '--strict', '--report', 'strict.json'],
      root,
    );
    expect(strict.status).toBe(1);
    expect(readReport(root, 'strict.json').runnable).toBe(false);
  });
});

describe('POC-001 contract and type generation', () => {
  test('the frozen schema separates AnalysisEntry/VideoEntry from file wrappers and has no contract defect', () => {
    const schema = JSON.parse(readFileSync(SCHEMA_FILE, 'utf8'));
    expect(detectContractDefects(schema)).toEqual([]);
    expect(schema.$defs.analysisData.properties.analyses.items.$ref).toBe('#/$defs/analysisEntry');
    expect(schema.$defs.videoData.properties.videos.items.$ref).toBe('#/$defs/videoEntry');
    expect(schema.$defs.analysis.properties.data.$ref).toBe('#/$defs/analysisData');
    expect(schema.$defs.video.properties.data.$ref).toBe('#/$defs/videoData');
    expect(schema.$defs.analysisEntry.properties.id).toBeTruthy();
    expect(schema.$defs.videoEntry.properties.id).toBeTruthy();
    expect(schema.$defs.analysisEntry.properties).not.toHaveProperty('data');
    expect(schema.$defs.videoEntry.properties).not.toHaveProperty('data');
  });

  test('the defect detector still catches an intentionally broken schema copy', () => {
    const schema = JSON.parse(readFileSync(SCHEMA_FILE, 'utf8'));
    schema.$defs.analysisData.properties.analyses.items.$ref = '#/$defs/analysis';
    schema.$defs.videoData.properties.videos.items.$ref = '#/$defs/video';
    const defects = detectContractDefects(schema);
    expect(defects).toHaveLength(2);
    expect(defects.map((defect: any) => defect.code)).toEqual(['CONTRACT_DEFECT', 'CONTRACT_DEFECT']);
    expect(defects.map((defect: any) => defect.jsonPointer)).toEqual([
      '#/$defs/analysisData/properties/analyses/items',
      '#/$defs/videoData/properties/videos/items',
    ]);
  });

  test('generated types are deterministic, mirror the corrected schema and expose AnalysisEntry/VideoEntry', () => {
    const check = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'poc', 'generate-types.mjs'), '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(check.status, check.stderr).toBe(0);

    const schemaBytes = readFileSync(SCHEMA_FILE);
    const manifest = JSON.parse(
      readFileSync(path.join(ROOT, 'apps', 'web', 'demo', 'poc', 'generated', 'generation-manifest.json'), 'utf8'),
    );
    expect(manifest.schemaSha256).toBe(sha256(schemaBytes));
    expect(manifest.schemaBytes).toBe(schemaBytes.length);
    expect(manifest.prefixItemsTuples).toBe(1);
    expect(manifest.contractDefects).toEqual([]);
    const types = readFileSync(path.join(ROOT, 'apps', 'web', 'demo', 'poc', 'generated', 'scenario.types.ts'), 'utf8');
    expect(types).toContain('export interface ScenarioPackage');
    expect(types).toContain('export interface AnalysisEntry');
    expect(types).toContain('export interface VideoEntry');
    expect(types).toContain('stages: ["discovery", "analysis", "video", "delivery"]');
    expect(types).toContain('type: "delivery.simulated"');
    expect(types).toContain('export type DeliveryRecord');
    expect(types).not.toContain('currently contains a known contract defect');
  });
});

describe('POC-001 semantic rules on the intended TEST_ONLY fixture', () => {
  test('L2/L3-static/L4 path rules pass; projection and L5 stay NOT_RUN', () => {
    const fixture = createFixture();
    const bundle = bundleFromFiles(fixture.files as Record<string, any>);
    const semantics = validateSemantics(bundle);
    expect(semantics.l2Errors, JSON.stringify(semantics.l2Errors)).toEqual([]);
    expect(semantics.l3Errors, JSON.stringify(semantics.l3Errors)).toEqual([]);
    expect(semantics.l4PathErrors).toEqual([]);
    expect(semantics.checkpointProjection.status).toBe('not_run');
    expect(compareCheckpointProjection(bundle).status).toBe('not_run');
    expect(semantics.warnings.join(' ')).toContain('NOT_RUN');
  });

  test('CLI now passes L1/L2/L4 on the finite TEST_ONLY fixture; L3 projection and L5 stay NOT_RUN', () => {
    const fixture = makeFixtureWorkspace();
    const result = runCli(['--dir', fixture.scenarioDir, '--report', 'report.json'], fixture.root);
    expect(result.status, result.stdout + result.stderr).toBe(0);
    const report = readReport(fixture.root);
    expect(report.scope).toBe('scenario');
    expect(report.runnable).toBe(false);
    expect(report.layers.map((layer: any) => `${layer.name}:${layer.status}`)).toEqual([
      'L1:pass',
      'L2:pass',
      'L3:not_run',
      'L4:pass',
      'L5:not_run',
    ]);
    expect(report.errors).toEqual([]);
    expect(report.packageHash).toMatch(/^[a-f0-9]{64}$/);
    expect(report.warnings.join(' ')).toContain('Content reviewStatus is not reviewed');
    expect(report.warnings.join(' ')).toContain('L5 media verification is NOT_RUN');
    expect(report.warnings.join(' ')).toContain('projection comparison is NOT_RUN');

    const strict = runCli(['--dir', fixture.scenarioDir, '--strict', '--report', 'strict.json'], fixture.root);
    expect(strict.status).toBe(1);
    const strictReport = readReport(fixture.root, 'strict.json');
    expect(strictReport.runnable).toBe(false);
    expect(strictReport.layers.find((layer: any) => layer.name === 'L3').status).toBe('not_run');
  });

  test('missing package directory is an IO/usage error (exit 2), not a fake pass', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'poc-001-missing-'));
    tempRoots.push(root);
    const result = runCli(['--dir', path.join(root, 'scenarios', 'nope', '1.0.0'), '--report', 'r.json'], root);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('not found');
    expect(existsSync(path.join(root, 'r.json'))).toBe(false);
  });
});

describe('POC-001 negative validation cases', () => {
  test('missing file: L1 MISSING_FILE with file and pointer', () => {
    const fixture = makeFixtureWorkspace();
    rmSync(path.join(fixture.scenarioDir, 'brand.json'));
    const result = runCli(['--dir', fixture.scenarioDir, '--report', 'report.json'], fixture.root);
    expect(result.status).toBe(1);
    const report = readReport(fixture.root);
    const issue = findIssue(report, 'MISSING_FILE', 'brand.json');
    expect(issue).toBeTruthy();
    expect(issue.jsonPointer).toBe('');
    expect(report.layers.find((layer: any) => layer.name === 'L1').status).toBe('fail');
  });

  test('unknown field: SCHEMA_INVALID points at the extra property', () => {
    const fixture = makeFixtureWorkspace((files) => {
      files['manifest.json'].unexpectedProperty = true;
    });
    const result = runCli(['--dir', fixture.scenarioDir, '--report', 'report.json'], fixture.root);
    expect(result.status).toBe(1);
    const report = readReport(fixture.root);
    const issue = report.errors.find(
      (error: any) => error.code === 'SCHEMA_INVALID' && error.file === 'manifest.json',
    );
    expect(issue).toBeTruthy();
    expect(issue.jsonPointer).toBe('/unexpectedProperty');
  });

  test('duplicate ID across entities: L2 DUPLICATE_ID', () => {
    const fixture = makeFixtureWorkspace((files) => {
      files['brand.json'].data.products[0].id = files['discovery.json'].data.evidence[0].id;
      refreshManifest(files);
    });
    const result = runCli(['--dir', fixture.scenarioDir, '--report', 'report.json'], fixture.root);
    expect(result.status).toBe(1);
    const report = readReport(fixture.root);
    const duplicate = report.errors.find((error: any) => error.code === 'DUPLICATE_ID');
    expect(duplicate).toBeTruthy();
    expect(duplicate.message).toContain('already used');
    expect(report.layers.find((layer: any) => layer.name === 'L2').status).toBe('fail');
  });

  test('wrong reference type: L2 REFERENCE_TYPE_MISMATCH', () => {
    const fixture = makeFixtureWorkspace((files) => {
      files['discovery.json'].data.signals[0].evidenceIds = [files['assets.json'].data.assets[0].id];
      refreshManifest(files);
    });
    const result = runCli(['--dir', fixture.scenarioDir, '--report', 'report.json'], fixture.root);
    expect(result.status).toBe(1);
    const report = readReport(fixture.root);
    const issue = findIssue(report, 'REFERENCE_TYPE_MISMATCH', 'discovery.json');
    expect(issue).toBeTruthy();
    expect(issue.jsonPointer).toContain('/evidenceIds/0');
  });

  test('cross-scenario reference: L2 CROSS_SCENARIO_REFERENCE', () => {
    const crossId = 'scn-oud-storytelling.evidence.other';
    const fixture = makeFixtureWorkspace((files) => {
      files['discovery.json'].data.signals[0].evidenceIds = [crossId];
      refreshManifest(files);
    });
    const result = runCli(['--dir', fixture.scenarioDir, '--report', 'report.json'], fixture.root);
    expect(result.status).toBe(1);
    const report = readReport(fixture.root);
    const issue = findIssue(report, 'CROSS_SCENARIO_REFERENCE', 'discovery.json');
    expect(issue).toBeTruthy();
    expect(issue.jsonPointer).toContain('/evidenceIds/0');
  });

  test('event disorder: L3 EVENT_SEQUENCE_INVALID / EVENT_TIME_DISORDER with pointers', () => {
    const fixture = makeFixtureWorkspace((files) => {
      const events = files['events.json'].data.events as any[];
      events[2].sequence = 9;
      events[3].atMs = 1;
      refreshManifest(files);
    });
    const result = runCli(['--dir', fixture.scenarioDir, '--report', 'report.json'], fixture.root);
    expect(result.status).toBe(1);
    const report = readReport(fixture.root);
    expect(findIssue(report, 'EVENT_SEQUENCE_INVALID', 'events.json')).toBeTruthy();
    const disorder = report.errors.find(
      (error: any) => error.code === 'EVENT_TIME_DISORDER' && error.file === 'events.json',
    );
    expect(disorder).toBeTruthy();
    expect(disorder.jsonPointer).toMatch(/^\/data\/events\/\d+\/atMs$/);
    expect(report.layers.find((layer: any) => layer.name === 'L3').status).toBe('fail');
  });

  test('wrong manifest hash: L4 FILE_HASH_MISMATCH at manifest pointer', () => {
    const fixture = makeFixtureWorkspace((files) => {
      files['manifest.json'].files[0].sha256 = '0'.repeat(64);
    });
    const result = runCli(['--dir', fixture.scenarioDir, '--report', 'report.json'], fixture.root);
    expect(result.status).toBe(1);
    const report = readReport(fixture.root);
    const issue = findIssue(report, 'FILE_HASH_MISMATCH', 'manifest.json');
    expect(issue).toBeTruthy();
    expect(issue.jsonPointer).toBe('/files/0/sha256');
    expect(report.layers.find((layer: any) => layer.name === 'L4').status).toBe('fail');
  });

  test('path traversal: L4 PATH_TRAVERSAL with assets.json pointer', () => {
    const fixture = makeFixtureWorkspace((files) => {
      files['assets.json'].data.assets[0].uri = `/scenario-media/${SLUG}/${SCENARIO_VERSION}/../logo.png`;
      refreshManifest(files);
    });
    const result = runCli(['--dir', fixture.scenarioDir, '--report', 'report.json'], fixture.root);
    expect(result.status).toBe(1);
    const report = readReport(fixture.root);
    const issue = findIssue(report, 'PATH_TRAVERSAL', 'assets.json');
    expect(issue).toBeTruthy();
    expect(issue.jsonPointer).toBe('/data/assets/0/uri');
  });

  test('non-.invalid recipient: L2 INVALID_RECIPIENT_DOMAIN', () => {
    const fixture = makeFixtureWorkspace((files) => {
      files['delivery.json'].data.recipients[0].email = 'qa@example.com';
      refreshManifest(files);
    });
    const result = runCli(['--dir', fixture.scenarioDir, '--report', 'report.json'], fixture.root);
    expect(result.status).toBe(1);
    const report = readReport(fixture.root);
    const issue = findIssue(report, 'INVALID_RECIPIENT_DOMAIN', 'delivery.json');
    expect(issue).toBeTruthy();
    expect(issue.jsonPointer).toBe('/data/recipients/0/email');
  });

  test('missing media: L4 MEDIA_MISSING with assets.json pointer', () => {
    const fixture = makeFixtureWorkspace();
    rmSync(path.join(fixture.mediaDir, 'logo.png'));
    const result = runCli(['--dir', fixture.scenarioDir, '--report', 'report.json'], fixture.root);
    expect(result.status).toBe(1);
    const report = readReport(fixture.root);
    const issue = findIssue(report, 'MEDIA_MISSING', 'assets.json');
    expect(issue).toBeTruthy();
    expect(issue.jsonPointer).toBe('/data/assets/0/uri');
    expect(report.layers.find((layer: any) => layer.name === 'L4').status).toBe('fail');
  });

  test('future visible entity in expected checkpoint: L3 CHECKPOINT_VISIBLE_FUTURE_LEAK', () => {
    const fixture = makeFixtureWorkspace((files) => {
      const checkpoints = files['expected.json'].data.checkpoints as any[];
      checkpoints[1].visibleEntityIds = [...checkpoints[1].visibleEntityIds, files['video.json'].data.videos[0].id].sort();
      refreshManifest(files);
    });
    const result = runCli(['--dir', fixture.scenarioDir, '--report', 'report.json'], fixture.root);
    expect(result.status).toBe(1);
    const report = readReport(fixture.root);
    const issue = findIssue(report, 'CHECKPOINT_VISIBLE_FUTURE_LEAK', 'expected.json');
    expect(issue).toBeTruthy();
    expect(issue.jsonPointer).toContain('/visibleEntityIds/');
  });

  test('script timeline gap: L3 SCRIPT_SHOT_GAP', () => {
    const fixture = makeFixtureWorkspace((files) => {
      files['script.json'].data.versions[0].shots[1].startMs = 4000;
      refreshManifest(files);
    });
    const result = runCli(['--dir', fixture.scenarioDir, '--report', 'report.json'], fixture.root);
    expect(result.status).toBe(1);
    const report = readReport(fixture.root);
    const issue = findIssue(report, 'SCRIPT_SHOT_GAP', 'script.json');
    expect(issue).toBeTruthy();
    expect(issue.jsonPointer).toBe('/data/versions/0/shots/1/startMs');
  });

  test('entity namespace: an unreferenced foreign evidence ID is rejected by its own id field', () => {
    const fixture = makeFixtureWorkspace((files) => {
      const source = files['discovery.json'].data.evidence[0];
      files['discovery.json'].data.evidence.push({
        ...source,
        id: 'scn-oud-storytelling.evidence.unreferenced-foreign',
      });
      refreshManifest(files);
    });
    const result = runCli(['--dir', fixture.scenarioDir, '--report', 'report.json'], fixture.root);
    expect(result.status).toBe(1);
    const report = readReport(fixture.root);
    const issue = findIssue(report, 'CROSS_SCENARIO_ENTITY', 'discovery.json');
    expect(issue).toBeTruthy();
    expect(issue.jsonPointer).toBe('/data/evidence/1/id');
    expect(issue.message).toContain('scn-oud-storytelling.evidence.unreferenced-foreign');
    expect(report.layers.find((layer: any) => layer.name === 'L2').status).toBe('fail');
  });

  test('entity namespace: an unreferenced foreign asset ID is rejected by its own id field', () => {
    const fixture = makeFixtureWorkspace((files) => {
      const source = files['assets.json'].data.assets[0];
      files['assets.json'].data.assets.push({
        ...source,
        id: 'scn-oud-storytelling.asset.unreferenced-foreign',
        productIds: [],
      });
      refreshManifest(files);
    });
    const result = runCli(['--dir', fixture.scenarioDir, '--report', 'report.json'], fixture.root);
    expect(result.status).toBe(1);
    const report = readReport(fixture.root);
    const issue = findIssue(report, 'CROSS_SCENARIO_ENTITY', 'assets.json');
    expect(issue).toBeTruthy();
    expect(issue.jsonPointer).toBe('/data/assets/5/id');
  });

  test('entity namespace: a nested shot ID from another scenario is rejected', () => {
    const fixture = makeFixtureWorkspace((files) => {
      files['script.json'].data.versions[0].shots[0].id = 'scn-oud-storytelling.shot.nested-foreign';
      refreshManifest(files);
    });
    const result = runCli(['--dir', fixture.scenarioDir, '--report', 'report.json'], fixture.root);
    expect(result.status).toBe(1);
    const report = readReport(fixture.root);
    const issue = findIssue(report, 'CROSS_SCENARIO_ENTITY', 'script.json');
    expect(issue).toBeTruthy();
    expect(issue.jsonPointer).toBe('/data/versions/0/shots/0/id');
  });

  test('entity namespace: an event ID from another scenario is rejected', () => {
    const fixture = makeFixtureWorkspace((files) => {
      files['events.json'].data.events[0].id = 'scn-oud-storytelling.event.foreign';
      refreshManifest(files);
    });
    const result = runCli(['--dir', fixture.scenarioDir, '--report', 'report.json'], fixture.root);
    expect(result.status).toBe(1);
    const report = readReport(fixture.root);
    const issue = findIssue(report, 'CROSS_SCENARIO_ENTITY', 'events.json');
    expect(issue).toBeTruthy();
    expect(issue.jsonPointer).toBe('/data/events/0/id');
  });
});

describe('POC-001 L5 report merge', () => {
  test('media report with matching package hash can pass L5 but never overrides NOT_RUN L3', () => {
    const fixture = makeFixtureWorkspace();
    const first = runCli(['--dir', fixture.scenarioDir, '--report', 'base.json'], fixture.root);
    expect(first.status).toBe(0);
    const base = readReport(fixture.root, 'base.json');
    const mediaReport = {
      schemaVersion: '1.0.0',
      scope: 'scenario',
      scenarioId: SCENARIO_ID,
      scenarioVersion: SCENARIO_VERSION,
      packageHash: base.packageHash,
      layers: [{ name: 'L5', status: 'pass' }],
      errors: [],
      warnings: [],
      runnable: true,
    };
    writeFileSync(path.join(fixture.root, 'media.json'), JSON.stringify(mediaReport, null, 2));

    const merged = runCli(
      ['--dir', fixture.scenarioDir, '--media-report', 'media.json', '--report', 'merged.json'],
      fixture.root,
    );
    expect(merged.status).toBe(0);
    const mergedReport = readReport(fixture.root, 'merged.json');
    expect(mergedReport.layers.find((layer: any) => layer.name === 'L5').status).toBe('pass');
    expect(mergedReport.layers.find((layer: any) => layer.name === 'L3').status).toBe('not_run');
    expect(mergedReport.runnable).toBe(false);

    writeFileSync(
      path.join(fixture.root, 'media-wrong.json'),
      JSON.stringify({ ...mediaReport, packageHash: '0'.repeat(64) }, null, 2),
    );
    const wrong = runCli(
      ['--dir', fixture.scenarioDir, '--media-report', 'media-wrong.json', '--report', 'mismatch.json'],
      fixture.root,
    );
    expect(wrong.status).toBe(1);
    const mismatchReport = readReport(fixture.root, 'mismatch.json');
    expect(mismatchReport.layers.find((layer: any) => layer.name === 'L5').status).toBe('fail');
    expect(findIssue(mismatchReport, 'MEDIA_REPORT_MISMATCH')).toBeTruthy();
  });
});
