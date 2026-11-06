import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createMockApi } from '../../apps/web/demo/poc/api';
import type {
  ApiResult,
  CommandContext,
  LoadedScenario,
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

describe('IP-002 · explicit campaign editing context', () => {
  test('first explicit edit prepares a real working session without confirming or exporting', async () => {
    const { api } = createApi();
    const edited = unwrap(await api.beginCampaignEdit({
      campaignId: 'scn-luxury-gifting.brief.main',
      versionId: 'scn-luxury-gifting.script.en-v1',
      sessionId: null,
      idempotencyKey: 'edit-b-en',
    }));
    expect(edited.session.id.startsWith('usr.')).toBe(true);
    expect(edited.session.workflow.discovery).toBe('completed');
    expect(['awaiting_confirmation', 'completed']).toContain(edited.session.workflow.analysis);
    expect(edited.session.activeScriptVersionId).toBe('scn-luxury-gifting.script.en-v1');
    expect(edited.session.workflow.analysis).not.toBe('completed');
    expect(edited.version.versionId).toBe('scn-luxury-gifting.script.en-v1');
    const sessions = unwrap(await api.listSessions()).items;
    expect(sessions).toHaveLength(1);
    expect(sessions[0].revision).toBe(edited.session.revision);
    const campaign = unwrap(await api.getCampaign({ campaignId: 'scn-luxury-gifting.brief.main' }));
    expect(campaign.workingSession?.id).toBe(edited.session.id);
    expect(campaign.selectedVersion.confirmation).toBe('unconfirmed');
    // No confirmation, delivery draft or export side effect.
    expect(unwrap(await api.getOverview()).recentExports).toEqual([]);
    expect(unwrap(await api.listDeliverables()).exports).toEqual([]);
  });

  test('repeated edit clicks reuse the same prepared working session without extra revisions', async () => {
    const { api } = createApi();
    const first = unwrap(await api.beginCampaignEdit({
      campaignId: 'scn-luxury-gifting.brief.main',
      versionId: 'scn-luxury-gifting.script.en-v1',
      sessionId: null,
      idempotencyKey: 'edit-click-1',
    }));
    const second = unwrap(await api.beginCampaignEdit({
      campaignId: 'scn-luxury-gifting.brief.main',
      versionId: 'scn-luxury-gifting.script.en-v1',
      sessionId: null,
      idempotencyKey: 'edit-click-2',
    }));
    expect(second.session.id).toBe(first.session.id);
    expect(second.session.revision).toBe(first.session.revision);
    expect(second.session.activeScriptVersionId).toBe('scn-luxury-gifting.script.en-v1');
    expect(unwrap(await api.listSessions()).items).toHaveLength(1);
  });

  test('switching an explicit working version selects that exact version and allows a derived save', async () => {
    const { api } = createApi();
    const base = unwrap(await api.beginCampaignEdit({
      campaignId: 'scn-scent-layering.brief.main',
      versionId: 'scn-scent-layering.script.en-v1',
      sessionId: null,
      idempotencyKey: 'edit-a-en',
    }));
    const arabic = unwrap(await api.beginCampaignEdit({
      campaignId: 'scn-scent-layering.brief.main',
      versionId: 'scn-scent-layering.script.ar-v1',
      sessionId: null,
      idempotencyKey: 'edit-a-ar',
    }));
    expect(arabic.session.id).toBe(base.session.id);
    expect(arabic.session.activeScriptVersionId).toBe('scn-scent-layering.script.ar-v1');
    expect(arabic.version.language).toBe('ar');
    const saved = unwrap(await api.saveScriptDraft(ctx(arabic.session, 'save-ar'), {
      baseVersionId: 'scn-scent-layering.script.ar-v1',
      content: { ...arabic.version.content, title: 'عنوان محفوظ' },
    }));
    expect(saved.version.language).toBe('ar');
    expect(saved.version.content.title).toBe('عنوان محفوظ');
    expect(saved.session.activeScriptVersionId).toBe(saved.version.id);
    const campaign = unwrap(await api.getCampaign({ campaignId: 'scn-scent-layering.brief.main', language: 'ar' }));
    expect(campaign.versions.some((version) => version.origin === 'saved' && version.versionId === saved.version.id && version.sessionId === saved.session.id)).toBe(true);
    expect(campaign.workingSession?.id).toBe(saved.session.id);
  });

  test('saved versions are edited through their owning session and confirmation stays exact', async () => {
    const { api } = createApi();
    const base = unwrap(await api.beginCampaignEdit({
      campaignId: 'scn-oud-storytelling.brief.main',
      versionId: 'scn-oud-storytelling.script.en-v1',
      sessionId: null,
      idempotencyKey: 'oud-edit',
    }));
    const saved = unwrap(await api.saveScriptDraft(ctx(base.session, 'oud-save'), {
      baseVersionId: 'scn-oud-storytelling.script.en-v1',
      content: { ...base.version.content, hook: 'A new hook for the saved version' },
    }));
    const confirmed = unwrap(await api.confirmScript(ctx(saved.session, 'oud-confirm'), { scriptVersionId: saved.version.id }));
    expect(confirmed.workflow.analysis).toBe('completed');
    expect(confirmed.activeScriptVersionId).toBe(saved.version.id);
    const campaign = unwrap(await api.getCampaign({ campaignId: 'scn-oud-storytelling.brief.main' }));
    const stored = campaign.versions.find((version) => version.versionId === saved.version.id);
    expect(stored?.confirmation).toBe('confirmed_current');
    expect(stored?.confirmedInSessionId).toBe(saved.session.id);
    // Editing again through the explicit command reuses the owner session.
    const reopened = unwrap(await api.beginCampaignEdit({
      campaignId: 'scn-oud-storytelling.brief.main',
      versionId: saved.version.id,
      sessionId: saved.session.id,
      idempotencyKey: 'oud-reopen',
    }));
    expect(reopened.session.id).toBe(saved.session.id);
    expect(reopened.session.revision).toBe(confirmed.revision);
    expect(reopened.session.activeScriptVersionId).toBe(saved.version.id);
  });
});

describe('IP-002 · isolated agent activity sessions', () => {
  test('activity replay creates an isolated purpose=activity session only when explicitly opened', async () => {
    const { api, storage } = createApi();
    const work = unwrap(await api.beginCampaignEdit({
      campaignId: 'scn-luxury-gifting.brief.main',
      versionId: 'scn-luxury-gifting.script.en-v1',
      sessionId: null,
      idempotencyKey: 'work-session',
    }));
    const workBefore = unwrap(await api.getSession({ sessionId: work.session.id }));
    const activity = unwrap(await api.openActivityReplay({ campaignId: 'scn-luxury-gifting.brief.main', creationKey: 'drawer-1' }));
    expect(activity.session.id).not.toBe(work.session.id);
    expect(activity.lastSequence).toBeGreaterThan(0);
    expect(activity.session.activeScriptVersionId).toBeNull();
    const records = await storage.listSessions();
    const activityRecord = records.find((record) => record.id === activity.session.id);
    expect(activityRecord?.purpose).toBe('activity');
    expect(activityRecord?.state.userVersions).toEqual([]);
    // Replay advances only the isolated activity session.
    const stepped = unwrap(await api.replayCommand(ctx(activity.session, 'step-1'), { action: 'step' }));
    expect(stepped.session.id).toBe(activity.session.id);
    expect(stepped.session.activeBriefId).toBeNull();
    const workAfter = unwrap(await api.getSession({ sessionId: work.session.id }));
    expect(workAfter.revision).toBe(workBefore.revision);
    expect(workAfter.activeScriptVersionId).toBe(workBefore.activeScriptVersionId);
    expect(workAfter.workflow).toEqual(workBefore.workflow);
    // Activity sessions are not offered as campaign working sessions or library saved versions.
    const campaign = unwrap(await api.getCampaign({ campaignId: 'scn-luxury-gifting.brief.main' }));
    expect(campaign.workingSession?.id).toBe(work.session.id);
    const savedItems = unwrap(await api.listCreativeAssets({ campaignId: 'scn-luxury-gifting.brief.main', origin: 'saved' }));
    expect(savedItems.items.every((item) => item.version.sessionId !== activity.session.id)).toBe(true);
    const reopened = unwrap(await api.openActivityReplay({ campaignId: 'scn-luxury-gifting.brief.main', creationKey: 'drawer-1' }));
    expect(reopened.session.id).toBe(activity.session.id);
  });

  test('opening the activity drawer read view does not create a session', async () => {
    const { api } = createApi();
    const activity = unwrap(await api.getAgentActivity({ campaignId: 'scn-scent-layering.brief.main' }));
    expect(activity.events.length).toBeGreaterThan(0);
    expect(unwrap(await api.listSessions()).items).toHaveLength(0);
    const replay = await api.openActivityReplay({ campaignId: 'scn-missing.brief', creationKey: 'missing' });
    expect(replay.ok).toBe(false);
    if (!replay.ok) expect(replay.error.code).toBe('NOT_FOUND');
  });
});
