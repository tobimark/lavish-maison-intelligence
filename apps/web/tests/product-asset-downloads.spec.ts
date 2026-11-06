import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const EVIDENCE = process.env.EVIDENCE_ROOT
  ? path.resolve(process.env.EVIDENCE_ROOT)
  : path.resolve(process.cwd(), 'evidence', 'product', 'workspace-integration', 'ws-003', 'downloads');
const A_CAMPAIGN = 'scn-scent-layering.brief.main';
const B_CAMPAIGN = 'scn-luxury-gifting.brief.main';
const PROVIDED = {
  hero: { bytes: 2513070, sha256: '1c4e337ba0bed4c2fab0da2cd7fd2fa8d3e8929015923ba23c8353caa0b37499' },
  identity: { bytes: 538290, sha256: 'f75fa10b2d4fc33df4beb6391895bb8c60cfafc1091de28b1f49f7e9d026af62' },
  video: { bytes: 1315394, sha256: '15d3756a0e93f591fc767998d84911ed425e3394554272f62120d61f0e31e10e' },
};

function unzip(bytes: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = new Map<string, Uint8Array>();
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const compressed = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLength));
    const start = offset + 30 + nameLength + extraLength;
    entries.set(name, bytes.slice(start, start + compressed));
    offset = start + compressed;
  }
  return entries;
}

function sha(bytes: Uint8Array): string {
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
}

async function download(page: Page, trigger: () => Promise<void>, filename: string): Promise<Buffer> {

  const pending = page.waitForEvent('download');
  await trigger();
  const download = await pending;
  const file = path.join(EVIDENCE, filename);
  await download.saveAs(file);
  return readFileSync(file);
}

async function showDownloads(page: Page) {
  const details = page.getByTestId('deliverables-downloads');
  await expect(details).toBeVisible();
  if (!(await details.evaluate((element) => element.hasAttribute('open')))) {
    await details.locator('summary').first().click();
    await expect(details).toHaveAttribute('open', '');
  }
}

