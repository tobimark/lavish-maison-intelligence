import { describe, expect, test } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createMockApi } from '../../apps/web/demo/poc/api';
import type { ApiResult, LoadedScenario, ScenarioListItem, ScenarioSource } from '../../apps/web/demo/poc/api';
import { adaptContentOnlyPackage, type ContentPackageInput } from '../../apps/web/demo/poc/domain';
import { MemoryStorage } from '../../apps/web/demo/poc/storage';

const ROOT = path.resolve(process.cwd(), 'apps', 'web', 'public');
const NOW = '2026-11-05T00:00:00.000Z';
const FILES = ['manifest', 'brand', 'discovery', 'analysis', 'script', 'video', 'delivery', 'events', 'assets', 'expected'] as const;
const catalog = JSON.parse(readFileSync(path.join(ROOT, 'content-scenarios', 'catalog.json'), 'utf8')) as {
  items: Array<{ scenarioId: string; title: string; scenarioVersion: string; packageHash: string; packagePath: string; profile: 'content_only'; readiness: 'content_ready'; mediaStatus: 'deferred' }>;
};

function load(slug: string): LoadedScenario {
  const base = path.join(ROOT, 'content-scenarios', slug, '1.0.0');
  const files = Object.fromEntries(FILES.map((name) => [name, JSON.parse(readFileSync(path.join(base, `${name}.json`), 'utf8'))])) as unknown as ContentPackageInput;
  const media: Record<string, Uint8Array> = {};
  for (const asset of files.assets.data.assets) {
    if (typeof asset.bytes !== 'number') continue;
    media[asset.id] = new Uint8Array(readFileSync(path.join(ROOT, asset.uri.replace(/^\//, ''))));
  }
  const entry = catalog.items.find((item) => item.packagePath.includes(`/${slug}/`));
  return { scenarioId: files.manifest.scenarioId, scenarioVersion: files.manifest.scenarioVersion, packageHash: entry?.packageHash ?? 'missing', package: adaptContentOnlyPackage(files), media, profile: 'content_only', contentPackage: files };
}

function source(): ScenarioSource {
  const items: ScenarioListItem[] = catalog.items.map((item) => ({ ...item, issues: [] }));
  return {
    async list() { return items; },
    async get(scenarioId) {
      const item = catalog.items.find((candidate) => candidate.scenarioId === scenarioId);
      return item ? load(item.packagePath.split('/')[2]) : null;
    },
  };
}

function unwrap<T>(result: ApiResult<T>): T {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}

function readZip(bytes: Uint8Array): Map<string, Uint8Array> {
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

describe('AS-005 bilingual campaign pack', () => {
  test('builds a real EN+AR pack with matching versions and no fake video when content is unbound', async () => {
    const api = createMockApi({ scenarioSource: source(), storage: new MemoryStorage(), now: () => NOW, virtualNow: () => 0 });
    const campaign = unwrap(await api.getCampaign({ campaignId: 'scn-scent-layering.brief.main' }));
    const presets = campaign.versions.filter((version) => version.origin === 'preset');
    expect(new Set(presets.map((version) => version.language))).toEqual(new Set(['en', 'ar']));
    const refs = presets.map((version) => ({ campaignId: version.campaignId, versionId: version.versionId, sessionId: version.sessionId, scenarioVersion: campaign.campaign.scenarioVersion }));
    const prepared = unwrap(await api.exportCampaignPack({ campaignId: campaign.campaign.campaignId, versions: refs, includeProvidedAssets: false, idempotencyKey: 'bilingual-1' }));
    expect(prepared.record.kind).toBe('provided_asset_campaign_pack');
    expect(prepared.record.includedVersions).toHaveLength(2);
    expect(prepared.record.noVideo).toBe(true);
    expect(prepared.record.providedAssetIds).toEqual([]);
    expect(prepared.record.archiveFilename).toMatch(/campaign-pack\.zip$/);
    const entries = readZip(prepared.download.blob);
    expect(entries.has('en/script.json')).toBe(true);
    expect(entries.has('ar/script.json')).toBe(true);
    expect(entries.has('en/subtitles-en.vtt')).toBe(true);
    expect(entries.has('ar/subtitles-ar.vtt')).toBe(true);
    expect([...entries.keys()].some((name) => name.endsWith('.mp4'))).toBe(false);
    const exportJson = JSON.parse(new TextDecoder().decode(entries.get('EXPORT.json'))) as { noVideo: boolean; includedVersions: unknown[]; attachments: Array<{ filename: string; sha256: string }> };
    expect(exportJson.noVideo).toBe(true);
    expect(exportJson.includedVersions).toHaveLength(2);
    for (const attachment of exportJson.attachments) {
      const bytes = entries.get(attachment.filename);
      expect(bytes, attachment.filename).toBeTruthy();
      expect(createHash('sha256').update(Buffer.from(bytes!)).digest('hex')).toBe(attachment.sha256);
    }
    const listed = unwrap(await api.listCampaignPackExports({ campaignId: campaign.campaign.campaignId }));
    expect(listed.items).toHaveLength(1);
    const redownload = unwrap(await api.getCampaignPackExport({ exportId: prepared.record.id }));
    expect(Buffer.from(redownload.download.blob).equals(Buffer.from(prepared.download.blob))).toBe(true);
    const marked = unwrap(await api.markCampaignPackExportTriggered({ exportId: prepared.record.id }));
    expect(marked.status).toBe('download_triggered');
  });

  test('rejects a version from another campaign and does not create a pack', async () => {
    const api = createMockApi({ scenarioSource: source(), storage: new MemoryStorage(), now: () => NOW, virtualNow: () => 0 });
    const a = unwrap(await api.getCampaign({ campaignId: 'scn-scent-layering.brief.main' }));
    const b = unwrap(await api.getCampaign({ campaignId: 'scn-luxury-gifting.brief.main' }));
    const wrong = { campaignId: b.campaign.campaignId, versionId: b.versions[0].versionId, sessionId: null, scenarioVersion: b.campaign.scenarioVersion };
    const result = await api.exportCampaignPack({ campaignId: a.campaign.campaignId, versions: [wrong], includeProvidedAssets: false, idempotencyKey: 'wrong-campaign' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_INPUT');
    expect(unwrap(await api.listCampaignPackExports())).toEqual({ items: [] });
  });
});
