import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { createMockApi } from '../../apps/web/demo/poc/api';
import type {
  ApiResult,
  CampaignJourney,
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
import { MemoryStorage } from '../../apps/web/demo/poc/storage';
import { IDS, SCENARIO_ID, SCENARIO_VERSION, createFixture } from '../fixtures/poc/build-fixture';

/*
 * TEST_ONLY synthetic fixture. NOT customer content, NOT a demo scenario and
 * never copied into scenarios/ or apps/web/public/. Every string below is a
 * technical marker so the projection/validation path can be exercised without
 * inventing or reusing authored marketing copy.
 */

const NOW = '2026-11-06T00:00:00.000Z';
const PACKAGE_HASH = createHash('sha256').update('TEST_ONLY_FLOW_PACKAGE_BYTES').digest('hex');
const PRODUCT_ASSET_ID = 'provided.test-only.product-original';
const HERO_ASSET_ID = 'provided.test-only.hero';
const VIDEO_ASSET_ID = 'provided.test-only.final-preview';

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

function buildProvidedSet(overrides: { contentStatus?: string; videoSha?: string } = {}): ProvidedAssetSet {
  const productBytes = fixtureData.media[IDS.productImage];
  const heroBytes = fixtureData.media[IDS.poster];
  const videoBytes = fixtureData.media[IDS.mp4];
  const base = {
    mappingVersion: '1.0.0',
    id: 'provided.test-only.flow',
    scenarioId: SCENARIO_ID,
    scenarioVersion: SCENARIO_VERSION,
    campaignId: IDS.brief,
    contentStatus: overrides.contentStatus ?? 'bound',
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
      {
        id: PRODUCT_ASSET_ID,
        type: 'product_original_image',
        label: 'TEST_ONLY product original',
        roles: ['product_identity', 'storyboard_source', 'deliverable_asset'],
        uri: '/scenario-media/scent-layering/1.0.0/product.png',
        mimeType: 'image/png',
        bytes: productBytes.byteLength,
        sha256: sha256(productBytes),
        productId: IDS.product,
        visibility: ['campaign_brief', 'atelier', 'library', 'deliverables'],
        source: 'user_provided',
        rightsScope: 'internal_demo',
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
      },
      {
        id: HERO_ASSET_ID,
        type: 'hero_image',
        label: 'TEST_ONLY hero',
        roles: ['hero', 'deliverable_asset'],
        uri: '/scenario-media/scent-layering/1.0.0/poster.png',
        mimeType: 'image/png',
        bytes: heroBytes.byteLength,
        sha256: sha256(heroBytes),
        productId: IDS.product,
        visibility: ['overview', 'opportunity', 'campaign_brief', 'atelier', 'library', 'deliverables'],
        source: 'user_provided',
        rightsScope: 'internal_demo',
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
      },
      {
        id: VIDEO_ASSET_ID,
        type: 'final_preview_video',
        label: 'TEST_ONLY final preview',
        roles: ['final_preview', 'deliverable_asset'],
        uri: '/scenario-media/scent-layering/1.0.0/video.mp4',
        mimeType: 'video/mp4',
        bytes: videoBytes.byteLength,
        sha256: overrides.videoSha ?? sha256(videoBytes),
        productId: IDS.product,
        visibility: ['atelier', 'library', 'deliverables'],
        source: 'user_provided',
        rightsScope: 'internal_demo',
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
      },
    ],
  };
  return base as unknown as ProvidedAssetSet;
}

function buildPresentation(overrides: Partial<CampaignPresentation> = {}): CampaignPresentation {
  const base: CampaignPresentation = {
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
        id: 'test-only.social.en',
        channel: 'instagram',
        placement: 'video_post',
        accountLabel: 'Lavish Perfumes · Demo account',
        language: 'en',
        sourceScriptVersionId: IDS.scriptEn,
        videoAssetId: VIDEO_ASSET_ID,
        caption: 'TEST_ONLY EN caption',
        cta: 'TEST_ONLY EN CTA',
        hashtags: ['#TEST_ONLY'],
      },
      {
        id: 'test-only.social.ar',
        channel: 'instagram',
        placement: 'video_post',
        accountLabel: 'Lavish Perfumes · Demo account',
        language: 'ar',
        sourceScriptVersionId: IDS.scriptAr,
        videoAssetId: VIDEO_ASSET_ID,
        caption: 'TEST_ONLY AR caption',
        cta: 'TEST_ONLY AR CTA',
        hashtags: ['#TEST_ONLY'],
      },
    ],
  };
  return { ...base, ...overrides };
}

