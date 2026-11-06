function compareScenarioVersions(left: string, right: string): number {
  const leftParts = left.split('.').map((part) => Number.parseInt(part, 10));
  const rightParts = right.split('.').map((part) => Number.parseInt(part, 10));
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const a = Number.isFinite(leftParts[index]) ? leftParts[index] : 0;
    const b = Number.isFinite(rightParts[index]) ? rightParts[index] : 0;
    if (a !== b) return a - b;
  }
  return 0;
}
/**
 * Interactive Mock Product · read-only business projection.
 *
 * All queries reuse the existing ScenarioSource / MockApi storage and never
 * create sessions, advance stages, select scripts, confirm, export or write
 * history. Opportunity = existing analysis.id; Campaign = existing brief.id.
 */
import type {
  LoadedScenario,
  ScenarioSource,
  SessionView,
} from './types';
import type { ApiErrorCode, ApiMeta, ApiResult } from './types';
import type { ContentPackageInput, ScriptEditable, UserScriptVersion, Shot, Subtitle } from '../domain';
import type {
  ActivityEventView,
  CampaignBrowseInput,
  CampaignCard,
  CampaignRef,
  CampaignView,
  CreativeItem,
  DeliverableItem,
  OpportunityView,
  ProductExportRecord,
  ProductReadFilter,
  ProductSignalView,
  ProductSource,
  ProductVersion,
  ProductVersionRef,
  ReceivedAsset,
} from './product-contract';
import type { ContentDeliveryAttempt } from '../domain';
import type { PersistedSession, PocStorage, StoredProductExport } from '../storage/types';

export interface ProductQueryDeps {
  source: ScenarioSource;
  storage: PocStorage;
  now: () => string;
  toSessionView: (record: PersistedSession) => SessionView;
}

export interface CampaignBundle {
  loaded: LoadedScenario;
  content: ContentPackageInput;
  ref: CampaignRef;
  brief: ContentPackageInput['analysis']['data']['briefs'][number];
  analysis: ContentPackageInput['analysis']['data']['analyses'][number];
  campaign: CampaignCard;
  images: CampaignCard['images'];
  products: CampaignCard['products'];
  signalViews: ProductSignalView[];
}

const SOURCE_ORDER: ProductSource[] = ['instagram', 'tiktok', 'pinterest', 'youtube', 'other'];

export function normalizeSource(platform: string): ProductSource {
  const value = platform.toLowerCase();
  if (value.startsWith('instagram')) return 'instagram';
  if (value.startsWith('tiktok')) return 'tiktok';
  if (value.startsWith('pinterest')) return 'pinterest';
  if (value.startsWith('youtube')) return 'youtube';
  return 'other';
}

export function scriptContentFromVersion(version: {
  title: string;
  hook: string;
  message: string;
  cta: string;
  shots: Shot[];
  subtitles: Subtitle[];
  caption: string;
  hashtags: string[];
}): ScriptEditable {
  return {
    title: version.title,
    hook: version.hook,
    message: version.message,
    cta: version.cta,
    shots: version.shots.map((shot) => ({ ...shot, assetIds: [...shot.assetIds] as [string, ...string[]] })),
    subtitles: version.subtitles.map((subtitle) => ({ ...subtitle })),
    caption: version.caption,
    hashtags: [...version.hashtags],
  };
}

function isRealImageAsset(asset: ContentPackageInput['assets']['data']['assets'][number]): asset is ReceivedAsset {
  return (
    asset.rightsStatus === 'approved_for_demo'
    && (asset.kind === 'logo' || asset.kind === 'product_image' || asset.kind === 'image')
    && (asset.mimeType === 'image/png' || asset.mimeType === 'image/jpeg' || asset.mimeType === 'image/webp')
  );
}

function contentOf(loaded: LoadedScenario): ContentPackageInput {
  if (loaded.contentPackage) return loaded.contentPackage;
  return loaded.package as unknown as ContentPackageInput;
}

export class ProductQueries {
  private readonly source: ScenarioSource;
  private readonly storage: PocStorage;
  private readonly now: () => string;
  private readonly toSessionView: (record: PersistedSession) => SessionView;
  private readonly packageCache = new Map<string, Promise<LoadedScenario | null>>();
  private bundlesCache: Promise<CampaignBundle[]> | null = null;
  private requestCounter = 0;

