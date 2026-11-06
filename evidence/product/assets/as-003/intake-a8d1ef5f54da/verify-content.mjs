import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const { parseVtt } = await import(pathToFileURL(path.join(root, 'scripts/poc/verify-media.mjs')));
register(pathToFileURL(path.join(root, 'apps/web/demo/poc/replay/node-loader.mjs')));
const { adaptContentOnlyPackage } = await import(pathToFileURL(path.join(root, 'apps/web/demo/poc/domain/content-only.ts')));
const { compareCheckpointProjections } = await import(pathToFileURL(path.join(root, 'apps/web/demo/poc/replay/checkpoint.ts')));
const { isContentPackageInput } = await import(pathToFileURL(path.join(root, 'apps/web/demo/poc/api/scenario-source.ts')));
const dir = path.join(root, 'content-inbox/web-chatgpt-prepared/a8d1ef5f54da/scent-layering/1.1.0');
const names = ['manifest', 'brand', 'discovery', 'analysis', 'script', 'video', 'delivery', 'events', 'assets', 'expected'];
const files = Object.fromEntries(names.map(name => [name, JSON.parse(readFileSync(path.join(dir, `${name}.json`), 'utf8'))]));
assert.ok(isContentPackageInput(files), 'Actual browser loader rejects input shape');
assert.equal(files.brand.data.products.length, 1);
const productId = 'scn-scent-layering.product.serenity';
assert.equal(files.brand.data.products[0].id, productId);
for (const brief of files.analysis.data.briefs) assert.deepEqual(brief.productIds, [productId]);
const subtitleResults = [];
for (const version of files.script.data.versions) {
  assert.equal(version.version, 2);
  assert.equal(version.id, `scn-scent-layering.script.${version.language}-v2`);
  assert.equal(version.durationMs, 15000);
  assert.equal(version.shots.length, 4);
  let end = 0;
  for (const shot of version.shots) {
    assert.equal(shot.startMs, end);
    end += shot.durationMs;
    for (const id of shot.assetIds) {
      const asset = files.assets.data.assets.find(a => a.id === id);
      assert.ok(asset && typeof asset.bytes === 'number');
      if (asset.kind !== 'logo') assert.deepEqual(asset.productIds, [productId]);
    }
  }
  assert.equal(end, 15000);
  const asset = files.assets.data.assets.find(a => a.id === `scn-scent-layering.asset.vtt-${version.language}-v2`);
  const parsed = parseVtt(readFileSync(path.join(dir, 'media', path.basename(asset.uri)), 'utf8'), 15000);
  assert.deepEqual(parsed.issues, []);
  assert.deepEqual(parsed.cues, version.subtitles.map(({ startMs, endMs, text }) => ({ startMs, endMs, text })));
  subtitleResults.push({ language: version.language, scriptId: version.id, cueCount: parsed.cues.length, exactTextAndTimingMatch: true, shotDurationMs: end });
}
assert.equal(subtitleResults.length, 2);
const events = files.events.data.events;
events.forEach((event, index) => {
  assert.equal(event.scenarioVersion, '1.1.0');
  assert.equal(event.sequence, index + 1);
  assert.equal(event.mode, 'mock');
  if (index > 0) assert.ok(event.atMs >= events[index - 1].atMs);
});
const endSequence = events.find(e => e.stage === 'analysis' && e.type === 'stage.completed').sequence;
const checkpoints = files.expected.data.checkpoints.filter(c => c.cursorSequence <= endSequence);
const replay = compareCheckpointProjections(adaptContentOnlyPackage(files), events.filter(e => e.sequence <= endSequence), checkpoints);
assert.ok(replay.ok, JSON.stringify(replay.issues));
const report = {
  checkedAt: new Date().toISOString(),
  browserLoaderShape: 'pass',
  scenarioVersion: '1.1.0',
  soleProduct: productId,
  scriptAndVtt: subtitleResults,
  orderedMockEvents: events.length,
  replay: { prefixEnd: endSequence, checkpoints: checkpoints.map(c => c.cursorSequence), ...replay },
  futureVideoDeliveryReplay: 'not_run; outside content-only runtime',
  retainedLegacyRunKeyLabels: [...new Set(events.map(e => e.runKey).filter(k => k.includes('1.0.0')))],
  runKeyNote: 'Author label retained; authoritative scenarioVersion is 1.1.0 on every event. Do not use runKey as a cross-package storage key.',
  productBrowserAcceptance: 'not_run; binding is DSH AS-003 work',
  pass: true,
};
writeFileSync(path.join(root, 'evidence/product/assets/as-003/intake-a8d1ef5f54da/semantic-media-replay.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
