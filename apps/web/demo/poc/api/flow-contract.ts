/**
 * FLOW-001 · Connected campaign journey projection + local social workflow.
 *
 * Main-controller contract: docs/SOCIAL_MOCK_CONTRACT.md (authoritative) and
 * docs/CONNECTED_MARKETING_FLOW.md. Types only; no frozen scenario schema,
 * AgentEvent, replay or email API is changed. The old MockApi members are
 * untouched; everything here is additive and is composed into
 * `FlowAwareMockApi` on the SAME browser MockApi/storage facade.
 */
import type { ApiResult } from './types';
import type {
  CampaignCard,
  OpportunityView,
  ProductLocale,
  ProductVersion,
} from './product-contract';
import type { AssetAwareMockApi, ProvidedAssetSet } from './provided-asset-contract';

// ---------------------------------------------------------------- presentation

export type PresentationLanguage = 'en' | 'ar';
export type PresentationStepRole = 'product_identity' | 'hero' | 'final_preview';
export type SocialChannel = 'instagram';
export type SocialPlacement = 'video_post';

export interface PresentationInsight {
  title: string;
  takeaway: string;
  signalIds: string[];
  trendIds: string[];
  evidenceIds: string[];
}

export interface PresentationStrategy {
  analysisId: string;
  briefId: string;
  whyThisProduct: string;
}

export interface PresentationCreativeStep {
  role: PresentationStepRole;
  assetId: string;
  explanation: string;
}

export interface PresentationCreative {
  title: string;
  /** Actual EN + AR preset script version ids for this package (never placeholders). */
  scriptVersionIds: string[];
  /** Exactly three steps, in role order: product_identity, hero, final_preview. */
  steps: PresentationCreativeStep[];
  relationship: 'illustrative_workflow_with_provided_assets';
}

export interface PresentationSocialPost {
  id: string;
  channel: SocialChannel;
  /** Local mock product option, not a platform API field. */
  placement: SocialPlacement;
  accountLabel: string;
  language: PresentationLanguage;
  sourceScriptVersionId: string;
  videoAssetId: string;
  caption: string;
  cta: string;
  hashtags: string[];
}

/**
 * Authored content sidecar (public/campaign-presentation/<slug>/<version>.json).
 * Text is authored elsewhere and is only surfaced when every reference closes;
 * this contract never invents fallback marketing copy.
 */
export interface CampaignPresentation {
  schemaVersion: '1.0.0';
  scenarioId: 'scn-scent-layering';
  scenarioVersion: string;
  /** SHA-256 of the exact published manifest.json bytes. */
  packageHash: string;
  campaignId: string;
  productIds: string[];
  mode: 'mock';
  insight: PresentationInsight;
  strategy: PresentationStrategy;
  creative: PresentationCreative;
  /** A must contain exactly one EN and one AR post. */
  socialPosts: PresentationSocialPost[];
}

// ------------------------------------------------------------- social workflow

export type SocialDraftStatus = 'draft' | 'ready' | 'published_simulated';
export type SocialAttemptStatus = 'published_simulated' | 'failed_simulated';

export interface SocialSourceScript {
  campaignId: string;
  versionId: string;
  /** null = preset package version (social posts always use a preset script). */
  sessionId: string | null;
  scenarioVersion: string;
}

export interface SocialVideoRef {
  assetSetId: string;
  assetId: string;
  sha256: string;
}

/**
 * Local social draft. `presetPostId` and `reviewHash` are additive audit fields
 * on top of the minimum contract field list: one draft per preset post is
 * reused, and a saved draft always clears its previous review hash.
 */
