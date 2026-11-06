/*
 * Shared POC scenario semantics (POC-001).
 *
 * Pure, framework-free functions shared by the validation CLI
 * (`scripts/poc/validate-scenario.mjs`) and by the future POC reducer
 * (POC-003/POC-005). This module performs no filesystem or network IO: the CLI
 * adds file/hash/media checks on top.
 *
 * The machine structure source remains contracts/poc/scenario.schema.json; this
 * module only encodes the cross-file / semantic rules documented in
 * docs/SCENARIO_DATA_CONTRACT.md, docs/POC_EVENT_PROTOCOL.md and
 * docs/POC_STATE_MACHINES.md.
 */

export const SCHEMA_VERSION = '1.0.0';

export const SCENARIO_IDS = [
  'scn-scent-layering',
  'scn-luxury-gifting',
  'scn-oud-storytelling',
];

export const SLUG_BY_SCENARIO = {
  'scn-scent-layering': 'scent-layering',
  'scn-luxury-gifting': 'luxury-gifting',
  'scn-oud-storytelling': 'oud-storytelling',
};

export const STAGE_ORDER = ['discovery', 'analysis', 'video', 'delivery'];

export const STAGE_STATES = [
  'locked',
  'ready',
  'running',
  'awaiting_confirmation',
  'completed',
  'failed',
  'stale',
];

export const FILE_NAMES = [
  'manifest',
  'brand',
  'discovery',
  'analysis',
  'script',
  'video',
  'delivery',
  'events',
  'assets',
  'expected',
];

export const DATA_FILE_NAMES = FILE_NAMES.filter((name) => name !== 'manifest');

export const MEDIA_PREFIX = '/scenario-media/';

export const ID_PATTERN = /^scn-(scent-layering|luxury-gifting|oud-storytelling)\.[a-z][a-z0-9-]*\.[a-zA-Z0-9-]+$/;

