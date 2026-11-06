/**
 * FLOW-001 · Local social workflow commands.
 *
 * Explicit prepare/save/review/simulate commands over the SAME MockApi storage.
 * Only these commands write; every write is a single atomic `socialWorkflows`
 * aggregate put (drafts + immutable attempts + idempotency receipts) and every
 * success is reported only after the storage put has resolved. No external
 * service is called and no platform URL/metrics are fabricated.
 *
 * Idempotency: same idempotencyKey + same body replays the original ApiResult;
 * the same key with a different body returns IDEMPOTENCY_CONFLICT. Injected
 * provider failure (tests only) records a failed attempt, keeps the reviewed
 * draft intact and does not consume the key so a retry can create a new attempt.
 */
import type { ApiErrorCode, ApiMeta, ApiResult } from './types';
import type {
  GetSocialDraftResult,
  ListSocialPostsResult,
  PrepareSocialDraftInput,
  ReviewSocialDraftResult,
  SaveSocialDraftInput,
  SimulateSocialPublishInput,
  SimulateSocialPublishResult,
  SocialAttempt,
  SocialAttemptSnapshot,
  SocialCommandReceipt,
  SocialDraft,
  SocialWorkflowState,
} from './flow-contract';
import { socialWorkflowKey } from './flow-contract';
import type { FlowQueries } from './flow-queries';
import type { ProductQueries } from './product-queries';
import type { PocStorage } from '../storage/types';

export interface SocialFailureInjection {
  code: ApiErrorCode;
  message: string;
}

export interface SocialCommandDeps {
  queries: ProductQueries;
  flowQueries: FlowQueries;
  storage: PocStorage;
  now: () => string;
  /** TEST ONLY local provider-failure branch; never surfaced as a customer toggle. */
  simulateFailure?: (input: { draft: SocialDraft; attemptOrdinal: number }) => SocialFailureInjection | null;
}