test.describe('AS-005 · campaign pack with supplied video', () => {
  test.setTimeout(120_000);

  test('A 1.1.0 bilingual pack contains real versions, hero, identity and original MP4 with noVideo=false', async ({ page }) => {
    mkdirSync(EVIDENCE, { recursive: true });
    await page.goto('/deliverables', { waitUntil: 'load' });
    await showDownloads(page);
    await expect(page.getByTestId('DEL-bilingual')).toBeVisible();
    const zipBytes = await download(page, () => page.getByTestId('DEL-bilingual').click(), 'a-1.1.0-en-ar-pack.zip');
    expect(zipBytes.subarray(0, 2).toString('latin1')).toBe('PK');
    const entries = unzip(zipBytes);
    for (const name of [
      'en/script.json', 'en/brief.json', 'en/storyboard.html', 'en/subtitles-en.vtt',
      'ar/script.json', 'ar/brief.json', 'ar/storyboard.html', 'ar/subtitles-ar.vtt',
      'provided/hero-serenity.png', 'provided/product-serenity.png', 'provided/final-preview.mp4',
      'README.txt', 'EXPORT.json',
    ]) {
      expect(entries.has(name), `missing ZIP entry ${name}`).toBe(true);
    }
    const exportJson = JSON.parse(new TextDecoder().decode(entries.get('EXPORT.json'))) as {
      noVideo: boolean;
      noRealEmail: boolean;
      providedAssetSetId: string | null;
      providedAssetIds: string[];
      includedVersions: Array<{ scenarioVersion: string; versionId: string }>;
      attachments: Array<{ filename: string; bytes: number; sha256: string }>;
    };
    expect(exportJson.noVideo).toBe(false);
    expect(exportJson.noRealEmail).toBe(true);
    expect(exportJson.providedAssetSetId).toBe('provided.scent-layering.serenity-v1');
    expect(exportJson.providedAssetIds).toHaveLength(3);
    expect(exportJson.includedVersions).toHaveLength(2);
    expect(exportJson.includedVersions.every((version) => version.scenarioVersion === '1.1.0')).toBe(true);
    expect(exportJson.includedVersions.map((version) => version.versionId).sort()).toEqual(['scn-scent-layering.script.ar-v2', 'scn-scent-layering.script.en-v2']);

    const hero = entries.get('provided/hero-serenity.png')!;
    const identity = entries.get('provided/product-serenity.png')!;
    const video = entries.get('provided/final-preview.mp4')!;
    expect(hero.byteLength).toBe(PROVIDED.hero.bytes);
    expect(sha(hero)).toBe(PROVIDED.hero.sha256);
    expect(identity.byteLength).toBe(PROVIDED.identity.bytes);
    expect(sha(identity)).toBe(PROVIDED.identity.sha256);
    expect(video.byteLength).toBe(PROVIDED.video.bytes);
    expect(sha(video)).toBe(PROVIDED.video.sha256);

    for (const attachment of exportJson.attachments) {
      const entry = entries.get(attachment.filename);
      expect(entry, `attachment ${attachment.filename} missing from ZIP`).toBeTruthy();
      expect(entry!.byteLength).toBe(attachment.bytes);
      expect(sha(entry!)).toBe(attachment.sha256);
    }
    const summary = {
      checkedAt: new Date().toISOString(),
      archive: 'a-1.1.0-en-ar-pack.zip',
      archiveBytes: zipBytes.byteLength,
      entries: [...entries.keys()].sort(),
      noVideo: exportJson.noVideo,
      providedAssetIds: exportJson.providedAssetIds,
      includedVersions: exportJson.includedVersions,
      providedHashes: { hero: sha(hero), identity: sha(identity), video: sha(video) },
    };
    writeFileSync(path.join(EVIDENCE, 'a-1.1.0-pack-audit.json'), `${JSON.stringify(summary, null, 2)}\n`);
  });

  test('old 1.0.0 pack remains noVideo=true and does not borrow SERENITY assets', async ({ page }) => {
    mkdirSync(EVIDENCE, { recursive: true });
    await page.goto(`/deliverables?campaignId=${B_CAMPAIGN}`, { waitUntil: 'load' });
    await showDownloads(page);
    await expect(page.getByTestId('DEL-bilingual')).toBeVisible();
    const zipBytes = await download(page, () => page.getByTestId('DEL-bilingual').click(), 'b-1.0.0-pack.zip');
    const entries = unzip(zipBytes);
    expect([...entries.keys()].some((name) => name.endsWith('.mp4'))).toBe(false);
    expect([...entries.keys()].some((name) => name.startsWith('provided/'))).toBe(false);
    const exportJson = JSON.parse(new TextDecoder().decode(entries.get('EXPORT.json'))) as {
      noVideo: boolean;
      includedVersions: Array<{ scenarioVersion: string }>;
      providedAssetIds: string[];
    };
    expect(exportJson.noVideo).toBe(true);
    expect(exportJson.includedVersions.length).toBeGreaterThan(0);
    expect(exportJson.includedVersions.every((version) => version.scenarioVersion === '1.0.0')).toBe(true);
    expect(exportJson.providedAssetIds).toEqual([]);
    writeFileSync(path.join(EVIDENCE, 'b-1.0.0-pack-audit.json'), `${JSON.stringify({ checkedAt: new Date().toISOString(), archive: 'b-1.0.0-pack.zip', archiveBytes: zipBytes.byteLength, entries: [...entries.keys()].sort(), noVideo: exportJson.noVideo, includedVersions: exportJson.includedVersions }, null, 2)}\n`);
  });

  test('independent Download video yields the original 1,315,394-byte MP4 with matching SHA-256', async ({ page }) => {
    mkdirSync(EVIDENCE, { recursive: true });
    await page.goto('/deliverables', { waitUntil: 'load' });
    await showDownloads(page);
    const mp4 = await download(page, () => page.getByTestId('provided-video-download').click(), 'deliverables-provided-final-preview.mp4');
    expect(mp4.byteLength).toBe(PROVIDED.video.bytes);
    expect(createHash('sha256').update(mp4).digest('hex')).toBe(PROVIDED.video.sha256);
    writeFileSync(path.join(EVIDENCE, 'video-download-audit.json'), `${JSON.stringify({ checkedAt: new Date().toISOString(), bytes: mp4.byteLength, sha256: createHash('sha256').update(mp4).digest('hex') }, null, 2)}\n`);
  });
});
