/**
 * Main-controller contract: Interactive Mock Product, 2026-11-05.
 * Types only. No implementation or acceptance is implied by this file.
 * Frozen scenario input schemas and existing command signatures stay unchanged.
 */
import type {
  ApiResult, MockApi, SessionView, ScriptEditable, ContentPackageInput,
  ContentAttachment, ContentDeliveryAttempt, DownloadResult,
} from './types';

export type ProductLocale = 'en' | 'ar';
export type ProductSource = 'instagram' | 'tiktok' | 'pinterest' | 'youtube' | 'other';
export type PackageAnalysis = ContentPackageInput['analysis']['data']['analyses'][number];
export type PackageBrief = ContentPackageInput['analysis']['data']['briefs'][number];
export type PackageSignal = ContentPackageInput['discovery']['data']['signals'][number];
export type PackageTrend = ContentPackageInput['discovery']['data']['trends'][number];
export type PackageEvidence = ContentPackageInput['discovery']['data']['evidence'][number];
export type ProductRecord = ContentPackageInput['brand']['data']['products'][number];
export type ReceivedAsset = Extract<ContentPackageInput['assets']['data']['assets'][number], { rightsStatus: 'approved_for_demo' }>;

export interface CampaignRef {
  campaignId: string; // existing brief.id, never a new persisted Campaign entity
  opportunityId: string; // existing analysis.id
  scenarioId: string;
  scenarioVersion: string;
  packageHash: string;
}
export interface ProductVersionRef {
  campaignId: string;
  versionId: string;
  sessionId: string | null; // null=preset; derived version requires its owning session
}
export interface ProductVersion extends ProductVersionRef {
  language: ProductLocale;
  origin: 'preset' | 'saved';
  confirmation: 'unconfirmed' | 'confirmed_current';
  title: string;
  content: ScriptEditable;
  sourceScriptVersionId: string;
  parentVersionId: string;
  confirmedInSessionId: string | null;
}
export interface CampaignCard extends CampaignRef {
  name: string;
  objective: string;
  audience: string;
  products: ProductRecord[];
  images: ReceivedAsset[];
}
export interface OpportunityView extends CampaignRef {
  title: string;
  analysis: PackageAnalysis;
  brief: PackageBrief;
  signals: PackageSignal[];
  trends: PackageTrend[];
  evidence: PackageEvidence[];
  products: ProductRecord[];
  images: ReceivedAsset[];
  sourceType: 'MOCK';
}
export interface ProductSignalView {
  signal: PackageSignal;
  sourceKeys: ProductSource[];
  evidence: PackageEvidence[];
  trends: PackageTrend[];
  opportunities: CampaignRef[];
}
export interface CampaignView {
  campaign: CampaignCard;
  brief: PackageBrief;
  analysis: PackageAnalysis;
  versions: ProductVersion[];
  selectedVersion: ProductVersion;
  workingSession: SessionView | null;
  exports: ProductExportRecord[];
}
export interface CreativeItem {
  kind: 'script' | 'storyboard';
  version: ProductVersion;
  campaign: CampaignCard;
  exportIds: string[];
}
export interface DeliverableItem {
  version: ProductVersion;
  campaign: CampaignCard;
  exportIds: string[];
  available: boolean;
  unavailableReason: string | null;
}
export interface ProductExportRecord {
  id: string;
  campaign: CampaignRef;
  version: ProductVersionRef;
  language: ProductLocale;
  title: string;
  origin: 'preset' | 'saved';
  confirmationAtExport: 'unconfirmed' | 'confirmed_current';
  createdAt: string;
  status: 'prepared' | 'download_triggered';
  archiveFilename: string;
  archiveBytes: number;
  archiveSha256: string;
  attachments: ContentAttachment[]; // excludes EXPORT.json to avoid a self-hash cycle
  mode: 'mock';
  noVideo: true;
  noRealEmail: true;
}
export interface ActivityEventView {
  id: string;
  sequence: number;
  atMs: number;
  stage: 'discovery' | 'analysis';
  type: string;
  inputRefs: string[];
  outputRefs: string[];
}
export interface ProductReadFilter {
  campaignId?: string;
  language?: ProductLocale;
  query?: string;
}
export interface CampaignBrowseInput {
  campaignId: string;
  versionId?: string;
  sessionId?: string;
  language?: ProductLocale;
  /**
   * FLOW-001 additive explicit version lookup. When omitted, existing callers
   * keep the historical "latest published version" behavior exactly.
   */
  scenarioVersion?: string;
}

/** Queries below do not create/advance sessions, confirm scripts or log exports. */
export interface ProductReadApi {
  getOverview(): Promise<ApiResult<{ opportunities: OpportunityView[]; campaigns: CampaignCard[]; recentExports: ProductExportRecord[] }>>;
  listSignals(input?: { campaignId?: string; source?: ProductSource; topic?: string; query?: string }): Promise<ApiResult<{ items: ProductSignalView[]; sources: ProductSource[]; topics: string[] }>>;
  getSignal(input: { signalId: string }): Promise<ApiResult<ProductSignalView>>;
  listOpportunities(input?: { campaignId?: string; query?: string }): Promise<ApiResult<{ items: OpportunityView[] }>>;
  getOpportunity(input: { opportunityId: string }): Promise<ApiResult<OpportunityView>>;
  listCampaigns(): Promise<ApiResult<{ items: CampaignCard[] }>>;
  getCampaign(input: CampaignBrowseInput): Promise<ApiResult<CampaignView>>;
  listCreativeAssets(input?: ProductReadFilter & { kind?: 'script' | 'storyboard'; origin?: 'preset' | 'saved' }): Promise<ApiResult<{ items: CreativeItem[] }>>;
  getCreativeAsset(input: ProductVersionRef & { kind: 'script' | 'storyboard' }): Promise<ApiResult<CreativeItem>>;
  listDeliverables(input?: ProductReadFilter): Promise<ApiResult<{ items: DeliverableItem[]; exports: ProductExportRecord[] }>>;
  getAgentActivity(input: { campaignId: string }): Promise<ApiResult<{ campaign: CampaignRef; events: ActivityEventView[]; editingHistory: SessionView['history']; deliveryAttempts: ContentDeliveryAttempt[] }>>;
}
export interface BeginCampaignEditInput {
  campaignId: string;
  versionId: string;
  sessionId: string | null;
  idempotencyKey: string;
}
export interface PreparedProductExport {
  record: ProductExportRecord;
  download: DownloadResult;
}
/** Additive facade, implemented by the SAME browser MockApi/storage stack. */
export interface ProductMockApi extends MockApi, ProductReadApi {
  beginCampaignEdit(input: BeginCampaignEditInput): Promise<ApiResult<{ session: SessionView; version: ProductVersion }>>;
  openActivityReplay(input: { campaignId: string; creationKey: string }): Promise<ApiResult<{ session: SessionView; lastSequence: number }>>;
  exportScriptPack(input: ProductVersionRef & { idempotencyKey: string }): Promise<ApiResult<PreparedProductExport>>;
  getProductExport(input: { exportId: string }): Promise<ApiResult<PreparedProductExport>>;
  markProductExportTriggered(input: { exportId: string }): Promise<ApiResult<ProductExportRecord>>;
}