const CAPTION_MAX_LENGTH = 2200;
const CTA_MAX_LENGTH = 150;
const HASHTAG_MAX_COUNT = 30;
const HASHTAG_MAX_LENGTH = 100;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('WebCrypto SHA-256 is unavailable.');
  const digest = await subtle.digest('SHA-256', bytes as unknown as BufferSource);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function shortKey(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function snapshotOf(draft: SocialDraft): SocialAttemptSnapshot {
  return {
    sourceScript: { ...draft.sourceScript },
    video: { ...draft.video },
    channel: draft.channel,
    placement: draft.placement,
    accountLabel: draft.accountLabel,
    language: draft.language,
    caption: draft.caption,
    cta: draft.cta,
    hashtags: [...draft.hashtags],
  };
}

function receiptKey(operation: string, idempotencyKey: string): string {
  return `${operation}|${idempotencyKey}`;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class SocialCommands {
  private readonly queries: ProductQueries;
  private readonly flowQueries: FlowQueries;
  private readonly storage: PocStorage;
  private readonly now: () => string;
  private readonly simulateFailure?: SocialCommandDeps['simulateFailure'];
  private requestCounter = 0;
  private mutex: Promise<unknown> = Promise.resolve();

  constructor(deps: SocialCommandDeps) {
    this.queries = deps.queries;
    this.flowQueries = deps.flowQueries;
    this.storage = deps.storage;
    this.now = deps.now;
    this.simulateFailure = deps.simulateFailure;
  }

  private serialized<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.mutex.then(operation, operation);
    this.mutex = run.catch(() => undefined);
    return run;
  }

  private meta(revision: number | null = null): ApiMeta {
    this.requestCounter += 1;
    return { mode: 'mock', schemaVersion: '1.0.0', requestId: `social-${this.requestCounter}`, sessionId: null, revision };
  }

  private ok<T>(data: T, revision: number | null = null): ApiResult<T> {
    return { ok: true, data, meta: this.meta(revision) };
  }

  private fail<T>(
    code: ApiErrorCode,
    message: string,
    fieldErrors: Array<{ path: string; message: string }> = [],
    revision: number | null = null,
  ): ApiResult<T> {
    return {
      ok: false,
      error: { code, message, fieldErrors, retryable: code === 'STORAGE_UNAVAILABLE' || code === 'STORAGE_QUOTA' },
      meta: this.meta(revision),
    };
  }

  private async bodyHash(operation: string, payload: Record<string, unknown>): Promise<string> {
    return sha256Hex(utf8(canonicalJson({ operation, ...payload })));
  }

  private findReceipt(state: SocialWorkflowState, operation: string, idempotencyKey: string): SocialCommandReceipt | null {
    const key = receiptKey(operation, idempotencyKey);
    return state.receipts.find((receipt) => receipt.key === key) ?? null;
  }

  private makeReceipt(
    operation: string,
    idempotencyKey: string,
    bodyHash: string,
    response: unknown,
    createdAt: string,
  ): SocialCommandReceipt {
    return { key: receiptKey(operation, idempotencyKey), operation, idempotencyKey, bodyHash, response, createdAt };
  }

  private replay<T>(receipt: SocialCommandReceipt, bodyHash: string): ApiResult<T> {
    if (receipt.bodyHash !== bodyHash) {
      return this.fail('IDEMPOTENCY_CONFLICT', 'This idempotency key was already used with a different request body.');
    }
    const response = receipt.response as { ok?: unknown } | null;
    if (!response || typeof response.ok !== 'boolean') {
      return this.fail('STORAGE_UNAVAILABLE', 'The stored idempotency receipt is malformed; no result was replayed.');
    }
    return response as ApiResult<T>;
  }

  private emptyState(campaignId: string, scenarioVersion: string, packageHash: string, now: string): SocialWorkflowState {
    return { campaignId, scenarioVersion, packageHash, drafts: [], attempts: [], receipts: [], updatedAt: now };
  }

  private replaceDraft(state: SocialWorkflowState, draft: SocialDraft): SocialWorkflowState {
    return { ...state, drafts: state.drafts.map((candidate) => (candidate.id === draft.id ? draft : candidate)) };
  }

  private async findDraft(draftId: string): Promise<{ state: SocialWorkflowState; draft: SocialDraft } | null> {
    const all = await this.storage.listSocialWorkflows();
    for (const state of all) {
      const draft = state.drafts.find((candidate) => candidate.id === draftId);
      if (draft) return { state, draft };
    }
    return null;
  }

  private async reviewHashOf(draft: SocialDraft, snapshot: SocialAttemptSnapshot): Promise<string> {
    return sha256Hex(utf8(canonicalJson({
      campaignId: draft.campaignId,
      scenarioVersion: draft.scenarioVersion,
      packageHash: draft.packageHash,
      snapshot,
    })));
  }

  /** Shared source validity check for review/simulate: saved text/video/language still current. */
  private async assertSourceStillValid(
    draft: SocialDraft,
  ): Promise<{ ok: true } | { ok: false; result: ApiResult<never> }> {
    const resolved = await this.queries.findVersion({
      campaignId: draft.campaignId,
      versionId: draft.sourceScript.versionId,
      sessionId: null,
    });
    if (!resolved) {
      return {
        ok: false,
        result: this.fail('INVALID_TRANSITION', 'The source script version no longer exists for this campaign package.') as ApiResult<never>,
      };
    }
    if (resolved.bundle.ref.scenarioVersion !== draft.scenarioVersion || resolved.bundle.ref.packageHash !== draft.packageHash) {
      return {
        ok: false,
        result: this.fail('INVALID_TRANSITION', 'The source script version belongs to a different campaign package.') as ApiResult<never>,
      };
    }
    if (resolved.version.language !== draft.language) {
      return {
        ok: false,
        result: this.fail('INVALID_TRANSITION', 'The source script language no longer matches this social draft.') as ApiResult<never>,
      };
    }
    if (resolved.version.confirmation !== 'confirmed_current') {
      return {
        ok: false,
        result: this.fail(
          'CONFIRMATION_REQUIRED',
          `The ${draft.language.toUpperCase()} source script is not confirmed. Open the creative step, confirm the script, then review the social post again.`,
        ) as ApiResult<never>,
      };
    }
    const providedResult = await this.flowQueries.getProvidedSet({
      campaignId: draft.campaignId,
      scenarioId: resolved.bundle.ref.scenarioId,
      scenarioVersion: draft.scenarioVersion,
    });
    if (!providedResult.set) {
      return {
        ok: false,
        result: this.fail('INVALID_TRANSITION', providedResult.issue ?? 'The provided assets are no longer available.') as ApiResult<never>,
      };
    }
    const asset = providedResult.set.assets.find((candidate) => candidate.id === draft.video.assetId);
    if (!asset) {
      return {
        ok: false,
        result: this.fail('ASSET_UNAVAILABLE', 'The provided preview video is no longer available for this campaign.') as ApiResult<never>,
      };
    }
    if (providedResult.set.id !== draft.video.assetSetId || asset.sha256 !== draft.video.sha256) {
      return {
        ok: false,
        result: this.fail('INVALID_TRANSITION', 'The provided preview video changed since this draft was created; re-prepare the draft.') as ApiResult<never>,
      };
    }
    const hashIssue = await this.flowQueries.verifyProvidedAsset(providedResult.set, asset);
    if (hashIssue) {
      return { ok: false, result: this.fail('ASSET_UNAVAILABLE', hashIssue) as ApiResult<never> };
    }
    return { ok: true };
  }

  // ------------------------------------------------------------------ prepare

  async prepareSocialDraft(input: PrepareSocialDraftInput): Promise<ApiResult<SocialDraft>> {
    return this.serialized(async () => {
      try {
        if (!input || typeof input !== 'object') return this.fail('INVALID_INPUT', 'input must be an object.');
        const { campaignId, scenarioVersion, presetPostId, idempotencyKey } = input;
        if (!isNonEmptyString(campaignId) || !isNonEmptyString(scenarioVersion) || !isNonEmptyString(presetPostId) || !isNonEmptyString(idempotencyKey)) {
          return this.fail('INVALID_INPUT', 'input.campaignId, input.scenarioVersion, input.presetPostId and input.idempotencyKey are required.');
        }
        const journeyResult = await this.flowQueries.getCampaignJourney({ campaignId, scenarioVersion });
        if (!journeyResult.ok) return this.fail(journeyResult.error.code, journeyResult.error.message);
        const journey = journeyResult.data;
        if (journey.contentStatus !== 'ready' || !journey.presentation || !journey.providedAssets) {
          return this.fail('NOT_FOUND', journey.contentIssue ?? 'The campaign presentation is not available for this campaign version.');
        }
        const preset = journey.presentation.socialPosts.find((post) => post.id === presetPostId);
        if (!preset) return this.fail('NOT_FOUND', `Unknown preset social post ${presetPostId} for this campaign version.`);
        const video = journey.providedAssets.assets.find((asset) => asset.id === preset.videoAssetId);
        if (!video) return this.fail('NOT_FOUND', `The preset video ${preset.videoAssetId} is not available in the provided asset set.`);

        const packageHash = journey.campaign.packageHash;
        const key = socialWorkflowKey(campaignId, packageHash);
        const now = this.now();
        const stored = await this.storage.getSocialWorkflow(key);
        const state = stored && stored.scenarioVersion === scenarioVersion
          ? stored
          : this.emptyState(campaignId, scenarioVersion, packageHash, now);
        const bodyHash = await this.bodyHash('prepareSocialDraft', { campaignId, scenarioVersion, presetPostId });
        const receipt = this.findReceipt(state, 'prepareSocialDraft', idempotencyKey);
        if (receipt) return this.replay<SocialDraft>(receipt, bodyHash);

        // One draft per preset post: reuse it and never overwrite user edits.
        const existing = state.drafts.find((draft) => draft.presetPostId === presetPostId);
        if (existing) {
          const response = this.ok(clone(existing), existing.revision);
          const nextState: SocialWorkflowState = {
            ...state,
            receipts: [...state.receipts, this.makeReceipt('prepareSocialDraft', idempotencyKey, bodyHash, response, now)],
            updatedAt: now,
          };
          await this.storage.putSocialWorkflow(nextState);
          return response;
        }

        const draft: SocialDraft = {
          id: `social-draft.${shortKey(`${campaignId}|${packageHash}|${presetPostId}`)}`,
          campaignId,
          scenarioVersion,
          packageHash,
          presetPostId,
          sourceScript: {
            campaignId,
            versionId: preset.sourceScriptVersionId,
            sessionId: null,
            scenarioVersion,
          },
          video: { assetSetId: journey.providedAssets.id, assetId: video.id, sha256: video.sha256 },
          language: preset.language,
          channel: preset.channel,
          placement: preset.placement,
          accountLabel: preset.accountLabel,
          caption: preset.caption,
          cta: preset.cta,
          hashtags: [...preset.hashtags],
          revision: 1,
          status: 'draft',
          reviewHash: null,
          createdAt: now,
          updatedAt: now,
        };
        const response = this.ok(clone(draft), draft.revision);
        const nextState: SocialWorkflowState = {
          ...state,
          drafts: [...state.drafts, draft],
          receipts: [...state.receipts, this.makeReceipt('prepareSocialDraft', idempotencyKey, bodyHash, response, now)],
          updatedAt: now,
        };
        await this.storage.putSocialWorkflow(nextState);
        const persisted = await this.storage.getSocialWorkflow(key);
        if (!persisted?.drafts.some((candidate) => candidate.id === draft.id)) {
          return this.fail('STORAGE_UNAVAILABLE', 'The social draft could not be stored; nothing was created.');
        }
        return response;
      } catch (error) {
        return this.fail('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
      }
    });
  }

  // --------------------------------------------------------------- read-only

  async getSocialDraft(input: { draftId: string }): Promise<ApiResult<GetSocialDraftResult>> {
    try {
      if (!input || !isNonEmptyString(input.draftId)) return this.fail('INVALID_INPUT', 'input.draftId is required.');
      const found = await this.findDraft(input.draftId);
      if (!found) return this.fail('NOT_FOUND', `Unknown social draft ${input.draftId}.`);
      const attempts = found.state.attempts.filter((attempt) => attempt.draftId === input.draftId);
      return this.ok({ draft: clone(found.draft), attempts: clone(attempts) }, found.draft.revision);
    } catch (error) {
      return this.fail('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  async listSocialPosts(input: { campaignId: string; scenarioVersion: string }): Promise<ApiResult<ListSocialPostsResult>> {
    try {
      if (!input || !isNonEmptyString(input.campaignId) || !isNonEmptyString(input.scenarioVersion)) {
        return this.fail('INVALID_INPUT', 'input.campaignId and input.scenarioVersion are required.');
      }
      const campaignResult = await this.queries.getCampaign({
        campaignId: input.campaignId,
        scenarioVersion: input.scenarioVersion,
      });
      if (!campaignResult.ok) return this.fail(campaignResult.error.code, campaignResult.error.message);
      const key = socialWorkflowKey(input.campaignId, campaignResult.data.campaign.packageHash);
      const state = await this.storage.getSocialWorkflow(key);
      if (!state || state.scenarioVersion !== input.scenarioVersion) return this.ok({ drafts: [], attempts: [] });
      return this.ok({ drafts: clone(state.drafts), attempts: clone(state.attempts) });
    } catch (error) {
      return this.fail('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  async getSocialPost(input: { attemptId: string }): Promise<ApiResult<SocialAttempt>> {
    try {
      if (!input || !isNonEmptyString(input.attemptId)) return this.fail('INVALID_INPUT', 'input.attemptId is required.');
      const all = await this.storage.listSocialWorkflows();
      for (const state of all) {
        const attempt = state.attempts.find((candidate) => candidate.id === input.attemptId);
        if (attempt) return this.ok(clone(attempt));
      }
      return this.fail('NOT_FOUND', `Unknown simulated social post ${input.attemptId}.`);
    } catch (error) {
      return this.fail('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
    }
  }

  // --------------------------------------------------------------------- save

  async saveSocialDraft(input: SaveSocialDraftInput): Promise<ApiResult<SocialDraft>> {
    return this.serialized(async () => {
      try {
        if (!input || typeof input !== 'object') return this.fail('INVALID_INPUT', 'input must be an object.');
        const { draftId, expectedRevision, idempotencyKey, caption, cta, hashtags } = input;
        if (!isNonEmptyString(draftId) || !isNonNegativeInteger(expectedRevision) || !isNonEmptyString(idempotencyKey)) {
          return this.fail('INVALID_INPUT', 'input.draftId, input.expectedRevision and input.idempotencyKey are required.');
        }
        const fieldErrors: Array<{ path: string; message: string }> = [];
        if (typeof caption !== 'string' || caption.trim().length === 0) {
          fieldErrors.push({ path: 'input.caption', message: 'Caption must be a non-empty string.' });
        } else if ([...caption].length > CAPTION_MAX_LENGTH) {
          fieldErrors.push({ path: 'input.caption', message: `Caption must be at most ${CAPTION_MAX_LENGTH} characters.` });
        }
        if (typeof cta !== 'string' || cta.trim().length === 0) {
          fieldErrors.push({ path: 'input.cta', message: 'Call to action must be a non-empty string.' });
        } else if ([...cta].length > CTA_MAX_LENGTH) {
          fieldErrors.push({ path: 'input.cta', message: `Call to action must be at most ${CTA_MAX_LENGTH} characters.` });
        }
        if (!Array.isArray(hashtags) || hashtags.length === 0) {
          fieldErrors.push({ path: 'input.hashtags', message: 'Hashtags must be a non-empty array.' });
        } else {
          if (hashtags.length > HASHTAG_MAX_COUNT) {
            fieldErrors.push({ path: 'input.hashtags', message: `At most ${HASHTAG_MAX_COUNT} hashtags are allowed.` });
          }
          hashtags.forEach((hashtag, index) => {
            if (typeof hashtag !== 'string' || hashtag.trim().length === 0 || [...hashtag].length > HASHTAG_MAX_LENGTH) {
              fieldErrors.push({ path: `input.hashtags[${index}]`, message: 'Each hashtag must be a non-empty string within the length limit.' });
            }
          });
        }
        if (fieldErrors.length > 0) return this.fail('INVALID_INPUT', 'The social post content is invalid.', fieldErrors);

        const found = await this.findDraft(draftId);
        if (!found) return this.fail('NOT_FOUND', `Unknown social draft ${draftId}.`);
        const { state, draft } = found;
        const bodyHash = await this.bodyHash('saveSocialDraft', { draftId, expectedRevision, caption, cta, hashtags });
        const receipt = this.findReceipt(state, 'saveSocialDraft', idempotencyKey);
        if (receipt) return this.replay<SocialDraft>(receipt, bodyHash);
        if (draft.revision !== expectedRevision) {
          return this.fail('REVISION_CONFLICT', `Expected revision ${expectedRevision}, current is ${draft.revision}.`, [], draft.revision);
        }
        const now = this.now();
        const nextDraft: SocialDraft = {
          ...draft,
          caption,
          cta,
          hashtags: [...hashtags],
          revision: draft.revision + 1,
          status: 'draft',
          reviewHash: null,
          updatedAt: now,
        };
        const response = this.ok(clone(nextDraft), nextDraft.revision);
        const nextState: SocialWorkflowState = {
          ...this.replaceDraft(state, nextDraft),
          receipts: [...state.receipts, this.makeReceipt('saveSocialDraft', idempotencyKey, bodyHash, response, now)],
          updatedAt: now,
        };
        await this.storage.putSocialWorkflow(nextState);
        const persisted = await this.storage.getSocialWorkflow(socialWorkflowKey(draft.campaignId, draft.packageHash));
        const storedDraft = persisted?.drafts.find((candidate) => candidate.id === draftId);
        if (!storedDraft || storedDraft.revision !== nextDraft.revision || storedDraft.status !== 'draft') {
          return this.fail('STORAGE_UNAVAILABLE', 'The social draft could not be saved; the previous revision is unchanged.');
        }
        return response;
      } catch (error) {
        return this.fail('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
      }
    });
  }

  // ------------------------------------------------------------------- review

  async reviewSocialDraft(input: { draftId: string; expectedRevision: number; idempotencyKey: string }): Promise<ApiResult<ReviewSocialDraftResult>> {
    return this.serialized(async () => {
      try {
        if (!input || typeof input !== 'object') return this.fail('INVALID_INPUT', 'input must be an object.');
        const { draftId, expectedRevision, idempotencyKey } = input;
        if (!isNonEmptyString(draftId) || !isNonNegativeInteger(expectedRevision) || !isNonEmptyString(idempotencyKey)) {
          return this.fail('INVALID_INPUT', 'input.draftId, input.expectedRevision and input.idempotencyKey are required.');
        }
        const found = await this.findDraft(draftId);
        if (!found) return this.fail('NOT_FOUND', `Unknown social draft ${draftId}.`);
        const { state, draft } = found;
        const bodyHash = await this.bodyHash('reviewSocialDraft', { draftId, expectedRevision });
        const receipt = this.findReceipt(state, 'reviewSocialDraft', idempotencyKey);
        if (receipt) return this.replay<ReviewSocialDraftResult>(receipt, bodyHash);
        if (draft.revision !== expectedRevision) {
          return this.fail('REVISION_CONFLICT', `Expected revision ${expectedRevision}, current is ${draft.revision}.`, [], draft.revision);
        }
        if (draft.status === 'published_simulated') {
          return this.fail('INVALID_TRANSITION', 'This draft was already simulated as published; edit and save it before reviewing again.', [], draft.revision);
        }
        const sourceCheck = await this.assertSourceStillValid(draft);
        if (!sourceCheck.ok) return sourceCheck.result;

        const snapshot = snapshotOf(draft);
        const reviewHash = await this.reviewHashOf(draft, snapshot);
        const now = this.now();
        const nextDraft: SocialDraft = {
          ...draft,
          status: 'ready',
          reviewHash,
          revision: draft.revision + 1,
          updatedAt: now,
        };
        const response = this.ok(clone({ draft: nextDraft, snapshot, reviewHash }), nextDraft.revision);
        const nextState: SocialWorkflowState = {
          ...this.replaceDraft(state, nextDraft),
          receipts: [...state.receipts, this.makeReceipt('reviewSocialDraft', idempotencyKey, bodyHash, response, now)],
          updatedAt: now,
        };
        await this.storage.putSocialWorkflow(nextState);
        const persisted = await this.storage.getSocialWorkflow(socialWorkflowKey(draft.campaignId, draft.packageHash));
        const storedDraft = persisted?.drafts.find((candidate) => candidate.id === draftId);
        if (!storedDraft || storedDraft.status !== 'ready' || storedDraft.reviewHash !== reviewHash) {
          return this.fail('STORAGE_UNAVAILABLE', 'The review could not be stored; the draft is unchanged.');
        }
        return response;
      } catch (error) {
        return this.fail('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
      }
    });
  }

  // ----------------------------------------------------------------- simulate

  async simulateSocialPublish(input: SimulateSocialPublishInput): Promise<ApiResult<SimulateSocialPublishResult>> {
    return this.serialized(async () => {
      try {
        if (!input || typeof input !== 'object') return this.fail('INVALID_INPUT', 'input must be an object.');
        const { draftId, expectedRevision, reviewHash, idempotencyKey } = input;
        if (!isNonEmptyString(draftId) || !isNonNegativeInteger(expectedRevision) || !isNonEmptyString(reviewHash) || !isNonEmptyString(idempotencyKey)) {
          return this.fail('INVALID_INPUT', 'input.draftId, input.expectedRevision, input.reviewHash and input.idempotencyKey are required.');
        }
        if (!SHA256_PATTERN.test(reviewHash)) return this.fail('INVALID_INPUT', 'input.reviewHash must be a lowercase SHA-256 hex string.');
        const found = await this.findDraft(draftId);
        if (!found) return this.fail('NOT_FOUND', `Unknown social draft ${draftId}.`);
        const { state, draft } = found;
        const bodyHash = await this.bodyHash('simulateSocialPublish', { draftId, expectedRevision, reviewHash });
        const receipt = this.findReceipt(state, 'simulateSocialPublish', idempotencyKey);
        if (receipt) return this.replay<SimulateSocialPublishResult>(receipt, bodyHash);
        if (draft.revision !== expectedRevision) {
          return this.fail('REVISION_CONFLICT', `Expected revision ${expectedRevision}, current is ${draft.revision}.`, [], draft.revision);
        }
        if (draft.status !== 'ready' || !draft.reviewHash) {
          return this.fail('INVALID_TRANSITION', 'Only a reviewed draft can be simulated as published.', [], draft.revision);
        }
        if (draft.reviewHash !== reviewHash) {
          return this.fail('INVALID_TRANSITION', 'The reviewHash does not match the saved reviewed draft; review the draft again.', [], draft.revision);
        }
        const snapshot = snapshotOf(draft);
        if ((await this.reviewHashOf(draft, snapshot)) !== draft.reviewHash) {
          return this.fail('INVALID_TRANSITION', 'The reviewed snapshot is no longer current; review the draft again.', [], draft.revision);
        }
        const sourceCheck = await this.assertSourceStillValid(draft);
        if (!sourceCheck.ok) return sourceCheck.result;

        const now = this.now();
        const attemptOrdinal = state.attempts.length + 1;
        const attemptId = `social-attempt.${shortKey(`${draft.id}|${draft.revision}|${draft.reviewHash}|${idempotencyKey}`)}.${attemptOrdinal}`;
        const failure = this.simulateFailure?.({ draft: clone(draft), attemptOrdinal }) ?? null;
        if (failure) {
          // Local injectable provider failure: keep the reviewed draft, record an
          // immutable failed attempt, and do not consume the idempotency key.
          const failedAttempt: SocialAttempt = {
            id: attemptId,
            draftId: draft.id,
            draftRevision: draft.revision,
            campaignId: draft.campaignId,
            scenarioVersion: draft.scenarioVersion,
            packageHash: draft.packageHash,
            mode: 'mock',
            status: 'failed_simulated',
            snapshot,
            reviewHash: draft.reviewHash,
            createdAt: now,
            error: { code: failure.code, message: failure.message },
          };
          const nextState: SocialWorkflowState = {
            ...state,
            attempts: [...state.attempts, failedAttempt],
            updatedAt: now,
          };
          await this.storage.putSocialWorkflow(nextState);
          const persisted = await this.storage.getSocialWorkflow(socialWorkflowKey(draft.campaignId, draft.packageHash));
          if (!persisted?.attempts.some((attempt) => attempt.id === attemptId)) {
            return this.fail('STORAGE_UNAVAILABLE', 'The simulated publish failed and its failed attempt could not be stored.', [], draft.revision);
          }
          return this.fail(failure.code, failure.message, [], draft.revision);
        }

        const attempt: SocialAttempt = {
          id: attemptId,
          draftId: draft.id,
          draftRevision: draft.revision,
          campaignId: draft.campaignId,
          scenarioVersion: draft.scenarioVersion,
          packageHash: draft.packageHash,
          mode: 'mock',
          status: 'published_simulated',
          snapshot,
          reviewHash: draft.reviewHash,
          createdAt: now,
          error: null,
        };
        const nextDraft: SocialDraft = { ...draft, status: 'published_simulated', updatedAt: now };
        const response = this.ok(clone({ attempt }), draft.revision);
        const nextState: SocialWorkflowState = {
          ...this.replaceDraft(state, nextDraft),
          attempts: [...state.attempts, attempt],
          receipts: [...state.receipts, this.makeReceipt('simulateSocialPublish', idempotencyKey, bodyHash, response, now)],
          updatedAt: now,
        };
        // Single atomic put: attempt + receipt + draft.status together.
        await this.storage.putSocialWorkflow(nextState);
        const persisted = await this.storage.getSocialWorkflow(socialWorkflowKey(draft.campaignId, draft.packageHash));
        const storedDraft = persisted?.drafts.find((candidate) => candidate.id === draft.id);
        const storedAttempt = persisted?.attempts.find((candidate) => candidate.id === attempt.id);
        if (!storedDraft || storedDraft.status !== 'published_simulated' || !storedAttempt) {
          return this.fail('STORAGE_UNAVAILABLE', 'The simulated post could not be committed; no success was reported.', [], draft.revision);
        }
        return response;
      } catch (error) {
        return this.fail('STORAGE_UNAVAILABLE', error instanceof Error ? error.message : String(error));
      }
    });
  }
}

export function createSocialCommands(deps: SocialCommandDeps): SocialCommands {
  return new SocialCommands(deps);
}
