/**
 * FLOW-001 · Campaign presentation sidecar source.
 *
 * The sidecar is authored outside the app and published to
 * `/campaign-presentation/<slug>/<scenarioVersion>.json`. This module is the
 * ONLY loader: pages must not fetch or hard-code marketing copy themselves.
 *
 * Scope of this file is structural validation only (shape / types / enums /
 * EN+AR pair / preset-id rules). Cross-references against the published
 * scenario package, packageHash, scripts, provided assets and video hashes are
 * checked by flow-queries.ts so a sidecar can never be treated as ready from a
 * different package. A missing or structurally invalid file resolves to null;
 * no fallback copy is ever produced.
 */
import type { CampaignPresentation, PresentationSocialPost } from './flow-contract';

export const DEFAULT_PRESENTATION_BASE_PATH = '/campaign-presentation';

export interface CampaignPresentationSource {
  /** Returns null when the sidecar is missing or structurally invalid. */
  getPresentation(scenarioId: string, scenarioVersion: string): Promise<CampaignPresentation | null>;
}

export interface CampaignPresentationSourceOptions {
  loadJson: (path: string) => unknown | null | Promise<unknown | null>;
}

export type PresentationInspection =
  | { ok: true; presentation: CampaignPresentation }
  | { ok: false; issues: string[] };

const SOCIAL_CHANNELS = ['instagram'] as const;
const SOCIAL_PLACEMENTS = ['video_post'] as const;
const STEP_ROLES = ['product_identity', 'hero', 'final_preview'] as const;
const LANGUAGES = ['en', 'ar'] as const;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
}

function uniqueNonEmptyStrings(value: unknown): value is string[] {
  if (!isNonEmptyStringArray(value)) return false;
  return new Set(value).size === value.length;
}

function inspectSocialPost(value: unknown, index: number, issues: string[]): value is PresentationSocialPost {
  const path = `socialPosts[${index}]`;
  if (!isObject(value)) {
    issues.push(`${path} must be an object.`);
    return false;
  }
  if (!isNonEmptyString(value.id)) issues.push(`${path}.id must be a non-empty string.`);
  if (!(SOCIAL_CHANNELS as readonly unknown[]).includes(value.channel)) issues.push(`${path}.channel must be instagram.`);
  if (!(SOCIAL_PLACEMENTS as readonly unknown[]).includes(value.placement)) issues.push(`${path}.placement must be video_post.`);
  if (!isNonEmptyString(value.accountLabel)) issues.push(`${path}.accountLabel must be a non-empty string.`);
  if (!(LANGUAGES as readonly unknown[]).includes(value.language)) issues.push(`${path}.language must be en or ar.`);
  if (!isNonEmptyString(value.sourceScriptVersionId)) issues.push(`${path}.sourceScriptVersionId must be a non-empty string.`);
  if (!isNonEmptyString(value.videoAssetId)) issues.push(`${path}.videoAssetId must be a non-empty string.`);
  if (!isNonEmptyString(value.caption)) issues.push(`${path}.caption must be a non-empty string.`);
  if (!isNonEmptyString(value.cta)) issues.push(`${path}.cta must be a non-empty string.`);
  if (!isNonEmptyStringArray(value.hashtags)) issues.push(`${path}.hashtags must be a non-empty array of non-empty strings.`);
  return issues.length === 0;
}

