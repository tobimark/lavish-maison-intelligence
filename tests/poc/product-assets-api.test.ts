import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createMockApi } from '../../apps/web/demo/poc/api';
import type {
  ApiResult,
  LoadedScenario,
  ScenarioListItem,
  ScenarioSource,
} from '../../apps/web/demo/poc/api';
import type { AssetAwareMockApi, AssetLibraryItem } from '../../apps/web/demo/poc/api/provided-asset-contract';
import { createProvidedAssetSource } from '../../apps/web/demo/poc/api/provided-asset-source';
import { adaptContentOnlyPackage, type ContentPackageInput } from '../../apps/web/demo/poc/domain';
import { MemoryStorage } from '../../apps/web/demo/poc/storage';

const NOW = '2026-11-05T00:00:00.000Z';
const ROOT = path.resolve(process.cwd(), 'apps', 'web', 'public');
const SLUGS = ['scent-layering', 'luxury-gifting', 'oud-storytelling'] as const;
const NAMES = ['manifest', 'brand', 'discovery', 'analysis', 'script', 'video', 'delivery', 'events', 'assets', 'expected'] as const;
const A_CAMPAIGN = 'scn-scent-layering.brief.main';
const A_VERSION = '1.1.0';

interface CatalogItem {
  scenarioId: string;
  title: string;
  scenarioVersion: string;
  packageHash: string;
  packagePath: string;
  profile: 'content_only';
  readiness: 'content_ready';
  mediaStatus: 'deferred';
}

function catalog(): { items: CatalogItem[] } {
  return JSON.parse(readFileSync(path.join(ROOT, 'content-scenarios', 'catalog.json'), 'utf8')) as { items: CatalogItem[] };
}