export interface SocialDraft {
  id: string;
  campaignId: string;
  scenarioVersion: string;
  packageHash: string;
  presetPostId: string;
  sourceScript: SocialSourceScript;
  video: SocialVideoRef;
  language: ProductLocale;
  channel: SocialChannel;
  placement: SocialPlacement;
  accountLabel: string;
  caption: string;
  cta: string;
  hashtags: string[];
  revision: number;
  status: SocialDraftStatus;
  reviewHash: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Immutable published/failed snapshot: never re-reads current presentation copy. */
export interface SocialAttemptSnapshot {
  sourceScript: SocialSourceScript;
  video: SocialVideoRef;
  channel: SocialChannel;
  placement: SocialPlacement;
  accountLabel: string;
  language: ProductLocale;
  caption: string;
  cta: string;
  hashtags: string[];
}

export interface SocialAttempt {
  id: string;
  draftId: string;
  draftRevision: number;
  campaignId: string;
  scenarioVersion: string;
  packageHash: string;
  mode: 'mock';
  status: SocialAttemptStatus;
  snapshot: SocialAttemptSnapshot;
  reviewHash: string;
  createdAt: string;
  error: null | { code: string; message: string };
}

export interface SocialCommandReceipt {
  key: string;
  operation: string;
  idempotencyKey: string;
  bodyHash: string;
  response: unknown;
  createdAt: string;
}

/** Single IndexedDB `socialWorkflows` aggregate, keyed `campaignId@packageHash`. */
export interface SocialWorkflowState {
  campaignId: string;
  scenarioVersion: string;
  packageHash: string;
  drafts: SocialDraft[];
  attempts: SocialAttempt[];
  receipts: SocialCommandReceipt[];
  updatedAt: string;
}

export function socialWorkflowKey(campaignId: string, packageHash: string): string {
  return `${campaignId}@${packageHash}`;
}

// -------------------------------------------------------------------- journey

export interface CampaignJourney {
  campaign: CampaignCard;
  opportunity: OpportunityView;
  contentStatus: 'pending' | 'ready';
  /** null whenever the sidecar is missing or any cross-reference does not close. */
  presentation: CampaignPresentation | null;
  selectedVersions: {
    en: ProductVersion | null;
    ar: ProductVersion | null;
  };
  providedAssets: ProvidedAssetSet | null;
  socialDrafts: SocialDraft[];
  socialAttempts: SocialAttempt[];
  /** Human-readable, honest reason for `pending`; null when ready. */
  contentIssue: string | null;
}

// ------------------------------------------------------------------------ API

export interface GetCampaignJourneyInput {
  campaignId: string;
  scenarioVersion: string;
}

export interface PrepareSocialDraftInput {
  campaignId: string;
  scenarioVersion: string;
  presetPostId: string;
  idempotencyKey: string;
}

export interface GetSocialDraftInput {
  draftId: string;
}

export interface ListSocialPostsInput {
  campaignId: string;
  scenarioVersion: string;
}

export interface ListSocialPostsResult {
  drafts: SocialDraft[];
  attempts: SocialAttempt[];
}

export interface GetSocialDraftResult {
  draft: SocialDraft;
  attempts: SocialAttempt[];
}

export interface SaveSocialDraftInput {
  draftId: string;
  expectedRevision: number;
  idempotencyKey: string;
  caption: string;
  cta: string;
  hashtags: string[];
}

export interface ReviewSocialDraftInput {
  draftId: string;
  expectedRevision: number;
  idempotencyKey: string;
}

export interface ReviewSocialDraftResult {
  draft: SocialDraft;
  /** Exact saved snapshot the review hash was computed over. */
  snapshot: SocialAttemptSnapshot;
  reviewHash: string;
}

export interface SimulateSocialPublishInput {
  draftId: string;
  expectedRevision: number;
  reviewHash: string;
  idempotencyKey: string;
}

export interface SimulateSocialPublishResult {
  attempt: SocialAttempt;
}

export interface GetSocialPostInput {
  attemptId: string;
}

/** Read-only journey projection. Never creates sessions, drafts or attempts. */
export interface CampaignJourneyApi {
  getCampaignJourney(input: GetCampaignJourneyInput): Promise<ApiResult<CampaignJourney>>;
}

/** Local social workflow commands; the only writers are prepare/save/review/simulate. */
export interface SocialWorkflowApi {
  prepareSocialDraft(input: PrepareSocialDraftInput): Promise<ApiResult<SocialDraft>>;
  getSocialDraft(input: GetSocialDraftInput): Promise<ApiResult<GetSocialDraftResult>>;
  listSocialPosts(input: ListSocialPostsInput): Promise<ApiResult<ListSocialPostsResult>>;
  saveSocialDraft(input: SaveSocialDraftInput): Promise<ApiResult<SocialDraft>>;
  reviewSocialDraft(input: ReviewSocialDraftInput): Promise<ApiResult<ReviewSocialDraftResult>>;
  simulateSocialPublish(input: SimulateSocialPublishInput): Promise<ApiResult<SimulateSocialPublishResult>>;
  getSocialPost(input: GetSocialPostInput): Promise<ApiResult<SocialAttempt>>;
}

/** Same browser MockApi facade + storage; not a second backend or Agent framework. */
export type FlowAwareMockApi = AssetAwareMockApi & CampaignJourneyApi & SocialWorkflowApi;