interface ApiOptions {
  storage?: MemoryStorage;
  presentation?: CampaignPresentation | null;
  noPresentationSource?: boolean;
  providedSet?: ProvidedAssetSet | null;
  simulateFailure?: SocialCommandDeps['simulateFailure'];
}

function createApi(options: ApiOptions = {}): FlowAwareMockApi {
  const presentation = options.presentation === undefined ? buildPresentation() : options.presentation;
  const providedSet = options.providedSet === undefined ? buildProvidedSet() : options.providedSet;
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
    providedAssetSource: providedSet
      ? createProvidedAssetSource({
        loadAssetSet: () => providedSet,
        loadBytes: async (asset) => providedBytes[asset.id] ?? null,
      })
      : undefined,
    presentationSource: options.noPresentationSource
      ? undefined
      : createCampaignPresentationSource({ loadJson: () => presentation }),
    socialSimulateFailure: options.simulateFailure,
  });
}

function unwrap<T>(result: ApiResult<T>): T {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}

async function journeyOf(api: FlowAwareMockApi): Promise<CampaignJourney> {
  return unwrap(await api.getCampaignJourney({ campaignId: IDS.brief, scenarioVersion: SCENARIO_VERSION }));
}

describe('FLOW-001 · closed campaign journey projection', () => {
  test('ready journey binds the same campaign/opportunity/version/package/provided assets', async () => {
    const api = createApi();
    const journey = await journeyOf(api);
    expect(journey.contentStatus).toBe('ready');
    expect(journey.contentIssue).toBeNull();
    expect(journey.presentation).not.toBeNull();
    expect(journey.presentation?.scenarioId).toBe(SCENARIO_ID);
    expect(journey.presentation?.scenarioVersion).toBe(SCENARIO_VERSION);
    expect(journey.presentation?.packageHash).toBe(PACKAGE_HASH);
    expect(journey.presentation?.campaignId).toBe(IDS.brief);
    expect(journey.campaign.campaignId).toBe(IDS.brief);
    expect(journey.campaign.scenarioVersion).toBe(SCENARIO_VERSION);
    expect(journey.campaign.packageHash).toBe(PACKAGE_HASH);
    expect(journey.opportunity.opportunityId).toBe(IDS.analysis);
    expect(journey.opportunity.campaignId).toBe(IDS.brief);
    expect(journey.opportunity.scenarioVersion).toBe(SCENARIO_VERSION);
    expect(journey.opportunity.brief.id).toBe(IDS.brief);
    expect(journey.selectedVersions.en?.versionId).toBe(IDS.scriptEn);
    expect(journey.selectedVersions.ar?.versionId).toBe(IDS.scriptAr);
    expect(journey.selectedVersions.en?.language).toBe('en');
    expect(journey.selectedVersions.ar?.language).toBe('ar');
    expect(journey.providedAssets?.contentStatus).toBe('bound');
    expect(journey.providedAssets?.campaignId).toBe(IDS.brief);
    expect(journey.socialDrafts).toEqual([]);
    expect(journey.socialAttempts).toEqual([]);
  });

  test('browsing the journey and read-only social reads never write', async () => {
    const storage = new MemoryStorage();
    const api = createApi({ storage });
    await journeyOf(api);
    await journeyOf(api);
    expect(unwrap(await api.listSocialPosts({ campaignId: IDS.brief, scenarioVersion: SCENARIO_VERSION }))).toEqual({ drafts: [], attempts: [] });
    const missing = await api.getSocialDraft({ draftId: 'social-draft.unknown' });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.code).toBe('NOT_FOUND');
    expect(await storage.getSocialWorkflow(socialWorkflowKey(IDS.brief, PACKAGE_HASH))).toBeNull();
    expect(await storage.listSessions()).toEqual([]);
    expect(await storage.listWorkspaceLinks()).toEqual([]);
  });

  test('missing presentation sidecar is an honest pending with real available sections', async () => {
    const api = createApi({ presentation: null });
    const journey = await journeyOf(api);
    expect(journey.contentStatus).toBe('pending');
    expect(journey.presentation).toBeNull();
    expect(journey.contentIssue).toMatch(/presentation sidecar/i);
    // Available real sections are still returned; no fallback marketing copy is invented.
    expect(journey.campaign.campaignId).toBe(IDS.brief);
    expect(journey.opportunity.opportunityId).toBe(IDS.analysis);
    expect(journey.selectedVersions.en?.versionId).toBe(IDS.scriptEn);
    expect(journey.selectedVersions.ar?.versionId).toBe(IDS.scriptAr);
    expect(journey.providedAssets?.contentStatus).toBe('bound');
  });

  test('no presentation source configured is pending, not ready', async () => {
    const api = createApi({ noPresentationSource: true });
    const journey = await journeyOf(api);
    expect(journey.contentStatus).toBe('pending');
    expect(journey.presentation).toBeNull();
    expect(journey.contentIssue).toMatch(/presentation source/i);
  });

  test('packageHash cross-reference mismatch is pending, not a silent substitution', async () => {
    const api = createApi({ presentation: buildPresentation({ packageHash: 'f'.repeat(64) }) });
    const journey = await journeyOf(api);
    expect(journey.contentStatus).toBe('pending');
    expect(journey.presentation).toBeNull();
    expect(journey.contentIssue).toMatch(/packageHash/);
  });

  test('social preset language/script mismatch is pending', async () => {
    const presentation = buildPresentation();
    presentation.socialPosts[0] = { ...presentation.socialPosts[0], sourceScriptVersionId: IDS.scriptAr };
    const journey = await journeyOf(createApi({ presentation }));
    expect(journey.contentStatus).toBe('pending');
    expect(journey.contentIssue).toMatch(/EN preset script/i);
  });

  test('unbound provided assets are pending and honest', async () => {
    const api = createApi({ providedSet: buildProvidedSet({ contentStatus: 'awaiting_serenity_content' }) });
    const journey = await journeyOf(api);
    expect(journey.contentStatus).toBe('pending');
    expect(journey.providedAssets).toBeNull();
    expect(journey.contentIssue).toMatch(/not bound/i);
  });

  test('a provided video whose real bytes do not match the sidecar hash is pending', async () => {
    const api = createApi({ providedSet: buildProvidedSet({ videoSha: 'a'.repeat(64) }) });
    const journey = await journeyOf(api);
    expect(journey.contentStatus).toBe('pending');
    expect(journey.contentIssue).toMatch(/SHA-256/);
  });

  test('unknown campaign or explicit scenario version is NOT_FOUND', async () => {
    const api = createApi();
    const unknownCampaign = await api.getCampaignJourney({ campaignId: 'scn-scent-layering.brief.missing', scenarioVersion: SCENARIO_VERSION });
    expect(unknownCampaign.ok).toBe(false);
    if (!unknownCampaign.ok) expect(unknownCampaign.error.code).toBe('NOT_FOUND');
    const unknownVersion = await api.getCampaignJourney({ campaignId: IDS.brief, scenarioVersion: '9.9.9' });
    expect(unknownVersion.ok).toBe(false);
    if (!unknownVersion.ok) expect(unknownVersion.error.code).toBe('NOT_FOUND');
  });

  test('old package without a sidecar stays browsable as pending', async () => {
    // The fixture only publishes one version; asking for another returns NOT_FOUND,
    // while the published version with a missing sidecar is pending (above).
    const api = createApi({ presentation: null });
    const journey = await journeyOf(api);
    expect(journey.contentStatus).toBe('pending');
    expect(journey.campaign.products.length).toBeGreaterThan(0);
    expect(journey.campaign.images.length).toBeGreaterThan(0);
  });
});