  constructor(deps: ProductQueryDeps) {
    this.source = deps.source;
    this.storage = deps.storage;
    this.now = deps.now;
    this.toSessionView = deps.toSessionView;
  }

  private meta(): ApiMeta {
    this.requestCounter += 1;
    return { mode: 'mock', schemaVersion: '1.0.0', requestId: `prd-${this.requestCounter}`, sessionId: null, revision: null };
  }

  private ok<T>(data: T): ApiResult<T> {
    return { ok: true, data, meta: this.meta() };
  }

  private fail<T>(code: ApiErrorCode, message: string): ApiResult<T> {
    return { ok: false, error: { code, message, fieldErrors: [], retryable: false }, meta: this.meta() };
  }

  /** Loads a published content package once per browser API instance. */
  async loadScenario(scenarioId: string, scenarioVersion: string, packageHash: string): Promise<LoadedScenario | null> {
    const key = `${scenarioId}@${scenarioVersion}@${packageHash}`;
    const cached = this.packageCache.get(key);
    if (cached) return cached;
    const pending = (async () => {
      try {
        const loaded = await this.source.get(scenarioId, scenarioVersion);
        if (!loaded) return null;
        if (loaded.packageHash !== packageHash) return null;
        return loaded;
      } catch {
        return null;
      }
    })();
    this.packageCache.set(key, pending);
    return pending;
  }

  private async bundles(): Promise<CampaignBundle[]> {
    if (!this.bundlesCache) {
      this.bundlesCache = (async () => {
        const items = await this.source.list();
        const ready = items.filter(
          (item) => (item.readiness === 'content_ready' || item.readiness === 'ready') && Boolean(item.scenarioVersion),
        );
        // A scenario may publish several versions (for example the historical
        // 1.0.0 package and the current 1.1.0 SERENITY package). Product pages
        // default to the highest published version; older versions stay
        // readable through explicit scenarioVersion/session loading.
        const latestByScenario = new Map<string, (typeof ready)[number]>();
        for (const item of ready) {
          if (!item.scenarioVersion) continue;
          const existing = latestByScenario.get(item.scenarioId);
          if (!existing?.scenarioVersion || compareScenarioVersions(item.scenarioVersion, existing.scenarioVersion) > 0) {
            latestByScenario.set(item.scenarioId, item);
          }
        }
        const bundles: CampaignBundle[] = [];
        for (const item of latestByScenario.values()) {
          if (!item.scenarioVersion) continue;
          const resolved = await this.loadScenarioAny(item.scenarioId, item.scenarioVersion);
          if (!resolved) continue;
          const built = this.buildBundle(resolved);
          if (built) bundles.push(built);
        }
        return bundles;
      })();
    }
    return this.bundlesCache;
  }

  /** packageHash is discovered from the source; the catalog entry carries it. */
  private async loadScenarioAny(scenarioId: string, scenarioVersion: string): Promise<LoadedScenario | null> {
    const key = `${scenarioId}@${scenarioVersion}@*`;
    const cached = this.packageCache.get(key);
    if (cached) return cached;
    const pending = (async () => {
      try {
        return await this.source.get(scenarioId, scenarioVersion);
      } catch {
        return null;
      }
    })();
    this.packageCache.set(key, pending);
    return pending;
  }

