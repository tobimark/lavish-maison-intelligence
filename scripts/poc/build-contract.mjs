// Main-controller contract authoring tool. Does not generate scenario content.
import { mkdir, writeFile } from 'node:fs/promises';
const target = 'contracts/poc';
const s = { type: 'string', minLength: 1 };
const str = (pattern) => ({ ...s, pattern });
const enumOf = (...values) => ({ type: 'string', enum: values });
const literal = (value) => ({ const: value });
const int = (minimum = 0) => ({ type: 'integer', minimum });
const num = (minimum = 0) => ({ type: 'number', minimum });
const arr = (items, minItems = 1) => ({ type: 'array', items, minItems });
const object = (properties, optional = []) => ({ type: 'object', properties, required: Object.keys(properties).filter(k => !optional.includes(k)), additionalProperties: false });
const ref = name => ({ $ref: `#/$defs/${name}` });
const nullable = schema => ({ anyOf: [schema, { type: 'null' }] });
const id = str('^scn-(scent-layering|luxury-gifting|oud-storytelling)\\.[a-z][a-z0-9-]*\\.[a-zA-Z0-9-]+$');
const ids = () => ({ ...arr(id), uniqueItems: true });
const maybeIds = () => ({ ...arr(id, 0), uniqueItems: true });
const scenarioId = enumOf('scn-scent-layering', 'scn-luxury-gifting', 'scn-oud-storytelling');
const version = str('^[0-9]+\\.[0-9]+\\.[0-9]+$');
const hash = str('^[a-f0-9]{64}$');
const utc = { type: 'string', format: 'date-time', pattern: 'Z$' };
const stage = enumOf('discovery', 'analysis', 'video', 'delivery');
const states = enumOf('locked', 'ready', 'running', 'awaiting_confirmation', 'completed', 'failed', 'stale');
const locales = { ...arr(enumOf('en', 'ar'), 2), maxItems: 2, uniqueItems: true };
const envelope = data => object({ schemaVersion: literal('1.0.0'), scenarioId, scenarioVersion: version, data });
const entity = properties => object({ id, ...properties });
const defs = {};
defs.product = entity({ officialName: s, sku: s, factsSourceUrl: str('^https://'), verifiedFacts: arr(s), imageAssetIds: ids() });
defs.brandData = object({ brand: entity({ name: literal('Lavish Perfumes'), logoAssetId: id, tone: arr(s), rules: arr(s), prohibitedClaims: arr(s) }), products: arr(ref('product')) });
defs.evidence = entity({ sourceType: literal('MOCK'), platform: s, title: s, summary: s, simulatedAt: utc, disclosure: s });
defs.signal = entity({ title: s, topic: s, region: enumOf('UAE', 'Dubai', 'Abu Dhabi', 'GCC'), evidenceIds: ids(), summary: s });
defs.trend = entity({ title: s, signalIds: ids(), direction: enumOf('rising', 'stable', 'declining', 'uncertain'), unit: s, window: object({ start: utc, end: utc }), points: arr(object({ at: utc, value: num() }), 2), interpretation: s, disclosure: s });
defs.discoveryData = object({ evidence: arr(ref('evidence')), signals: arr(ref('signal')), trends: arr(ref('trend')) });
defs.analysisEntry = entity({ trendIds: ids(), evidenceIds: ids(), insights: arr(s), rationale: s, assumptions: arr(s), uncertainties: arr(s), recommendation: s });
defs.brief = entity({ analysisId: id, name: s, objective: s, markets: arr(s), audience: s, productIds: ids(), concept: s, tone: s, channels: arr(s), languages: locales, keyMessage: s, cta: s });
defs.analysisData = object({ analyses: arr(ref('analysisEntry')), briefs: arr(ref('brief')) });
defs.shot = entity({ startMs: int(), durationMs: int(1), visual: s, voiceover: { type: 'string' }, onScreenText: { type: 'string' }, transition: s, assetIds: ids() });
defs.subtitle = entity({ startMs: int(), endMs: int(1), text: s });
defs.scriptVersion = entity({ briefId: id, version: int(1), language: enumOf('en', 'ar'), title: s, hook: s, message: s, cta: s, durationMs: literal(15000), shots: { ...arr(ref('shot'), 4), maxItems: 4 }, subtitles: arr(ref('subtitle')), caption: s, hashtags: arr(s) });
defs.scriptData = object({ versions: arr(ref('scriptVersion'), 2) });
defs.videoEntry = entity({ scriptVersionId: id, storyboardShotIds: { ...ids(), minItems: 4, maxItems: 4 }, mp4AssetId: id, posterAssetId: id, subtitleAssetIds: ids(), durationMs: literal(15000), width: literal(1080), height: literal(1920), frameRate: num(1), productionMode: literal('preproduced'), disclosure: s });
defs.videoData = object({ videos: arr(ref('videoEntry')) });
defs.recipient = entity({ displayName: s, role: s, email: str('^[A-Za-z0-9.!#$&*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*\\.invalid$'), isSimulated: literal(true) });
defs.deliveryPlan = entity({ scriptVersionId: id, videoId: id, recipientIds: ids(), attachmentAssetIds: ids(), subject: s, body: s, channel: literal('email'), scheduledVirtualMs: int(), disclosure: s });
defs.deliveryRecord = { oneOf: [
  entity({ planId: id, outcome: literal('simulated_delivered'), attempt: int(1), atMs: int(), failureCode: { type: 'null' }, mode: literal('mock') }),
  entity({ planId: id, outcome: literal('failed'), attempt: int(1), atMs: int(), failureCode: literal('delivery_failed'), mode: literal('mock') })
] };
defs.deliveryData = object({ recipients: arr(ref('recipient')), plans: arr(ref('deliveryPlan')), records: arr(ref('deliveryRecord'), 2) });
defs.asset = entity({ kind: enumOf('logo', 'product_image', 'image', 'video', 'poster', 'subtitle', 'audio'), mimeType: enumOf('image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'text/vtt', 'audio/mpeg', 'audio/mp4'), uri: str('^/scenario-media/(scent-layering|luxury-gifting|oud-storytelling)/[0-9]+\\.[0-9]+\\.[0-9]+/[A-Za-z0-9_-]+\\.[A-Za-z0-9]+$'), bytes: int(1), sha256: hash, width: nullable(int(1)), height: nullable(int(1)), durationMs: nullable(int(1)), sourceUrl: nullable(str('^https://')), sourceNote: s, rightsStatus: literal('approved_for_demo'), rightsNote: s, productIds: maybeIds() });
defs.assetsData = object({ assets: arr(ref('asset')) });
const event = (type, eventStage, payload) => object({ id, scenarioId, scenarioVersion: version, sequence: int(1), atMs: int(), stage: eventStage, runKey: s, mode: literal('mock'), type: literal(type), inputRefs: maybeIds(), outputRefs: maybeIds(), payload: object(payload) });
const specific = [
  ['signal.discovered', 'discovery', { signalId: id }],
  ['trend.summarized', 'discovery', { trendId: id }],
  ['analysis.presented', 'analysis', { analysisId: id }],
  ['brief.presented', 'analysis', { briefId: id }],
  ['script.presented', 'analysis', { scriptVersionId: id }],
  ['script.confirmed', 'analysis', { scriptVersionId: id }],
  ['video.queued', 'video', { videoId: id }],
  ['video.progressed', 'video', { videoId: id, progress: { ...int(), maximum: 100 } }],
  ['video.available', 'video', { videoId: id }],
  ['delivery.queued', 'delivery', { planId: id }],
  ['delivery.simulated', 'delivery', { recordId: id }]
];
defs.event = { oneOf: [
  ...specific.map(([type, st, payload]) => event(type, literal(st), payload)),
  ...['discovery', 'analysis', 'video', 'delivery'].flatMap(st => [
    event('stage.started', literal(st), { stage: literal(st) }),
    event('stage.completed', literal(st), { stage: literal(st) }),
    event('stage.failed', literal(st), { stage: literal(st), code: s, retryable: { type: 'boolean' } })
  ])
] };
defs.eventsData = object({ events: arr(ref('event')) });
defs.workflow = object({ discovery: states, analysis: states, video: states, delivery: states });
defs.checkpoint = object({ cursorSequence: int(), workflow: ref('workflow'), visibleEntityIds: maybeIds(), activeScriptVersionId: nullable(id), activeVideoId: nullable(id), deliveryRecordIds: maybeIds() });
defs.expectedData = object({ checkpoints: arr(ref('checkpoint'), 5) });
const filenames = ['brand', 'discovery', 'analysis', 'script', 'video', 'delivery', 'events', 'assets', 'expected'];
defs.manifest = object({ schemaVersion: literal('1.0.0'), scenarioId, scenarioVersion: version, title: s, slug: enumOf('scent-layering', 'luxury-gifting', 'oud-storytelling'), mode: literal('mock'), timeZone: literal('Asia/Dubai'), locales, stages: { type: 'array', prefixItems: ['discovery', 'analysis', 'video', 'delivery'].map(literal), minItems: 4, maxItems: 4, items: false }, entryBriefId: id, entryScriptVersionId: id, entryVideoId: id, entryDeliveryId: id, authoring: object({ producer: literal('ChatGPT'), authoredAt: utc, reasoningSummary: s, assumptions: arr(s), limitations: arr(s), reviewStatus: enumOf('pending', 'reviewed') }), files: { ...arr(object({ path: enumOf(...filenames.map(n => `${n}.json`)), bytes: int(1), sha256: hash }), 9), maxItems: 9, uniqueItems: true } });
for (const name of filenames) {
  if (Object.hasOwn(defs, name)) throw new Error(`Schema definition collision: ${name}`);
  defs[name] = envelope(ref(`${name}Data`));
}
const base = 'https://contracts.lavish-poc.invalid/v1/scenario.schema.json';
const schema = { $schema: 'https://json-schema.org/draft/2020-12/schema', $id: base, title: 'Lavish Fully Mocked POC Scenario Package', ...object(Object.fromEntries(['manifest', ...filenames].map(name => [name, ref(name)]))), $defs: defs };
await mkdir(`${target}/files`, { recursive: true });
const save = (p, value) => writeFile(p, JSON.stringify(value, null, 2) + '\n');
await save(`${target}/scenario.schema.json`, schema);
for (const name of ['manifest', ...filenames]) await save(`${target}/files/${name}.schema.json`, { $schema: schema.$schema, $id: `https://contracts.lavish-poc.invalid/v1/files/${name}.schema.json`, $ref: `${base}#/$defs/${name}` });
// .invalid schema IDs are identifiers, never fetch targets: validators register all schemas locally.
await mkdir('scenarios', { recursive: true });
console.log('Wrote scenario schema and ten file entry schemas; no scenario content generated.');
