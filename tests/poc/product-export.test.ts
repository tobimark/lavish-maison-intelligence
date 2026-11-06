import { describe, expect, test } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createMockApi } from '../../apps/web/demo/poc/api';
import type {
  ApiResult,
  CommandContext,
  LoadedScenario,
  PreparedProductExport,
  ProductMockApi,
  ScenarioListItem,
  ScenarioSource,
} from '../../apps/web/demo/poc/api';
import { adaptContentOnlyPackage, type ContentPackageInput } from '../../apps/web/demo/poc/domain';
import { MemoryStorage } from '../../apps/web/demo/poc/storage';

const NOW = '2026-11-05T00:00:00.000Z';
const ROOT = path.resolve(process.cwd(), 'apps', 'web', 'public');
const SLUGS = ['scent-layering', 'luxury-gifting', 'oud-storytelling'] as const;
const NAMES = ['manifest', 'brand', 'discovery', 'analysis', 'script', 'video', 'delivery', 'events', 'assets', 'expected'] as const;

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
    async list() {
      return items;
    },
    async get(scenarioId) {
      const item = catalog().items.find((candidate) => candidate.scenarioId === scenarioId);
      if (!item) return null;
      const slug = item.packagePath.split('/')[2];
      return loaded.get(slug as (typeof SLUGS)[number]) ?? null;
    },
  };
}

function unwrap<T>(result: ApiResult<T>): T {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}

function createApi(storage: MemoryStorage = new MemoryStorage()): { api: ProductMockApi; storage: MemoryStorage } {
  return {
    api: createMockApi({ scenarioSource: makeSource(), storage, now: () => NOW, virtualNow: () => 0 }),
    storage,
  };
}

function ctx(session: { id: string; revision: number }, key: string): CommandContext {
  return { sessionId: session.id, expectedRevision: session.revision, idempotencyKey: key };
}

/** Store-only ZIP reader for verifying the real exported archive. */
function readZip(bytes: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = new Map<string, Uint8Array>();
  let offset = 0;
  while (offset + 30 <= bytes.length) {
    const signature = view.getUint32(offset, true);
    if (signature !== 0x04034b50) break;
    const method = view.getUint16(offset + 8, true);
    expect(method).toBe(0);
    const compressed = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLength));
    const dataStart = offset + 30 + nameLength + extraLength;
    entries.set(name, bytes.slice(dataStart, dataStart + compressed));
    offset = dataStart + compressed;
  }
  return entries;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
}

function textOf(entries: Map<string, Uint8Array>, name: string): string {
  const value = entries.get(name);
  if (!value) throw new Error(`ZIP entry ${name} is missing. Entries: ${[...entries.keys()].join(', ')}`);
  return new TextDecoder().decode(value);
}

function assertPackStructure(prepared: PreparedProductExport, language: 'en' | 'ar'): Map<string, Uint8Array> {
  const entries = readZip(prepared.download.blob);
  expect(prepared.download.blob[0]).toBe(0x50);
  expect(prepared.download.blob[1]).toBe(0x4b);
  for (const expected of ['brief.json', 'script.json', `subtitles-${language}.vtt`, 'storyboard.html', 'README.txt', 'EXPORT.json', 'media/']) {
    const matches = expected.endsWith('/')
      ? [...entries.keys()].filter((name) => name.startsWith(expected))
      : [...entries.keys()].filter((name) => name === expected);
    expect(matches.length, `missing ${expected}`).toBeGreaterThan(0);
  }
  expect([...entries.keys()].some((name) => name.endsWith('.mp4'))).toBe(false);
  const exportJson = JSON.parse(textOf(entries, 'EXPORT.json')) as {
    exportId: string;
    mode: string;
    noVideo: boolean;
    noRealEmail: boolean;
    confirmationAtExport: string;
    attachments: Array<{ filename: string; sha256: string; bytes: number }>;
  };
  expect(exportJson.exportId).toBe(prepared.record.id);
  expect(exportJson.mode).toBe('mock');
  expect(exportJson.noVideo).toBe(true);
  expect(exportJson.noRealEmail).toBe(true);
  expect(exportJson.attachments.some((attachment) => attachment.filename === 'EXPORT.json')).toBe(false);
  for (const attachment of exportJson.attachments) {
    const bytes = entries.get(attachment.filename);
    expect(bytes, `attachment ${attachment.filename}`).toBeTruthy();
    expect(sha256(bytes as Uint8Array)).toBe(attachment.sha256);
    expect((bytes as Uint8Array).byteLength).toBe(attachment.bytes);
  }
  return entries;
}