  private buildBundle(loaded: LoadedScenario): CampaignBundle | null {
    const content = contentOf(loaded);
    const brief = content.analysis.data.briefs.find((candidate) => candidate.id === content.manifest.entryBriefId)
      ?? content.analysis.data.briefs[0];
    if (!brief) return null;
    const analysis = content.analysis.data.analyses.find((candidate) => candidate.id === brief.analysisId)
      ?? content.analysis.data.analyses[0];
    if (!analysis) return null;
    const ref: CampaignRef = {
      campaignId: brief.id,
      opportunityId: analysis.id,
      scenarioId: loaded.scenarioId,
      scenarioVersion: loaded.scenarioVersion,
      packageHash: loaded.packageHash,
    };
    const products = (brief.productIds ?? [])
      .map((id) => content.brand.data.products.find((product) => product.id === id))
      .filter((product): product is ContentPackageInput['brand']['data']['products'][number] => Boolean(product));
    const productImageIds = new Set(products.flatMap((product) => product.imageAssetIds));
    const allAssets = content.assets.data.assets.filter(isRealImageAsset);
    const images = allAssets.filter(
      (asset) => asset.kind === 'logo'
        || productImageIds.has(asset.id)
        || asset.productIds.some((id) => productImageIds.has(id))
        || asset.kind === 'product_image'
        || asset.kind === 'image',
    );
    const campaign: CampaignCard = {
      ...ref,
      name: brief.name,
      objective: brief.objective,
      audience: brief.audience,
      products,
      images,
    };
    const signalViews = content.discovery.data.signals.map((signal) => {
      const evidence = content.discovery.data.evidence.filter((item) => signal.evidenceIds.includes(item.id));
      const trends = content.discovery.data.trends.filter((trend) => trend.signalIds.includes(signal.id));
      const analysisEvidence = new Set(analysis.evidenceIds);
      const analysisTrends = new Set(analysis.trendIds);
      const related = evidence.some((item) => analysisEvidence.has(item.id))
        || trends.some((trend) => analysisTrends.has(trend.id));
      const sources = [...new Set(evidence.map((item) => normalizeSource(item.platform)))];
      return {
        signal,
        sourceKeys: sources.length > 0 ? sources : ['other'],
        evidence,
        trends,
        opportunities: related ? [ref] : [],
      } satisfies ProductSignalView;
    });
    return { loaded, content, ref, brief, analysis, campaign, images, products, signalViews };
  }

  private versionConfirmation(
    bundle: CampaignBundle,
    versionId: string,
    sessions: PersistedSession[],
  ): { confirmation: ProductVersion['confirmation']; confirmedInSessionId: string | null } {
    const confirming = sessions.find(
      (session) => session.state.activeScriptVersionId === versionId && session.state.workflow.analysis === 'completed',
    );
    if (!confirming) return { confirmation: 'unconfirmed', confirmedInSessionId: null };
    void bundle;
    return { confirmation: 'confirmed_current', confirmedInSessionId: confirming.id };
  }

  private presetVersions(bundle: CampaignBundle, sessions: PersistedSession[]): ProductVersion[] {
    return [...bundle.content.script.data.versions]
      .sort((left, right) => (left.language === 'en' ? -1 : 1) - (right.language === 'en' ? -1 : 1))
      .map((version) => {
        const confirmation = this.versionConfirmation(bundle, version.id, sessions);
        return {
          campaignId: bundle.ref.campaignId,
          versionId: version.id,
          sessionId: null,
          language: version.language,
          origin: 'preset' as const,
          confirmation: confirmation.confirmation,
          title: version.title,
          content: scriptContentFromVersion(version),
          sourceScriptVersionId: version.id,
          parentVersionId: version.id,
          confirmedInSessionId: confirmation.confirmedInSessionId,
        } satisfies ProductVersion;
      });
  }

  private savedVersions(bundle: CampaignBundle, sessions: PersistedSession[]): ProductVersion[] {
    const versions: ProductVersion[] = [];
    for (const session of sessions) {
      for (const version of session.state.userVersions as UserScriptVersion[]) {
        const confirmation = session.state.activeScriptVersionId === version.id && session.state.workflow.analysis === 'completed'
          ? { confirmation: 'confirmed_current' as const, confirmedInSessionId: session.id }
          : { confirmation: 'unconfirmed' as const, confirmedInSessionId: null };
        versions.push({
          campaignId: bundle.ref.campaignId,
          versionId: version.id,
          sessionId: session.id,
          language: version.language,
          origin: 'saved',
          confirmation: confirmation.confirmation,
          title: version.content.title,
          content: {
            ...version.content,
            shots: version.content.shots.map((shot) => ({ ...shot, assetIds: [...shot.assetIds] })),
            subtitles: version.content.subtitles.map((subtitle) => ({ ...subtitle })),
            hashtags: [...version.content.hashtags],
          },
          sourceScriptVersionId: version.sourceScriptVersionId,
          parentVersionId: version.parentVersionId,
          confirmedInSessionId: confirmation.confirmedInSessionId,
        });
      }
    }
    return versions;
  }

