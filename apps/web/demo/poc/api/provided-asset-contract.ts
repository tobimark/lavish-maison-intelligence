/** Main-controller-owned additive UI sidecar/API contract; no existing API is broken. */
import type { ApiResult, DownloadResult } from './types';
import type { ProductMockApi, ProductVersionRef, ProductExportRecord, CreativeItem, CampaignCard, ProductReadFilter } from './product-contract';
export type ProvidedAssetType = 'hero_image' | 'product_original_image' | 'final_preview_video';
export type ProvidedAssetRole = 'hero' | 'product_identity' | 'storyboard_source' | 'final_preview' | 'deliverable_asset';
export type AssetVisibility = 'overview' | 'opportunity' | 'campaign_brief' | 'atelier' | 'library' | 'deliverables';
export interface ProvidedAsset {
  id: string;
  type: ProvidedAssetType;
  label: string;
  roles: ProvidedAssetRole[];
  uri: string;
  mimeType: 'image/png' | 'video/mp4';
  bytes: number;
  sha256: string;
  productId: string;
  visibility: AssetVisibility[];
  source: 'user_provided';
  rightsScope: 'internal_demo';
  metadata: {
    width: number;
    height: number;
    durationMs: number | null;
    frameRate: number | null;
    videoCodec: 'h264' | null;
    pixelFormat: 'yuv420p' | null;
    audioCodec: 'aac' | null;
    posterAssetId: string | null;
    posterRole: 'hero_reference' | null;
    scriptBinding: 'not_applicable' | 'independent_provided_preview';
    disclosure: string;
  };
}
export interface ProvidedAssetSet {
  mappingVersion: '1.0.0';
  id: string;
  scenarioId: 'scn-scent-layering';
  scenarioVersion: '1.1.0';
  campaignId: string;
  contentStatus: 'awaiting_serenity_content' | 'bound';
  product: {
    id: string;
    officialName: 'SERENITY';
    sku: string;
    factsSourceUrl: string;
    verifiedFacts: string[];
    identityAssetId: string;
    campaignRole: 'featured_product';
  };
  assets: ProvidedAsset[];
}
export interface ProvidedCreativeItem {
  kind: ProvidedAssetType;
  asset: ProvidedAsset;
  version: null;
  campaign: CampaignCard;
  exportIds: string[];
}
export type AssetLibraryItem = CreativeItem | ProvidedCreativeItem;
export interface CampaignVersionRef extends ProductVersionRef {
  scenarioVersion: string;
}
export interface CampaignPackRecord extends Omit<ProductExportRecord, 'noVideo'> {
  kind: 'provided_asset_campaign_pack';
  includedVersions: CampaignVersionRef[];
  providedAssetSetId: string | null;
  providedAssetIds: string[];
  noVideo: boolean;
}
export interface PreparedCampaignPack {
  record: CampaignPackRecord;
  download: DownloadResult;
}
/** Implement on the existing MockApi facade during AS tasks, not a second backend/store. */
export interface ProvidedAssetApi {
  getProvidedAssets(input: { campaignId: string; scenarioVersion: string }): Promise<ApiResult<ProvidedAssetSet | null>>;
  listLibraryItems(input?: ProductReadFilter & { kind?: AssetLibraryItem['kind']; origin?: 'preset' | 'saved' }): Promise<ApiResult<{ items: AssetLibraryItem[] }>>;
  getProvidedAssetDownload(input: { campaignId: string; scenarioVersion: string; assetId: string }): Promise<ApiResult<DownloadResult>>;
  exportCampaignPack(input: { campaignId: string; versions: CampaignVersionRef[]; includeProvidedAssets: boolean; idempotencyKey: string }): Promise<ApiResult<PreparedCampaignPack>>;
  listCampaignPackExports(input?: { campaignId?: string }): Promise<ApiResult<{ items: CampaignPackRecord[] }>>;
  getCampaignPackExport(input: { exportId: string }): Promise<ApiResult<PreparedCampaignPack>>;
  markCampaignPackExportTriggered(input: { exportId: string }): Promise<ApiResult<CampaignPackRecord>>;
}
export type AssetAwareMockApi = ProductMockApi & ProvidedAssetApi;
