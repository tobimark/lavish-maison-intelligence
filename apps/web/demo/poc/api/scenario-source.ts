import type { LoadedScenario, ScenarioListItem, ScenarioSource } from './types';
import { adaptContentOnlyPackage, type ContentPackageInput, type ContentProfile } from '../domain/content-only';

export interface CatalogScenarioSourceOptions {
  /** URL of the approved scenario catalog published under apps/web/public. */
  catalogUrl?: string;
  /** Optional approved package loader; in the content-not-received state it returns null. */
  loadPackage?: (scenarioId: string, scenarioVersion: string) => Promise<LoadedScenario | null>;
}

interface CatalogItem {
  scenarioId?: unknown;
  title?: unknown;
  scenarioVersion?: unknown;
  readiness?: unknown;
  profile?: unknown;
  mediaStatus?: unknown;
  packagePath?: unknown;
  issues?: unknown;
}

type ContentCatalogEntry = {
  scenarioId: string;
  title: string;
  scenarioVersion: string;
  packageHash: string;
  packagePath: string;
  profile: 'content_only';
  readiness: 'content_ready';
  mediaStatus: 'deferred';
};

const DATA_FILES = ['manifest', 'brand', 'discovery', 'analysis', 'script', 'video', 'delivery', 'events', 'assets', 'expected'] as const;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isFileRoot(value: unknown, name: string): value is UnknownRecord {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== '1.0.0') return false;
  if (!isString(value.scenarioId) || !isString(value.scenarioVersion)) return false;
  return name === 'manifest' ? !('data' in value) : isRecord(value.data);
}

/**
 * Boundary guard for the approved content-only package shape. This checks the
 * fields this client actually consumes, including that pending media can only
 * be video/poster and that a received logo exists. It is deliberately not a
 * replacement for the build-time Schema/semantic validator.
 */
