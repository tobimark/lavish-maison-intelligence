import type {
  CampaignJourney,
  PresentationStepRole,
} from '../../../demo/poc/api/flow-contract';
import type { ProvidedAsset } from '../../../demo/poc/api/provided-asset-contract';
import type { ProductLocale, ProductVersion } from '../../../demo/poc/api/product-contract';

/**
 * Shared, presentation-only helpers for the connected Journey. Nothing here
 * writes or invents content: every value is read from the closed
 * getCampaignJourney projection for exactly one campaign + scenario version.
 */

export interface JourneyStageDefinition {
  id: JourneyStage;
  index: string;
  label: string;
  purpose: string;
}

export type JourneyStage = 'insight' | 'strategy' | 'creative' | 'social';

/** Four business reading positions. There is no locking or completion state. */
export const JOURNEY_STAGES: readonly JourneyStageDefinition[] = [
  { id: 'insight', index: '01', label: 'Market insight', purpose: 'What the simulated signals point to' },
  { id: 'strategy', index: '02', label: 'Campaign idea', purpose: 'Why SERENITY, and the brief behind it' },
  { id: 'creative', index: '03', label: 'Creative development', purpose: 'How supplied assets become the story' },
  { id: 'social', index: '04', label: 'Social post', purpose: 'The Instagram video post, EN and AR' },
] as const;

export const STEP_ROLE_ORDER: readonly PresentationStepRole[] = [
  'product_identity',
  'hero',
  'final_preview',
] as const;

export function isJourneyStage(value: string | null | undefined): value is JourneyStage {
  return JOURNEY_STAGES.some((stage) => stage.id === value);
}

export function journeyHref(campaignId: string, scenarioVersion: string, stage: JourneyStage): string {
  return `/campaigns/${encodeURIComponent(campaignId)}/journey?scenarioVersion=${encodeURIComponent(scenarioVersion)}&stage=${stage}`;
}

export function firstSentence(value: string): string {
  const match = value.match(/^(.+?[.!?])(\s|$)/);
  return (match ? match[1] : value).trim();
}

export function findProvidedAsset(journey: CampaignJourney, assetId: string): ProvidedAsset | null {
  return journey.providedAssets?.assets.find((asset) => asset.id === assetId) ?? null;
}

export function assetForStep(journey: CampaignJourney, step: { role: PresentationStepRole; assetId: string }): ProvidedAsset | null {
  return findProvidedAsset(journey, step.assetId);
}

export function productIdentityAsset(journey: CampaignJourney): ProvidedAsset | null {
  const steps = journey.presentation?.creative.steps ?? [];
  const identityStep = steps.find((step) => step.role === 'product_identity');
  if (identityStep) {
    const asset = findProvidedAsset(journey, identityStep.assetId);
    if (asset) return asset;
  }
  return journey.providedAssets?.assets.find((asset) => asset.type === 'product_original_image') ?? null;
}

export function heroAsset(journey: CampaignJourney): ProvidedAsset | null {
  const steps = journey.presentation?.creative.steps ?? [];
  const heroStep = steps.find((step) => step.role === 'hero');
  if (heroStep) {
    const asset = findProvidedAsset(journey, heroStep.assetId);
    if (asset) return asset;
  }
  return journey.providedAssets?.assets.find((asset) => asset.type === 'hero_image') ?? null;
}

export function videoAsset(journey: CampaignJourney): ProvidedAsset | null {
  const steps = journey.presentation?.creative.steps ?? [];
  const videoStep = steps.find((step) => step.role === 'final_preview');
  if (videoStep) {
    const asset = findProvidedAsset(journey, videoStep.assetId);
    if (asset) return asset;
  }
  return journey.providedAssets?.assets.find((asset) => asset.type === 'final_preview_video') ?? null;
}

/**
 * Small SERENITY photograph for the persistent campaign context. Prefers the
 * bound provided identity asset; falls back to the campaign's approved product
 * photograph from the content package. Never a fabricated image.
 */
export function campaignProductImage(journey: CampaignJourney): string | null {
  const identity = productIdentityAsset(journey);
  if (identity?.uri) return identity.uri;
  const productId = journey.campaign.products[0]?.id;
  const images = journey.campaign.images;
  const match = images.find((image) => image.kind === 'product_image' && productId && image.productIds.includes(productId));
  return match?.uri ?? images.find((image) => image.kind === 'product_image')?.uri ?? null;
}

export function scriptVersionFor(journey: CampaignJourney, language: ProductLocale): ProductVersion | null {
  return journey.selectedVersions[language];
}

export function stepRoleLabel(role: PresentationStepRole): { name: string; note: string } {
  switch (role) {
    case 'product_identity':
      return { name: 'Product original', note: 'The supplied white-background SERENITY bottle, kept true to the original.' };
    case 'hero':
      return { name: 'Campaign hero', note: 'The supplied lifestyle visual that sets the atmosphere.' };
    case 'final_preview':
      return { name: 'Final video', note: 'The provided 10.08-second, 720×960 independent preview.' };
    default:
      return { name: 'Creative step', note: 'Provided demo asset.' };
  }
}

export function productNames(journey: CampaignJourney): string {
  return journey.campaign.products.map((product) => product.officialName).join(' · ');
}
