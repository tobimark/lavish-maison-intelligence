import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// @ts-expect-error -- plain ESM validator deliberately has no TypeScript declarations
import * as validator from '../../scripts/poc/validate-provided-assets.mjs';

const ROOT = process.cwd();
const MAPPING_PATH = path.join(ROOT, 'design/presentation-assets/scent-layering.json');
const PUBLIC_MAPPING_PATH = path.join(ROOT, 'apps/web/public/presentation-assets/scent-layering.json');
const RECEIPT_PATH = path.join(ROOT, 'evidence/brand/provided-serenity-assets-receipt.json');
const PUBLIC_ROOT = path.join(ROOT, 'apps/web/public');
const SOURCE_ROOT = path.join(ROOT, 'assets/provided/scent-layering/1.0.0');

const mapping = JSON.parse(readFileSync(MAPPING_PATH, 'utf8'));
const receipt = JSON.parse(readFileSync(RECEIPT_PATH, 'utf8'));
const readFile = (file: string) => readFileSync(file);

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

function validate(mutator?: (copy: typeof mapping) => void) {
  const copy = clone(mapping);
  if (mutator) mutator(copy);
  return validator.validateMapping(copy, { root: PUBLIC_ROOT, receipt, readFile });
}

function asset(id: string) {
  return mapping.assets.find((candidate: { id: string }) => candidate.id === id);
}