/** Structural validation only. Cross-package references are checked in flow-queries. */
export function inspectPresentationStructure(value: unknown): PresentationInspection {
  const issues: string[] = [];
  if (!isObject(value)) return { ok: false, issues: ['presentation must be a JSON object.'] };
  if (value.schemaVersion !== '1.0.0') issues.push('schemaVersion must be 1.0.0.');
  if (value.scenarioId !== 'scn-scent-layering') issues.push('scenarioId must be scn-scent-layering.');
  if (!isNonEmptyString(value.scenarioVersion)) issues.push('scenarioVersion must be a non-empty string.');
  if (!isNonEmptyString(value.packageHash) || !SHA256_PATTERN.test(value.packageHash)) {
    issues.push('packageHash must be a lowercase SHA-256 hex string.');
  }
  if (!isNonEmptyString(value.campaignId)) issues.push('campaignId must be a non-empty string.');
  if (!uniqueNonEmptyStrings(value.productIds)) issues.push('productIds must be a non-empty array of unique non-empty strings.');
  if (value.mode !== 'mock') issues.push('mode must be mock.');

  const insight = value.insight;
  if (!isObject(insight)) {
    issues.push('insight must be an object.');
  } else {
    if (!isNonEmptyString(insight.title)) issues.push('insight.title must be a non-empty string.');
    if (!isNonEmptyString(insight.takeaway)) issues.push('insight.takeaway must be a non-empty string.');
    for (const key of ['signalIds', 'trendIds', 'evidenceIds'] as const) {
      if (!isStringArray(insight[key])) issues.push(`insight.${key} must be an array of strings.`);
    }
  }

  const strategy = value.strategy;
  if (!isObject(strategy)) {
    issues.push('strategy must be an object.');
  } else {
    if (!isNonEmptyString(strategy.analysisId)) issues.push('strategy.analysisId must be a non-empty string.');
    if (!isNonEmptyString(strategy.briefId)) issues.push('strategy.briefId must be a non-empty string.');
    if (!isNonEmptyString(strategy.whyThisProduct)) issues.push('strategy.whyThisProduct must be a non-empty string.');
  }

  const creative = value.creative;
  if (!isObject(creative)) {
    issues.push('creative must be an object.');
  } else {
    if (!isNonEmptyString(creative.title)) issues.push('creative.title must be a non-empty string.');
    if (!uniqueNonEmptyStrings(creative.scriptVersionIds) || creative.scriptVersionIds.length !== 2) {
      issues.push('creative.scriptVersionIds must reference exactly one EN and one AR script version id.');
    }
    if (!Array.isArray(creative.steps) || creative.steps.length !== 3) {
      issues.push('creative.steps must contain exactly three steps.');
    } else {
      creative.steps.forEach((step, index) => {
        if (!isObject(step)) {
          issues.push(`creative.steps[${index}] must be an object.`);
          return;
        }
        if (step.role !== STEP_ROLES[index]) issues.push(`creative.steps[${index}].role must be ${STEP_ROLES[index]}.`);
        if (!isNonEmptyString(step.assetId)) issues.push(`creative.steps[${index}].assetId must be a non-empty string.`);
        if (!isNonEmptyString(step.explanation)) issues.push(`creative.steps[${index}].explanation must be a non-empty string.`);
      });
    }
    if (creative.relationship !== 'illustrative_workflow_with_provided_assets') {
      issues.push('creative.relationship must be illustrative_workflow_with_provided_assets.');
    }
  }

  if (!Array.isArray(value.socialPosts)) {
    issues.push('socialPosts must be an array.');
  } else {
    value.socialPosts.forEach((post, index) => inspectSocialPost(post, index, issues));
    const languages = value.socialPosts
      .filter((post): post is Record<string, unknown> => isObject(post))
      .map((post) => post.language);
    if (languages.filter((language) => language === 'en').length !== 1 || languages.filter((language) => language === 'ar').length !== 1) {
      issues.push('socialPosts must contain exactly one EN and one AR preset.');
    }
    const ids = value.socialPosts
      .filter((post): post is Record<string, unknown> => isObject(post))
      .map((post) => post.id)
      .filter((id): id is string => typeof id === 'string');
    if (new Set(ids).size !== ids.length) issues.push('socialPosts ids must be unique.');
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, presentation: value as unknown as CampaignPresentation };
}

export function presentationPathFor(
  scenarioId: string,
  scenarioVersion: string,
  basePath: string = DEFAULT_PRESENTATION_BASE_PATH,
): string {
  const slug = scenarioId.startsWith('scn-') ? scenarioId.slice('scn-'.length) : scenarioId;
  const base = basePath.replace(/\/+$/, '');
  return `${base}/${slug}/${scenarioVersion}.json`;
}

export function createCampaignPresentationSource(options: CampaignPresentationSourceOptions): CampaignPresentationSource {
  return {
    async getPresentation(scenarioId, scenarioVersion) {
      if (!isNonEmptyString(scenarioId) || !isNonEmptyString(scenarioVersion)) return null;
      const path = presentationPathFor(scenarioId, scenarioVersion);
      if (path.split('/').includes('..')) return null;
      let raw: unknown;
      try {
        raw = await options.loadJson(path);
      } catch {
        return null;
      }
      if (raw === null || raw === undefined) return null;
      const inspection = inspectPresentationStructure(raw);
      return inspection.ok ? inspection.presentation : null;
    },
  };
}

/** Browser loader: no-store so a newly published sidecar is picked up on refresh. */
export function createBrowserCampaignPresentationSource(
  basePath: string = DEFAULT_PRESENTATION_BASE_PATH,
): CampaignPresentationSource {
  return createCampaignPresentationSource({
    async loadJson(path) {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) return null;
      return (await response.json()) as unknown;
    },
  });
}