describe('IP-002 · ordinary product export', () => {
  test('preset export produces a real ZIP, needs no session/confirmation/email and persists immutable bytes', async () => {
    const { api, storage } = createApi();
    const prepared = unwrap(await api.exportScriptPack({
      campaignId: 'scn-luxury-gifting.brief.main',
      versionId: 'scn-luxury-gifting.script.en-v1',
      sessionId: null,
      idempotencyKey: 'export-b-preset',
    }));
    expect(prepared.record.status).toBe('prepared');
    expect(prepared.record.origin).toBe('preset');
    expect(prepared.record.confirmationAtExport).toBe('unconfirmed');
    expect(prepared.record.mode).toBe('mock');
    expect(prepared.record.noVideo).toBe(true);
    expect(prepared.record.noRealEmail).toBe(true);
    expect(prepared.record.archiveFilename.endsWith('.zip')).toBe(true);
    expect(prepared.record.archiveBytes).toBe(prepared.download.bytes);
    expect(prepared.record.archiveSha256).toBe(sha256(prepared.download.blob));
    expect(prepared.record.attachments.length).toBeGreaterThan(5);
    // Nothing about the export touched a working session, confirmation or email.
    expect(await storage.listSessions()).toHaveLength(0);
    const entries = assertPackStructure(prepared, 'en');
    const script = JSON.parse(textOf(entries, 'script.json')) as { language: string; origin: string; confirmation: string; title: string };
    expect(script.language).toBe('en');
    expect(script.origin).toBe('preset');
    expect(script.confirmation).toBe('unconfirmed');
    const brief = JSON.parse(textOf(entries, 'brief.json')) as { brief: { objective: string }; analysis: { recommendation: string } };
    expect(brief.brief.objective.length).toBeGreaterThan(20);
    expect(brief.analysis.recommendation.length).toBeGreaterThan(20);
    const storyboard = textOf(entries, 'storyboard.html');
    expect(storyboard).toContain('Static storyboard');
    expect(storyboard).toContain('media/');
    expect(storyboard).not.toContain('<script');
    const readme = textOf(entries, 'README.txt');
    expect(readme).toContain('No MP4');
    // Real referenced media hashes must match the source package assets.
    const loaded = loadPackage('luxury-gifting');
    const version = loaded.contentPackage?.script.data.versions.find((candidate) => candidate.id === 'scn-luxury-gifting.script.en-v1');
    const referencedIds = new Set((version?.shots ?? []).flatMap((shot) => [...shot.assetIds]));
    for (const asset of loaded.contentPackage?.assets.data.assets ?? []) {
      if (typeof asset.sha256 !== 'string' || typeof asset.bytes !== 'number') continue;
      if (!referencedIds.has(asset.id)) continue;
      const entry = [...entries.entries()].find(([, value]) => value.byteLength === asset.bytes && sha256(value) === asset.sha256);
      expect(entry, `referenced asset ${asset.id} should be embedded`).toBeTruthy();
    }
    // Re-reading the export returns the same original bytes.
    const again = unwrap(await api.getProductExport({ exportId: prepared.record.id }));
    expect(again.download.sha256).toBe(prepared.download.sha256);
    expect(again.download.blob).toEqual(prepared.download.blob);
    // Download trigger is recorded honestly and separately.
    const triggered = unwrap(await api.markProductExportTriggered({ exportId: prepared.record.id }));
    expect(triggered.status).toBe('download_triggered');
    const reread = unwrap(await api.getProductExport({ exportId: prepared.record.id }));
    expect(reread.record.status).toBe('download_triggered');
    expect(reread.download.sha256).toBe(prepared.download.sha256);
    const repeated = unwrap(await api.markProductExportTriggered({ exportId: prepared.record.id }));
    expect(repeated.status).toBe('download_triggered');
  });

  test('idempotent export retries return one record; repeat exports stay listed', async () => {
    const { api } = createApi();
    const first = unwrap(await api.exportScriptPack({
      campaignId: 'scn-scent-layering.brief.main',
      versionId: 'scn-scent-layering.script.ar-v1',
      sessionId: null,
      idempotencyKey: 'same-key',
    }));
    const retry = unwrap(await api.exportScriptPack({
      campaignId: 'scn-scent-layering.brief.main',
      versionId: 'scn-scent-layering.script.ar-v1',
      sessionId: null,
      idempotencyKey: 'same-key',
    }));
    expect(retry.record.id).toBe(first.record.id);
    expect(unwrap(await api.getOverview()).recentExports).toHaveLength(1);
    const second = unwrap(await api.exportScriptPack({
      campaignId: 'scn-scent-layering.brief.main',
      versionId: 'scn-scent-layering.script.ar-v1',
      sessionId: null,
      idempotencyKey: 'different-key',
    }));
    expect(second.record.id).not.toBe(first.record.id);
    expect(unwrap(await api.getOverview()).recentExports).toHaveLength(2);
    assertPackStructure(second, 'ar');
  });

  test('AR preset and saved-version exports keep the exact language, title and confirmation', async () => {
    const { api } = createApi();
    const edited = unwrap(await api.beginCampaignEdit({
      campaignId: 'scn-oud-storytelling.brief.main',
      versionId: 'scn-oud-storytelling.script.ar-v1',
      sessionId: null,
      idempotencyKey: 'oud-edit',
    }));
    const saved = unwrap(await api.saveScriptDraft(ctx(edited.session, 'oud-save'), {
      baseVersionId: 'scn-oud-storytelling.script.ar-v1',
      content: { ...edited.version.content, title: 'عنوان النسخة المحفوظة', hook: 'خطاف محفوظ' },
    }));
    const draftExport = unwrap(await api.exportScriptPack({
      campaignId: 'scn-oud-storytelling.brief.main',
      versionId: saved.version.id,
      sessionId: saved.session.id,
      idempotencyKey: 'saved-draft-export',
    }));
    expect(draftExport.record.origin).toBe('saved');
    expect(draftExport.record.confirmationAtExport).toBe('unconfirmed');
    expect(draftExport.record.language).toBe('ar');
    const draftEntries = assertPackStructure(draftExport, 'ar');
    const draftScript = JSON.parse(textOf(draftEntries, 'script.json')) as { id: string; title: string; confirmation: string };
    expect(draftScript.id).toBe(saved.version.id);
    expect(draftScript.title).toBe('عنوان النسخة المحفوظة');
    expect(draftScript.confirmation).toBe('unconfirmed');
    expect(textOf(draftEntries, 'README.txt')).toContain('Draft / Not confirmed');

    const confirmed = unwrap(await api.confirmScript(ctx(saved.session, 'confirm-saved'), { scriptVersionId: saved.version.id }));
    const confirmedExport = unwrap(await api.exportScriptPack({
      campaignId: 'scn-oud-storytelling.brief.main',
      versionId: saved.version.id,
      sessionId: saved.session.id,
      idempotencyKey: 'saved-confirmed-export',
    }));
    expect(confirmedExport.record.confirmationAtExport).toBe('confirmed_current');
    expect(confirmedExport.record.id).not.toBe(draftExport.record.id);
    const confirmedEntries = assertPackStructure(confirmedExport, 'ar');
    expect(JSON.parse(textOf(confirmedEntries, 'script.json')).confirmation).toBe('confirmed_current');
    void confirmed;
    // The earlier draft export keeps its original snapshot even after confirmation.
    const oldAgain = unwrap(await api.getProductExport({ exportId: draftExport.record.id }));
    expect(oldAgain.record.confirmationAtExport).toBe('unconfirmed');
    expect(oldAgain.download.sha256).toBe(draftExport.download.sha256);
  });

  test('unknown or mismatched version references are refused instead of silently substituting A', async () => {
    const { api } = createApi();
    const unknownCampaign = await api.exportScriptPack({
      campaignId: 'scn-missing.brief',
      versionId: 'scn-missing.script.en-v1',
      sessionId: null,
      idempotencyKey: 'missing-campaign',
    });
    expect(unknownCampaign.ok).toBe(false);
    if (!unknownCampaign.ok) expect(unknownCampaign.error.code).toBe('NOT_FOUND');
    const unknownVersion = await api.exportScriptPack({
      campaignId: 'scn-scent-layering.brief.main',
      versionId: 'scn-luxury-gifting.script.en-v1',
      sessionId: null,
      idempotencyKey: 'cross-campaign',
    });
    expect(unknownVersion.ok).toBe(false);
    const fakeSession = await api.exportScriptPack({
      campaignId: 'scn-scent-layering.brief.main',
      versionId: 'scn-scent-layering.script.en-v1',
      sessionId: 'usr.does-not-exist',
      idempotencyKey: 'fake-session',
    });
    expect(fakeSession.ok).toBe(false);
    expect(unwrap(await api.getOverview()).recentExports).toEqual([]);
    const missingExport = await api.getProductExport({ exportId: 'prd-export.missing' });
    expect(missingExport.ok).toBe(false);
    if (!missingExport.ok) expect(missingExport.error.code).toBe('NOT_FOUND');
  });

  test('a storage failure is reported honestly and writes no export record', async () => {
    class FailingStorage extends MemoryStorage {
      override async putProductExport(): Promise<void> {
        throw new Error('STORAGE_QUOTA: simulated quota failure');
      }
    }
    const api = createMockApi({
      scenarioSource: makeSource(),
      storage: new FailingStorage(),
      now: () => NOW,
      virtualNow: () => 0,
    });
    const failed = await api.exportScriptPack({
      campaignId: 'scn-scent-layering.brief.main',
      versionId: 'scn-scent-layering.script.en-v1',
      sessionId: null,
      idempotencyKey: 'quota',
    });
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.error.message.length).toBeGreaterThan(0);
    expect(unwrap(await api.getOverview()).recentExports).toEqual([]);
  });
});