describe('provided SERENITY assets', () => {
  it('keeps byte-identical published copies of the three source files', () => {
    for (const name of ['hero-serenity.png', 'product-serenity.png', 'final-preview.mp4']) {
      const source = readFileSync(path.join(SOURCE_ROOT, name));
      const published = readFileSync(path.join(PUBLIC_ROOT, 'provided-assets/scent-layering/1.0.0', name));
      expect(published.equals(source), `${name} must be byte-identical`).toBe(true);
    }
  });

  it('matches every receipt byte count and SHA-256', () => {
    expect(receipt.assets).toHaveLength(3);
    for (const receiptAsset of receipt.assets) {
      const mapped = asset(receiptAsset.id);
      expect(mapped, `mapping asset ${receiptAsset.id}`).toBeTruthy();
      expect(mapped.bytes).toBe(receiptAsset.bytes);
      expect(mapped.sha256).toBe(receiptAsset.sha256);
      const relative = mapped.uri.replace(/^\//, '');
      const published = readFileSync(path.join(PUBLIC_ROOT, relative));
      expect(published.length).toBe(receiptAsset.bytes);
      expect(validator.parsePngHeader(published).sha256 ?? validator.parseMp4(published).sha256).toBe(receiptAsset.sha256);
    }
  });

  it('publishes the sidecar unchanged and keeps contentStatus awaiting', () => {
    expect(readFileSync(PUBLIC_MAPPING_PATH).equals(readFileSync(MAPPING_PATH))).toBe(true);
    expect(mapping.contentStatus).toBe('awaiting_serenity_content');
    expect(mapping.scenarioVersion).toBe('1.1.0');
    expect(mapping.scenarioId).toBe('scn-scent-layering');
    expect(mapping.product.officialName).toBe('SERENITY');
    expect(mapping.product.id).toBe('scn-scent-layering.product.serenity');
    expect(mapping.product.identityAssetId).toBe('provided.scent-layering.product-serenity');
  });

  it('reads real PNG dimensions and refuses stretched/renamed metadata', () => {
    const hero = validator.parsePngHeader(readFileSync(path.join(PUBLIC_ROOT, 'provided-assets/scent-layering/1.0.0/hero-serenity.png')));
    const identity = validator.parsePngHeader(readFileSync(path.join(PUBLIC_ROOT, 'provided-assets/scent-layering/1.0.0/product-serenity.png')));
    expect(hero).toMatchObject({ valid: true, width: 2560, height: 1440, bytes: 2513070 });
    expect(identity).toMatchObject({ valid: true, width: 2000, height: 2000, bytes: 538290 });
    const wrong = validate((copy) => {
      copy.assets[0].metadata.width = 1920;
      copy.assets[0].metadata.height = 1080;
    });
    expect(wrong.errors.some((error: string) => error.includes('does not match metadata'))).toBe(true);
    expect(validate().errors).toEqual([]);
  });

  it('reads the real 10.08s / 720x960 / 3:4 / 24fps H.264+AAC preview', () => {
    const mp4 = validator.parseMp4(readFileSync(path.join(PUBLIC_ROOT, 'provided-assets/scent-layering/1.0.0/final-preview.mp4')));
    expect(mp4).toMatchObject({
      valid: true,
      bytes: 1315394,
      sha256: '15d3756a0e93f591fc767998d84911ed425e3394554272f62120d61f0e31e10e',
      video: { width: 720, height: 960, fps: 24, codec: 'h264' },
      audio: { codec: 'aac' },
      pixelFormat: 'yuv420p',
    });
    expect(Math.abs(mp4.durationMs - 10080)).toBeLessThanOrEqual(150);
    expect(mp4.video.width / mp4.video.height).toBeCloseTo(0.75, 3);
    expect(mp4.durationMs).not.toBe(15000);
  });

  it('rejects a 15s or 9:16 relabel of the provided preview', () => {
    const wrongDuration = validate((copy) => {
      copy.assets[2].metadata.durationMs = 15000;
    });
    expect(wrongDuration.errors.some((error: string) => error.includes('duration'))).toBe(true);
    const wrongRatio = validate((copy) => {
      copy.assets[2].metadata.width = 1080;
      copy.assets[2].metadata.height = 1920;
    });
    expect(wrongRatio.errors.some((error: string) => error.includes('3:4') || error.includes('does not match'))).toBe(true);
  });

  it('rejects bad hashes/bytes, unsafe URIs, missing roles and broken product binding', () => {
    expect(validate((copy) => { copy.assets[0].sha256 = '0'.repeat(64); }).errors.length).toBeGreaterThan(0);
    expect(validate((copy) => { copy.assets[0].bytes += 1; }).errors.length).toBeGreaterThan(0);
    expect(validate((copy) => { copy.assets[0].uri = '../escape.png'; }).errors.some((error: string) => error.includes('same-origin'))).toBe(true);
    expect(validate((copy) => { copy.assets[0].roles = []; }).errors.some((error: string) => error.includes('roles'))).toBe(true);
    expect(validate((copy) => { copy.product.identityAssetId = 'provided.scent-layering.final-preview'; }).errors.some((error: string) => error.includes('product_original_image'))).toBe(true);
    expect(validate((copy) => { copy.assets.pop(); }).errors.some((error: string) => error.includes('missing provided asset type'))).toBe(true);
  });

  it('serves the published files over HTTP with correct status, MIME, bytes and Range support', async () => {
    const checks = await validator.collectHttpChecks(mapping, PUBLIC_ROOT);
    expect(checks).toHaveLength(3);
    for (const check of checks) {
      expect(check.status).toBe(200);
      expect(check.matchesFile).toBe(true);
      expect(check.supportsRange).toBe(true);
      expect(check.rangeStatus).toBe(206);
      if (check.id.endsWith('final-preview')) expect(check.mimeType).toBe('video/mp4');
      else expect(check.mimeType).toBe('image/png');
    }
  });

  it('builds a green static report while keeping the awaiting-content warning', async () => {
    const report = await validator.buildStaticReport({
      mapping: 'design/presentation-assets/scent-layering.json',
      root: 'apps/web/public',
      receipt: 'evidence/brand/provided-serenity-assets-receipt.json',
    });
    expect(report.ok).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.contentStatus).toBe('awaiting_serenity_content');
    expect(report.assets).toHaveLength(3);
    expect(report.warnings.some((warning: string) => warning.includes('awaiting_serenity_content'))).toBe(true);
  });
});