export const INVALID_EMAIL_PATTERN = /^[A-Za-z0-9.!#$&*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.invalid$/;

/** Kinds that are loaded as metadata and do not need an exposing event. */
export const BASE_ENTITY_KINDS = new Set(['brand', 'product', 'asset', 'evidence', 'recipient']);

/** Kinds that can appear in expected.visibleEntityIds. */
export const VISIBLE_ENTITY_KINDS = new Set([
  'signal',
  'trend',
  'analysis',
  'brief',
  'scriptVersion',
  'shot',
  'subtitle',
  'video',
  'deliveryPlan',
  'deliveryRecord',
]);

export const GOLDEN_EVENT_TYPES = [
  'stage.started',
  'signal.discovered',
  'trend.summarized',
  'analysis.presented',
  'brief.presented',
  'script.presented',
  'script.confirmed',
  'video.queued',
  'video.progressed',
  'video.available',
  'delivery.queued',
  'delivery.simulated',
  'stage.completed',
];

const TYPE_STAGE = {
  'signal.discovered': 'discovery',
  'trend.summarized': 'discovery',
  'analysis.presented': 'analysis',
  'brief.presented': 'analysis',
  'script.presented': 'analysis',
  'script.confirmed': 'analysis',
  'video.queued': 'video',
  'video.progressed': 'video',
  'video.available': 'video',
  'delivery.queued': 'delivery',
  'delivery.simulated': 'delivery',
};

const PAYLOAD_ENTITY = {
  'signal.discovered': { field: 'signalId', kind: 'signal' },
  'trend.summarized': { field: 'trendId', kind: 'trend' },
  'analysis.presented': { field: 'analysisId', kind: 'analysis' },
  'brief.presented': { field: 'briefId', kind: 'brief' },
  'script.presented': { field: 'scriptVersionId', kind: 'scriptVersion' },
  'script.confirmed': { field: 'scriptVersionId', kind: 'scriptVersion' },
  'video.queued': { field: 'videoId', kind: 'video' },
  'video.progressed': { field: 'videoId', kind: 'video' },
  'video.available': { field: 'videoId', kind: 'video' },
  'delivery.queued': { field: 'planId', kind: 'deliveryPlan' },
  'delivery.simulated': { field: 'recordId', kind: 'deliveryRecord' },
};

/** Events whose outputRefs are exactly the payload entity (others are empty). */
const EXPOSING_TYPES = new Set([
  'signal.discovered',
  'trend.summarized',
  'analysis.presented',
  'brief.presented',
  'script.presented',
  'video.queued',
  'video.available',
  'delivery.queued',
  'delivery.simulated',
]);

export function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function asString(value) {
  return typeof value === 'string' ? value : '';
}

export function issue(code, file, jsonPointer, message) {
  return { code, file, jsonPointer, message };
}

export function escapePointerSegment(segment) {
  return String(segment).replace(/~/g, '~0').replace(/\//g, '~1');
}

export function pointer(base, ...segments) {
  return segments.reduce((acc, segment) => `${acc}/${escapePointerSegment(segment)}`, base);
}

export function detectContractDefects(schema) {
  const errors = [];
  const defs = isObject(schema) && isObject(schema.$defs) ? schema.$defs : {};
  const checks = [
    { name: 'analysis', data: 'analysisData', array: 'analyses' },
    { name: 'video', data: 'videoData', array: 'videos' },
  ];

  for (const check of checks) {
    const envelope = defs[check.name];
    const data = defs[check.data];
    const itemsRef = data?.properties?.[check.array]?.items?.$ref;
    if (isObject(envelope?.properties?.data) && itemsRef === `#/$defs/${check.name}`) {
      errors.push(
        issue(
          'CONTRACT_DEFECT',
          'contracts/poc/scenario.schema.json',
          `#/$defs/${check.data}/properties/${check.array}/items`,
          `${check.name}Data.${check.array}.items points at #/$defs/${check.name}, but #/$defs/${check.name} is the ten-file envelope (it requires data.${check.name}Data). The reference is recursive and no finite ${check.name} entry can satisfy it. scripts/poc/build-contract.mjs defines the ${check.name} entry near line ${check.name === 'analysis' ? '33' : '40'} but the envelope loop (line 79) overwrites #/$defs/${check.name}. Main control must rename the envelope or entry definitions and regenerate the frozen schema; this validator cannot mask it.`,
        ),
      );
    }
  }
  return errors;
}

/* ------------------------------------------------------------------------- */
/* Entity index                                                              */
/* ------------------------------------------------------------------------- */

function addEntity(store, kind, file, jsonPointer, value) {
  if (!isObject(value) || typeof value.id !== 'string') return null;
  const existing = store.byId.get(value.id);
  if (existing) {
    store.duplicates.push(
      issue(
        'DUPLICATE_ID',
        file,
        `${jsonPointer}/id`,
        `ID ${value.id} is already used by ${existing.kind} at ${existing.file}${existing.jsonPointer}. IDs must be unique within a scenario version.`,
      ),
    );
    return existing;
  }
  const record = { id: value.id, kind, file, jsonPointer, value };
  store.byId.set(value.id, record);
  if (!store.byKind[kind]) store.byKind[kind] = [];
  store.byKind[kind].push(record);
  return record;
}

export function collectEntityIndex(bundle) {
  const store = { byId: new Map(), byKind: {}, duplicates: [] };
  const data = (name) => (isObject(bundle?.[name]) ? bundle[name].data : undefined);

  const brand = data('brand');
  addEntity(store, 'brand', 'brand.json', '/data/brand', brand?.brand);
  asArray(brand?.products).forEach((product, index) =>
    addEntity(store, 'product', 'brand.json', `/data/products/${index}`, product),
  );

  const discovery = data('discovery');
  asArray(discovery?.evidence).forEach((item, index) =>
    addEntity(store, 'evidence', 'discovery.json', `/data/evidence/${index}`, item),
  );
  asArray(discovery?.signals).forEach((item, index) =>
    addEntity(store, 'signal', 'discovery.json', `/data/signals/${index}`, item),
  );
  asArray(discovery?.trends).forEach((item, index) =>
    addEntity(store, 'trend', 'discovery.json', `/data/trends/${index}`, item),
  );

  const analysis = data('analysis');
  asArray(analysis?.analyses).forEach((item, index) =>
    addEntity(store, 'analysis', 'analysis.json', `/data/analyses/${index}`, item),
  );
  asArray(analysis?.briefs).forEach((item, index) =>
    addEntity(store, 'brief', 'analysis.json', `/data/briefs/${index}`, item),
  );

  const script = data('script');
  asArray(script?.versions).forEach((version, versionIndex) => {
    addEntity(store, 'scriptVersion', 'script.json', `/data/versions/${versionIndex}`, version);
    asArray(version?.shots).forEach((shot, shotIndex) =>
      addEntity(store, 'shot', 'script.json', `/data/versions/${versionIndex}/shots/${shotIndex}`, shot),
    );
    asArray(version?.subtitles).forEach((subtitle, subtitleIndex) =>
      addEntity(
        store,
        'subtitle',
        'script.json',
        `/data/versions/${versionIndex}/subtitles/${subtitleIndex}`,
        subtitle,
      ),
    );
  });

  asArray(data('video')?.videos).forEach((item, index) =>
    addEntity(store, 'video', 'video.json', `/data/videos/${index}`, item),
  );

  const delivery = data('delivery');
  asArray(delivery?.recipients).forEach((item, index) =>
    addEntity(store, 'recipient', 'delivery.json', `/data/recipients/${index}`, item),
  );
  asArray(delivery?.plans).forEach((item, index) =>
    addEntity(store, 'deliveryPlan', 'delivery.json', `/data/plans/${index}`, item),
  );
  asArray(delivery?.records).forEach((item, index) =>
    addEntity(store, 'deliveryRecord', 'delivery.json', `/data/records/${index}`, item),
  );

  asArray(data('assets')?.assets).forEach((item, index) =>
    addEntity(store, 'asset', 'assets.json', `/data/assets/${index}`, item),
  );

  asArray(data('events')?.events).forEach((item, index) =>
    addEntity(store, 'event', 'events.json', `/data/events/${index}`, item),
  );

  return store;
}

/* ------------------------------------------------------------------------- */
/* References                                                                */
/* ------------------------------------------------------------------------- */

function checkReference(errors, index, manifest, file, jsonPointer, id, expectedKind) {
  if (typeof id !== 'string') return null;
  const scenarioId = asString(manifest?.scenarioId);
  const prefix = id.split('.')[0];
  if (SCENARIO_IDS.includes(prefix) && scenarioId && prefix !== scenarioId) {
    errors.push(
      issue(
        'CROSS_SCENARIO_REFERENCE',
        file,
        jsonPointer,
        `${id} belongs to ${prefix}, but this package is ${scenarioId}. Cross-scenario references are not allowed.`,
      ),
    );
    return null;
  }

  const record = index.byId.get(id);
  if (!record) {
    errors.push(
      issue(
        'REFERENCE_NOT_FOUND',
        file,
        jsonPointer,
        `${id} does not resolve to an entity in this scenario version.`,
      ),
    );
    return null;
  }
  if (expectedKind && record.kind !== expectedKind) {
    errors.push(
      issue(
        'REFERENCE_TYPE_MISMATCH',
        file,
        jsonPointer,
        `${id} resolves to ${record.kind}, expected ${expectedKind}.`,
      ),
    );
  }
  return record;
}

function checkReferenceList(errors, index, manifest, file, basePointer, field, ids, expectedKind) {
  asArray(ids).forEach((id, refIndex) => {
    checkReference(errors, index, manifest, file, `${basePointer}/${field}/${refIndex}`, id, expectedKind);
  });
}

export function validateHeaders(bundle) {
  const errors = [];
  const manifest = bundle?.manifest;
  if (!isObject(manifest)) return errors;
  const expected = {
    schemaVersion: SCHEMA_VERSION,
    scenarioId: manifest.scenarioId,
    scenarioVersion: manifest.scenarioVersion,
  };
  for (const name of DATA_FILE_NAMES) {
    const doc = bundle?.[name];
    if (!isObject(doc)) continue;
    for (const field of ['schemaVersion', 'scenarioId', 'scenarioVersion']) {
      if (doc[field] !== expected[field]) {
        errors.push(
          issue(
            'HEADER_MISMATCH',
            `${name}.json`,
            `/${field}`,
            `Expected ${field} ${JSON.stringify(expected[field])} from manifest but found ${JSON.stringify(doc[field])}.`,
          ),
        );
      }
    }
  }
  return errors;
}

export function validateEntityNamespaces(bundle, index) {
  const errors = [];
  const scenarioId = asString(bundle?.manifest?.scenarioId);
  if (!SCENARIO_IDS.includes(scenarioId)) return errors;

  for (const record of index.byId.values()) {
    if (typeof record.id !== 'string') continue;
    const namespace = record.id.split('.')[0];
    if (namespace !== scenarioId) {
      errors.push(
        issue(
          'CROSS_SCENARIO_ENTITY',
          record.file,
          `${record.jsonPointer}/id`,
          `Entity ID ${record.id} belongs to ${namespace}, but this package is ${scenarioId}. Every entity ID (including unreferenced metadata, nested shots/subtitles and events) must use the package namespace.`,
        ),
      );
    }
  }

  return errors;
}

export function validateReferences(bundle, index) {
  const errors = [];
  const manifest = bundle?.manifest ?? {};
  const data = (name) => (isObject(bundle?.[name]) ? bundle[name].data : undefined);
  const ref = (file, pointerPath, id, kind) =>
    checkReference(errors, index, manifest, file, pointerPath, id, kind);
  const refList = (file, basePointer, field, ids, kind) =>
    checkReferenceList(errors, index, manifest, file, basePointer, field, ids, kind);

  const brand = data('brand');
  ref('brand.json', '/data/brand/logoAssetId', brand?.brand?.logoAssetId, 'asset');
  asArray(brand?.products).forEach((product, productIndex) => {
    refList(
      'brand.json',
      `/data/products/${productIndex}`,
      'imageAssetIds',
      product?.imageAssetIds,
      'asset',
    );
  });

  const discovery = data('discovery');
  asArray(discovery?.signals).forEach((signal, signalIndex) => {
    refList('discovery.json', `/data/signals/${signalIndex}`, 'evidenceIds', signal?.evidenceIds, 'evidence');
  });
  asArray(discovery?.trends).forEach((trend, trendIndex) => {
    refList('discovery.json', `/data/trends/${trendIndex}`, 'signalIds', trend?.signalIds, 'signal');
  });

  const analysis = data('analysis');
  asArray(analysis?.analyses).forEach((item, itemIndex) => {
    refList('analysis.json', `/data/analyses/${itemIndex}`, 'trendIds', item?.trendIds, 'trend');
    refList('analysis.json', `/data/analyses/${itemIndex}`, 'evidenceIds', item?.evidenceIds, 'evidence');
  });
  asArray(analysis?.briefs).forEach((brief, briefIndex) => {
    ref('analysis.json', `/data/briefs/${briefIndex}/analysisId`, brief?.analysisId, 'analysis');
    refList('analysis.json', `/data/briefs/${briefIndex}`, 'productIds', brief?.productIds, 'product');
  });

  const script = data('script');
  asArray(script?.versions).forEach((version, versionIndex) => {
    const versionPointer = `/data/versions/${versionIndex}`;
    ref('script.json', `${versionPointer}/briefId`, version?.briefId, 'brief');
    asArray(version?.shots).forEach((shot, shotIndex) => {
      refList('script.json', `${versionPointer}/shots/${shotIndex}`, 'assetIds', shot?.assetIds, 'asset');
    });
  });

  asArray(data('video')?.videos).forEach((video, videoIndex) => {
    const videoPointer = `/data/videos/${videoIndex}`;
    ref('video.json', `${videoPointer}/scriptVersionId`, video?.scriptVersionId, 'scriptVersion');
    refList('video.json', `${videoPointer}`, 'storyboardShotIds', video?.storyboardShotIds, 'shot');
    ref('video.json', `${videoPointer}/mp4AssetId`, video?.mp4AssetId, 'asset');
    ref('video.json', `${videoPointer}/posterAssetId`, video?.posterAssetId, 'asset');
    refList('video.json', `${videoPointer}`, 'subtitleAssetIds', video?.subtitleAssetIds, 'asset');
  });

  const delivery = data('delivery');
  asArray(delivery?.plans).forEach((plan, planIndex) => {
    const planPointer = `/data/plans/${planIndex}`;
    ref('delivery.json', `${planPointer}/scriptVersionId`, plan?.scriptVersionId, 'scriptVersion');
    ref('delivery.json', `${planPointer}/videoId`, plan?.videoId, 'video');
    refList('delivery.json', `${planPointer}`, 'recipientIds', plan?.recipientIds, 'recipient');
    refList('delivery.json', `${planPointer}`, 'attachmentAssetIds', plan?.attachmentAssetIds, 'asset');
  });
  asArray(delivery?.records).forEach((record, recordIndex) => {
    ref('delivery.json', `/data/records/${recordIndex}/planId`, record?.planId, 'deliveryPlan');
  });

  asArray(data('assets')?.assets).forEach((asset, assetIndex) => {
    refList('assets.json', `/data/assets/${assetIndex}`, 'productIds', asset?.productIds, 'product');
  });

  // Entry IDs must exist with the expected type as well.
  const manifestEntryChecks = [
    ['entryBriefId', 'brief'],
    ['entryScriptVersionId', 'scriptVersion'],
    ['entryVideoId', 'video'],
    ['entryDeliveryId', 'deliveryPlan'],
  ];
  for (const [field, kind] of manifestEntryChecks) {
    ref('manifest.json', `/${field}`, manifest?.[field], kind);
  }

  return errors;
}

/* ------------------------------------------------------------------------- */
/* Entry chain and cross-file relations                                      */
/* ------------------------------------------------------------------------- */

function findRecord(index, kind, id) {
  const record = typeof id === 'string' ? index.byId.get(id) : null;
  return record && record.kind === kind ? record.value : null;
}

export function validateEntryChain(bundle, index) {
  const errors = [];
  const manifest = bundle?.manifest ?? {};
  const analysis = bundle?.analysis?.data ?? {};
  const script = bundle?.script?.data ?? {};
  const videoData = bundle?.video?.data ?? {};
  const delivery = bundle?.delivery?.data ?? {};

  const entryBrief = findRecord(index, 'brief', manifest.entryBriefId);
  const entryScript = findRecord(index, 'scriptVersion', manifest.entryScriptVersionId);
  const entryVideo = findRecord(index, 'video', manifest.entryVideoId);
  const entryPlan = findRecord(index, 'deliveryPlan', manifest.entryDeliveryId);

  if (entryScript && entryBrief && entryScript.briefId !== entryBrief.id) {
    errors.push(
      issue(
        'ENTRY_CHAIN_MISMATCH',
        'script.json',
        `/data/versions/${asArray(script.versions).findIndex((version) => version?.id === entryScript.id)}/briefId`,
        `Entry script ${entryScript.id} references brief ${entryScript.briefId}, but manifest.entryBriefId is ${entryBrief.id}.`,
      ),
    );
  }
  if (entryVideo && entryScript && entryVideo.scriptVersionId !== entryScript.id) {
    errors.push(
      issue(
        'ENTRY_CHAIN_MISMATCH',
        'video.json',
        `/data/videos/${asArray(videoData.videos).findIndex((video) => video?.id === entryVideo.id)}/scriptVersionId`,
        `Entry video ${entryVideo.id} is bound to ${entryVideo.scriptVersionId}, not manifest.entryScriptVersionId ${entryScript.id}.`,
      ),
    );
  }
  if (entryPlan && entryScript && entryPlan.scriptVersionId !== entryScript.id) {
    errors.push(
      issue(
        'ENTRY_CHAIN_MISMATCH',
        'delivery.json',
        `/data/plans/${asArray(delivery.plans).findIndex((plan) => plan?.id === entryPlan.id)}/scriptVersionId`,
        `Entry delivery plan must use the entry script version ${entryScript.id}.`,
      ),
    );
  }
  if (entryPlan && entryVideo && entryPlan.videoId !== entryVideo.id) {
    errors.push(
      issue(
        'ENTRY_CHAIN_MISMATCH',
        'delivery.json',
        `/data/plans/${asArray(delivery.plans).findIndex((plan) => plan?.id === entryPlan.id)}/videoId`,
        `Entry delivery plan must use the entry video ${entryVideo.id}.`,
      ),
    );
  }
  if (entryPlan && entryVideo && Array.isArray(entryPlan.attachmentAssetIds)) {
    if (!entryPlan.attachmentAssetIds.includes(entryVideo.mp4AssetId)) {
      errors.push(
        issue(
          'DELIVERY_ATTACHMENT_MISMATCH',
          'delivery.json',
          `/data/plans/${asArray(delivery.plans).findIndex((plan) => plan?.id === entryPlan.id)}/attachmentAssetIds`,
          `Entry delivery attachments must include the entry video MP4 asset ${entryVideo.mp4AssetId}.`,
        ),
      );
    }
  }

  // The successful preset receipt for the entry plan is required.
  const records = asArray(delivery.records);
  const entrySuccess = records.find(
    (record) => record?.planId === manifest.entryDeliveryId && record?.outcome === 'simulated_delivered',
  );
  if (!entrySuccess) {
    errors.push(
      issue(
        'DELIVERY_RECORD_MISSING',
        'delivery.json',
        '/data/records',
        `No successful simulated_delivered record for entry delivery plan ${manifest.entryDeliveryId}.`,
      ),
    );
  }
  if (!records.some((record) => record?.outcome === 'failed')) {
    errors.push(
      issue(
        'DELIVERY_RECORD_MISSING',
        'delivery.json',
        '/data/records',
        'delivery.json must include at least one explicit failed record as the recoverable failure sample (POC_EVENT_PROTOCOL v1).',
      ),
    );
  }

  // Brand/product/asset bindings.
  const brand = bundle?.brand?.data ?? {};
  const logo = findRecord(index, 'asset', brand?.brand?.logoAssetId);
  if (logo && logo.kind !== 'logo') {
    errors.push(
      issue(
        'ASSET_KIND_MISMATCH',
        'brand.json',
        '/data/brand/logoAssetId',
        `Brand logo asset ${logo.id} has kind ${logo.kind}, expected logo.`,
      ),
    );
  }
  for (const [productIndex, product] of asArray(brand.products).entries()) {
    for (const [assetIndex, assetId] of asArray(product?.imageAssetIds).entries()) {
      const asset = findRecord(index, 'asset', assetId);
      if (asset && asset.kind !== 'image' && asset.kind !== 'product_image') {
        errors.push(
          issue(
            'ASSET_KIND_MISMATCH',
            'brand.json',
            `/data/products/${productIndex}/imageAssetIds/${assetIndex}`,
            `Product image asset ${asset.id} has kind ${asset.kind}.`,
          ),
        );
      }
    }
  }

  // Video asset kinds and storyboard binding.
  for (const [videoIndex, video] of asArray(videoData.videos).entries()) {
    const videoPointer = `/data/videos/${videoIndex}`;
    const mp4 = findRecord(index, 'asset', video?.mp4AssetId);
    if (mp4 && mp4.kind !== 'video') {
      errors.push(
        issue(
          'ASSET_KIND_MISMATCH',
          'video.json',
          `${videoPointer}/mp4AssetId`,
          `MP4 asset ${mp4.id} has kind ${mp4.kind}, expected video.`,
        ),
      );
    }
    const poster = findRecord(index, 'asset', video?.posterAssetId);
    if (poster && poster.kind !== 'poster') {
      errors.push(
        issue(
          'ASSET_KIND_MISMATCH',
          'video.json',
          `${videoPointer}/posterAssetId`,
          `Poster asset ${poster.id} has kind ${poster.kind}, expected poster.`,
        ),
      );
    }
    for (const [assetIndex, assetId] of asArray(video?.subtitleAssetIds).entries()) {
      const asset = findRecord(index, 'asset', assetId);
      if (asset && asset.kind !== 'subtitle') {
        errors.push(
          issue(
            'ASSET_KIND_MISMATCH',
            'video.json',
            `${videoPointer}/subtitleAssetIds/${assetIndex}`,
            `Subtitle asset ${asset.id} has kind ${asset.kind}.`,
          ),
        );
      }
    }
    const boundScript = findRecord(index, 'scriptVersion', video?.scriptVersionId);
    if (boundScript) {
      const expectedShots = asArray(boundScript.shots).map((shot) => shot?.id);
      const actualShots = asArray(video?.storyboardShotIds);
      if (
        expectedShots.length !== actualShots.length ||
        expectedShots.some((shotId, shotIndex) => shotId !== actualShots[shotIndex])
      ) {
        errors.push(
          issue(
            'STORYBOARD_MISMATCH',
            'video.json',
            `${videoPointer}/storyboardShotIds`,
            'storyboardShotIds must equal the bound script version shot IDs in order.',
          ),
        );
      }
    }
  }

  // Each brief language pair and the script versions must cover en and ar.
  const versions = asArray(script.versions);
  const briefs = asArray(analysis.briefs);
  for (const [briefIndex, brief] of briefs.entries()) {
    const languages = asArray(brief?.languages);
    if (!languages.includes('en') || !languages.includes('ar')) {
      errors.push(
        issue(
          'SCRIPT_LANGUAGE_MISSING',
          'analysis.json',
          `/data/briefs/${briefIndex}/languages`,
          'Each brief must require both en and ar (v1 needs EN and AR script versions).',
        ),
      );
    }
    const briefVersions = versions.filter((version) => version?.briefId === brief?.id);
    for (const language of ['en', 'ar']) {
      if (!briefVersions.some((version) => version?.language === language)) {
        errors.push(
          issue(
            'SCRIPT_LANGUAGE_MISSING',
            'script.json',
            '/data/versions',
            `Brief ${brief?.id} has no ${language} script version (v1 requires at least EN and AR script copy).`,
          ),
        );
      }
    }
  }

  return errors;
}

/* ------------------------------------------------------------------------- */
/* Script timeline / video static checks (L3)                                */
/* ------------------------------------------------------------------------- */

export function validateScriptTimelineAndVideos(bundle, index) {
  const errors = [];
  const versions = asArray(bundle?.script?.data?.versions);
  const videos = asArray(bundle?.video?.data?.videos);

  versions.forEach((version, versionIndex) => {
    const base = `/data/versions/${versionIndex}`;
    const shots = asArray(version?.shots);
    if (shots.length !== 4) {
      errors.push(issue('SCRIPT_SHOT_COUNT', 'script.json', `${base}/shots`, `Expected exactly 4 shots, found ${shots.length}.`));
    }
    let cursor = 0;
    shots.forEach((shot, shotIndex) => {
      const shotPointer = `${base}/shots/${shotIndex}`;
      if (shot?.startMs !== cursor) {
        errors.push(
          issue(
            'SCRIPT_SHOT_GAP',
            'script.json',
            `${shotPointer}/startMs`,
            `Shot must start at ${cursor} ms (contiguous timeline), found ${shot?.startMs}.`,
          ),
        );
      }
      const duration = Number(shot?.durationMs);
      if (!Number.isInteger(duration) || duration <= 0) {
        errors.push(issue('SCRIPT_SHOT_DURATION', 'script.json', `${shotPointer}/durationMs`, 'Shot durationMs must be a positive integer.'));
      } else {
        cursor += duration;
      }
    });
    if (version?.durationMs !== 15000) {
      errors.push(issue('SCRIPT_DURATION_INVALID', 'script.json', `${base}/durationMs`, 'Script durationMs must be exactly 15000.'));
    }
    if (cursor !== 15000) {
      errors.push(
        issue(
          'SCRIPT_DURATION_MISMATCH',
          'script.json',
          `${base}/shots`,
          `Shot durations add up to ${cursor} ms, expected 15000 ms.`,
        ),
      );
    }

    let previousEnd = -1;
    asArray(version?.subtitles).forEach((subtitle, subtitleIndex) => {
      const subtitlePointer = `${base}/subtitles/${subtitleIndex}`;
      const start = Number(subtitle?.startMs);
      const end = Number(subtitle?.endMs);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start) {
        errors.push(
          issue(
            'SUBTITLE_RANGE_INVALID',
            'script.json',
            subtitlePointer,
            'Subtitle must have integer startMs >= 0 and endMs > startMs.',
          ),
        );
        return;
      }
      if (end > 15000) {
        errors.push(issue('SUBTITLE_RANGE_INVALID', 'script.json', `${subtitlePointer}/endMs`, 'Subtitle endMs exceeds the 15000 ms script duration.'));
      }
      if (start < previousEnd) {
        errors.push(
          issue(
            'SUBTITLE_OVERLAP',
            'script.json',
            `${subtitlePointer}/startMs`,
            `Subtitle starts at ${start} ms but the previous subtitle ends at ${previousEnd} ms (overlap/unsorted).`,
          ),
        );
      }
      previousEnd = Math.max(previousEnd, end);
    });
  });

  videos.forEach((video, videoIndex) => {
    const base = `/data/videos/${videoIndex}`;
    if (video?.durationMs !== 15000) {
      errors.push(issue('VIDEO_DURATION_INVALID', 'video.json', `${base}/durationMs`, 'Video durationMs must be 15000.'));
    }
    if (video?.width !== 1080 || video?.height !== 1920) {
      errors.push(issue('VIDEO_DIMENSION_INVALID', 'video.json', base, 'Entry video must be 1080×1920 (9:16).'));
    }
    if (typeof video?.frameRate !== 'number' || video.frameRate <= 0) {
      errors.push(issue('VIDEO_FRAMERATE_INVALID', 'video.json', `${base}/frameRate`, 'frameRate must be a positive number.'));
    }
    if (video?.productionMode !== 'preproduced') {
      errors.push(issue('VIDEO_MODE_INVALID', 'video.json', `${base}/productionMode`, 'productionMode must be preproduced.'));
    }
    if (!/pre-produced|preproduced/i.test(asString(video?.disclosure))) {
      errors.push(
        issue(
          'VIDEO_DISCLOSURE_MISSING',
          'video.json',
          `${base}/disclosure`,
          'Video disclosure must explicitly state the video is pre-produced.',
        ),
      );
    }
    if (video?.scriptVersionId) {
      const version = findRecord(index, 'scriptVersion', video.scriptVersionId);
      if (!version) {
        // The generic reference check already reports the missing ID.
      } else if (asArray(version.shots).length !== asArray(video.storyboardShotIds).length) {
        errors.push(issue('STORYBOARD_MISMATCH', 'video.json', `${base}/storyboardShotIds`, 'Storyboard shot count must match the script version.'));
      }
    }
    if (!asArray(video?.subtitleAssetIds).length) {
      errors.push(issue('VIDEO_SUBTITLE_MISSING', 'video.json', `${base}/subtitleAssetIds`, 'Entry video must reference at least one subtitle asset.'));
    }
  });

  return errors;
}

/* ------------------------------------------------------------------------- */
/* Delivery semantics (L2/L3)                                                */
/* ------------------------------------------------------------------------- */

export function validateDeliverySemantics(bundle, index) {
  const errors = [];
  const warnings = [];
  const delivery = bundle?.delivery?.data ?? {};
  const recipients = asArray(delivery.recipients);
  const plans = asArray(delivery.plans);
  const records = asArray(delivery.records);

  recipients.forEach((recipient, recipientIndex) => {
    const email = asString(recipient?.email);
    if (!INVALID_EMAIL_PATTERN.test(email)) {
      errors.push(
        issue(
          'INVALID_RECIPIENT_DOMAIN',
          'delivery.json',
          `/data/recipients/${recipientIndex}/email`,
          `Recipient email ${JSON.stringify(email)} must use the reserved .invalid domain.`,
        ),
      );
    }
    if (recipient?.isSimulated !== true) {
      errors.push(
        issue(
          'RECIPIENT_NOT_SIMULATED',
          'delivery.json',
          `/data/recipients/${recipientIndex}/isSimulated`,
          'Recipients must be marked simulated.',
        ),
      );
    }
  });

  plans.forEach((plan, planIndex) => {
    const base = `/data/plans/${planIndex}`;
    const video = findRecord(index, 'video', plan?.videoId);
    if (video) {
      if (plan?.scriptVersionId !== video.scriptVersionId) {
        errors.push(
          issue(
            'DELIVERY_VERSION_MISMATCH',
            'delivery.json',
            `${base}/scriptVersionId`,
            'Delivery plan scriptVersionId must match the script bound to its video.',
          ),
        );
      }
      if (!asArray(plan?.attachmentAssetIds).includes(video.mp4AssetId)) {
        errors.push(
          issue(
            'DELIVERY_ATTACHMENT_MISMATCH',
            'delivery.json',
            `${base}/attachmentAssetIds`,
            `Delivery plan attachments must include the video MP4 asset ${video.mp4AssetId}.`,
          ),
        );
      }
    }
    if (!/simulated/i.test(asString(plan?.disclosure))) {
      errors.push(
        issue(
          'DELIVERY_DISCLOSURE_MISSING',
          'delivery.json',
          `${base}/disclosure`,
          'Delivery plan disclosure must explicitly state the delivery is simulated.',
        ),
      );
    }
    if (!Number.isInteger(plan?.scheduledVirtualMs) || plan.scheduledVirtualMs < 0) {
      errors.push(issue('DELIVERY_SCHEDULE_INVALID', 'delivery.json', `${base}/scheduledVirtualMs`, 'scheduledVirtualMs must be a non-negative integer.'));
    }
  });

  const recordGroups = new Map();
  records.forEach((record, recordIndex) => {
    const base = `/data/records/${recordIndex}`;
    const plan = findRecord(index, 'deliveryPlan', record?.planId);
    if (!plan) return;
    if (!recordGroups.has(record.planId)) recordGroups.set(record.planId, []);
    recordGroups.get(record.planId).push({ record, recordIndex });
    if (!Number.isInteger(record?.attempt) || record.attempt < 1) {
      errors.push(issue('DELIVERY_ATTEMPT_INVALID', 'delivery.json', `${base}/attempt`, 'Delivery attempt must be a positive integer.'));
    }
    if (!Number.isInteger(record?.atMs) || record.atMs < plan.scheduledVirtualMs) {
      errors.push(
        issue(
          'DELIVERY_RECORD_BEFORE_SCHEDULE',
          'delivery.json',
          `${base}/atMs`,
          'Preset delivery record must not occur before the plan scheduledVirtualMs.',
        ),
      );
    }
    if (record?.outcome === 'simulated_delivered' && record?.failureCode !== null) {
      errors.push(issue('DELIVERY_OUTCOME_INVALID', 'delivery.json', `${base}/failureCode`, 'Successful simulated record requires failureCode null.'));
    }
    if (record?.outcome === 'failed' && record?.failureCode !== 'delivery_failed') {
      errors.push(issue('DELIVERY_OUTCOME_INVALID', 'delivery.json', `${base}/failureCode`, 'Failed record requires failureCode delivery_failed.'));
    }
  });

  for (const [planId, group] of recordGroups.entries()) {
    const attempts = group.map(({ record }) => record.attempt);
    const uniqueAttempts = new Set(attempts);
    if (uniqueAttempts.size !== attempts.length) {
      errors.push(issue('DELIVERY_ATTEMPT_DUPLICATE', 'delivery.json', '/data/records', `Plan ${planId} has duplicate attempt numbers.`));
    }
    const sorted = [...attempts].sort((a, b) => a - b);
    sorted.forEach((attempt, attemptIndex) => {
      if (attempt !== attemptIndex + 1) {
        warnings.push(`delivery.json: plan ${planId} attempt numbers are not contiguous from 1 (${attempts.join(', ')}); history remains readable.`);
      }
    });
  }

  return { errors, warnings };
}

/* ------------------------------------------------------------------------- */
/* Media path safety (L4, no IO)                                             */
/* ------------------------------------------------------------------------- */

export function validateMediaPathSafety(bundle) {
  const errors = [];
  const manifest = bundle?.manifest ?? {};
  const slug = SLUG_BY_SCENARIO[manifest?.scenarioId] ?? asString(manifest?.slug);
  const version = asString(manifest?.scenarioVersion);
  const assets = asArray(bundle?.assets?.data?.assets);
  const expectedPrefix = `${MEDIA_PREFIX}${slug}/${version}/`;

  assets.forEach((asset, assetIndex) => {
    const uri = asString(asset?.uri);
    const base = `/data/assets/${assetIndex}/uri`;
    if (!uri) {
      errors.push(issue('MEDIA_URI_INVALID', 'assets.json', base, 'Asset uri is required.'));
      return;
    }
    if (uri.includes('%')) {
      errors.push(issue('PATH_PERCENT_ENCODING', 'assets.json', base, 'Asset uri must not contain percent-encoded characters.'));
      return;
    }
    if (/[?#]/.test(uri)) {
      errors.push(issue('PATH_QUERY_OR_FRAGMENT', 'assets.json', base, 'Asset uri must not contain query or fragment components.'));
      return;
    }
    if (uri.includes('\\')) {
      errors.push(issue('PATH_TRAVERSAL', 'assets.json', base, 'Asset uri must use forward slashes, not backslashes.'));
      return;
    }
    if (!uri.startsWith(MEDIA_PREFIX)) {
      errors.push(issue('MEDIA_URI_EXTERNAL', 'assets.json', base, 'Asset uri must be a same-origin /scenario-media/ path.'));
      return;
    }
    const remainder = uri.slice(MEDIA_PREFIX.length);
    const segments = remainder.split('/');
    if (segments.some((segment) => segment === '..' || segment === '.' || segment === '')) {
      errors.push(issue('PATH_TRAVERSAL', 'assets.json', base, 'Asset uri must not contain empty, "." or ".." path segments.'));
      return;
    }
    if (!uri.startsWith(expectedPrefix)) {
      errors.push(
        issue(
          'MEDIA_URI_SCENARIO_MISMATCH',
          'assets.json',
          base,
          `Asset uri must be under ${expectedPrefix} for ${manifest.scenarioId} ${version}.`,
        ),
      );
      return;
    }
    const filename = uri.slice(expectedPrefix.length);
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/.test(filename) || filename.includes('/')) {
      errors.push(issue('MEDIA_FILENAME_INVALID', 'assets.json', base, 'Asset filename must be a single safe file name with an extension.'));
    }
  });

  return errors;
}

/* ------------------------------------------------------------------------- */
/* Event flow (L3 static ordering / guards)                                  */
/* ------------------------------------------------------------------------- */

function directDependencies(event, index) {
  const type = event?.type;
  const payload = event?.payload ?? {};
  const deps = [];
  const pushDependencies = (kind, id) => {
    const record = findRecord(index, kind, id);
    if (!record) return;
    if (kind === 'signal') deps.push(...asArray(record.evidenceIds));
    if (kind === 'trend') deps.push(...asArray(record.signalIds));
    if (kind === 'analysis') deps.push(...asArray(record.trendIds), ...asArray(record.evidenceIds));
    if (kind === 'brief') deps.push(record.analysisId, ...asArray(record.productIds));
    if (kind === 'scriptVersion') deps.push(record.briefId);
    if (kind === 'video') {
      deps.push(
        record.scriptVersionId,
        ...asArray(record.storyboardShotIds),
        record.mp4AssetId,
        record.posterAssetId,
        ...asArray(record.subtitleAssetIds),
      );
    }
    if (kind === 'deliveryPlan') {
      deps.push(record.scriptVersionId, record.videoId, ...asArray(record.recipientIds), ...asArray(record.attachmentAssetIds));
    }
    if (kind === 'deliveryRecord') deps.push(record.planId);
  };

  switch (type) {
    case 'signal.discovered':
      pushDependencies('signal', payload.signalId);
      break;
    case 'trend.summarized':
      pushDependencies('trend', payload.trendId);
      break;
    case 'analysis.presented':
      pushDependencies('analysis', payload.analysisId);
      break;
    case 'brief.presented':
      pushDependencies('brief', payload.briefId);
      break;
    case 'script.presented':
      pushDependencies('scriptVersion', payload.scriptVersionId);
      break;
    case 'script.confirmed':
      deps.push(payload.scriptVersionId);
      break;
    case 'video.queued':
    case 'video.available':
      pushDependencies('video', payload.videoId);
      break;
    case 'video.progressed':
      deps.push(payload.videoId);
      break;
    case 'delivery.queued':
      pushDependencies('deliveryPlan', payload.planId);
      break;
    case 'delivery.simulated':
      pushDependencies('deliveryRecord', payload.recordId);
      break;
    default:
      break;
  }
  return [...new Set(deps.filter((id) => typeof id === 'string'))];
}

function expectedOutputRefs(event) {
  const mapping = PAYLOAD_ENTITY[event?.type];
  if (!mapping || !EXPOSING_TYPES.has(event?.type)) return [];
  const id = event?.payload?.[mapping.field];
  return typeof id === 'string' ? [id] : [];
}

function sameStringSet(actual, expected) {
  const a = [...new Set(asArray(actual))].sort();
  const b = [...new Set(asArray(expected))].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function stageExpectedWorkflow(completedStageCount) {
  const workflow = {};
  STAGE_ORDER.forEach((stage, stageIndex) => {
    if (stageIndex < completedStageCount) workflow[stage] = 'completed';
    else if (stageIndex === completedStageCount) workflow[stage] = 'ready';
    else workflow[stage] = 'locked';
  });
  return workflow;
}

export function analyseEvents(bundle, index) {
  const errors = [];
  const events = asArray(bundle?.events?.data?.events);
  const manifest = bundle?.manifest ?? {};
  const exposed = new Set();
  const exposedBySequence = new Map([[0, new Set()]]);
  const stageEvents = new Map(STAGE_ORDER.map((stage) => [stage, []]));
  const stageCompletedSequence = {};
  const stageStartedSequence = {};
  let previousAtMs = -1;
  let currentStage = null;
  let currentStageCompleted = false;

  const expose = (event) => {
    const mapping = PAYLOAD_ENTITY[event?.type];
    if (mapping && EXPOSING_TYPES.has(event?.type)) {
      const id = event?.payload?.[mapping.field];
      if (typeof id === 'string') exposed.add(id);
    }
    if (event?.type === 'script.presented') {
      const version = findRecord(index, 'scriptVersion', event?.payload?.scriptVersionId);
      if (version) {
        asArray(version.shots).forEach((shot) => exposed.add(shot?.id));
        asArray(version.subtitles).forEach((subtitle) => exposed.add(subtitle?.id));
      }
    }
  };

  if (!events.length) {
    errors.push(issue('EVENTS_MISSING', 'events.json', '/data/events', 'At least one event is required.'));
    return { errors, exposedBySequence, stageEvents, stageCompletedSequence, stageStartedSequence };
  }

  events.forEach((event, eventIndex) => {
    const base = `/data/events/${eventIndex}`;
    if (event?.sequence !== eventIndex + 1) {
      errors.push(
        issue(
          'EVENT_SEQUENCE_INVALID',
          'events.json',
          `${base}/sequence`,
          `Events must be contiguous from sequence 1; expected ${eventIndex + 1}, found ${event?.sequence}.`,
        ),
      );
    }
    if (typeof event?.atMs !== 'number' || !Number.isInteger(event.atMs) || event.atMs < 0) {
      errors.push(issue('EVENT_TIME_INVALID', 'events.json', `${base}/atMs`, 'atMs must be a non-negative integer.'));
    } else if (event.atMs < previousAtMs) {
      errors.push(
        issue(
          'EVENT_TIME_DISORDER',
          'events.json',
          `${base}/atMs`,
          `atMs must be non-decreasing; ${event.atMs} follows ${previousAtMs}.`,
        ),
      );
    } else {
      previousAtMs = event.atMs;
    }
    if (event?.scenarioId !== manifest.scenarioId || event?.scenarioVersion !== manifest.scenarioVersion) {
      errors.push(
        issue(
          'EVENT_SCENARIO_MISMATCH',
          'events.json',
          base,
          'Event scenarioId/scenarioVersion must match the package manifest.',
        ),
      );
    }
    if (!asString(event?.runKey)) {
      errors.push(issue('EVENT_RUNKEY_MISSING', 'events.json', `${base}/runKey`, 'runKey is required for replay grouping.'));
    }

    const stage = event?.stage;
    if (!STAGE_ORDER.includes(stage)) {
      errors.push(issue('EVENT_STAGE_UNKNOWN', 'events.json', `${base}/stage`, `Unknown stage ${JSON.stringify(stage)}.`));
      return;
    }
    if (currentStage === null) {
      if (stage !== 'discovery') {
        errors.push(
          issue(
            'EVENT_STAGE_ORDER',
            'events.json',
            `${base}/stage`,
            'Events must start with the discovery stage.',
          ),
        );
      }
      currentStage = stage;
    } else if (stage !== currentStage) {
      if (!currentStageCompleted) {
        errors.push(
          issue(
            'EVENT_STAGE_ORDER',
            'events.json',
            `${base}/stage`,
            `Stage ${stage} starts before ${currentStage} completed.`,
          ),
        );
      }
      if (STAGE_ORDER.indexOf(stage) < STAGE_ORDER.indexOf(currentStage)) {
        errors.push(issue('EVENT_STAGE_ORDER', 'events.json', `${base}/stage`, `Stage ${stage} appears after ${currentStage}.`));
      }
      currentStage = stage;
      currentStageCompleted = false;
    }

    const stageList = stageEvents.get(stage);
    if (stageList.length === 0) {
      if (event?.type !== 'stage.started') {
        errors.push(issue('EVENT_STAGE_START_MISSING', 'events.json', `${base}/type`, `Stage ${stage} must start with stage.started.`));
      } else {
        stageStartedSequence[stage] = event.sequence;
      }
    }

    if (event?.type === 'stage.failed') {
      errors.push(
        issue(
          'EVENT_FAILURE_IN_MAIN_FLOW',
          'events.json',
          `${base}/type`,
          'The v1 golden-path events stream must not contain stage.failed; recoverable failures live in delivery.records and explicit API failureCase.',
        ),
      );
    }

    if (event?.type === 'stage.completed') {
      currentStageCompleted = true;
      stageCompletedSequence[stage] = event.sequence;
    }
    if (stageList.some((item) => item?.type === 'stage.completed')) {
      errors.push(issue('EVENT_AFTER_STAGE_COMPLETED', 'events.json', base, `Event appears after ${stage} completed.`));
    }

    // Payload reference and outputRefs exactness.
    const mapping = PAYLOAD_ENTITY[event?.type];
    if (mapping) {
      const payloadId = event?.payload?.[mapping.field];
      checkReference(errors, index, manifest, 'events.json', `${base}/payload/${mapping.field}`, payloadId, mapping.kind);
    } else if (!['stage.started', 'stage.completed', 'stage.failed'].includes(event?.type)) {
      errors.push(issue('EVENT_TYPE_UNKNOWN', 'events.json', `${base}/type`, `Unknown event type ${JSON.stringify(event?.type)}.`));
    }
    const expectedOutputs = expectedOutputRefs(event);
    if (!sameStringSet(event?.outputRefs, expectedOutputs)) {
      errors.push(
        issue(
          'EVENT_OUTPUT_REFS_MISMATCH',
          'events.json',
          `${base}/outputRefs`,
          `outputRefs must be exactly ${JSON.stringify(expectedOutputs)} for ${event?.type}.`,
        ),
      );
    }

    // Input refs: direct dependencies must be included and resolvable/visible.
    const deps = directDependencies(event, index);
    for (const depId of deps) {
      const inputRefs = asArray(event?.inputRefs);
      if (!inputRefs.includes(depId)) {
        const dep = index.byId.get(depId);
        if (!dep || !BASE_ENTITY_KINDS.has(dep.kind)) {
          errors.push(
            issue(
              'EVENT_INPUT_REF_MISSING',
              'events.json',
              `${base}/inputRefs`,
              `inputRefs must include direct dependency ${depId} for ${event?.type}.`,
            ),
          );
        }
      }
    }
    for (const [refIndex, refId] of asArray(event?.inputRefs).entries()) {
      const record = checkReference(errors, index, manifest, 'events.json', `${base}/inputRefs/${refIndex}`, refId, null);
      if (record && !BASE_ENTITY_KINDS.has(record.kind)) {
        const visibleBefore =
          exposed.has(record.id) ||
          (record.kind === 'shot' || record.kind === 'subtitle') &&
            asArray(bundle?.script?.data?.versions).some((version) =>
              exposed.has(version?.id),
            );
        if (!visibleBefore) {
          errors.push(
            issue(
              'EVENT_INPUT_REF_NOT_VISIBLE',
              'events.json',
              `${base}/inputRefs/${refIndex}`,
              `${refId} is referenced before it becomes visible at this cursor.`,
            ),
          );
        }
      }
    }
    for (const [outputIndex, outputId] of asArray(event?.outputRefs).entries()) {
      checkReference(errors, index, manifest, 'events.json', `${base}/outputRefs/${outputIndex}`, outputId, null);
    }

    expose(event);
    stageList.push(event);
    exposedBySequence.set(event.sequence, new Set(exposed));
  });

  // Per-stage presence/completeness and internal ordering.
  for (const [stageIndex, stage] of STAGE_ORDER.entries()) {
    const list = stageEvents.get(stage);
    if (!list.length) {
      errors.push(issue('EVENT_STAGE_MISSING', 'events.json', '/data/events', `No events for stage ${stage}.`));
      continue;
    }
    if (list[0]?.type !== 'stage.started') {
      errors.push(issue('EVENT_STAGE_START_MISSING', 'events.json', `/data/events`, `Stage ${stage} must have exactly one stage.started first.`));
    }
    if (list[list.length - 1]?.type !== 'stage.completed') {
      errors.push(issue('EVENT_STAGE_COMPLETION_MISSING', 'events.json', '/data/events', `Stage ${stage} must end with stage.completed.`));
    }
    const startedCount = list.filter((event) => event.type === 'stage.started').length;
    const completedCount = list.filter((event) => event.type === 'stage.completed').length;
    if (startedCount !== 1) {
      errors.push(issue('EVENT_STAGE_START_DUPLICATE', 'events.json', '/data/events', `Stage ${stage} must contain exactly one stage.started, found ${startedCount}.`));
    }
    if (completedCount !== 1) {
      errors.push(issue('EVENT_STAGE_COMPLETION_DUPLICATE', 'events.json', '/data/events', `Stage ${stage} must contain exactly one stage.completed, found ${completedCount}.`));
    }
    if (stageIndex > 0 && !stageCompletedSequence[STAGE_ORDER[stageIndex - 1]]) {
      errors.push(issue('EVENT_STAGE_ORDER', 'events.json', '/data/events', `Stage ${STAGE_ORDER[stageIndex - 1]} has no stage.completed before ${stage}.`));
    }

    const middle = list.filter((event) => !['stage.started', 'stage.completed'].includes(event.type));
    const types = middle.map((event) => event.type);

    if (stage === 'discovery') {
      const signals = asArray(bundle?.discovery?.data?.signals);
      const trends = asArray(bundle?.discovery?.data?.trends);
      const signalIds = middle.filter((event) => event.type === 'signal.discovered').map((event) => event.payload?.signalId);
      const trendIds = middle.filter((event) => event.type === 'trend.summarized').map((event) => event.payload?.trendId);
      for (const signal of signals) {
        if (!signalIds.includes(signal?.id)) {
          errors.push(issue('EVENT_SIGNAL_MISSING', 'events.json', '/data/events', `Signal ${signal?.id} has no signal.discovered event.`));
        }
      }
      for (const trend of trends) {
        if (!trendIds.includes(trend?.id)) {
          errors.push(issue('EVENT_TREND_MISSING', 'events.json', '/data/events', `Trend ${trend?.id} has no trend.summarized event.`));
        }
      }
      const firstTrendIndex = types.indexOf('trend.summarized');
      const lastSignalIndex = types.lastIndexOf('signal.discovered');
      if (firstTrendIndex !== -1 && lastSignalIndex !== -1 && firstTrendIndex < lastSignalIndex) {
        errors.push(issue('EVENT_ORDER', 'events.json', '/data/events', 'All signal.discovered events must precede trend.summarized events.'));
      }
    }

    if (stage === 'analysis') {
      const analyses = asArray(bundle?.analysis?.data?.analyses);
      const briefs = asArray(bundle?.analysis?.data?.briefs);
      const versions = asArray(bundle?.script?.data?.versions);
      const presentedAnalyses = middle.filter((event) => event.type === 'analysis.presented').map((event) => event.payload?.analysisId);
      const presentedBriefs = middle.filter((event) => event.type === 'brief.presented').map((event) => event.payload?.briefId);
      const presentedScripts = middle.filter((event) => event.type === 'script.presented').map((event) => event.payload?.scriptVersionId);
      const confirmed = middle.filter((event) => event.type === 'script.confirmed');
      for (const analysis of analyses) {
        if (!presentedAnalyses.includes(analysis?.id)) {
          errors.push(issue('EVENT_ANALYSIS_MISSING', 'events.json', '/data/events', `Analysis ${analysis?.id} has no analysis.presented event.`));
        }
      }
      for (const brief of briefs) {
        if (!presentedBriefs.includes(brief?.id)) {
          errors.push(issue('EVENT_BRIEF_MISSING', 'events.json', '/data/events', `Brief ${brief?.id} has no brief.presented event.`));
        }
      }
      for (const version of versions) {
        if (!presentedScripts.includes(version?.id)) {
          errors.push(issue('EVENT_SCRIPT_MISSING', 'events.json', '/data/events', `Script version ${version?.id} has no script.presented event.`));
        }
      }
      const rank = { 'analysis.presented': 0, 'brief.presented': 1, 'script.presented': 2, 'script.confirmed': 3 };
      let previousRank = -1;
      for (const event of middle) {
        const currentRank = rank[event.type];
        if (currentRank !== undefined && currentRank < previousRank) {
          errors.push(issue('EVENT_ORDER', 'events.json', '/data/events', `Event ${event.type} appears after a higher-order analysis event.`));
        }
        if (currentRank !== undefined) previousRank = Math.max(previousRank, currentRank);
      }
      if (confirmed.length !== 1) {
        errors.push(issue('EVENT_CONFIRMATION_COUNT', 'events.json', '/data/events', `analysis must contain exactly one script.confirmed, found ${confirmed.length}.`));
      } else {
        const payloadId = confirmed[0].payload?.scriptVersionId;
        if (payloadId !== manifest.entryScriptVersionId) {
          errors.push(
            issue(
              'EVENT_CONFIRMATION_VERSION',
              'events.json',
              '/data/events',
              `script.confirmed must bind manifest.entryScriptVersionId ${manifest.entryScriptVersionId}, found ${payloadId}.`,
            ),
          );
        }
        if (!presentedScripts.includes(payloadId)) {
          errors.push(issue('EVENT_CONFIRMATION_BEFORE_PRESENTATION', 'events.json', '/data/events', 'script.confirmed must follow the presentation of that script version.'));
        }
      }
    }

    if (stage === 'video') {
      const queued = middle.filter((event) => event.type === 'video.queued');
      const progressed = middle.filter((event) => event.type === 'video.progressed');
      const available = middle.filter((event) => event.type === 'video.available');
      if (queued.length !== 1) {
        errors.push(issue('EVENT_VIDEO_QUEUE_COUNT', 'events.json', '/data/events', `video must contain exactly one video.queued, found ${queued.length}.`));
      }
      if (available.length !== 1) {
        errors.push(issue('EVENT_VIDEO_AVAILABLE_COUNT', 'events.json', '/data/events', `video must contain exactly one video.available, found ${available.length}.`));
      }
      const videoIds = [...queued, ...progressed, ...available].map((event) => event.payload?.videoId);
      for (const videoId of videoIds) {
        if (videoId !== manifest.entryVideoId) {
          errors.push(issue('EVENT_VIDEO_VERSION', 'events.json', '/data/events', `Video events must use manifest.entryVideoId ${manifest.entryVideoId}, found ${videoId}.`));
        }
      }
      let previousProgress = -1;
      progressed.forEach((event) => {
        const progress = event.payload?.progress;
        if (typeof progress !== 'number' || !Number.isInteger(progress) || progress < 0 || progress > 100) {
          errors.push(issue('EVENT_PROGRESS_INVALID', 'events.json', '/data/events', 'video.progressed payload.progress must be an integer 0..100.'));
          return;
        }
        if (progress < previousProgress) {
          errors.push(issue('EVENT_PROGRESS_DISORDER', 'events.json', '/data/events', 'video.progressed values must be non-decreasing.'));
        }
        previousProgress = progress;
      });
      if (progressed.length && previousProgress !== 100) {
        errors.push(issue('EVENT_PROGRESS_INCOMPLETE', 'events.json', '/data/events', 'The last video.progressed must be exactly 100.'));
      }
      const queuedIndex = types.indexOf('video.queued');
      const availableIndex = types.indexOf('video.available');
      if (queuedIndex === -1 || availableIndex === -1 || availableIndex < queuedIndex) {
        errors.push(issue('EVENT_ORDER', 'events.json', '/data/events', 'video.queued must precede video.available.'));
      }
      const lastProgressIndex = types.lastIndexOf('video.progressed');
      if (lastProgressIndex > availableIndex && availableIndex !== -1) {
        errors.push(issue('EVENT_ORDER', 'events.json', '/data/events', 'video.progressed must precede video.available.'));
      }
    }

    if (stage === 'delivery') {
      const queued = middle.filter((event) => event.type === 'delivery.queued');
      const simulated = middle.filter((event) => event.type === 'delivery.simulated');
      if (queued.length !== 1) {
        errors.push(issue('EVENT_DELIVERY_QUEUE_COUNT', 'events.json', '/data/events', `delivery must contain exactly one delivery.queued, found ${queued.length}.`));
      }
      if (simulated.length !== 1) {
        errors.push(issue('EVENT_DELIVERY_SIMULATED_COUNT', 'events.json', '/data/events', `delivery must contain exactly one delivery.simulated, found ${simulated.length}.`));
      }
      const plan = findRecord(index, 'deliveryPlan', manifest.entryDeliveryId);
      if (queued.length === 1) {
        if (queued[0].payload?.planId !== manifest.entryDeliveryId) {
          errors.push(issue('EVENT_DELIVERY_PLAN', 'events.json', '/data/events', 'delivery.queued must use manifest.entryDeliveryId.'));
        }
        if (plan && Number.isInteger(plan.scheduledVirtualMs) && queued[0].atMs < plan.scheduledVirtualMs) {
          errors.push(issue('EVENT_DELIVERY_TIME', 'events.json', '/data/events', 'delivery.queued atMs must not be earlier than plan.scheduledVirtualMs.'));
        }
      }
      if (simulated.length === 1) {
        const record = findRecord(index, 'deliveryRecord', simulated[0].payload?.recordId);
        if (record) {
          if (record.planId !== manifest.entryDeliveryId) {
            errors.push(issue('EVENT_DELIVERY_RECORD_PLAN', 'events.json', '/data/events', 'delivery.simulated record must belong to manifest.entryDeliveryId.'));
          }
          if (record.outcome !== 'simulated_delivered') {
            errors.push(issue('EVENT_DELIVERY_OUTCOME', 'events.json', '/data/events', 'delivery.simulated must reference a successful simulated_delivered record.'));
          }
          if (record.atMs !== simulated[0].atMs) {
            errors.push(issue('EVENT_DELIVERY_RECORD_TIME', 'events.json', '/data/events', 'delivery record atMs must equal the delivery.simulated event atMs.'));
          }
        }
      }
      if (types.indexOf('delivery.queued') > types.indexOf('delivery.simulated') && types.includes('delivery.queued') && types.includes('delivery.simulated')) {
        errors.push(issue('EVENT_ORDER', 'events.json', '/data/events', 'delivery.queued must precede delivery.simulated.'));
      }
    }
  }

  for (const [stageIndex, stage] of STAGE_ORDER.entries()) {
    if (!stageStartedSequence[stage] || !stageCompletedSequence[stage]) continue;
    if (stageIndex > 0) {
      const previous = STAGE_ORDER[stageIndex - 1];
      if (stageStartedSequence[stage] <= stageCompletedSequence[previous]) {
        errors.push(issue('EVENT_STAGE_ORDER', 'events.json', '/data/events', `${stage} starts before ${previous} completed.`));
      }
    }
  }

  return { errors, exposedBySequence, stageEvents, stageCompletedSequence, stageStartedSequence };
}

/* ------------------------------------------------------------------------- */
/* Expected checkpoints (static only; projection comparison NOT_RUN)         */
/* ------------------------------------------------------------------------- */

export function validateExpectedCheckpoints(bundle, eventsAnalysis, index) {
  const errors = [];
  const warnings = [];
  const checkpoints = asArray(bundle?.expected?.data?.checkpoints);
  const eventCount = asArray(bundle?.events?.data?.events).length;
  const manifest = bundle?.manifest ?? {};

  if (!checkpoints.length) {
    errors.push(issue('CHECKPOINTS_MISSING', 'expected.json', '/data/checkpoints', 'At least one checkpoint is required.'));
    return { errors, warnings };
  }

  const cursorSeen = new Set();
  let previousCursor = -1;
  checkpoints.forEach((checkpoint, checkpointIndex) => {
    const base = `/data/checkpoints/${checkpointIndex}`;
    const cursor = checkpoint?.cursorSequence;
    if (typeof cursor !== 'number' || !Number.isInteger(cursor) || cursor < 0) {
      errors.push(issue('CHECKPOINT_CURSOR_INVALID', 'expected.json', `${base}/cursorSequence`, 'cursorSequence must be a non-negative integer.'));
      return;
    }
    if (cursor > eventCount) {
      errors.push(
        issue(
          'CHECKPOINT_CURSOR_OUT_OF_RANGE',
          'expected.json',
          `${base}/cursorSequence`,
          `Checkpoint cursor ${cursor} exceeds the number of events (${eventCount}).`,
        ),
      );
    }
    if (cursor <= previousCursor) {
      errors.push(
        issue(
          'CHECKPOINT_ORDER_INVALID',
          'expected.json',
          `${base}/cursorSequence`,
          'Checkpoints must be ordered by strictly increasing cursorSequence.',
        ),
      );
    }
    previousCursor = cursor;
    if (cursorSeen.has(cursor)) {
      errors.push(issue('CHECKPOINT_DUPLICATE', 'expected.json', `${base}/cursorSequence`, `Duplicate checkpoint cursor ${cursor}.`));
    }
    cursorSeen.add(cursor);

    const visible = asArray(checkpoint?.visibleEntityIds);
    const sorted = [...visible].sort();
    if (visible.some((id, idIndex) => id !== sorted[idIndex])) {
      errors.push(issue('CHECKPOINT_VISIBLE_ORDER', 'expected.json', `${base}/visibleEntityIds`, 'visibleEntityIds must be sorted lexicographically by ID.'));
    }
    if (new Set(visible).size !== visible.length) {
      errors.push(issue('CHECKPOINT_VISIBLE_DUPLICATE', 'expected.json', `${base}/visibleEntityIds`, 'visibleEntityIds must not contain duplicates.'));
    }
    const exposedAtCursor = eventsAnalysis.exposedBySequence.get(cursor) ?? new Set();
    visible.forEach((id, idIndex) => {
      const record = index.byId.get(id);
      if (!record) {
        errors.push(issue('CHECKPOINT_VISIBLE_UNKNOWN', 'expected.json', `${base}/visibleEntityIds/${idIndex}`, `${id} does not exist in the package.`));
        return;
      }
      if (BASE_ENTITY_KINDS.has(record.kind) || record.kind === 'event') {
        errors.push(
          issue(
            'CHECKPOINT_VISIBLE_BASE_ENTITY',
            'expected.json',
            `${base}/visibleEntityIds/${idIndex}`,
            `visibleEntityIds must not include base metadata/event IDs (${record.kind} ${id}).`,
          ),
        );
      }
      if (!VISIBLE_ENTITY_KINDS.has(record.kind)) {
        errors.push(issue('CHECKPOINT_VISIBLE_KIND', 'expected.json', `${base}/visibleEntityIds/${idIndex}`, `${id} is a ${record.kind} and cannot be visible.`));
      }
      if (!exposedAtCursor.has(id)) {
        errors.push(
          issue(
            'CHECKPOINT_VISIBLE_FUTURE_LEAK',
            'expected.json',
            `${base}/visibleEntityIds/${idIndex}`,
            `${id} is not exposed by events at cursor ${cursor} (future result leakage).`,
          ),
        );
      }
    });

    if (checkpoint?.activeScriptVersionId !== null) {
      const record = index.byId.get(checkpoint.activeScriptVersionId);
      if (!record || record.kind !== 'scriptVersion') {
        errors.push(issue('CHECKPOINT_ACTIVE_SCRIPT_INVALID', 'expected.json', `${base}/activeScriptVersionId`, 'activeScriptVersionId must be null or an existing scriptVersion ID.'));
      } else if (!exposedAtCursor.has(record.id)) {
        errors.push(issue('CHECKPOINT_ACTIVE_SCRIPT_FUTURE', 'expected.json', `${base}/activeScriptVersionId`, 'activeScriptVersionId is exposed only after its script.presented event.'));
      }
    }
    if (checkpoint?.activeVideoId !== null) {
      const record = index.byId.get(checkpoint.activeVideoId);
      if (!record || record.kind !== 'video') {
        errors.push(issue('CHECKPOINT_ACTIVE_VIDEO_INVALID', 'expected.json', `${base}/activeVideoId`, 'activeVideoId must be null or an existing video ID.'));
      } else if (!exposedAtCursor.has(record.id)) {
        errors.push(issue('CHECKPOINT_ACTIVE_VIDEO_FUTURE', 'expected.json', `${base}/activeVideoId`, 'activeVideoId is exposed only after video.available.'));
      }
    }
    const recordIds = asArray(checkpoint?.deliveryRecordIds);
    if (new Set(recordIds).size !== recordIds.length) {
      errors.push(issue('CHECKPOINT_DELIVERY_DUPLICATE', 'expected.json', `${base}/deliveryRecordIds`, 'deliveryRecordIds must not contain duplicates.'));
    }
    recordIds.forEach((id, idIndex) => {
      const record = index.byId.get(id);
      if (!record || record.kind !== 'deliveryRecord') {
        errors.push(issue('CHECKPOINT_DELIVERY_INVALID', 'expected.json', `${base}/deliveryRecordIds/${idIndex}`, 'deliveryRecordIds must reference existing delivery records.'));
      } else if (!exposedAtCursor.has(id)) {
        errors.push(issue('CHECKPOINT_DELIVERY_FUTURE', 'expected.json', `${base}/deliveryRecordIds/${idIndex}`, 'Delivery record is listed before its delivery.simulated event.'));
      }
    });
  });

  // Initial checkpoint and the four stage-end checkpoints are required.
  const initial = checkpoints.find((checkpoint) => checkpoint?.cursorSequence === 0);
  if (!initial) {
    errors.push(issue('CHECKPOINT_INITIAL_MISSING', 'expected.json', '/data/checkpoints', 'A cursorSequence 0 initial checkpoint is required.'));
  } else {
    const expectedWorkflow = stageExpectedWorkflow(0);
    for (const stage of STAGE_ORDER) {
      if (initial?.workflow?.[stage] !== expectedWorkflow[stage]) {
        errors.push(
          issue(
            'CHECKPOINT_WORKFLOW_INVALID',
            'expected.json',
            '/data/checkpoints',
            `Initial workflow.${stage} must be ${expectedWorkflow[stage]}, found ${initial?.workflow?.[stage]}.`,
          ),
        );
      }
    }
    if (asArray(initial?.visibleEntityIds).length !== 0) {
      errors.push(issue('CHECKPOINT_INITIAL_VISIBLE', 'expected.json', '/data/checkpoints', 'Initial checkpoint must not expose business entities.'));
    }
    if (initial?.activeScriptVersionId !== null || initial?.activeVideoId !== null || asArray(initial?.deliveryRecordIds).length) {
      errors.push(issue('CHECKPOINT_INITIAL_ACTIVE', 'expected.json', '/data/checkpoints', 'Initial checkpoint must have null active pointers and no delivery records.'));
    }
  }

  STAGE_ORDER.forEach((stage, stageIndex) => {
    const completedSequence = eventsAnalysis.stageCompletedSequence[stage];
    if (!completedSequence) return;
    const checkpoint = checkpoints.find((item) => item?.cursorSequence === completedSequence);
    if (!checkpoint) {
      errors.push(
        issue(
          'CHECKPOINT_STAGE_END_MISSING',
          'expected.json',
          '/data/checkpoints',
          `A checkpoint is required at the ${stage} stage.completed sequence ${completedSequence}.`,
        ),
      );
      return;
    }
    const expectedWorkflow = stageExpectedWorkflow(stageIndex + 1);
    for (const workflowStage of STAGE_ORDER) {
      if (checkpoint?.workflow?.[workflowStage] !== expectedWorkflow[workflowStage]) {
        errors.push(
          issue(
            'CHECKPOINT_WORKFLOW_INVALID',
            'expected.json',
            `/data/checkpoints`,
            `Checkpoint ${completedSequence} workflow.${workflowStage} must be ${expectedWorkflow[workflowStage]}, found ${checkpoint?.workflow?.[workflowStage]}.`,
          ),
        );
      }
    }
  });

  if (manifest?.entryScriptVersionId) {
    const finalCheckpoint = checkpoints[checkpoints.length - 1];
    if (finalCheckpoint?.cursorSequence === eventCount) {
      if (finalCheckpoint?.activeScriptVersionId !== manifest.entryScriptVersionId) {
        errors.push(
          issue(
            'CHECKPOINT_FINAL_SCRIPT',
            'expected.json',
            '/data/checkpoints',
            `Final checkpoint activeScriptVersionId must be the entry script ${manifest.entryScriptVersionId}.`,
          ),
        );
      }
      if (finalCheckpoint?.activeVideoId !== manifest.entryVideoId) {
        errors.push(
          issue(
            'CHECKPOINT_FINAL_VIDEO',
            'expected.json',
            '/data/checkpoints',
            `Final checkpoint activeVideoId must be the entry video ${manifest.entryVideoId}.`,
          ),
        );
      }
    }
  }

  warnings.push(
    'L3 checkpoint projection comparison is NOT_RUN by default; the POC-005 reducer adapter is available through the validator --replay flag and compares every expected checkpoint.',
  );

  return { errors, warnings };
}

/**
 * Entry point reserved for the POC-005 reducer integration.
 *
 * POC-001 must not pretend to compare projections: until POC-005 supplies the
 * same domain reducer, this returns `not_run` and the CLI can never report the
 * scenario as runnable.
 */
export function compareCheckpointProjection(bundle, reducer) {
  if (typeof reducer !== 'function') {
    return {
      status: 'not_run',
      reason:
        'POC-005 domain reducer was not supplied to this call; the validation CLI passes the authoritative TypeScript reducer through the POC-005 adapter.',
      errors: [],
      checked: 0,
    };
  }
  const events = asArray(bundle?.events?.data?.events);
  const checkpoints = asArray(bundle?.expected?.data?.checkpoints);
  if (!checkpoints.length) {
    return { status: 'not_run', reason: 'No expected checkpoints were supplied.', errors: [], checked: 0 };
  }
  const errors = [];
  for (const checkpoint of checkpoints) {
    const cursor = checkpoint?.cursorSequence;
    let projected;
    try {
      projected = reducer(bundle, cursor);
    } catch (error) {
      errors.push({ code: 'CHECKPOINT_PROJECTION_FAILED', message: error instanceof Error ? error.message : String(error) });
      continue;
    }
    if (!projected?.ok) {
      errors.push({ code: 'CHECKPOINT_PROJECTION_FAILED', cursorSequence: cursor, message: projected?.error?.message ?? 'Reducer rejected checkpoint cursor.' });
      continue;
    }
    const projection = projected.value;
    const comparisons = [
      ['workflow', checkpoint.workflow, projection.workflow],
      ['visibleEntityIds', [...asArray(checkpoint.visibleEntityIds)].sort(), [...asArray(projection.visibleEntityIds)].sort()],
      ['activeScriptVersionId', checkpoint.activeScriptVersionId, projection.activeScriptVersionId],
      ['activeVideoId', checkpoint.activeVideoId, projection.activeVideoId],
      ['deliveryRecordIds', [...asArray(checkpoint.deliveryRecordIds)].sort(), [...asArray(projection.deliveryRecordIds)].sort()],
    ];
    for (const [path, expected, actual] of comparisons) {
      if (JSON.stringify(expected) !== JSON.stringify(actual)) {
        errors.push({
          code: 'CHECKPOINT_PROJECTION_MISMATCH',
          cursorSequence: cursor,
          path,
          message: `Expected ${JSON.stringify(expected)}; reducer produced ${JSON.stringify(actual)}.`,
        });
      }
    }
  }
  return { status: errors.length ? 'fail' : 'pass', errors, checked: checkpoints.length };
}

/* ------------------------------------------------------------------------- */
/* Aggregate semantic validation                                             */
/* ------------------------------------------------------------------------- */

export function validateSemantics(bundle) {
  const index = collectEntityIndex(bundle);
  const l2Errors = [
    ...index.duplicates,
    ...validateHeaders(bundle),
    ...validateEntityNamespaces(bundle, index),
    ...validateReferences(bundle, index),
    ...validateEntryChain(bundle, index),
    ...validateDeliverySemantics(bundle, index).errors,
  ];
  const l3Errors = [
    ...validateScriptTimelineAndVideos(bundle, index),
  ];
  const eventsAnalysis = analyseEvents(bundle, index);
  l3Errors.push(...eventsAnalysis.errors);
  const expectedResult = validateExpectedCheckpoints(bundle, eventsAnalysis, index);
  l3Errors.push(...expectedResult.errors);
  const l4PathErrors = validateMediaPathSafety(bundle);
  const warnings = [
    ...validateDeliverySemantics(bundle, index).warnings,
    ...expectedResult.warnings,
  ];

  return {
    index,
    l2Errors,
    l3Errors,
    l4PathErrors,
    warnings,
    eventsAnalysis,
    checkpointProjection: compareCheckpointProjection(bundle),
  };
}
