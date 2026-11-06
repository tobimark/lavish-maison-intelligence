/**
 * FLOW-001 · Connected campaign journey projection (read-only).
 *
 * One closed projection of the same campaign: campaign/opportunity from the
 * existing product read API, the exact scenario version bundle, the authored
 * presentation sidecar, the bound provided-asset set and the local social
 * drafts/attempts. Browsing NEVER writes: no session, draft, attempt or receipt
 * is created here, and no fallback marketing copy is invented. A sidecar that
 * is missing or whose references do not close yields contentStatus 'pending'
 * with an honest contentIssue, while the real campaign/opportunity/versions/
 * provided assets are still returned.
 */
import type { ApiErrorCode, ApiMeta, ApiResult, SessionView } from './types';
import type { CampaignJourney, CampaignPresentation } from './flow-contract';
import { socialWorkflowKey } from './flow-contract';
import type { CampaignPresentationSource } from './flow-source';
import type { ProvidedAsset, ProvidedAssetSet } from './provided-asset-contract';
import type { ProvidedAssetSource } from './provided-asset-source';
import type { ProductVersion } from './product-contract';
import type { CampaignBundle, ProductQueries } from './product-queries';
import type { PersistedSession, PocStorage } from '../storage/types';

export interface FlowQueryDeps {
  source?: CampaignPresentationSource;
  providedAssetSource?: ProvidedAssetSource;
  queries: ProductQueries;
  storage: PocStorage;
  now: () => string;
  toSessionView: (record: PersistedSession) => SessionView;
}