  private async contentSessions(bundle: CampaignBundle): Promise<PersistedSession[]> {
    const all = await this.storage.listSessions();
    return all
      .filter(
        (session) => session.scenarioId === bundle.ref.scenarioId
          && session.packageHash === bundle.ref.packageHash
          && session.profile === 'content_only'
          && session.purpose !== 'activity',
      )
      .sort((left, right) => (right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id)));
  }

  private async buildVersions(
    bundle: CampaignBundle,
    sessions: PersistedSession[],
  ): Promise<ProductVersion[]> {
    return [...this.presetVersions(bundle, sessions), ...this.savedVersions(bundle, sessions)];
  }

  private async exportsFor(campaignId?: string): Promise<ProductExportRecord[]> {
    const stored: StoredProductExport[] = await this.storage.listProductExports();
    return stored
      .map((value) => value.record)
      .filter((record) => !campaignId || record.campaign.campaignId === campaignId)
      .sort((left, right) => (right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id)));
  }

  private exportIdsForVersion(
    bundle: CampaignBundle,
    version: ProductVersion,
    exports: ProductExportRecord[],
  ): string[] {
    return exports
      .filter(
        (record) => record.campaign.campaignId === bundle.ref.campaignId
          && record.version.versionId === version.versionId
          && (record.version.sessionId ?? null) === (version.sessionId ?? null),
      )
      .map((record) => record.id);
  }

  /** Public so FLOW-001 can project the exact-version opportunity without re-reading. */
  toOpportunityView(bundle: CampaignBundle): OpportunityView {
    const analysisEvidence = new Set(bundle.analysis.evidenceIds);
    const analysisTrends = new Set(bundle.analysis.trendIds);
    const evidence = bundle.content.discovery.data.evidence.filter((item) => analysisEvidence.has(item.id));
    const trends = bundle.content.discovery.data.trends.filter((item) => analysisTrends.has(item.id));
    const signals = bundle.content.discovery.data.signals.filter((signal) =>
      signal.evidenceIds.some((evidenceId) => analysisEvidence.has(evidenceId)),
    );
    return {
      ...bundle.ref,
      title: bundle.brief.name,
      analysis: bundle.analysis,
      brief: bundle.brief,
      signals,
      trends,
      evidence,
      products: bundle.products,
      images: bundle.images,
      sourceType: 'MOCK',
    };
  }

  // ------------------------------------------------------------- read methods
  async getOverview(): Promise<ApiResult<{ opportunities: OpportunityView[]; campaigns: CampaignCard[]; recentExports: ProductExportRecord[] }>> {
    try {
      const bundles = await this.bundles();
      const exports = await this.exportsFor();
      return this.ok({
        opportunities: bundles.map((bundle) => this.toOpportunityView(bundle)),
        campaigns: bundles.map((bundle) => bundle.campaign),
        recentExports: exports.slice(0, 10),
      });
    } catch (error) {
      return this.fail('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  async listSignals(input?: { campaignId?: string; source?: ProductSource; topic?: string; query?: string }): Promise<ApiResult<{ items: ProductSignalView[]; sources: ProductSource[]; topics: string[] }>> {
    try {
      const bundles = await this.bundles();
      const allSignals = bundles.flatMap((bundle) => bundle.signalViews);
      const presentSources = new Set(allSignals.flatMap((view) => view.sourceKeys));
      const sources = SOURCE_ORDER.filter((source) => presentSources.has(source));
      const topics = [...new Set(allSignals.map((view) => view.signal.topic))].sort((left, right) => left.localeCompare(right));
      const filteredBundles = input?.campaignId
        ? bundles.filter((bundle) => bundle.ref.campaignId === input.campaignId)
        : bundles;
      let items = filteredBundles.flatMap((bundle) => bundle.signalViews);
      if (input?.source) items = items.filter((view) => view.sourceKeys.includes(input.source as ProductSource));
      if (input?.topic) items = items.filter((view) => view.signal.topic === input.topic);
      if (input?.query) {
        const query = input.query.toLowerCase();
        items = items.filter(
          (view) => view.signal.title.toLowerCase().includes(query) || view.signal.summary.toLowerCase().includes(query),
        );
      }
      return this.ok({ items, sources, topics });
    } catch (error) {
      return this.fail('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  async getSignal(input: { signalId: string }): Promise<ApiResult<ProductSignalView>> {
    try {
      const bundles = await this.bundles();
      for (const bundle of bundles) {
        const found = bundle.signalViews.find((view) => view.signal.id === input?.signalId);
        if (found) return this.ok(found);
      }
      return this.fail('NOT_FOUND', `Unknown signal ${input?.signalId ?? ''}.`);
    } catch (error) {
      return this.fail('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  async listOpportunities(input?: { campaignId?: string; query?: string }): Promise<ApiResult<{ items: OpportunityView[] }>> {
    try {
      const bundles = await this.bundles();
      let items = bundles.map((bundle) => this.toOpportunityView(bundle));
      if (input?.campaignId) items = items.filter((item) => item.campaignId === input.campaignId);
      if (input?.query) {
        const query = input.query.toLowerCase();
        items = items.filter(
          (item) => item.title.toLowerCase().includes(query)
            || item.brief.objective.toLowerCase().includes(query)
            || item.analysis.recommendation.toLowerCase().includes(query)
            || item.analysis.insights.some((insight) => insight.toLowerCase().includes(query)),
        );
      }
      return this.ok({ items });
    } catch (error) {
      return this.fail('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  async getOpportunity(input: { opportunityId: string }): Promise<ApiResult<OpportunityView>> {
    try {
      const bundles = await this.bundles();
      const bundle = bundles.find((candidate) => candidate.ref.opportunityId === input?.opportunityId);
      if (!bundle) return this.fail('NOT_FOUND', `Unknown opportunity ${input?.opportunityId ?? ''}.`);
      return this.ok(this.toOpportunityView(bundle));
    } catch (error) {
      return this.fail('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  async listCampaigns(): Promise<ApiResult<{ items: CampaignCard[] }>> {
    try {
      const bundles = await this.bundles();
      return this.ok({ items: bundles.map((bundle) => bundle.campaign) });
    } catch (error) {
      return this.fail('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  async getBundle(campaignId: string): Promise<CampaignBundle | null> {
    const bundles = await this.bundles();
    return bundles.find((bundle) => bundle.ref.campaignId === campaignId) ?? null;
  }

  /**
   * FLOW-001 additive explicit-version bundle. Read-only: loads exactly the
   * requested published scenario version (never substitutes the latest one), so
   * the connected journey can bind a campaign to its own package/version/hash.
   */
  async getBundleForVersion(campaignId: string, scenarioVersion: string): Promise<CampaignBundle | null> {
    if (!campaignId || !scenarioVersion) return null;
    const latest = await this.getBundle(campaignId);
    if (!latest) return null;
    if (latest.ref.scenarioVersion === scenarioVersion) return latest;
    const loaded = await this.loadScenarioAny(latest.ref.scenarioId, scenarioVersion);
    if (!loaded) return null;
    const built = this.buildBundle(loaded);
    if (!built || built.ref.campaignId !== campaignId) return null;
    return built;
  }

  async listSessionsForCampaign(campaignId: string): Promise<PersistedSession[]> {
    const bundle = await this.getBundle(campaignId);
    if (!bundle) return [];
    return this.contentSessions(bundle);
  }

  async objectForSession(session: PersistedSession): Promise<SessionView> {
    return this.toSessionView(session);
  }

  async getCampaign(input: CampaignBrowseInput): Promise<ApiResult<CampaignView>> {
    try {
      const bundle = input?.scenarioVersion
        ? await this.getBundleForVersion(input.campaignId, input.scenarioVersion)
        : await this.getBundle(input?.campaignId);
      if (!bundle) {
        return this.fail(
          'NOT_FOUND',
          input?.scenarioVersion
            ? `Unknown campaign ${input?.campaignId ?? ''} or scenario version ${input.scenarioVersion}.`
            : `Unknown campaign ${input?.campaignId ?? ''}.`,
        );
      }
      const sessions = await this.contentSessions(bundle);
      const exports = await this.exportsFor(bundle.ref.campaignId);
      const versions = await this.buildVersions(bundle, sessions);
      let selected: ProductVersion | undefined;
      if (input.versionId) {
        selected = versions.find(
          (version) => version.versionId === input.versionId
            && ((version.sessionId ?? null) === (input.sessionId ?? null)),
        );
        if (!selected) {
          return this.fail('NOT_FOUND', 'The requested version does not exist for this campaign and session.');
        }
      } else if (input.language) {
        selected = versions.find((version) => version.origin === 'preset' && version.language === input.language);
        if (!selected) return this.fail('NOT_FOUND', `No ${input.language} version exists for this campaign.`);
      } else {
        selected = versions.find((version) => version.versionId === bundle.content.manifest.entryScriptVersionId)
          ?? versions.find((version) => version.origin === 'preset' && version.language === 'en')
          ?? versions[0];
      }
      if (!selected) return this.fail('NOT_FOUND', 'This campaign has no readable version.');
      if (input.language && selected.language !== input.language) {
        return this.fail('NOT_FOUND', 'The requested version language does not match the requested language.');
      }
      return this.ok({
        campaign: bundle.campaign,
        brief: bundle.brief,
        analysis: bundle.analysis,
        versions,
        selectedVersion: selected,
        workingSession: sessions[0] ? this.toSessionView(sessions[0]) : null,
        exports,
      });
    } catch (error) {
      return this.fail('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  /** Exact version lookup for explicit commands and export. Does not write anything. */
  async findVersion(input: ProductVersionRef): Promise<{ bundle: CampaignBundle; version: ProductVersion; ownerSession: PersistedSession | null } | null> {
    const bundle = await this.getBundle(input.campaignId);
    if (!bundle) return null;
    const sessions = await this.contentSessions(bundle);
    const exports = await this.exportsFor(bundle.ref.campaignId);
    const versions = await this.buildVersions(bundle, sessions);
    const version = versions.find(
      (candidate) => candidate.versionId === input.versionId
        && (candidate.sessionId ?? null) === (input.sessionId ?? null),
    );
    if (!version) return null;
    const ownerSession = version.sessionId ? sessions.find((session) => session.id === version.sessionId) ?? null : null;
    return { bundle, version, ownerSession };
  }

  async buildCreativeItems(filter: ProductReadFilter & { kind?: 'script' | 'storyboard'; origin?: 'preset' | 'saved' } = {}): Promise<CreativeItem[]> {
    const bundles = await this.bundles();
    const items: CreativeItem[] = [];
    for (const bundle of bundles) {
      if (filter.campaignId && bundle.ref.campaignId !== filter.campaignId) continue;
      const sessions = await this.contentSessions(bundle);
      const exports = await this.exportsFor(bundle.ref.campaignId);
      const versions = await this.buildVersions(bundle, sessions);
      for (const version of versions) {
        if (filter.language && version.language !== filter.language) continue;
        if (filter.origin && version.origin !== filter.origin) continue;
        const exportIds = this.exportIdsForVersion(bundle, version, exports);
        if (filter.query) {
          const query = filter.query.toLowerCase();
          const haystack = `${version.title} ${version.content.title} ${version.content.hook} ${version.content.message} ${version.content.caption} ${bundle.campaign.name}`.toLowerCase();
          if (!haystack.includes(query)) continue;
        }
        if (!filter.kind || filter.kind === 'script') {
          items.push({ kind: 'script', version, campaign: bundle.campaign, exportIds });
        }
        if (!filter.kind || filter.kind === 'storyboard') {
          items.push({ kind: 'storyboard', version, campaign: bundle.campaign, exportIds });
        }
      }
    }
    return items;
  }

  async listCreativeAssets(input?: ProductReadFilter & { kind?: 'script' | 'storyboard'; origin?: 'preset' | 'saved' }): Promise<ApiResult<{ items: CreativeItem[] }>> {
    try {
      return this.ok({ items: await this.buildCreativeItems(input ?? {}) });
    } catch (error) {
      return this.fail('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  async getCreativeAsset(input: ProductVersionRef & { kind: 'script' | 'storyboard' }): Promise<ApiResult<CreativeItem>> {
    try {
      if (input?.kind !== 'script' && input?.kind !== 'storyboard') {
        return this.fail('INVALID_INPUT', 'input.kind must be script or storyboard.');
      }
      const resolved = await this.findVersion(input);
      if (!resolved) return this.fail('NOT_FOUND', 'The requested creative asset does not exist.');
      const exports = await this.exportsFor(resolved.bundle.ref.campaignId);
      return this.ok({
        kind: input.kind,
        version: resolved.version,
        campaign: resolved.bundle.campaign,
        exportIds: this.exportIdsForVersion(resolved.bundle, resolved.version, exports),
      });
    } catch (error) {
      return this.fail('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  async listDeliverables(input?: ProductReadFilter): Promise<ApiResult<{ items: DeliverableItem[]; exports: ProductExportRecord[] }>> {
    try {
      const bundles = await this.bundles();
      const allExports = await this.exportsFor();
      const items: DeliverableItem[] = [];
      for (const bundle of bundles) {
        if (input?.campaignId && bundle.ref.campaignId !== input.campaignId) continue;
        const sessions = await this.contentSessions(bundle);
        const campaignExports = allExports.filter((record) => record.campaign.campaignId === bundle.ref.campaignId);
        const versions = await this.buildVersions(bundle, sessions);
        for (const version of versions) {
          if (input?.language && version.language !== input.language) continue;
          if (input?.query) {
            const query = input.query.toLowerCase();
            if (!`${version.title} ${bundle.campaign.name}`.toLowerCase().includes(query)) continue;
          }
          items.push({
            version,
            campaign: bundle.campaign,
            exportIds: this.exportIdsForVersion(bundle, version, campaignExports),
            available: true,
            unavailableReason: null,
          });
        }
      }
      const exports = allExports.filter((record) =>
        (!input?.campaignId || record.campaign.campaignId === input.campaignId)
        && (!input?.language || record.language === input.language));
      return this.ok({ items, exports });
    } catch (error) {
      return this.fail('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  async getAgentActivity(input: { campaignId: string }): Promise<ApiResult<{ campaign: CampaignRef; events: ActivityEventView[]; editingHistory: SessionView['history']; deliveryAttempts: ContentDeliveryAttempt[] }>> {
    try {
      const bundle = await this.getBundle(input?.campaignId);
      if (!bundle) return this.fail('NOT_FOUND', `Unknown campaign ${input?.campaignId ?? ''}.`);
      const events = bundle.loaded.package.events.data.events;
      const completed = events.find((event) => event.stage === 'analysis' && event.type === 'stage.completed');
      const prefixEnd = completed?.sequence ?? 0;
      const prefix = events.filter((event) => event.sequence <= prefixEnd && (event.stage === 'discovery' || event.stage === 'analysis'));
      const sessions = await this.contentSessions(bundle);
      const working = sessions[0] ?? null;
      const history = working
        ? working.state.history.filter((record) => !record.action.startsWith('event:'))
        : [];
      const attempts = working?.contentDelivery?.attempts ?? [];
      return this.ok({
        campaign: bundle.ref,
        events: prefix.map((event) => ({
          id: event.id,
          sequence: event.sequence,
          atMs: event.atMs,
          stage: event.stage as 'discovery' | 'analysis',
          type: event.type,
          inputRefs: [...event.inputRefs],
          outputRefs: [...event.outputRefs],
        })),
        editingHistory: history,
        deliveryAttempts: attempts,
      });
    } catch (error) {
      return this.fail('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  /** Campaign/version cards for an Overview-style panel. */
  async campaignCards(): Promise<CampaignCard[]> {
    const bundles = await this.bundles();
    return bundles.map((bundle) => bundle.campaign);
  }

  async listExportRecords(): Promise<ProductExportRecord[]> {
    return this.exportsFor();
  }

  nowIso(): string {
    return this.now();
  }
}

export function createProductQueries(deps: ProductQueryDeps): ProductQueries {
  return new ProductQueries(deps);
}
