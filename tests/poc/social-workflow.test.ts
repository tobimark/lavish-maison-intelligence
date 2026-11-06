import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { IDBFactory as FakeIDBFactory } from 'fake-indexeddb';
import { createMockApi } from '../../apps/web/demo/poc/api';
import type {
  ApiResult,
  CampaignPresentation,
  FlowAwareMockApi,
  LoadedScenario,
  ScenarioListItem,
  ScenarioSource,
} from '../../apps/web/demo/poc/api';
import { socialWorkflowKey } from '../../apps/web/demo/poc/api/flow-contract';
import { createCampaignPresentationSource } from '../../apps/web/demo/poc/api/flow-source';
import { createProvidedAssetSource } from '../../apps/web/demo/poc/api/provided-asset-source';
import type { ProvidedAssetSet } from '../../apps/web/demo/poc/api/provided-asset-contract';
import type { SocialCommandDeps } from '../../apps/web/demo/poc/api/flow-commands';
import { adaptContentOnlyPackage } from '../../apps/web/demo/poc/domain';
import { IndexedDbStorage, MemoryStorage } from '../../apps/web/demo/poc/storage';
import type { PocStorage, StoredProductExport } from '../../apps/web/demo/poc/storage';
import { IDS, SCENARIO_ID, SCENARIO_VERSION, createFixture } from '../fixtures/poc/build-fixture';

/*
 * TEST_ONLY synthetic fixture. NOT customer content, NOT a demo scenario and
 * never copied into scenarios/ or apps/web/public/. All text below is a
 * technical marker so the local social workflow can be exercised without
 * inventing or reusing authored marketing copy.
 */

const NOW = '2026-11-06T00:00:00.000Z';
const PACKAGE_HASH = createHash('sha256').update('TEST_ONLY_FLOW_PACKAGE_BYTES').digest('hex');
const PRODUCT_ASSET_ID = 'provided.test-only.product-original';
const HERO_ASSET_ID = 'provided.test-only.hero';
const VIDEO_ASSET_ID = 'provided.test-only.final-preview';
const EN_PRESET_ID = 'test-only.social.en';
const AR_PRESET_ID = 'test-only.social.ar';

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
}

function buildFixturePackage() {
  const fixture = createFixture();
  const files = fixture.files as Record<string, any>;
  const pkg = {
    manifest: files['manifest.json'],
    brand: files['brand.json'],
    discovery: files['discovery.json'],
    analysis: files['analysis.json'],
    script: files['script.json'],
    video: files['video.json'],
    delivery: files['delivery.json'],
    events: files['events.json'],
    assets: files['assets.json'],
    expected: files['expected.json'],
  };
  const media: Record<string, Uint8Array> = {};
  for (const asset of pkg.assets.data.assets) {
    const name = String(asset.uri).split('/').pop();
    const bytes = fixture.media[name];
    if (bytes) media[asset.id] = new Uint8Array(bytes);
  }
  return { files, pkg, media };
}

const fixtureData = buildFixturePackage();

function makeSource(): ScenarioSource {
  const loaded: LoadedScenario = {
    scenarioId: SCENARIO_ID,
    scenarioVersion: SCENARIO_VERSION,
    packageHash: PACKAGE_HASH,
    package: adaptContentOnlyPackage(fixtureData.pkg as any),
    media: fixtureData.media,
    profile: 'content_only',
    contentPackage: fixtureData.pkg as any,
  };
  const listItem: ScenarioListItem = {
    scenarioId: SCENARIO_ID,
    title: 'TEST_ONLY flow fixture',
    scenarioVersion: SCENARIO_VERSION,
    readiness: 'ready',
    profile: 'content_only',
    issues: [],
  };
  return {
    async list() {
      return [listItem];
    },
    async get(scenarioId, scenarioVersion) {
      return scenarioId === SCENARIO_ID && scenarioVersion === SCENARIO_VERSION ? loaded : null;
    },
  };
}