interface ProvidedSetResolution {
  set: ProvidedAssetSet | null;
  issue: string | null;
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const STEP_EXPECTATIONS: Record<
  'product_identity' | 'hero' | 'final_preview',
  { type: ProvidedAsset['type']; role: ProvidedAsset['roles'][number] }
> = {
  product_identity: { type: 'product_original_image', role: 'product_identity' },
  hero: { type: 'hero_image', role: 'hero' },
  final_preview: { type: 'final_preview_video', role: 'final_preview' },
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('WebCrypto SHA-256 is unavailable.');
  const digest = await subtle.digest('SHA-256', bytes as unknown as BufferSource);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export class FlowQueries {
  private readonly source?: CampaignPresentationSource;
  private readonly providedAssetSource?: ProvidedAssetSource;
  private readonly queries: ProductQueries;
  private readonly storage: PocStorage;
  private readonly now: () => string;
  private requestCounter = 0;
  /** Verified provided-asset bytes cache (asset set + asset id + declared hash). */
  private readonly verifiedAssets = new Map<string, string | null>();

  constructor(deps: FlowQueryDeps) {
    this.source = deps.source;
    this.providedAssetSource = deps.providedAssetSource;
    this.queries = deps.queries;
    this.storage = deps.storage;
    this.now = deps.now;
  }

  private meta(): ApiMeta {
    this.requestCounter += 1;
    return { mode: 'mock', schemaVersion: '1.0.0', requestId: `flow-${this.requestCounter}`, sessionId: null, revision: null };
  }

  private ok<T>(data: T): ApiResult<T> {
    return { ok: true, data, meta: this.meta() };
  }

  private fail<T>(code: ApiErrorCode, message: string): ApiResult<T> {
    return {
      ok: false,
      error: { code, message, fieldErrors: [], retryable: code === 'STORAGE_UNAVAILABLE' || code === 'STORAGE_QUOTA' },
      meta: this.meta(),
    };
  }

  /** Read-only provided-asset resolution; no fallback set is fabricated. */
  async getProvidedSet(input: { campaignId: string; scenarioId: string; scenarioVersion: string }): Promise<ProvidedSetResolution> {
    if (!this.providedAssetSource) {
      return { set: null, issue: 'No provided asset sidecar source is configured for this workspace.' };
    }
    let set: ProvidedAssetSet | null = null;
    try {
      set = await this.providedAssetSource.getAssetSet();
    } catch {
      set = null;
    }
    if (!set) return { set: null, issue: 'The provided asset sidecar is not available for this campaign version.' };
    if (set.scenarioId !== input.scenarioId) {
      return { set: null, issue: `The provided asset set belongs to ${String(set.scenarioId)}, not ${input.scenarioId}.` };
    }
    if (set.scenarioVersion !== input.scenarioVersion) {
      return { set: null, issue: `The provided asset set is for scenario version ${String(set.scenarioVersion)}, not ${input.scenarioVersion}.` };
    }
    if (set.campaignId !== input.campaignId) {
      return { set: null, issue: 'The provided asset set is bound to a different campaign.' };
    }
    if (set.contentStatus !== 'bound') {
      return { set: null, issue: 'The provided SERENITY assets are not bound to this campaign version yet.' };
    }
    if (!Array.isArray(set.assets) || set.assets.length === 0 || !isNonEmptyString(set.product?.id)) {
      return { set: null, issue: 'The provided asset set has no usable assets for this campaign version.' };
    }
    return { set, issue: null };
  }

  /**
   * Verifies that the real provided bytes match the sidecar SHA-256/size.
   * Returns null when verified, otherwise an honest issue string. Read-only.
   */
  async verifyProvidedAsset(set: ProvidedAssetSet, asset: ProvidedAsset): Promise<string | null> {
    if (!SHA256_PATTERN.test(String(asset.sha256))) {
      return `Provided asset ${asset.id} has no valid SHA-256.`;
    }
    const cacheKey = `${set.id}|${asset.id}|${asset.sha256}|${asset.bytes}`;
    if (this.verifiedAssets.has(cacheKey)) return this.verifiedAssets.get(cacheKey) ?? null;
    let issue: string | null = null;
    if (!this.providedAssetSource) {
      issue = 'No provided asset source is configured, so the provided asset hash cannot be verified.';
    } else {
      let bytes: Uint8Array | null = null;
      try {
        bytes = await this.providedAssetSource.getAssetBytes(asset);
      } catch {
        bytes = null;
      }
      if (!bytes) {
        issue = `The bytes of provided asset ${asset.id} could not be read; its SHA-256 cannot be verified.`;
      } else if (bytes.byteLength !== asset.bytes) {
        issue = `The bytes of provided asset ${asset.id} do not match the sidecar size.`;
      } else {
        const actual = await sha256Hex(bytes);
        if (actual !== asset.sha256) issue = `The bytes of provided asset ${asset.id} do not match the sidecar SHA-256.`;
      }
    }
    this.verifiedAssets.set(cacheKey, issue);
    return issue;
  }

  private async loadPresentation(bundle: CampaignBundle): Promise<CampaignPresentation | null> {
    if (!this.source) return null;
    try {
      return await this.source.getPresentation(bundle.ref.scenarioId, bundle.ref.scenarioVersion);
    } catch {
      return null;
    }
  }

  private async validatePresentation(
    presentation: CampaignPresentation,
    bundle: CampaignBundle,
    en: ProductVersion | null,
    ar: ProductVersion | null,
    provided: ProvidedAssetSet | null,
  ): Promise<string[]> {
    const issues: string[] = [];
    const content = bundle.content;

    if (presentation.scenarioId !== bundle.ref.scenarioId) issues.push('presentation scenarioId does not match the campaign package.');
    if (presentation.scenarioVersion !== bundle.ref.scenarioVersion) issues.push('presentation scenarioVersion does not match the requested campaign version.');
    if (presentation.campaignId !== bundle.ref.campaignId) issues.push('presentation campaignId does not match the resolved campaign.');
    if (presentation.packageHash !== bundle.ref.packageHash) issues.push('presentation packageHash does not match the published manifest bytes.');
    if (presentation.mode !== 'mock') issues.push('presentation mode must be mock.');

    // Product closure: presentation product ids must be campaign products.
    const campaignProductIds = new Set(bundle.campaign.products.map((product) => product.id));
    if (presentation.productIds.length === 0) issues.push('presentation productIds is empty.');
    for (const productId of presentation.productIds) {
      if (!campaignProductIds.has(productId)) issues.push(`presentation productIds includes ${productId}, which is not part of campaign ${bundle.ref.campaignId}.`);
    }

    // Insight refs must exist in the loaded discovery content.
    const signalIds = new Set(content.discovery.data.signals.map((signal) => signal.id));
    const trendIds = new Set(content.discovery.data.trends.map((trend) => trend.id));
    const evidenceIds = new Set(content.discovery.data.evidence.map((evidence) => evidence.id));
    for (const id of presentation.insight.signalIds) if (!signalIds.has(id)) issues.push(`presentation insight references unknown signal ${id}.`);
    for (const id of presentation.insight.trendIds) if (!trendIds.has(id)) issues.push(`presentation insight references unknown trend ${id}.`);
    for (const id of presentation.insight.evidenceIds) if (!evidenceIds.has(id)) issues.push(`presentation insight references unknown evidence ${id}.`);

    // Strategy must point at this exact analysis/brief.
    if (presentation.strategy.analysisId !== bundle.analysis.id) issues.push('presentation strategy analysisId does not match the campaign analysis.');
    if (presentation.strategy.briefId !== bundle.brief.id) issues.push('presentation strategy briefId does not match the campaign brief.');

    // Creative scripts: real EN + AR preset version ids.
    const scriptLanguage = new Map(content.script.data.versions.map((version) => [version.id, version.language]));
    const declaredLanguages = presentation.creative.scriptVersionIds
      .map((id) => scriptLanguage.get(id))
      .filter((language): language is 'en' | 'ar' => language === 'en' || language === 'ar');
    if (presentation.creative.scriptVersionIds.length !== 2) issues.push('presentation creative.scriptVersionIds must reference exactly two script versions.');
    for (const id of presentation.creative.scriptVersionIds) {
      if (!scriptLanguage.has(id)) issues.push(`presentation creative references unknown script version ${id}.`);
    }
    if (!declaredLanguages.includes('en') || !declaredLanguages.includes('ar')) {
      issues.push('presentation creative.scriptVersionIds must include one EN and one AR script version.');
    }
    if (en && !presentation.creative.scriptVersionIds.includes(en.versionId)) issues.push('presentation creative does not reference the resolved EN preset script version.');
    if (ar && !presentation.creative.scriptVersionIds.includes(ar.versionId)) issues.push('presentation creative does not reference the resolved AR preset script version.');
    if (!en || !ar) issues.push('This campaign has no readable EN and AR preset script versions.');

    // Creative steps: three roles, provided assets with the matching role/type.
    const steps = presentation.creative.steps;
    if (steps.length !== 3) issues.push('presentation creative.steps must contain exactly three steps.');
    const finalPreviewAssetId = steps.find((step) => step.role === 'final_preview')?.assetId ?? null;
    if (!provided) {
      issues.push('Provided assets are unavailable, so the creative step assets cannot be verified.');
    } else {
      for (const step of steps) {
        const expectation = STEP_EXPECTATIONS[step.role];
        if (!expectation) {
          issues.push(`presentation creative step role ${String(step.role)} is not supported.`);
          continue;
        }
        const asset = provided.assets.find((candidate) => candidate.id === step.assetId);
        if (!asset) {
          issues.push(`presentation creative step ${step.role} references provided asset ${step.assetId}, which does not exist.`);
          continue;
        }
        if (asset.type !== expectation.type) issues.push(`provided asset ${asset.id} must have type ${expectation.type} for the ${step.role} step.`);
        if (!asset.roles.includes(expectation.role)) issues.push(`provided asset ${asset.id} must carry the ${expectation.role} role.`);
        if (asset.productId !== provided.product.id) issues.push(`provided asset ${asset.id} is not bound to product ${provided.product.id}.`);
        if (step.role === 'final_preview') {
          if (asset.mimeType !== 'video/mp4') issues.push(`provided asset ${asset.id} must be a video/mp4 final preview.`);
          if (typeof asset.metadata?.durationMs !== 'number' || !(asset.metadata.durationMs > 0)) {
            issues.push(`provided asset ${asset.id} must declare a real positive duration.`);
          }
          const hashIssue = await this.verifyProvidedAsset(provided, asset);
          if (hashIssue) issues.push(hashIssue);
        }
      }
    }

    // Provided product must be one of the presentation products.
    if (provided && !presentation.productIds.includes(provided.product.id)) {
      issues.push(`provided product ${provided.product.id} is not listed in presentation productIds.`);
    }

    // Social posts: exactly EN + AR, matching language script, final preview video.
    const posts = presentation.socialPosts;
    if (posts.length !== 2) issues.push('presentation socialPosts must contain exactly one EN and one AR preset.');
    const postLanguages = posts.map((post) => post.language);
    if (postLanguages.filter((language) => language === 'en').length !== 1 || postLanguages.filter((language) => language === 'ar').length !== 1) {
      issues.push('presentation socialPosts must contain exactly one EN and one AR preset.');
    }
    const postIds = new Set<string>();
    for (const post of posts) {
      if (!post.id) issues.push('presentation social post id must be non-empty.');
      if (postIds.has(post.id)) issues.push(`presentation social post id ${post.id} is duplicated.`);
      postIds.add(post.id);
      if (post.channel !== 'instagram') issues.push(`social post ${post.id} channel must be instagram.`);
      if (post.placement !== 'video_post') issues.push(`social post ${post.id} placement must be video_post.`);
      if (!isNonEmptyString(post.accountLabel)) issues.push(`social post ${post.id} accountLabel must be non-empty.`);
      if (!isNonEmptyString(post.caption)) issues.push(`social post ${post.id} caption must be non-empty.`);
      if (!isNonEmptyString(post.cta)) issues.push(`social post ${post.id} cta must be non-empty.`);
      if (!Array.isArray(post.hashtags) || post.hashtags.length === 0) issues.push(`social post ${post.id} hashtags must be non-empty.`);
      const expectedScript = post.language === 'en' ? en?.versionId : ar?.versionId;
      if (expectedScript && post.sourceScriptVersionId !== expectedScript) {
        issues.push(`social post ${post.id} must reference the ${post.language.toUpperCase()} preset script ${expectedScript}.`);
      }
      if (scriptLanguage.has(post.sourceScriptVersionId) && scriptLanguage.get(post.sourceScriptVersionId) !== post.language) {
        issues.push(`social post ${post.id} script language does not match the post language.`);
      }
      if (provided) {
        const video = provided.assets.find((asset) => asset.id === post.videoAssetId);
        if (!video) {
          issues.push(`social post ${post.id} references provided video ${post.videoAssetId}, which does not exist.`);
        } else {
          if (video.type !== 'final_preview_video') issues.push(`social post ${post.id} video must be a final preview video.`);
          if (!video.roles.includes('final_preview')) issues.push(`social post ${post.id} video must carry the final_preview role.`);
          if (finalPreviewAssetId && post.videoAssetId !== finalPreviewAssetId) {
            issues.push(`social post ${post.id} must use the same provided final preview video as the creative step.`);
          }
        }
      }
    }

    return issues;
  }

  /** Closed read-only journey projection. Never writes. */
  async getCampaignJourney(input: { campaignId: string; scenarioVersion: string }): Promise<ApiResult<CampaignJourney>> {
    try {
      if (!isNonEmptyString(input?.campaignId) || !isNonEmptyString(input?.scenarioVersion)) {
        return this.fail('INVALID_INPUT', 'input.campaignId and input.scenarioVersion are required.');
      }
      const bundle = await this.queries.getBundleForVersion(input.campaignId, input.scenarioVersion);
      if (!bundle) return this.fail('NOT_FOUND', `Unknown campaign ${input.campaignId} or scenario version ${input.scenarioVersion}.`);
      const campaignResult = await this.queries.getCampaign({
        campaignId: input.campaignId,
        scenarioVersion: input.scenarioVersion,
      });
      if (!campaignResult.ok) return this.fail(campaignResult.error.code, campaignResult.error.message);
      const view = campaignResult.data;

      // Reuse the existing opportunity projection; fall back to the exact bundle
      // projection only when the latest-version lookup resolves another package.
      const opportunityResult = await this.queries.getOpportunity({ opportunityId: bundle.analysis.id });
      const opportunity = opportunityResult.ok
        && opportunityResult.data.campaignId === input.campaignId
        && opportunityResult.data.scenarioVersion === input.scenarioVersion
        ? opportunityResult.data
        : this.queries.toOpportunityView(bundle);

      const en = view.versions.find((version) => version.origin === 'preset' && version.language === 'en') ?? null;
      const ar = view.versions.find((version) => version.origin === 'preset' && version.language === 'ar') ?? null;

      const providedResult = await this.getProvidedSet({
        campaignId: input.campaignId,
        scenarioId: bundle.ref.scenarioId,
        scenarioVersion: input.scenarioVersion,
      });
      const provided = providedResult.set;

      const issues: string[] = [];
      if (providedResult.issue) issues.push(providedResult.issue);
      const presentation = await this.loadPresentation(bundle);
      if (!presentation) {
        issues.push(this.source
          ? `No valid campaign presentation sidecar was found for ${bundle.ref.scenarioId}@${bundle.ref.scenarioVersion}.`
          : 'No campaign presentation source is configured for this workspace.');
      } else {
        issues.push(...(await this.validatePresentation(presentation, bundle, en, ar, provided)));
      }

      const workflow = await this.storage.getSocialWorkflow(socialWorkflowKey(input.campaignId, bundle.ref.packageHash));
      const drafts = workflow && workflow.scenarioVersion === input.scenarioVersion ? workflow.drafts : [];
      const attempts = workflow && workflow.scenarioVersion === input.scenarioVersion ? workflow.attempts : [];
      const ready = presentation !== null && issues.length === 0;

      return this.ok({
        campaign: view.campaign,
        opportunity,
        contentStatus: ready ? 'ready' : 'pending',
        presentation: ready ? presentation : null,
        selectedVersions: { en, ar },
        providedAssets: provided,
        socialDrafts: [...drafts],
        socialAttempts: [...attempts],
        contentIssue: ready ? null : issues.join(' '),
      });
    } catch (error) {
      return this.fail('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  /** Timestamp helper kept explicit so callers can display deterministic read times. */
  nowIso(): string {
    return this.now();
  }
}

export function createFlowQueries(deps: FlowQueryDeps): FlowQueries {
  return new FlowQueries(deps);
}
