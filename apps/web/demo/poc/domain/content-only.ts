import type {
  Asset as ContentAsset,
  LavishContentOnlyScenarioInputPendingVideoIsNotPlayableMedia as ContentPackageInput,
} from '../generated/content-only.types';
import type { Asset, ScenarioPackage } from '../generated/scenario.types';
export type ContentProfile = 'complete' | 'content_only';
export type ContentDeliveryStatus = 'draft' | 'awaiting_confirmation' | 'running' | 'completed' | 'failed';

export interface ContentAttachment {
  filename: string;
  mimeType: string;
  bytes: number;
  sha256: string;
}

export interface ContentDeliveryRecipient {
  id: string;
  displayName: string;
  email: string;
}

export interface ContentDeliveryDraft {
  id: string;
  revision: number;
  sourcePlanId: string;
  scriptVersionId: string;
  recipientSnapshot: ContentDeliveryRecipient[];
  subject: string;
  body: string;
  attachmentManifest: ContentAttachment[];
  confirmedRevision: number | null;
}

export interface ContentDeliveryAttempt {
  id: string;
  attempt: number;
  draftId: string;
  draftRevision: number;
  scriptVersionId: string;
  recipientSnapshot: ContentDeliveryRecipient[];
  subject: string;
  body: string;
  attachmentManifest: ContentAttachment[];
  outcome: 'simulated_delivered' | 'failed';
  failureCode: null | 'delivery_failed';
  mode: 'mock';
  deliveryKind: 'script_pack';
  createdAt: string;
}

export interface ContentDeliveryState {
  draft: ContentDeliveryDraft | null;
  attempts: ContentDeliveryAttempt[];
  status: ContentDeliveryStatus;
}

export function createInitialContentDelivery(): ContentDeliveryState {
  return { draft: null, attempts: [], status: 'draft' };
}

function isRealAsset(asset: ContentAsset): asset is ContentAsset & { bytes: number; sha256: string } {
  return typeof asset.bytes === 'number' && typeof asset.sha256 === 'string';
}

/**
 * Build the frozen ScenarioPackage view used by the shared discovery/analysis
 * reducer. Deferred video/poster assets are not fabricated into the old
 * package: they are omitted and only real received assets remain. Video
 * planning metadata is retained, but the API rejects execution for
 * content-only sessions. No bytes or hashes are invented.
 */
export function adaptContentOnlyPackage(content: ContentPackageInput): ScenarioPackage {
  const realAssets: Asset[] = content.assets.data.assets.filter(isRealAsset);
  const [firstAsset, ...restAssets] = realAssets;
  if (!firstAsset) throw new Error('Content-only package has no real received assets.');
  return {
    manifest: content.manifest,
    brand: content.brand,
    discovery: content.discovery,
    analysis: content.analysis,
    script: content.script,
    video: content.video,
    delivery: content.delivery,
    events: content.events,
    assets: { ...content.assets, data: { assets: [firstAsset, ...restAssets] } },
    expected: content.expected,
  };
}

export function contentOnlyProfile(packageInput: { profile?: ContentProfile }): ContentProfile {
  return packageInput.profile === 'content_only' ? 'content_only' : 'complete';
}

export type { ContentPackageInput };