function buildProvidedSet(): ProvidedAssetSet {
  const productBytes = fixtureData.media[IDS.productImage];
  const heroBytes = fixtureData.media[IDS.poster];
  const videoBytes = fixtureData.media[IDS.mp4];
  const asset = (input: {
    id: string;
    type: string;
    label: string;
    roles: string[];
    uri: string;
    mimeType: string;
    bytes: Uint8Array;
    visibility: string[];
    metadata: Record<string, unknown>;
  }) => ({
    id: input.id,
    type: input.type,
    label: input.label,
    roles: input.roles,
    uri: input.uri,
    mimeType: input.mimeType,
    bytes: input.bytes.byteLength,
    sha256: sha256(input.bytes),
    productId: IDS.product,
    visibility: input.visibility,
    source: 'user_provided',
    rightsScope: 'internal_demo',
    metadata: input.metadata,
  });
  const base = {
    mappingVersion: '1.0.0',
    id: 'provided.test-only.flow',
    scenarioId: SCENARIO_ID,
    scenarioVersion: SCENARIO_VERSION,
    campaignId: IDS.brief,
    contentStatus: 'bound',
    product: {
      id: IDS.product,
      officialName: 'SERENITY',
      sku: 'TEST_ONLY-SKU',
      factsSourceUrl: 'https://example.invalid/test-only',
      verifiedFacts: ['TEST_ONLY verified fact; not a product claim'],
      identityAssetId: PRODUCT_ASSET_ID,
      campaignRole: 'featured_product',
    },
    assets: [
      asset({
        id: PRODUCT_ASSET_ID,
        type: 'product_original_image',
        label: 'TEST_ONLY product original',
        roles: ['product_identity', 'storyboard_source', 'deliverable_asset'],
        uri: '/scenario-media/scent-layering/1.0.0/product.png',
        mimeType: 'image/png',
        bytes: productBytes,
        visibility: ['campaign_brief', 'atelier', 'library', 'deliverables'],
        metadata: {
          width: 1,
          height: 1,
          durationMs: null,
          frameRate: null,
          videoCodec: null,
          pixelFormat: null,
          audioCodec: null,
          posterAssetId: null,
          posterRole: null,
          scriptBinding: 'not_applicable',
          disclosure: 'TEST_ONLY fixture asset; not a client asset',
        },
      }),
      asset({
        id: HERO_ASSET_ID,
        type: 'hero_image',
        label: 'TEST_ONLY hero',
        roles: ['hero', 'deliverable_asset'],
        uri: '/scenario-media/scent-layering/1.0.0/poster.png',
        mimeType: 'image/png',
        bytes: heroBytes,
        visibility: ['overview', 'opportunity', 'campaign_brief', 'atelier', 'library', 'deliverables'],
        metadata: {
          width: 1,
          height: 1,
          durationMs: null,
          frameRate: null,
          videoCodec: null,
          pixelFormat: null,
          audioCodec: null,
          posterAssetId: null,
          posterRole: null,
          scriptBinding: 'not_applicable',
          disclosure: 'TEST_ONLY fixture asset; not a client asset',
        },
      }),
      asset({
        id: VIDEO_ASSET_ID,
        type: 'final_preview_video',
        label: 'TEST_ONLY final preview',
        roles: ['final_preview', 'deliverable_asset'],
        uri: '/scenario-media/scent-layering/1.0.0/video.mp4',
        mimeType: 'video/mp4',
        bytes: videoBytes,
        visibility: ['atelier', 'library', 'deliverables'],
        metadata: {
          width: 1080,
          height: 1920,
          durationMs: 10080,
          frameRate: 24,
          videoCodec: 'h264',
          pixelFormat: 'yuv420p',
          audioCodec: 'aac',
          posterAssetId: HERO_ASSET_ID,
          posterRole: 'hero_reference',
          scriptBinding: 'independent_provided_preview',
          disclosure: 'TEST_ONLY fixture asset; not a client asset',
        },
      }),
    ],
  };
  return base as unknown as ProvidedAssetSet;
}

