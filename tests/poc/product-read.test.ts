import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createMockApi } from '../../apps/web/demo/poc/api';
import type {
  ApiResult,
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

function createApi(storage = new MemoryStorage()): ProductMockApi {
  return createMockApi({ scenarioSource: makeSource(), storage, now: () => NOW, virtualNow: () => 0 });
}

describe('ProductReadApi · overview and business projections', () => {
  test('overview returns three opportunities, three campaigns and no fabricated exports', async () => {
    const api = createApi();
    const overview = unwrap(await api.getOverview());
    expect(overview.opportunities).toHaveLength(3);
    expect(overview.campaigns).toHaveLength(3);
    expect(overview.recentExports).toEqual([]);
    expect(new Set(overview.campaigns.map((campaign) => campaign.campaignId)).size).toBe(3);
    for (const opportunity of overview.opportunities) {
      expect(opportunity.sourceType).toBe('MOCK');
      expect(opportunity.opportunityId).toMatch(/\.analysis\./);
      expect(opportunity.campaignId).toMatch(/\.brief\./);
      expect(opportunity.analysis.insights.length).toBeGreaterThan(0);
      expect(opportunity.analysis.rationale.length).toBeGreaterThan(20);
      expect(opportunity.analysis.recommendation.length).toBeGreaterThan(20);
      expect(opportunity.analysis.assumptions.length).toBeGreaterThan(0);
      expect(opportunity.analysis.uncertainties.length).toBeGreaterThan(0);
      expect(opportunity.brief.objective.length).toBeGreaterThan(10);
      expect(opportunity.brief.markets.length).toBeGreaterThan(0);
      expect(opportunity.brief.audience.length).toBeGreaterThan(10);
      expect(opportunity.brief.productIds.length).toBeGreaterThan(0);
      expect(opportunity.brief.keyMessage.length).toBeGreaterThan(10);
      expect(opportunity.products.length).toBeGreaterThan(0);
      expect(opportunity.images.length).toBeGreaterThan(0);
      expect(opportunity.images.every((image) => image.rightsStatus === 'approved_for_demo')).toBe(true);
      expect(opportunity.evidence.length).toBeGreaterThan(0);
      expect(opportunity.trends.length).toBeGreaterThan(0);
    }
  });

  test('opportunity ids are the existing analysis ids; campaign ids are existing brief ids', async () => {
    const api = createApi();
    const campaigns = unwrap(await api.listCampaigns());
    expect(campaigns.items.map((campaign) => campaign.campaignId).sort()).toEqual([
      'scn-luxury-gifting.brief.main',
      'scn-oud-storytelling.brief.main',
      'scn-scent-layering.brief.main',
    ]);
    const opportunities = unwrap(await api.listOpportunities());
    expect(opportunities.items.map((item) => item.opportunityId).sort()).toEqual([
      'scn-luxury-gifting.analysis.main',
      'scn-oud-storytelling.analysis.main',
      'scn-scent-layering.analysis.main',
    ]);
    const exact = unwrap(await api.getOpportunity({ opportunityId: 'scn-oud-storytelling.analysis.main' }));
    expect(exact.campaignId).toBe('scn-oud-storytelling.brief.main');
    const missing = await api.getOpportunity({ opportunityId: 'scn-unknown.analysis.main' });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.code).toBe('NOT_FOUND');
  });
});

describe('ProductReadApi · signals and exact filters', () => {
  test('all fifteen signals are readable with evidence, trends and related opportunity', async () => {
    const api = createApi();
    const signals = unwrap(await api.listSignals());
    expect(signals.items).toHaveLength(15);
    expect(signals.sources).toEqual(['instagram', 'tiktok', 'pinterest', 'youtube']);
    expect(signals.topics.length).toBeGreaterThan(3);
    for (const item of signals.items) {
      expect(item.signal.evidenceIds.length).toBeGreaterThan(0);
      expect(item.evidence).toHaveLength(item.signal.evidenceIds.length);
      expect(item.evidence.every((evidence) => evidence.sourceType === 'MOCK')).toBe(true);
      expect(item.sourceKeys.length).toBeGreaterThan(0);
      expect(item.trends.length).toBeGreaterThan(0);
      expect(item.opportunities).toHaveLength(1);
      expect(item.opportunities[0].campaignId).toMatch(/\.brief\./);
      const detail = unwrap(await api.getSignal({ signalId: item.signal.id }));
      expect(detail.signal.id).toBe(item.signal.id);
      expect(detail.evidence.map((evidence) => evidence.id)).toEqual(item.signal.evidenceIds);
    }
    const missing = await api.getSignal({ signalId: 'missing-signal' });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.code).toBe('NOT_FOUND');
  });

  test('source, topic and campaign filters combine with AND and clear correctly', async () => {
    const api = createApi();
    for (const source of ['instagram', 'tiktok', 'pinterest', 'youtube'] as const) {
      const filtered = unwrap(await api.listSignals({ source }));
      expect(filtered.items.length).toBeGreaterThan(0);
      expect(filtered.items.every((item) => item.sourceKeys.includes(source))).toBe(true);
    }
    const campaign = unwrap(await api.listSignals({ campaignId: 'scn-luxury-gifting.brief.main' }));
    expect(campaign.items).toHaveLength(5);
    const all = unwrap(await api.listSignals());
    const topic = all.items[0].signal.topic;
    const byTopic = unwrap(await api.listSignals({ topic }));
    expect(byTopic.items.length).toBeGreaterThan(0);
    expect(byTopic.items.every((item) => item.signal.topic === topic)).toBe(true);
    const combined = unwrap(await api.listSignals({ campaignId: 'scn-luxury-gifting.brief.main', source: 'instagram' }));
    expect(combined.items.length).toBe(2);
    expect(combined.items.every((item) => item.sourceKeys.includes('instagram'))).toBe(true);
    const none = await api.listSignals({ campaignId: 'scn-unknown.brief' });
    expect(none.ok).toBe(true);
    if (none.ok) expect(none.data.items).toHaveLength(0);
    const query = unwrap(await api.listSignals({ query: 'oud' }));
    expect(query.items.length).toBeGreaterThan(0);
  });
});

