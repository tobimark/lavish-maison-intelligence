#!/usr/bin/env node
/*
 * FLOW-001 · Campaign presentation sidecar validator.
 *
 * Small standalone check for the authored `campaign-presentation.json` sidecar
 * (docs/SOCIAL_MOCK_CONTRACT.md). It verifies:
 *   - structural shape/enums/EN+AR preset pair (structural only);
 *   - packageHash === SHA-256 of the published manifest.json bytes;
 *   - scenario/campaign/product ids exist in the published scenario package;
 *   - every insight signal/trend/evidence id exists in discovery.json;
 *   - strategy analysis/brief ids exist and point at this campaign;
 *   - creative scriptVersionIds are real EN+AR versions (incl. the entry EN version);
 *   - the three creative step asset ids exist in the provided-asset sidecar with
 *     the correct type/role/product, and the real provided media bytes match the
 *     sidecar size/SHA-256 (final preview must be a real video/mp4 with duration);
 *   - EN+AR social presets reference the matching-language script + provided
 *     final preview video and use the same creative final preview asset.
 *
 * This is a check, not a second validator framework: the frozen ten-file
 * scenario schema is untouched.
 *
 * Usage:
 *   node scripts/poc/validate-campaign-presentation.mjs \
 *     --presentation <campaign-presentation.json> \
 *     --scenario-dir <published scenario version dir> \
 *     --provided-assets <presentation-assets sidecar.json>
 *
 * Prints a JSON report; exit 0 when all checks pass, 1 otherwise.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
function arg(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? null : null;
}

const presentationPath = arg('--presentation');
const scenarioDir = arg('--scenario-dir');
const providedAssetsPath = arg('--provided-assets');

const checks = [];
const issues = [];
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const STEP_ROLES = ['product_identity', 'hero', 'final_preview'];
const STEP_EXPECTATIONS = {
  product_identity: { type: 'product_original_image', role: 'product_identity' },
  hero: { type: 'hero_image', role: 'hero' },
  final_preview: { type: 'final_preview_video', role: 'final_preview' },
};

function record(name, ok, message, extra = {}) {
  checks.push({ name, ok, message, ...extra });
  if (!ok) issues.push({ check: name, message, ...extra });
  return ok;
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
function readJsonFile(file, label) {
  if (!existsSync(file)) {
    record(`${label}.exists`, false, `Required file is missing: ${file}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    record(`${label}.json`, false, `Invalid JSON in ${file}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

if (!presentationPath || !scenarioDir || !providedAssetsPath) {
  console.log(JSON.stringify({
    ok: false,
    tool: 'validate-campaign-presentation',
    usage: 'node scripts/poc/validate-campaign-presentation.mjs --presentation <file> --scenario-dir <dir> --provided-assets <file>',
    issues: [{ check: 'usage', message: '--presentation, --scenario-dir and --provided-assets are all required.' }],
  }, null, 2));
  process.exit(1);
}

const absolutePresentation = path.resolve(process.cwd(), presentationPath);
const absoluteScenarioDir = path.resolve(process.cwd(), scenarioDir);
const absoluteProvidedAssets = path.resolve(process.cwd(), providedAssetsPath);

const presentation = readJsonFile(absolutePresentation, 'presentation');
const provided = readJsonFile(absoluteProvidedAssets, 'providedAssets');

const scenarioNames = ['manifest', 'brand', 'discovery', 'analysis', 'script', 'assets'];
const scenario = {};
for (const name of scenarioNames) {
  const value = readJsonFile(path.join(absoluteScenarioDir, `${name}.json`), `scenario.${name}`);
  if (value) scenario[name] = value;
}

if (!presentation || !provided || Object.keys(scenario).length !== scenarioNames.length) {
  console.log(JSON.stringify({ ok: false, tool: 'validate-campaign-presentation', issues }, null, 2));
  process.exit(1);
}

// ------------------------------------------------------------ structural shape
record('presentation.schemaVersion', presentation.schemaVersion === '1.0.0', 'schemaVersion must be 1.0.0.');
record('presentation.scenarioId', presentation.scenarioId === 'scn-scent-layering', 'scenarioId must be scn-scent-layering.');
record('presentation.mode', presentation.mode === 'mock', 'mode must be mock.');
record('presentation.packageHash.format', isNonEmptyString(presentation.packageHash) && SHA256_PATTERN.test(presentation.packageHash), 'packageHash must be a lowercase SHA-256 hex string.');
record('presentation.scenarioVersion', isNonEmptyString(presentation.scenarioVersion), 'scenarioVersion must be a non-empty string.');
record('presentation.campaignId', isNonEmptyString(presentation.campaignId), 'campaignId must be a non-empty string.');
record('presentation.productIds', Array.isArray(presentation.productIds) && presentation.productIds.length > 0 && presentation.productIds.every(isNonEmptyString) && new Set(presentation.productIds).size === presentation.productIds.length, 'productIds must be a non-empty array of unique non-empty strings.');

const insight = isObject(presentation.insight) ? presentation.insight : null;
record('presentation.insight', Boolean(insight), 'insight must be an object.');
if (insight) {
  record('presentation.insight.title', isNonEmptyString(insight.title), 'insight.title must be non-empty.');
  record('presentation.insight.takeaway', isNonEmptyString(insight.takeaway), 'insight.takeaway must be non-empty.');
  for (const key of ['signalIds', 'trendIds', 'evidenceIds']) {
    record(`presentation.insight.${key}`, isStringArray(insight[key]), `insight.${key} must be a string array.`);
  }
}

const strategy = isObject(presentation.strategy) ? presentation.strategy : null;
record('presentation.strategy', Boolean(strategy), 'strategy must be an object.');
if (strategy) {
  record('presentation.strategy.analysisId', isNonEmptyString(strategy.analysisId), 'strategy.analysisId must be non-empty.');
  record('presentation.strategy.briefId', isNonEmptyString(strategy.briefId), 'strategy.briefId must be non-empty.');
  record('presentation.strategy.whyThisProduct', isNonEmptyString(strategy.whyThisProduct), 'strategy.whyThisProduct must be non-empty.');
}

const creative = isObject(presentation.creative) ? presentation.creative : null;
record('presentation.creative', Boolean(creative), 'creative must be an object.');
if (creative) {
  record('presentation.creative.title', isNonEmptyString(creative.title), 'creative.title must be non-empty.');
  record('presentation.creative.relationship', creative.relationship === 'illustrative_workflow_with_provided_assets', 'creative.relationship must be illustrative_workflow_with_provided_assets.');
  record('presentation.creative.scriptVersionIds', Array.isArray(creative.scriptVersionIds) && creative.scriptVersionIds.length === 2 && creative.scriptVersionIds.every(isNonEmptyString) && new Set(creative.scriptVersionIds).size === 2, 'creative.scriptVersionIds must reference exactly two unique script versions.');
  record('presentation.creative.steps', Array.isArray(creative.steps) && creative.steps.length === 3, 'creative.steps must contain exactly three steps.');
  if (Array.isArray(creative.steps)) {
    creative.steps.forEach((step, index) => {
      record(`presentation.creative.steps[${index}]`, isObject(step) && step.role === STEP_ROLES[index] && isNonEmptyString(step.assetId) && isNonEmptyString(step.explanation), `creative.steps[${index}] must be a ${STEP_ROLES[index]} step with assetId and explanation.`);
    });
  }
}

const socialPosts = Array.isArray(presentation.socialPosts) ? presentation.socialPosts : null;
record('presentation.socialPosts', Boolean(socialPosts), 'socialPosts must be an array.');
if (socialPosts) {
  record('presentation.socialPosts.count', socialPosts.length === 2, 'socialPosts must contain exactly one EN and one AR preset.');
  const languages = socialPosts.map((post) => (isObject(post) ? post.language : null));
  record('presentation.socialPosts.languages', languages.filter((language) => language === 'en').length === 1 && languages.filter((language) => language === 'ar').length === 1, 'socialPosts must contain exactly one EN and one AR preset.');
  const ids = socialPosts.map((post) => (isObject(post) ? post.id : null)).filter((id) => typeof id === 'string');
  record('presentation.socialPosts.ids', ids.length === socialPosts.length && new Set(ids).size === ids.length, 'socialPosts ids must be present and unique.');
  socialPosts.forEach((post, index) => {
    if (!isObject(post)) return;
    record(`presentation.socialPosts[${index}].channel`, post.channel === 'instagram', 'channel must be instagram.');
    record(`presentation.socialPosts[${index}].placement`, post.placement === 'video_post', 'placement must be video_post.');
    record(`presentation.socialPosts[${index}].accountLabel`, isNonEmptyString(post.accountLabel), 'accountLabel must be non-empty.');
    record(`presentation.socialPosts[${index}].language`, post.language === 'en' || post.language === 'ar', 'language must be en or ar.');
    record(`presentation.socialPosts[${index}].sourceScriptVersionId`, isNonEmptyString(post.sourceScriptVersionId), 'sourceScriptVersionId must be non-empty.');
    record(`presentation.socialPosts[${index}].videoAssetId`, isNonEmptyString(post.videoAssetId), 'videoAssetId must be non-empty.');
    record(`presentation.socialPosts[${index}].caption`, isNonEmptyString(post.caption), 'caption must be non-empty.');
    record(`presentation.socialPosts[${index}].cta`, isNonEmptyString(post.cta), 'cta must be non-empty.');
    record(`presentation.socialPosts[${index}].hashtags`, Array.isArray(post.hashtags) && post.hashtags.length > 0 && post.hashtags.every(isNonEmptyString), 'hashtags must be a non-empty array of non-empty strings.');
  });
}

// --------------------------------------------------- packageHash + scenario ids
const manifestBytes = readFileSync(path.join(absoluteScenarioDir, 'manifest.json'));
const actualPackageHash = sha256(manifestBytes);
record('packageHash.manifestBytes', presentation.packageHash === actualPackageHash, `packageHash must equal SHA-256 of manifest.json bytes (expected ${actualPackageHash}).`);
record('scenario.scenarioId', presentation.scenarioId === scenario.manifest.scenarioId, 'presentation scenarioId must equal the published manifest scenarioId.');
record('scenario.scenarioVersion', presentation.scenarioVersion === scenario.manifest.scenarioVersion, 'presentation scenarioVersion must equal the published manifest scenarioVersion.');
record('campaign.entryBriefId', presentation.campaignId === scenario.manifest.entryBriefId, 'presentation campaignId must equal manifest.entryBriefId.');
record('campaign.briefExists', Array.isArray(scenario.analysis?.data?.briefs) && scenario.analysis.data.briefs.some((brief) => brief.id === presentation.campaignId), 'presentation campaignId must exist in analysis.json briefs.');
record('campaign.briefAnalysis', Array.isArray(scenario.analysis?.data?.briefs) && scenario.analysis.data.briefs.every((brief) => brief.id !== presentation.campaignId || brief.analysisId === scenario.analysis.data.analyses?.[0]?.id), 'the campaign brief must reference the presented analysis.');

const products = Array.isArray(scenario.brand?.data?.products) ? scenario.brand.data.products : [];
const brief = Array.isArray(scenario.analysis?.data?.briefs) ? scenario.analysis.data.briefs.find((candidate) => candidate.id === presentation.campaignId) : null;
for (const productId of presentation.productIds) {
  record(`product.exists.${productId}`, products.some((product) => product.id === productId), `presentation product ${productId} must exist in brand.json.`);
  if (brief) record(`product.brief.${productId}`, Array.isArray(brief.productIds) && brief.productIds.includes(productId), `presentation product ${productId} must belong to the campaign brief.`);
}

// ---------------------------------------------------------- insight references
const signals = new Set((scenario.discovery?.data?.signals ?? []).map((signal) => signal.id));
const trends = new Set((scenario.discovery?.data?.trends ?? []).map((trend) => trend.id));
const evidence = new Set((scenario.discovery?.data?.evidence ?? []).map((item) => item.id));
if (insight) {
  for (const id of insight.signalIds ?? []) record(`insight.signal.${id}`, signals.has(id), `insight signal ${id} must exist in discovery.json.`);
  for (const id of insight.trendIds ?? []) record(`insight.trend.${id}`, trends.has(id), `insight trend ${id} must exist in discovery.json.`);
  for (const id of insight.evidenceIds ?? []) record(`insight.evidence.${id}`, evidence.has(id), `insight evidence ${id} must exist in discovery.json.`);
}

// --------------------------------------------------------- strategy references
if (strategy) {
  const analyses = Array.isArray(scenario.analysis?.data?.analyses) ? scenario.analysis.data.analyses : [];
  record('strategy.analysisExists', analyses.some((analysis) => analysis.id === strategy.analysisId), 'strategy.analysisId must exist in analysis.json.');
  record('strategy.briefExists', Boolean(brief) && strategy.briefId === brief.id, 'strategy.briefId must equal the campaign brief id.');
  if (brief) record('strategy.briefAnalysisId', strategy.analysisId === brief.analysisId, 'strategy.analysisId must equal the campaign brief analysisId.');
}

// ---------------------------------------------------------- creative scripts
const scriptVersions = Array.isArray(scenario.script?.data?.versions) ? scenario.script.data.versions : [];
const scriptById = new Map(scriptVersions.map((version) => [version.id, version]));
if (creative) {
  for (const id of creative.scriptVersionIds ?? []) {
    record(`creative.script.${id}`, scriptById.has(id), `creative script version ${id} must exist in script.json.`);
  }
  const languages = (creative.scriptVersionIds ?? []).map((id) => scriptById.get(id)?.language).filter(Boolean);
  record('creative.script.languages', languages.filter((language) => language === 'en').length === 1 && languages.filter((language) => language === 'ar').length === 1, 'creative.scriptVersionIds must reference one EN and one AR version.');
  record('creative.script.entry', (creative.scriptVersionIds ?? []).includes(scenario.manifest.entryScriptVersionId), 'creative.scriptVersionIds must include the manifest entry script version.');
}

// ------------------------------------------------- provided assets + real bytes
record('providedAssets.mappingVersion', provided.mappingVersion === '1.0.0', 'provided-assets mappingVersion must be 1.0.0.');
record('providedAssets.scenarioId', provided.scenarioId === scenario.manifest.scenarioId, 'provided-assets scenarioId must match the scenario.');
record('providedAssets.scenarioVersion', provided.scenarioVersion === presentation.scenarioVersion, 'provided-assets scenarioVersion must match the presentation.');
record('providedAssets.campaignId', provided.campaignId === presentation.campaignId, 'provided-assets campaignId must match the presentation.');
record('providedAssets.contentStatus', provided.contentStatus === 'bound', 'provided-assets contentStatus must be bound.');
record('providedAssets.product', isObject(provided.product) && presentation.productIds.includes(provided.product.id), 'provided-assets product must be one of the presentation productIds.');

const providedAssets = Array.isArray(provided.assets) ? provided.assets : [];
// Public web root derived from the provided-assets sidecar location:
// <public>/presentation-assets/<slug>.json -> <public>
const publicRoot = path.resolve(path.dirname(absoluteProvidedAssets), '..');
const verifiedAssets = new Map();
function verifyAssetBytes(asset) {
  if (verifiedAssets.has(asset.id)) return verifiedAssets.get(asset.id);
  const result = { ok: true };
  if (!SHA256_PATTERN.test(String(asset.sha256)) || typeof asset.bytes !== 'number' || asset.bytes <= 0) {
    Object.assign(result, { ok: false, message: `Provided asset ${asset.id} must declare a real byte size and SHA-256.` });
  } else if (!isNonEmptyString(asset.uri) || !asset.uri.startsWith('/') || asset.uri.split('/').includes('..')) {
    Object.assign(result, { ok: false, message: `Provided asset ${asset.id} must have a safe absolute /uri.` });
  } else {
    const file = path.join(publicRoot, asset.uri.replace(/^\//, ''));
    if (!existsSync(file)) {
      Object.assign(result, { ok: false, message: `Provided asset file is missing: ${file}` });
    } else {
      const bytes = readFileSync(file);
      if (bytes.length !== asset.bytes) Object.assign(result, { ok: false, message: `Provided asset ${asset.id} size ${bytes.length} does not match sidecar ${asset.bytes}.` });
      else if (sha256(bytes) !== asset.sha256) Object.assign(result, { ok: false, message: `Provided asset ${asset.id} SHA-256 does not match sidecar.` });
    }
  }
  verifiedAssets.set(asset.id, result);
  return result;
}

if (creative) {
  const finalPreviewStep = (creative.steps ?? []).find((step) => step.role === 'final_preview');
  for (const step of creative.steps ?? []) {
    const expectation = STEP_EXPECTATIONS[step.role];
    if (!expectation) continue;
    const asset = providedAssets.find((candidate) => candidate.id === step.assetId);
    if (!record(`creative.step.${step.role}.exists`, Boolean(asset), `creative ${step.role} asset ${step.assetId} must exist in provided-assets.`)) continue;
    record(`creative.step.${step.role}.type`, asset.type === expectation.type, `provided asset ${asset.id} must have type ${expectation.type}.`);
    record(`creative.step.${step.role}.role`, Array.isArray(asset.roles) && asset.roles.includes(expectation.role), `provided asset ${asset.id} must carry the ${expectation.role} role.`);
    record(`creative.step.${step.role}.product`, asset.productId === provided.product.id, `provided asset ${asset.id} must be bound to the provided product.`);
    if (step.role === 'final_preview') {
      record('creative.step.final_preview.mimeType', asset.mimeType === 'video/mp4', 'the final preview provided asset must be a real video/mp4.');
      record('creative.step.final_preview.duration', isObject(asset.metadata) && typeof asset.metadata.durationMs === 'number' && asset.metadata.durationMs > 0, 'the final preview provided asset must declare a real positive duration.');
    }
    const verification = verifyAssetBytes(asset);
    record(`creative.step.${step.role}.bytes`, verification.ok, verification.message ?? `provided asset ${asset.id} bytes verified.`);
  }

  // ---------------------------------------------------------- social presets
  if (socialPosts && creative.scriptVersionIds) {
    const languageScriptIds = new Map();
    for (const id of creative.scriptVersionIds) {
      const version = scriptById.get(id);
      if (version) languageScriptIds.set(version.language, id);
    }
    const finalPreviewAssetId = finalPreviewStep?.assetId ?? null;
    for (const post of socialPosts) {
      if (!isObject(post)) continue;
      record(`social.${post.id}.scriptLanguage`, post.sourceScriptVersionId === languageScriptIds.get(post.language), `social post ${post.id} must reference the ${post.language.toUpperCase()} creative script version.`);
      const video = providedAssets.find((asset) => asset.id === post.videoAssetId);
      if (record(`social.${post.id}.videoExists`, Boolean(video), `social post ${post.id} videoAssetId must exist in provided-assets.`) && video) {
        record(`social.${post.id}.videoType`, video.type === 'final_preview_video', `social post ${post.id} video must be the final preview video.`);
        record(`social.${post.id}.videoRole`, Array.isArray(video.roles) && video.roles.includes('final_preview'), `social post ${post.id} video must carry the final_preview role.`);
        record(`social.${post.id}.videoSameAsCreative`, !finalPreviewAssetId || post.videoAssetId === finalPreviewAssetId, `social post ${post.id} must use the creative final preview asset.`);
      }
    }
  }
}

const ok = issues.length === 0;
console.log(JSON.stringify({
  ok,
  tool: 'validate-campaign-presentation',
  inputs: {
    presentation: path.relative(process.cwd(), absolutePresentation).replace(/\\/g, '/'),
    scenarioDir: path.relative(process.cwd(), absoluteScenarioDir).replace(/\\/g, '/'),
    providedAssets: path.relative(process.cwd(), absoluteProvidedAssets).replace(/\\/g, '/'),
  },
  packageHash: actualPackageHash,
  summary: {
    checks: checks.length,
    passed: checks.filter((check) => check.ok).length,
    failed: checks.filter((check) => !check.ok).length,
  },
  checks,
  issues,
}, null, 2));
process.exit(ok ? 0 : 1);