function loadPackage(slug: string): LoadedScenario {
  const base = path.join(ROOT, 'content-scenarios', slug, '1.0.0');
  const files = Object.fromEntries(
    NAMES.map((name) => [name, JSON.parse(readFileSync(path.join(base, `${name}.json`), 'utf8'))]),
  ) as unknown as ContentPackageInput;
  const media: Record<string, Uint8Array> = {};
  for (const asset of files.assets.data.assets) {
    if (typeof asset.bytes !== 'number') continue;
    media[asset.id] = new Uint8Array(readFileSync(path.join(ROOT, asset.uri.replace(/^\//, ''))));
  }
  const entry = catalog().items.find((item) => item.packagePath.includes(`/${slug}/`));
  return {
    scenarioId: files.manifest.scenarioId,
    scenarioVersion: files.manifest.scenarioVersion,
    packageHash: entry?.packageHash ?? 'missing-hash',
    package: adaptContentOnlyPackage(files),
    media,
    profile: 'content_only',
    contentPackage: files,
  };
}

function makeSource(): ScenarioSource {
  const items: ScenarioListItem[] = catalog().items.map((item) => ({
    scenarioId: item.scenarioId,
    title: item.title,
    scenarioVersion: item.scenarioVersion,
    readiness: item.readiness,
    profile: item.profile,
    mediaStatus: item.mediaStatus,
    issues: [],
  }));
  const loaded = new Map(SLUGS.map((slug) => [slug, loadPackage(slug)]));
  return {
    async list() { return items; },
    async get(scenarioId) {
      const item = catalog().items.find((candidate) => candidate.scenarioId === scenarioId);
      if (!item) return null;
      const slug = item.packagePath.split('/')[2];
      return loaded.get(slug as (typeof SLUGS)[number]) ?? null;
    },
  };
}

function mapping() {
  return JSON.parse(readFileSync(path.join(ROOT, 'presentation-assets', 'scent-layering.json'), 'utf8'));
}

function makeProvidedSource(active = true) {
  const set = mapping();
  return createProvidedAssetSource({
    loadAssetSet: () => (active ? set : null),
    loadBytes: async (asset) => new Uint8Array(readFileSync(path.join(ROOT, asset.uri.replace(/^\//, '')))),
  });
}

function createApi(options: { provided?: boolean } = {}): { api: AssetAwareMockApi; storage: MemoryStorage } {
  const storage = new MemoryStorage();
  const api = createMockApi({
    scenarioSource: makeSource(),
    storage,
    now: () => NOW,
    virtualNow: () => 0,
    ...(options.provided === false ? {} : { providedAssetSource: makeProvidedSource() }),
  });
  return { api, storage };
}

function unwrap<T>(result: ApiResult<T>): T {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}

describe('AS-002 · provided asset source and MockApi', () => {
  test('A returns the provided sidecar set with real hashes and awaiting content status', async () => {
    const { api } = createApi();
    const set = unwrap(await api.getProvidedAssets({ campaignId: A_CAMPAIGN, scenarioVersion: A_VERSION }));
    expect(set).not.toBeNull();
    expect(set?.contentStatus).toBe('awaiting_serenity_content');
    expect(set?.scenarioVersion).toBe('1.1.0');
    expect(set?.product.officialName).toBe('SERENITY');
    expect(set?.product.id).toBe('scn-scent-layering.product.serenity');
    expect(set?.assets).toHaveLength(3);
    expect(set?.assets.map((asset) => asset.type).sort()).toEqual(['final_preview_video', 'hero_image', 'product_original_image']);
    for (const asset of set?.assets ?? []) {
      expect(asset.source).toBe('user_provided');
      expect(asset.rightsScope).toBe('internal_demo');
      expect(asset.productId).toBe(set?.product.id);
      expect(readFileSync(path.join(ROOT, asset.uri.replace(/^\//, ''))).length).toBe(asset.bytes);
    }
  });

  test('rejects wrong campaign/version and tolerates no provided set for B/C', async () => {
    const { api } = createApi();
    expect(unwrap(await api.getProvidedAssets({ campaignId: 'scn-luxury-gifting.brief.main', scenarioVersion: A_VERSION }))).toBeNull();
    expect(unwrap(await api.getProvidedAssets({ campaignId: A_CAMPAIGN, scenarioVersion: '1.0.0' }))).toBeNull();
    expect(unwrap(await api.getProvidedAssets({ campaignId: 'scn-oud-storytelling.brief.main', scenarioVersion: '1.0.0' }))).toBeNull();
    const noAssets = createApi({ provided: false });
    expect(unwrap(await noAssets.api.getProvidedAssets({ campaignId: A_CAMPAIGN, scenarioVersion: A_VERSION }))).toBeNull();
    const library = unwrap(await noAssets.api.listLibraryItems());
    expect(library.items.some((item) => item.version === null)).toBe(false);
  });

  test('downloads the real MP4 and images with matching bytes and SHA-256 without creating sessions', async () => {
    const { api, storage } = createApi();
    const set = unwrap(await api.getProvidedAssets({ campaignId: A_CAMPAIGN, scenarioVersion: A_VERSION }));
    for (const asset of set?.assets ?? []) {
      const beforeSessions = unwrap(await api.listSessions()).items.length;
      const download = unwrap(await api.getProvidedAssetDownload({ campaignId: A_CAMPAIGN, scenarioVersion: A_VERSION, assetId: asset.id }));
      expect(download.bytes).toBe(asset.bytes);
      expect(download.sha256).toBe(asset.sha256);
      expect(download.mimeType).toBe(asset.mimeType);
      expect(download.blob.byteLength).toBe(asset.bytes);
      expect(download.filename.endsWith(asset.mimeType === 'video/mp4' ? '.mp4' : '.png')).toBe(true);
      expect(unwrap(await api.listSessions()).items.length).toBe(beforeSessions);
    }
    expect(unwrap(await api.getOverview()).recentExports).toEqual([]);
    expect((await storage.listProductExports?.()) ?? []).toEqual([]);
  });

  test('rejects unknown asset ids and mismatched campaign/version downloads', async () => {
    const { api } = createApi();
    const missing = await api.getProvidedAssetDownload({ campaignId: A_CAMPAIGN, scenarioVersion: A_VERSION, assetId: 'provided.unknown' });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.code).toBe('NOT_FOUND');
    const wrongVersion = await api.getProvidedAssetDownload({ campaignId: A_CAMPAIGN, scenarioVersion: '1.0.0', assetId: 'provided.scent-layering.hero-serenity' });
    expect(wrongVersion.ok).toBe(false);
    if (!wrongVersion.ok) expect(wrongVersion.error.code).toBe('NOT_FOUND');
  });

  test('listLibraryItems returns the script/storyboard union plus three provided assets without fake version ids', async () => {
    const { api } = createApi();
    const items = unwrap(await api.listLibraryItems()).items;
    const scripts = items.filter((item) => item.kind === 'script' || item.kind === 'storyboard');
    const provided = items.filter((item) => item.version === null);
    expect(scripts).toHaveLength(12);
    expect(provided).toHaveLength(3);
    expect(provided.map((item) => item.kind).sort()).toEqual(['final_preview_video', 'hero_image', 'product_original_image']);
    for (const item of provided) {
      expect(item.version).toBeNull();
      expect(item.campaign.campaignId).toBe(A_CAMPAIGN);
      expect(item.asset.bytes).toBeGreaterThan(0);
      expect(item.exportIds).toEqual([]);
    }
  });

  test('listLibraryItems filters by exact kind/campaign/query and keeps script items intact', async () => {
    const { api } = createApi();
    const onlyVideo = unwrap(await api.listLibraryItems({ kind: 'final_preview_video' })).items;
    expect(onlyVideo).toHaveLength(1);
    expect(onlyVideo[0].asset.id).toBe('provided.scent-layering.final-preview');
    expect((onlyVideo[0] as AssetLibraryItem).kind).toBe('final_preview_video');
    const noAssets = unwrap(await api.listLibraryItems({ campaignId: 'scn-oud-storytelling.brief.main' })).items;
    expect(noAssets.filter((item) => item.version === null)).toEqual([]);
    const query = unwrap(await api.listLibraryItems({ query: 'product' })).items;
    expect(query.some((item) => item.version === null && item.kind === 'product_original_image')).toBe(true);
    const savedOrigin = unwrap(await api.listLibraryItems({ origin: 'saved' })).items;
    expect(savedOrigin.filter((item) => item.version === null)).toEqual([]);
  });

  test('reading provided assets is side-effect free: no sessions, confirmations or export records', async () => {
    const { api } = createApi();
    unwrap(await api.getProvidedAssets({ campaignId: A_CAMPAIGN, scenarioVersion: A_VERSION }));
    unwrap(await api.listLibraryItems({ campaignId: A_CAMPAIGN }));
    expect(unwrap(await api.listSessions()).items).toEqual([]);
    expect(unwrap(await api.getOverview()).recentExports).toEqual([]);
    expect(unwrap(await api.listDeliverables()).exports).toEqual([]);
  });

  test('campaign pack export placeholders do not fake success before AS-005', async () => {
    const { api } = createApi();
    const result = await api.exportCampaignPack({
      campaignId: A_CAMPAIGN,
      versions: [{
        campaignId: A_CAMPAIGN,
        scenarioVersion: A_VERSION,
        versionId: 'scn-scent-layering.script.en-v1',
        sessionId: null,
      }],
      includeProvidedAssets: true,
      idempotencyKey: 'as-002-placeholder',
    });
    expect(result.ok).toBe(false);
    expect(unwrap(await api.listCampaignPackExports()).items).toEqual([]);
  });
});