function buildPresentation(): CampaignPresentation {
  return {
    schemaVersion: '1.0.0',
    scenarioId: SCENARIO_ID as 'scn-scent-layering',
    scenarioVersion: SCENARIO_VERSION,
    packageHash: PACKAGE_HASH,
    campaignId: IDS.brief,
    productIds: [IDS.product],
    mode: 'mock',
    insight: {
      title: 'TEST_ONLY insight title',
      takeaway: 'TEST_ONLY insight takeaway; no customer claim',
      signalIds: [IDS.signal],
      trendIds: [IDS.trend],
      evidenceIds: [IDS.evidence],
    },
    strategy: {
      analysisId: IDS.analysis,
      briefId: IDS.brief,
      whyThisProduct: 'TEST_ONLY why-this-product explanation',
    },
    creative: {
      title: 'TEST_ONLY creative title',
      scriptVersionIds: [IDS.scriptEn, IDS.scriptAr],
      steps: [
        { role: 'product_identity', assetId: PRODUCT_ASSET_ID, explanation: 'TEST_ONLY product identity explanation' },
        { role: 'hero', assetId: HERO_ASSET_ID, explanation: 'TEST_ONLY hero explanation' },
        { role: 'final_preview', assetId: VIDEO_ASSET_ID, explanation: 'TEST_ONLY final preview explanation' },
      ],
      relationship: 'illustrative_workflow_with_provided_assets',
    },
    socialPosts: [
      {
        id: EN_PRESET_ID,
        channel: 'instagram',
        placement: 'video_post',
        accountLabel: 'Lavish Perfumes · Demo account',
        language: 'en',
        sourceScriptVersionId: IDS.scriptEn,
        videoAssetId: VIDEO_ASSET_ID,
        caption: 'TEST_ONLY EN preset caption',
        cta: 'TEST_ONLY EN preset CTA',
        hashtags: ['#TEST_ONLY'],
      },
      {
        id: AR_PRESET_ID,
        channel: 'instagram',
        placement: 'video_post',
        accountLabel: 'Lavish Perfumes · Demo account',
        language: 'ar',
        sourceScriptVersionId: IDS.scriptAr,
        videoAssetId: VIDEO_ASSET_ID,
        caption: 'TEST_ONLY AR preset caption',
        cta: 'TEST_ONLY AR preset CTA',
        hashtags: ['#TEST_ONLY'],
      },
    ],
  };
}

interface ApiOptions {
  storage?: PocStorage;
  simulateFailure?: SocialCommandDeps['simulateFailure'];
}

function createApi(options: ApiOptions = {}): FlowAwareMockApi {
  const presentation = buildPresentation();
  const providedSet = buildProvidedSet();
  const providedBytes: Record<string, Uint8Array> = {
    [PRODUCT_ASSET_ID]: fixtureData.media[IDS.productImage],
    [HERO_ASSET_ID]: fixtureData.media[IDS.poster],
    [VIDEO_ASSET_ID]: fixtureData.media[IDS.mp4],
  };
  return createMockApi({
    scenarioSource: makeSource(),
    storage: options.storage ?? new MemoryStorage(),
    now: () => NOW,
    virtualNow: () => 0,
    providedAssetSource: createProvidedAssetSource({
      loadAssetSet: () => providedSet,
      loadBytes: async (asset) => providedBytes[asset.id] ?? null,
    }),
    presentationSource: createCampaignPresentationSource({ loadJson: () => presentation }),
    socialSimulateFailure: options.simulateFailure,
  });
}

function unwrap<T>(result: ApiResult<T>): T {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}

async function prepareDraft(api: FlowAwareMockApi, presetPostId = EN_PRESET_ID, key = 'prepare-1') {
  return unwrap(await api.prepareSocialDraft({
    campaignId: IDS.brief,
    scenarioVersion: SCENARIO_VERSION,
    presetPostId,
    idempotencyKey: key,
  }));
}

/** Explicitly confirms the preset EN script through the existing confirmation command. */
async function confirmPresetScript(api: FlowAwareMockApi, scriptVersionId = IDS.scriptEn): Promise<void> {
  const edit = unwrap(await api.beginCampaignEdit({
    campaignId: IDS.brief,
    versionId: scriptVersionId,
    sessionId: null,
    idempotencyKey: `edit:${scriptVersionId}`,
  }));
  expect(edit.session.workflow.analysis).toBe('awaiting_confirmation');
  const confirmed = unwrap(await api.confirmScript(
    { sessionId: edit.session.id, expectedRevision: edit.session.revision, idempotencyKey: `confirm:${scriptVersionId}` },
    { scriptVersionId },
  ));
  expect(confirmed.workflow.analysis).toBe('completed');
}