describe('ProductReadApi · campaign preview without sessions', () => {
  test('default and deep-linked campaign previews read preset versions without creating sessions', async () => {
    const api = createApi();
    const storage = new MemoryStorage();
    const isolated = createApi(storage);
    const campaign = unwrap(await isolated.getCampaign({ campaignId: 'scn-luxury-gifting.brief.main' }));
    expect(campaign.campaign.name.length).toBeGreaterThan(3);
    expect(campaign.versions.filter((version) => version.origin === 'preset')).toHaveLength(2);
    expect(campaign.selectedVersion.origin).toBe('preset');
    expect(campaign.selectedVersion.language).toBe('en');
    expect(campaign.selectedVersion.content.shots).toHaveLength(4);
    expect(campaign.selectedVersion.content.subtitles.length).toBeGreaterThan(0);
    expect(campaign.workingSession).toBeNull();
    expect(campaign.exports).toEqual([]);
    const arabic = unwrap(await isolated.getCampaign({ campaignId: 'scn-luxury-gifting.brief.main', language: 'ar' }));
    expect(arabic.selectedVersion.language).toBe('ar');
    expect(arabic.selectedVersion.id ?? arabic.selectedVersion.versionId).toBe('scn-luxury-gifting.script.ar-v1');
    const deep = unwrap(await isolated.getCampaign({
      campaignId: 'scn-oud-storytelling.brief.main',
      versionId: 'scn-oud-storytelling.script.ar-v1',
      language: 'ar',
    }));
    expect(deep.selectedVersion.versionId).toBe('scn-oud-storytelling.script.ar-v1');
    const wrongSession = await isolated.getCampaign({
      campaignId: 'scn-oud-storytelling.brief.main',
      versionId: 'scn-oud-storytelling.script.ar-v1',
      sessionId: 'usr.unknown',
    });
    expect(wrongSession.ok).toBe(false);
    if (!wrongSession.ok) expect(wrongSession.error.code).toBe('NOT_FOUND');
    const unknown = await isolated.getCampaign({ campaignId: 'scn-missing.brief' });
    expect(unknown.ok).toBe(false);
    // Reading must never create a session or export.
    expect(unwrap(await isolated.listSessions()).items).toHaveLength(0);
    expect(unwrap(await isolated.getOverview()).recentExports).toEqual([]);
    void api;
  });

  test('creative assets and deliverables expose every preset EN/AR script and storyboard', async () => {
    const api = createApi();
    const assets = unwrap(await api.listCreativeAssets());
    expect(assets.items).toHaveLength(12);
    expect(assets.items.filter((item) => item.kind === 'script')).toHaveLength(6);
    expect(assets.items.filter((item) => item.kind === 'storyboard')).toHaveLength(6);
    expect(assets.items.filter((item) => item.version.origin === 'preset')).toHaveLength(12);
    const arabicScripts = unwrap(await api.listCreativeAssets({ language: 'ar', kind: 'script' }));
    expect(arabicScripts.items).toHaveLength(3);
    expect(arabicScripts.items.every((item) => item.version.language === 'ar')).toBe(true);
    const exact = unwrap(await api.getCreativeAsset({
      campaignId: 'scn-scent-layering.brief.main',
      versionId: 'scn-scent-layering.script.en-v1',
      sessionId: null,
      kind: 'storyboard',
    }));
    expect(exact.kind).toBe('storyboard');
    expect(exact.campaign.campaignId).toBe('scn-scent-layering.brief.main');
    expect(unwrap(await api.listDeliverables()).items).toHaveLength(6);
    expect(unwrap(await api.listDeliverables({ language: 'en' })).items).toHaveLength(3);
  });

  test('read-only sweep leaves existing session revisions, history and delivery state unchanged', async () => {
    const storage = new MemoryStorage();
    const api = createApi(storage);
    const created = unwrap(await api.createSession({
      scenarioId: 'scn-scent-layering',
      scenarioVersion: '1.0.0',
      creationKey: 'read-sweep-session',
    }));
    const firstStage = unwrap(await api.executeStage(
      { sessionId: created.id, expectedRevision: created.revision, idempotencyKey: 'sweep-discovery' },
      { stage: 'discovery' },
    ));
    const before = unwrap(await api.listSessions());
    const beforeSession = unwrap(await api.getSession({ sessionId: created.id }));
    const beforeHistory = unwrap(await api.getHistory({ sessionId: created.id }));
    await api.getOverview();
    await api.listSignals({ source: 'instagram' });
    await api.listOpportunities();
    await api.getOpportunity({ opportunityId: 'scn-scent-layering.analysis.main' });
    await api.listCampaigns();
    await api.getCampaign({ campaignId: 'scn-scent-layering.brief.main' });
    await api.getCampaign({ campaignId: 'scn-luxury-gifting.brief.main', language: 'ar' });
    await api.listCreativeAssets({ campaignId: 'scn-luxury-gifting.brief.main' });
    await api.getCreativeAsset({
      campaignId: 'scn-scent-layering.brief.main',
      versionId: 'scn-scent-layering.script.en-v1',
      sessionId: null,
      kind: 'script',
    });
    await api.listDeliverables();
    await api.getAgentActivity({ campaignId: 'scn-scent-layering.brief.main' });
    const after = unwrap(await api.listSessions());
    const afterSession = unwrap(await api.getSession({ sessionId: created.id }));
    const afterHistory = unwrap(await api.getHistory({ sessionId: created.id }));
    expect(after).toEqual(before);
    expect(afterSession.revision).toBe(beforeSession.revision);
    expect(afterSession.activeScriptVersionId).toBe(beforeSession.activeScriptVersionId);
    expect(afterSession.workflow).toEqual(beforeSession.workflow);
    expect(afterHistory).toEqual(beforeHistory);
    expect(firstStage.revision).toBeGreaterThan(created.revision);
    expect(unwrap(await api.getOverview()).recentExports).toEqual([]);
  });

  test('saved versions from legitimate content sessions become readable without a write', async () => {
    const api = createApi();
    const created = unwrap(await api.createSession({
      scenarioId: 'scn-scent-layering',
      scenarioVersion: '1.0.0',
      creationKey: 'saved-version-session',
    }));
    let session = unwrap(await api.executeStage(
      { sessionId: created.id, expectedRevision: created.revision, idempotencyKey: 'saved-discovery' },
      { stage: 'discovery' },
    ));
    session = unwrap(await api.executeStage(
      { sessionId: session.id, expectedRevision: session.revision, idempotencyKey: 'saved-analysis' },
      { stage: 'analysis' },
    ));
    const packageVersion = session.activeScriptVersionId;
    expect(packageVersion).toBeTruthy();
    const saved = unwrap(await api.saveScriptDraft(
      { sessionId: session.id, expectedRevision: session.revision, idempotencyKey: 'saved-draft' },
      {
        baseVersionId: packageVersion as string,
        content: {
          ...unwrap(await api.getCampaign({ campaignId: 'scn-scent-layering.brief.main' })).selectedVersion.content,
          title: 'Saved title for read projection',
        },
      },
    ));
    const campaign = unwrap(await api.getCampaign({ campaignId: 'scn-scent-layering.brief.main' }));
    const savedVersion = campaign.versions.find((version) => version.origin === 'saved');
    expect(savedVersion).toBeTruthy();
    expect(savedVersion?.sessionId).toBe(session.id);
    expect(savedVersion?.versionId).toBe(saved.version.id);
    expect(savedVersion?.title).toBe('Saved title for read projection');
    expect(savedVersion?.confirmation).toBe('unconfirmed');
    const assets = unwrap(await api.listCreativeAssets({ campaignId: 'scn-scent-layering.brief.main', origin: 'saved' }));
    expect(assets.items).toHaveLength(2);
    const deliverables = unwrap(await api.listDeliverables({ campaignId: 'scn-scent-layering.brief.main' }));
    expect(deliverables.items.some((item) => item.version.versionId === saved.version.id && item.version.sessionId === session.id)).toBe(true);
    // The saved projection must not have mutated the session.
    expect(unwrap(await api.getSession({ sessionId: session.id })).revision).toBe(saved.session.revision);
  });

  test('agent activity is read-only and exposes preset prefix events plus real user actions', async () => {
    const api = createApi();
    const activity = unwrap(await api.getAgentActivity({ campaignId: 'scn-luxury-gifting.brief.main' }));
    expect(activity.campaign.campaignId).toBe('scn-luxury-gifting.brief.main');
    expect(activity.events.length).toBeGreaterThan(10);
    expect(activity.events.every((event) => event.stage === 'discovery' || event.stage === 'analysis')).toBe(true);
    expect(activity.events.some((event) => event.type === 'stage.completed')).toBe(true);
    expect(activity.deliveryAttempts).toEqual([]);
    expect(unwrap(await api.listSessions()).items).toHaveLength(0);
    const missing = await api.getAgentActivity({ campaignId: 'scn-missing.brief' });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.code).toBe('NOT_FOUND');
  });
});