export function isContentPackageInput(value: unknown): value is ContentPackageInput {
  if (!isRecord(value)) return false;
  if (!DATA_FILES.every((name) => isFileRoot(value[name], name))) return false;
  const roots = DATA_FILES.map((name) => value[name] as UnknownRecord);
  const first = roots[0];
  if (roots.some((root) => root.scenarioId !== first.scenarioId || root.scenarioVersion !== first.scenarioVersion)) return false;
  const manifest = first;
  if (!isString(manifest.title) || !isString(manifest.slug)) return false;
  if (!isString(manifest.entryBriefId) || !isString(manifest.entryScriptVersionId) || !isString(manifest.entryVideoId) || !isString(manifest.entryDeliveryId)) return false;

  const dataOf = (name: (typeof DATA_FILES)[number]) => (value[name] as UnknownRecord).data as UnknownRecord;
  const brand = dataOf('brand');
  const discovery = dataOf('discovery');
  const analysis = dataOf('analysis');
  const script = dataOf('script');
  const video = dataOf('video');
  const delivery = dataOf('delivery');
  const events = dataOf('events');
  const assets = dataOf('assets');
  const expected = dataOf('expected');
  if (!isRecord(brand.brand) || !isArray(brand.products)) return false;
  if (!isArray(discovery.evidence) || !isArray(discovery.signals) || !isArray(discovery.trends)) return false;
  if (!isArray(analysis.analyses) || !isArray(analysis.briefs)) return false;
  if (!isArray(script.versions) || script.versions.length === 0) return false;
  if (!isArray(video.videos) || video.videos.length === 0) return false;
  if (!isArray(delivery.recipients) || !isArray(delivery.plans) || !isArray(delivery.records)) return false;
  if (!isArray(events.events) || !isArray(assets.assets) || assets.assets.length === 0) return false;
  if (!isArray(expected.checkpoints) || expected.checkpoints.length === 0) return false;

  let realLogo = false;
  for (const asset of assets.assets) {
    if (!isRecord(asset)) return false;
    if (!isString(asset.id) || !isString(asset.kind) || !isString(asset.uri) || !isString(asset.rightsStatus)) return false;
    const pending = asset.bytes === null || asset.sha256 === null;
    if (pending) {
      if (asset.bytes !== null || asset.sha256 !== null) return false;
      if (asset.kind !== 'video' && asset.kind !== 'poster') return false;
      if (asset.rightsStatus !== 'pending') return false;
      continue;
    }
    if (typeof asset.bytes !== 'number' || !isString(asset.sha256)) return false;
    if (asset.kind === 'logo') realLogo = true;
  }
  return realLogo;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Content-only package file is unavailable (${response.status}): ${url}`);
  return response.json();
}

async function loadContentOnlyPackage(entry: ContentCatalogEntry): Promise<LoadedScenario> {
  const base = entry.packagePath.replace(/\/$/, '');
  const files: Record<string, unknown> = {};
  await Promise.all(
    DATA_FILES.map(async (name) => {
      files[name] = await fetchJson(`${base}/${name}.json`);
    }),
  );
  if (!isContentPackageInput(files)) {
    throw new Error('Content-only package failed structural input checks; it was not adapted or rendered.');
  }
  const contentPackage = files;
  const packageView = adaptContentOnlyPackage(contentPackage);
  const media: Record<string, Uint8Array> = {};
  for (const asset of contentPackage.assets.data.assets) {
    if (typeof asset.bytes !== 'number' || typeof asset.sha256 !== 'string') continue;
    const response = await fetch(asset.uri, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Approved media is unavailable (${response.status}): ${asset.uri}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    media[asset.id] = bytes;
  }
  return {
    scenarioId: entry.scenarioId,
    scenarioVersion: entry.scenarioVersion,
    packageHash: entry.packageHash,
    package: packageView,
    media,
    profile: 'content_only',
    contentPackage,
  };
}

/**
 * Browser scenario source backed by the approved catalog only. It never reads
 * test fixtures and never fabricates package contents.
 */
export function createCatalogScenarioSource(options: CatalogScenarioSourceOptions = {}): ScenarioSource {
  const catalogUrl = options.catalogUrl ?? '/content-scenarios/catalog.json';
  let cached: ScenarioListItem[] | null = null;

  async function loadCatalog(): Promise<ScenarioListItem[]> {
    if (cached) return cached;
    const response = await fetch(catalogUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Scenario catalog is unavailable (HTTP ${response.status}).`);
    const payload = (await response.json()) as { items?: unknown };
    const items = Array.isArray(payload.items) ? payload.items : [];
    cached = items
      .filter((item): item is CatalogItem => Boolean(item) && typeof item === 'object')
      .map((item) => {
        const rawReadiness = item.readiness;
        const readiness: ScenarioListItem['readiness'] =
          rawReadiness === 'ready' || rawReadiness === 'invalid' || rawReadiness === 'content_ready'
            ? rawReadiness
            : 'awaiting_content';
        const profile: ContentProfile = item.profile === 'content_only' ? 'content_only' : 'complete';
        const mediaStatus: ScenarioListItem['mediaStatus'] =
          item.mediaStatus === 'deferred' || item.mediaStatus === 'available' || item.mediaStatus === 'missing'
            ? item.mediaStatus
            : undefined;
        return {
          scenarioId: typeof item.scenarioId === 'string' ? item.scenarioId : '',
          title: typeof item.title === 'string' ? item.title : 'Untitled scenario',
          scenarioVersion: typeof item.scenarioVersion === 'string' ? item.scenarioVersion : null,
          readiness,
          profile,
          mediaStatus,
          issues: Array.isArray(item.issues)
            ? item.issues
                .filter((issue): issue is string => typeof issue === 'string')
                .map((message) => ({ path: '', message }))
            : [],
        };
      })
      .filter((item) => item.scenarioId.length > 0);
    return cached;
  }

  return {
    async list() {
      return loadCatalog();
    },
    async get(scenarioId, scenarioVersion) {
      if (options.loadPackage) return options.loadPackage(scenarioId, scenarioVersion);
      const entries = await loadCatalog();
      const listItem = entries.find((entry) => entry.scenarioId === scenarioId && entry.scenarioVersion === scenarioVersion);
      if (!listItem || listItem.readiness !== 'content_ready' || listItem.profile !== 'content_only') return null;
      const payload = (await fetchJson(catalogUrl)) as { items?: ContentCatalogEntry[] };
      const entry = Array.isArray(payload.items)
        ? payload.items.find(
            (candidate) =>
              candidate.scenarioId === scenarioId
              && candidate.scenarioVersion === scenarioVersion
              && candidate.profile === 'content_only'
              && typeof candidate.packagePath === 'string',
          )
        : undefined;
      return entry ? loadContentOnlyPackage(entry) : null;
    },
  };
}