async function savedDraft(api: FlowAwareMockApi) {
  const draft = await prepareDraft(api);
  return unwrap(await api.saveSocialDraft({
    draftId: draft.id,
    expectedRevision: draft.revision,
    idempotencyKey: 'save-1',
    caption: 'TEST_ONLY saved caption',
    cta: 'TEST_ONLY saved CTA',
    hashtags: ['#TEST_ONLY', '#FLOW'],
  }));
}

async function reviewedDraft(api: FlowAwareMockApi) {
  const saved = await savedDraft(api);
  await confirmPresetScript(api);
  return unwrap(await api.reviewSocialDraft({
    draftId: saved.id,
    expectedRevision: saved.revision,
    idempotencyKey: 'review-1',
  }));
}

describe('FLOW-001 · local social draft workflow', () => {
  test('prepare is explicit, creates one draft revision 1 and reuses it without overwriting edits', async () => {
    const storage = new MemoryStorage();
    const api = createApi({ storage });
    const draft = await prepareDraft(api);
    expect(draft.revision).toBe(1);
    expect(draft.status).toBe('draft');
    expect(draft.reviewHash).toBeNull();
    expect(draft.presetPostId).toBe(EN_PRESET_ID);
    expect(draft.campaignId).toBe(IDS.brief);
    expect(draft.scenarioVersion).toBe(SCENARIO_VERSION);
    expect(draft.packageHash).toBe(PACKAGE_HASH);
    expect(draft.language).toBe('en');
    expect(draft.channel).toBe('instagram');
    expect(draft.placement).toBe('video_post');
    expect(draft.sourceScript.versionId).toBe(IDS.scriptEn);
    expect(draft.video.assetId).toBe(VIDEO_ASSET_ID);
    expect(draft.video.sha256).toBe(sha256(fixtureData.media[IDS.mp4]));
    expect(draft.caption).toBe('TEST_ONLY EN preset caption');

    const again = await prepareDraft(api, EN_PRESET_ID, 'prepare-2');
    expect(again.id).toBe(draft.id);
    expect(again.revision).toBe(1);
    expect(again.caption).toBe(draft.caption);

    const saved = unwrap(await api.saveSocialDraft({
      draftId: draft.id,
      expectedRevision: draft.revision,
      idempotencyKey: 'save-before-reuse',
      caption: 'TEST_ONLY edited caption',
      cta: 'TEST_ONLY edited CTA',
      hashtags: ['#TEST_ONLY'],
    }));
    const reused = await prepareDraft(api, EN_PRESET_ID, 'prepare-3');
    expect(reused.id).toBe(draft.id);
    expect(reused.revision).toBe(saved.revision);
    expect(reused.caption).toBe('TEST_ONLY edited caption');
  });

  test('read-only social reads do not write anything', async () => {
    const storage = new MemoryStorage();
    const api = createApi({ storage });
    const draft = await prepareDraft(api);
    const before = await storage.getSocialWorkflow(socialWorkflowKey(IDS.brief, PACKAGE_HASH));
    unwrap(await api.getSocialDraft({ draftId: draft.id }));
    unwrap(await api.listSocialPosts({ campaignId: IDS.brief, scenarioVersion: SCENARIO_VERSION }));
    const missingPost = await api.getSocialPost({ attemptId: 'social-attempt.unknown' });
    expect(missingPost.ok).toBe(false);
    if (!missingPost.ok) expect(missingPost.error.code).toBe('NOT_FOUND');
    const after = await storage.getSocialWorkflow(socialWorkflowKey(IDS.brief, PACKAGE_HASH));
    expect(JSON.stringify(after)).toBe(JSON.stringify(before));
  });

  test('save persists the exact text across a refresh and rejects a stale revision', async () => {
    const storage = new MemoryStorage();
    const api = createApi({ storage });
    const draft = await prepareDraft(api);
    const saved = unwrap(await api.saveSocialDraft({
      draftId: draft.id,
      expectedRevision: 1,
      idempotencyKey: 'save-refresh',
      caption: 'TEST_ONLY persisted caption',
      cta: 'TEST_ONLY persisted CTA',
      hashtags: ['#TEST_ONLY', '#PERSIST'],
    }));
    expect(saved.revision).toBe(2);
    expect(saved.status).toBe('draft');

    // A fresh API instance on the same storage behaves like a page refresh.
    const refreshed = createApi({ storage });
    const reread = unwrap(await refreshed.getSocialDraft({ draftId: draft.id }));
    expect(reread.draft.revision).toBe(2);
    expect(reread.draft.caption).toBe('TEST_ONLY persisted caption');
    expect(reread.draft.cta).toBe('TEST_ONLY persisted CTA');
    expect(reread.draft.hashtags).toEqual(['#TEST_ONLY', '#PERSIST']);
    expect(reread.attempts).toEqual([]);

    const stale = await refreshed.saveSocialDraft({
      draftId: draft.id,
      expectedRevision: 1,
      idempotencyKey: 'save-stale',
      caption: 'TEST_ONLY stale caption',
      cta: 'TEST_ONLY stale CTA',
      hashtags: ['#TEST_ONLY'],
    });
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error.code).toBe('REVISION_CONFLICT');
  });

  test('review requires the existing script confirmation and uses the exact saved snapshot', async () => {
    const api = createApi();
    const saved = await savedDraft(api);
    const blocked = await api.reviewSocialDraft({
      draftId: saved.id,
      expectedRevision: saved.revision,
      idempotencyKey: 'review-unconfirmed',
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.error.code).toBe('CONFIRMATION_REQUIRED');
      expect(blocked.error.message).toMatch(/creative step|confirm/i);
    }

    await confirmPresetScript(api);
    const review = unwrap(await api.reviewSocialDraft({
      draftId: saved.id,
      expectedRevision: saved.revision,
      idempotencyKey: 'review-confirmed',
    }));
    expect(review.draft.status).toBe('ready');
    expect(review.draft.revision).toBe(saved.revision + 1);
    expect(review.reviewHash).toMatch(/^[0-9a-f]{64}$/);
    expect(review.draft.reviewHash).toBe(review.reviewHash);
    expect(review.snapshot.caption).toBe(saved.caption);
    expect(review.snapshot.cta).toBe(saved.cta);
    expect(review.snapshot.hashtags).toEqual(saved.hashtags);
    expect(review.snapshot.language).toBe('en');
    expect(review.snapshot.video.assetId).toBe(VIDEO_ASSET_ID);
    expect(review.snapshot.video.sha256).toBe(saved.video.sha256);
    expect(review.snapshot.sourceScript.versionId).toBe(IDS.scriptEn);

    const staleReview = await api.reviewSocialDraft({
      draftId: saved.id,
      expectedRevision: saved.revision,
      idempotencyKey: 'review-stale',
    });
    expect(staleReview.ok).toBe(false);
    if (!staleReview.ok) expect(staleReview.error.code).toBe('REVISION_CONFLICT');
  });

  test('save after review clears ready and every stale reviewHash is rejected', async () => {
    const api = createApi();
    const review = await reviewedDraft(api);
    const edited = unwrap(await api.saveSocialDraft({
      draftId: review.draft.id,
      expectedRevision: review.draft.revision,
      idempotencyKey: 'save-after-review',
      caption: 'TEST_ONLY caption after review',
      cta: 'TEST_ONLY CTA after review',
      hashtags: ['#TEST_ONLY'],
    }));
    expect(edited.status).toBe('draft');
    expect(edited.reviewHash).toBeNull();

    const staleHash = await api.simulateSocialPublish({
      draftId: edited.id,
      expectedRevision: edited.revision,
      reviewHash: review.reviewHash,
      idempotencyKey: 'publish-stale-hash',
    });
    expect(staleHash.ok).toBe(false);
    if (!staleHash.ok) expect(staleHash.error.code).toBe('INVALID_TRANSITION');

    const rereviewed = unwrap(await api.reviewSocialDraft({
      draftId: edited.id,
      expectedRevision: edited.revision,
      idempotencyKey: 'review-after-edit',
    }));
    expect(rereviewed.reviewHash).not.toBe(review.reviewHash);
    const oldHashAfterRereview = await api.simulateSocialPublish({
      draftId: rereviewed.draft.id,
      expectedRevision: rereviewed.draft.revision,
      reviewHash: review.reviewHash,
      idempotencyKey: 'publish-old-hash',
    });
    expect(oldHashAfterRereview.ok).toBe(false);
    if (!oldHashAfterRereview.ok) expect(oldHashAfterRereview.error.code).toBe('INVALID_TRANSITION');
  });

  test('simulated publish is atomic, idempotent and keeps old attempts immutable', async () => {
    const api = createApi();
    const review = await reviewedDraft(api);
    const input = {
      draftId: review.draft.id,
      expectedRevision: review.draft.revision,
      reviewHash: review.reviewHash,
      idempotencyKey: 'publish-1',
    };
    const published = unwrap(await api.simulateSocialPublish(input));
    expect(published.attempt.status).toBe('published_simulated');
    expect(published.attempt.mode).toBe('mock');
    expect(published.attempt.error).toBeNull();
    expect(published.attempt.reviewHash).toBe(review.reviewHash);
    expect(published.attempt.draftRevision).toBe(review.draft.revision);
    expect(published.attempt.snapshot.caption).toBe(review.snapshot.caption);
    expect(published.attempt.snapshot.video.sha256).toBe(review.snapshot.video.sha256);

    const draftAfter = unwrap(await api.getSocialDraft({ draftId: review.draft.id }));
    expect(draftAfter.draft.status).toBe('published_simulated');
    expect(draftAfter.draft.revision).toBe(review.draft.revision);
    expect(draftAfter.attempts).toHaveLength(1);

    const replay = unwrap(await api.simulateSocialPublish(input));
    expect(replay.attempt.id).toBe(published.attempt.id);
    expect(unwrap(await api.listSocialPosts({ campaignId: IDS.brief, scenarioVersion: SCENARIO_VERSION })).attempts).toHaveLength(1);

    const conflict = await api.simulateSocialPublish({ ...input, reviewHash: 'a'.repeat(64) });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.error.code).toBe('IDEMPOTENCY_CONFLICT');

    const post = unwrap(await api.getSocialPost({ attemptId: published.attempt.id }));
    expect(post.snapshot.caption).toBe(review.snapshot.caption);

    // Editing after publish moves the draft back to draft; the old post snapshot is unchanged.
    const edited = unwrap(await api.saveSocialDraft({
      draftId: review.draft.id,
      expectedRevision: review.draft.revision,
      idempotencyKey: 'save-after-publish',
      caption: 'TEST_ONLY edited after publish',
      cta: 'TEST_ONLY CTA after publish',
      hashtags: ['#TEST_ONLY'],
    }));
    expect(edited.status).toBe('draft');
    expect(edited.revision).toBe(review.draft.revision + 1);
    const oldPost = unwrap(await api.getSocialPost({ attemptId: published.attempt.id }));
    expect(oldPost.snapshot.caption).toBe(review.snapshot.caption);
    expect(oldPost.snapshot.caption).not.toBe('TEST_ONLY edited after publish');
    expect(unwrap(await api.listSocialPosts({ campaignId: IDS.brief, scenarioVersion: SCENARIO_VERSION })).attempts).toHaveLength(1);
  });

  test('injected simulated failure keeps the reviewed draft, records a failed attempt and retry succeeds', async () => {
    let calls = 0;
    const api = createApi({
      simulateFailure: ({ attemptOrdinal }) => {
        calls += 1;
        return attemptOrdinal === 1
          ? { code: 'MOCK_FAILURE', message: 'TEST_ONLY simulated provider failure' }
          : null;
      },
    });
    const review = await reviewedDraft(api);
    const input = {
      draftId: review.draft.id,
      expectedRevision: review.draft.revision,
      reviewHash: review.reviewHash,
      idempotencyKey: 'publish-with-failure',
    };
    const failed = await api.simulateSocialPublish(input);
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.error.code).toBe('MOCK_FAILURE');
    expect(calls).toBe(1);

    const afterFailure = unwrap(await api.getSocialDraft({ draftId: review.draft.id }));
    expect(afterFailure.draft.status).toBe('ready');
    expect(afterFailure.draft.revision).toBe(review.draft.revision);
    expect(afterFailure.attempts).toHaveLength(1);
    expect(afterFailure.attempts[0].status).toBe('failed_simulated');
    expect(afterFailure.attempts[0].error?.code).toBe('MOCK_FAILURE');
    expect(afterFailure.attempts[0].snapshot.caption).toBe(review.snapshot.caption);

    // Same key/body retry: the failed attempt did not consume the idempotency key.
    const retried = unwrap(await api.simulateSocialPublish(input));
    expect(retried.attempt.status).toBe('published_simulated');
    expect(calls).toBe(2);
    const posts = unwrap(await api.listSocialPosts({ campaignId: IDS.brief, scenarioVersion: SCENARIO_VERSION }));
    expect(posts.attempts).toHaveLength(2);
    expect(posts.attempts[0].status).toBe('failed_simulated');
    expect(posts.attempts[0].error?.code).toBe('MOCK_FAILURE');
    expect(posts.attempts[1].status).toBe('published_simulated');
    const failedPost = unwrap(await api.getSocialPost({ attemptId: posts.attempts[0].id }));
    expect(failedPost.status).toBe('failed_simulated');
  });

  test('DB version 2 -> 3 migration preserves sessions, workspace links and product exports and adds socialWorkflows', async () => {
    const factory = new FakeIDBFactory();
    const dbName = `lavish-poc-flow-migration-${Date.now()}`;
    const v2 = new IndexedDbStorage({ factory, dbName, version: 2 });
    await v2.open();
    const apiV2 = createApi({ storage: v2 });
    const session = unwrap(await apiV2.createSession({
      scenarioId: SCENARIO_ID,
      scenarioVersion: SCENARIO_VERSION,
      creationKey: 'migration-session',
    }));
    expect(session.storageMode).toBe('indexeddb');
    await v2.putWorkspaceLink({ campaignId: IDS.brief, packageHash: PACKAGE_HASH, sessionId: session.id });
    const legacyExport = {
      record: {
        id: 'export.test-only.migration',
        campaign: {
          campaignId: IDS.brief,
          opportunityId: IDS.analysis,
          scenarioId: SCENARIO_ID,
          scenarioVersion: SCENARIO_VERSION,
          packageHash: PACKAGE_HASH,
        },
      },
      download: {
        blob: new Uint8Array([1, 2, 3]),
        filename: 'test-only.zip',
        mimeType: 'application/zip',
        bytes: 3,
        sha256: 'a'.repeat(64),
      },
    } as unknown as StoredProductExport;
    await v2.putProductExport(legacyExport);
    await v2.close();

    const v3 = new IndexedDbStorage({ factory, dbName });
    await v3.open();
    const sessions = await v3.listSessions();
    expect(sessions.map((record) => record.id)).toContain(session.id);
    expect((await v3.getSession(session.id))?.revision).toBe(0);
    expect((await v3.listWorkspaceLinks()).map((link) => link.sessionId)).toContain(session.id);
    expect((await v3.listProductExports()).map((value) => value.record.id)).toContain('export.test-only.migration');

    // The new v3 socialWorkflows store is usable through the same facade.
    const apiV3 = createApi({ storage: v3 });
    const draft = await prepareDraft(apiV3, EN_PRESET_ID, 'migrate-prepare');
    expect(draft.revision).toBe(1);
    const workflow = await v3.getSocialWorkflow(socialWorkflowKey(IDS.brief, PACKAGE_HASH));
    expect(workflow).not.toBeNull();
    expect(workflow?.drafts.map((candidate) => candidate.id)).toContain(draft.id);
    await v3.close();
  });
});
