// Offline ChatGPT-authored customer content. Never imported by the application.
// Rebuilds the draft and receipts only; does not fetch, render or publish media.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, 'content-inbox/scent-layering/1.0.0');
const media = path.join(dir, 'media');
await mkdir(media, { recursive: true });
const sid = 'scn-scent-layering';
const version = '1.0.0';
const authoredAt = '2026-11-05T00:00:00Z'; // Editorial date, not a collection timestamp.
const id = (kind, key) => `${sid}.${kind}.${key}`;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const wrap = data => ({ schemaVersion: '1.0.0', scenarioId: sid, scenarioVersion: version, data });
const save = async (name, value) => writeFile(path.join(dir, `${name}.json`), JSON.stringify(value, null, 2) + '\n');
const P = { oud: id('product', 'lavish-oud'), perla: id('product', 'perla') };
const A = Object.fromEntries(['logo', 'oud', 'perla', 'mp4-en', 'poster-en', 'vtt-en', 'vtt-ar'].map(k => [k, id('asset', k)]));
const briefId = id('brief', 'signature');
const analysisId = id('analysis', 'layering-opportunity');
const scriptId = lang => id('script', `${lang}-v1`);
const videoId = id('video', 'en-v1');
const planId = id('delivery', 'review-pack');
const recipientId = id('recipient', 'brand-reviewer');
const successId = id('record', 'simulated-success');
const failureId = id('record', 'simulated-failure');
const disclosure = 'MOCK: ChatGPT-authored illustrative scenario, not collected platform data or a measured market trend.';

const brand = wrap({
  brand: {
    id: id('brand', 'lavish'), name: 'Lavish Perfumes', logoAssetId: A.logo,
    tone: ['Refined', 'Inviting', 'Sensory without performance claims'],
    rules: ['Keep official product names in Latin script in both locales.', 'Preserve original bottles, labels, image proportions and supplied Logo.', 'Clearly label all discovery, analysis, render events and delivery as Mock or Simulated.', 'Present the pairing as an exploration concept, not an officially tested layering formula.'],
    prohibitedClaims: ['Unverified longevity, projection or medical benefits.', 'Claims that this pairing is officially endorsed or tested by Lavish.', 'Invented current sales, growth, customer quotes or platform endorsement.', 'Real-time generation or real email delivery claims.'],
  },
  products: [
    { id: P.oud, officialName: 'LAVISH OUD', sku: '6290360532790 / 101653', factsSourceUrl: 'https://lavishperfumes.com/product/lavish-oud/', verifiedFacts: ['Official product title: LAVISH OUD.', 'Official description refers to oud, spices and floral notes.'], imageAssetIds: [A.oud] },
    { id: P.perla, officialName: 'PERLA 50ML UNISEX', sku: '6290360532820 / 101691', factsSourceUrl: 'https://lavishperfumes.com/product/perla-50ml-unisex/', verifiedFacts: ['Official product title: PERLA 50ML UNISEX.', '50 ml; unisex, as stated in the official title.', 'Official description refers to floral, fruity and musk notes.'], imageAssetIds: [A.perla] },
  ],
});

const evidence = [
  { id: id('evidence', 'layering-guide'), platform: 'Instagram — simulated editorial signal', title: 'How-to content invites a layering explanation', summary: 'A constructed signal asks how to explore two fragrance profiles without a complicated routine. It motivates a short, approachable creative treatment; it is not a real post or quote.' },
  { id: id('evidence', 'personal-signature'), platform: 'TikTok — simulated editorial signal', title: 'Personal expression offers a useful creative hook', summary: 'A constructed discovery example focuses on choosing an individual fragrance signature. It supports an exploration message, without inferring real audience size or purchasing intent.' },
  { id: id('evidence', 'gifting-control'), platform: 'Pinterest — simulated editorial signal', title: 'Gifting is a stable comparison theme', summary: 'A deliberately stable comparison prevents every fragrance topic being called a growth opportunity. It is a control in this demonstration, not a measured gifting trend.' },
].map((e, i) => ({ ...e, sourceType: 'MOCK', simulatedAt: `2026-10-${25 + i}T08:00:00Z`, disclosure }));
const signals = [
  { id: id('signal', 'layering-guide'), title: 'Make layering approachable', topic: 'Perfume Layering', region: 'UAE', evidenceIds: [evidence[0].id], summary: 'Test an accessible visual explanation rather than a technical mixing tutorial. Mock editorial hypothesis.' },
  { id: id('signal', 'personal-signature'), title: 'A personal fragrance signature', topic: 'Premium Fragrance Lifestyle', region: 'Dubai', evidenceIds: [evidence[1].id], summary: 'Use personal choice as the hook, without a promise that two scents create a guaranteed result. Mock editorial hypothesis.' },
  { id: id('signal', 'gifting-control'), title: 'Gifting remains a comparison theme', topic: 'Luxury Gifting', region: 'GCC', evidenceIds: [evidence[2].id], summary: 'Keep gifting as context; this scenario prioritizes self-expression, not a claim of a gifting surge.' },
];
const dates = [22, 24, 26, 28, 30].map(d => `2026-10-${d}T08:00:00Z`);
const trends = [
  { id: id('trend', 'layering-interest'), title: 'Illustrative interest in scent layering', signalIds: [signals[0].id, signals[1].id], direction: 'rising', values: [30, 34, 43, 51, 58], interpretation: 'The synthetic index rises to illustrate how an Agent might prioritize a topic. It cannot establish real growth, statistical significance or sales demand.' },
  { id: id('trend', 'gifting-context'), title: 'Illustrative gifting baseline', signalIds: [signals[2].id], direction: 'stable', values: [42, 43, 42, 44, 43], interpretation: 'The synthetic comparison remains broadly stable. No current market claim is made; the comparison supports a selective, explainable recommendation.' },
].map(({ values, ...t }) => ({ ...t, unit: 'Illustrative interest index (synthetic 0–100; not counts or percentages)', window: { start: dates[0], end: dates.at(-1) }, points: values.map((value, i) => ({ at: dates[i], value })), disclosure }));
const discovery = wrap({ evidence, signals, trends });
const analysis = wrap({
  analyses: [{
    id: analysisId, trendIds: trends.map(t => t.id), evidenceIds: evidence.map(e => e.id),
    insights: [
      'Observation within the mock scenario: layering guidance and personal expression form a coherent creative theme; the comparison gifting theme is stable.',
      'Product match: LAVISH OUD provides an oud/spice/floral description, while PERLA is described through floral/fruity/musk notes. These verified descriptions suggest a story contrast; they do not prove a blended scent result.',
      'Creative decision: a 15-second, text-led product film can introduce both identities with one invitation to explore. It fits the available official product photographs without inventing lifestyle footage or a new bottle.',
    ],
    rationale: 'Connect the guide signal to an approachable format, the self-expression signal to a personal-signature hook, and the official product descriptions to a two-product exploration concept. Keep gifting as a comparison instead of claiming every topic is rising. Recommend a creative hypothesis to review, with no numerical opportunity score or forecast unsupported by the inputs.',
    assumptions: ['The demonstration addresses adult fragrance enthusiasts in the UAE; this audience is an editorial choice, not inferred customer targeting.', 'Product exploration is an appropriate call to action for a concept review; no conversion uplift is forecast.', 'A pairing concept is acceptable for internal review pending brand approval and sensory testing.'],
    uncertainties: ['There is no live social listening or measured market validation.', 'The product pairing has not been sensory-tested or officially endorsed.', 'Arabic copy needs native-language and brand review.', 'The matching MP4 and poster are not yet supplied.'],
    recommendation: 'Develop “Your signature. In layers.” as a restrained product-led concept for review. Invite exploration of LAVISH OUD and PERLA; do not teach a spray ratio, promise scent compatibility or describe synthetic signals as real discovery.',
  }],
  briefs: [{
    id: briefId, analysisId, name: 'Your signature. In layers.', objective: 'Demonstrate how an explainable mock discovery can become a coherent Lavish creative review pack, with product exploration as the proposed audience action.',
    markets: ['UAE'], audience: 'Adult fragrance enthusiasts interested in personal expression; hypothetical creative audience, not an observed customer segment.', productIds: [P.oud, P.perla],
    concept: 'A quiet, four-shot product study: introduce personal expression, introduce LAVISH OUD, invite exploration alongside PERLA, and close on the exact Lavish Logo. Pairing is an invitation, not a tested formula.',
    tone: 'Refined, clear, understated; warm white composition and restrained gold accents following the HTML reference.', channels: ['Instagram Reels — proposed placement only', 'Instagram Stories — proposed placement only'], languages: ['en', 'ar'],
    keyMessage: 'Explore a fragrance signature that feels personal, through the distinct identities of LAVISH OUD and PERLA.', cta: 'Discover Lavish Perfumes',
  }],
});

const starts = [0, 3000, 7000, 11000];
const durations = [3000, 4000, 4000, 4000];
const texts = {
  en: ['One signature. More than one note.', 'Begin with LAVISH OUD.', 'Explore a pairing with PERLA 50ML UNISEX.', 'Make it yours. Discover Lavish Perfumes.'],
  ar: ['بصمتك العطرية، بطريقتك.', 'ابدأ مع LAVISH OUD.', 'اكتشف تنسيقاً مع PERLA 50ML UNISEX.', 'اختر بصمتك. اكتشف Lavish Perfumes.'],
};
const visuals = [
  'Opening product study: LAVISH OUD and PERLA official full photographs, each contained in a generous white field. Preserve both complete bottles and the PERLA package; no cutout, redrawn label or fabricated liquid. Introduce the hook in separate negative space.',
  'LAVISH OUD official photograph alone, complete bottle and label visible. A slow camera move may translate the full photograph by at most 3%, without cropping bottle or label; text stays outside the product.',
  'PERLA official photograph with bottle and package, followed by a balanced two-product composition. Preserve each image aspect ratio; do not imply actual bottle size from unverified physical dimensions. Present exploration, not a spray tutorial.',
  'End card on warm white: the exact supplied opaque gold-square Lavish Logo, centered, with generous clear space. Keep its original shape and colors; no redraw, filter or crop. CTA below it; no price, offer, or unsupported claim.',
];
const shotAssets = [[A.oud, A.perla], [A.oud], [A.perla, A.oud], [A.logo]];
const versions = ['en', 'ar'].map(lang => ({
  id: scriptId(lang), briefId, version: 1, language: lang,
  title: lang === 'en' ? 'Your signature. In layers.' : 'بصمتك العطرية، بطريقتك.',
  hook: texts[lang][0], message: lang === 'en' ? 'An invitation to explore LAVISH OUD and PERLA as a personal pairing concept.' : 'دعوة لاكتشاف LAVISH OUD وPERLA ضمن فكرة تنسيق عطري شخصي.',
  cta: lang === 'en' ? 'Discover Lavish Perfumes' : 'اكتشف Lavish Perfumes', durationMs: 15000,
  shots: starts.map((startMs, i) => ({ id: id('shot', `${lang}-${i + 1}`), startMs, durationMs: durations[i], visual: visuals[i], voiceover: '', onScreenText: texts[lang][i], transition: i === 3 ? 'Hold through 15000 ms; no fade that obscures the CTA.' : 'Gentle cut or 180 ms crossfade inside this shot interval; preserve the exact shot boundary.', assetIds: shotAssets[i] })),
  subtitles: starts.map((startMs, i) => ({ id: id('subtitle', `${lang}-${i + 1}`), startMs, endMs: startMs + durations[i], text: texts[lang][i] })),
  caption: lang === 'en' ? 'Your signature. In layers. Explore LAVISH OUD and PERLA 50ML UNISEX with Lavish Perfumes. A pairing concept to discover at your own pace. Internal concept demo; product combination has not been sensory-tested.' : 'بصمتك العطرية، بطريقتك. اكتشف LAVISH OUD وPERLA 50ML UNISEX مع Lavish Perfumes، واستكشف فكرة التنسيق العطري على طريقتك. نموذج إبداعي داخلي؛ لم يُختبر المزج بين المنتجين حسياً.',
  hashtags: ['#LavishPerfumes', '#ScentLayering', '#FragranceDiscovery'],
}));
const script = wrap({ versions });
const video = wrap({ videos: [{ id: videoId, scriptVersionId: scriptId('en'), storyboardShotIds: versions[0].shots.map(s => s.id), mp4AssetId: A['mp4-en'], posterAssetId: A['poster-en'], subtitleAssetIds: [A['vtt-en']], durationMs: 15000, width: 1080, height: 1920, frameRate: 30, productionMode: 'preproduced', disclosure: 'Pre-produced concept video — pending customer-supplied MP4. Render events are Simulated; this draft does not contain a playable video.' }] });
const delivery = wrap({
  recipients: [{ id: recipientId, displayName: 'Lavish Brand Review — Demo Persona', role: 'Simulated internal creative reviewer; no real person or mailbox', email: 'brand-review@lavish-demo.invalid', isSimulated: true }],
  plans: [{ id: planId, scriptVersionId: scriptId('en'), videoId, recipientIds: [recipientId], attachmentAssetIds: [A['mp4-en'], A['poster-en'], A['vtt-en']], subject: '[SIMULATED] Lavish | Your signature. In layers. | Creative review pack', body: 'Hello Brand Review,\n\nThis simulated review pack presents “Your signature. In layers.” for Lavish Perfumes. The concept connects illustrative layering signals to a restrained, product-led 15-second film featuring LAVISH OUD and PERLA 50ML UNISEX.\n\nProposed audience: adult fragrance enthusiasts in the UAE. Proposed action: discover the products. Attached in the completed demo: the pre-produced English MP4, poster and English subtitle track. The Arabic script is a separate draft awaiting localization review and is not represented as an Arabic video.\n\nPlease review product identity, the exploratory pairing concept, typography, timing and CTA. The pairing has not been sensory-tested. No growth, sales or performance claim is made.\n\nMOCK / SIMULATED: signals, analysis, render events and this delivery record are prepared demo content. No email is sent, and no external platform is contacted.\n\nLavish AI Marketing — Demo', channel: 'email', scheduledVirtualMs: 46000, disclosure: 'Simulated email review delivery to a .invalid demo persona; no external transport, real send or real open tracking.' }],
  records: [
    { id: successId, planId, outcome: 'simulated_delivered', attempt: 1, atMs: 48000, failureCode: null, mode: 'mock' },
    { id: failureId, planId, outcome: 'failed', attempt: 2, atMs: 50000, failureCode: 'delivery_failed', mode: 'mock' },
  ],
});

const events = [];
function event(stage, atMs, type, payload, inputRefs = [], outputRefs = []) {
  const sequence = events.length + 1;
  events.push({ id: id('event', String(sequence).padStart(2, '0')), scenarioId: sid, scenarioVersion: version, sequence, atMs, stage, runKey: `${sid}:${version}:${stage}:golden`, mode: 'mock', type, inputRefs: [...new Set(inputRefs)], outputRefs, payload });
}
const started = (s, t) => event(s, t, 'stage.started', { stage: s });
const completed = (s, t) => event(s, t, 'stage.completed', { stage: s });
started('discovery', 0);
signals.forEach((s, i) => event('discovery', (i + 1) * 2000, 'signal.discovered', { signalId: s.id }, s.evidenceIds, [s.id]));
trends.forEach((t, i) => event('discovery', 8000 + i * 2000, 'trend.summarized', { trendId: t.id }, t.signalIds, [t.id]));
completed('discovery', 12000);
started('analysis', 14000);
event('analysis', 16000, 'analysis.presented', { analysisId }, [...trends.map(t => t.id), ...evidence.map(e => e.id)], [analysisId]);
event('analysis', 18000, 'brief.presented', { briefId }, [analysisId, P.oud, P.perla], [briefId]);
versions.forEach((s, i) => event('analysis', 20000 + i * 2000, 'script.presented', { scriptVersionId: s.id }, [briefId], [s.id]));
event('analysis', 24000, 'script.confirmed', { scriptVersionId: scriptId('en') }, [scriptId('en')]);
completed('analysis', 26000);
started('video', 28000);
const videoRefs = [scriptId('en'), ...versions[0].shots.map(s => s.id), A['mp4-en'], A['poster-en'], A['vtt-en']];
event('video', 30000, 'video.queued', { videoId }, videoRefs, [videoId]);
[[32000, 25], [35000, 65], [38000, 100]].forEach(([time, progress]) => event('video', time, 'video.progressed', { videoId, progress }, [videoId]));
event('video', 40000, 'video.available', { videoId }, videoRefs, [videoId]);
completed('video', 42000);
started('delivery', 44000);
event('delivery', 46000, 'delivery.queued', { planId }, [scriptId('en'), videoId, recipientId, ...delivery.data.plans[0].attachmentAssetIds], [planId]);
event('delivery', 48000, 'delivery.simulated', { recordId: successId }, [planId], [successId]);
completed('delivery', 50000);

// Independent authoring oracle: five explicit narrative boundaries, not reducer output.
const discovered = [...signals.map(s => s.id), ...trends.map(t => t.id)];
const analysed = [...discovered, analysisId, briefId, ...versions.flatMap(s => [s.id, ...s.shots.map(x => x.id), ...s.subtitles.map(x => x.id)])];
const cp = (cursorSequence, workflow, visibleEntityIds, activeScriptVersionId = null, activeVideoId = null, deliveryRecordIds = []) => ({ cursorSequence, workflow, visibleEntityIds: [...visibleEntityIds].sort(), activeScriptVersionId, activeVideoId, deliveryRecordIds });
const expected = wrap({ checkpoints: [
  cp(0, { discovery: 'ready', analysis: 'locked', video: 'locked', delivery: 'locked' }, []),
  cp(7, { discovery: 'completed', analysis: 'ready', video: 'locked', delivery: 'locked' }, discovered),
  cp(14, { discovery: 'completed', analysis: 'completed', video: 'ready', delivery: 'locked' }, analysed, scriptId('en')),
  cp(21, { discovery: 'completed', analysis: 'completed', video: 'completed', delivery: 'ready' }, [...analysed, videoId], scriptId('en')),
  cp(25, { discovery: 'completed', analysis: 'completed', video: 'completed', delivery: 'completed' }, [...analysed, videoId, planId, successId], scriptId('en'), videoId, [successId]),
] });

const formatTime = ms => `00:${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
for (const s of versions) {
  await writeFile(path.join(media, `signature-${s.language}.vtt`), 'WEBVTT\n\n' + s.subtitles.map((cue, i) => `${i + 1}\n${formatTime(cue.startMs)} --> ${formatTime(cue.endMs)}\n${cue.text}\n`).join('\n'), 'utf8');
}
const localSources = [
  { key: 'logo', from: 'assets/brand/lavish-logo-primary-294x294-rgb.png', file: 'lavish-logo.png', kind: 'logo', mimeType: 'image/png', width: 294, height: 294, sourceUrl: null, sourceNote: 'Exact user-supplied official Logo; evidence/brand/logo-receipt.json.', productIds: [] },
  { key: 'oud', from: 'assets/products/lavish-oud-2000.jpg', file: 'lavish-oud.jpg', kind: 'product_image', mimeType: 'image/jpeg', width: 2000, height: 2000, sourceUrl: 'https://lavishperfumes.com/wp-content/uploads/2025/05/1-22.jpg', sourceNote: 'Original image linked by the official LAVISH OUD product page, downloaded unchanged on 2026-11-05 and visually checked.', productIds: [P.oud] },
  { key: 'perla', from: 'assets/products/perla-50ml-unisex-2000.png', file: 'perla-50ml-unisex.png', kind: 'product_image', mimeType: 'image/png', width: 2000, height: 2000, sourceUrl: 'https://lavishperfumes.com/wp-content/uploads/2025/05/3-30.png', sourceNote: 'Original image linked by the official PERLA 50ML UNISEX product page, downloaded unchanged on 2026-11-05 and visually checked.', productIds: [P.perla] },
  ...['en', 'ar'].map(lang => ({ key: `vtt-${lang}`, file: `signature-${lang}.vtt`, kind: 'subtitle', mimeType: 'text/vtt', width: null, height: null, sourceUrl: null, sourceNote: `ChatGPT-authored ${lang.toUpperCase()} script subtitles; AR remains a localization draft and is not attached to the English video.`, productIds: [] })),
];
const assets = [];
for (const source of localSources) {
  if (source.from) await copyFile(path.join(root, source.from), path.join(media, source.file));
  const bytes = await readFile(path.join(media, source.file));
  assets.push({ id: A[source.key], kind: source.kind, mimeType: source.mimeType, uri: `/scenario-media/scent-layering/1.0.0/${source.file}`, bytes: bytes.length, sha256: hash(bytes), width: source.width, height: source.height, durationMs: source.kind === 'subtitle' ? 15000 : null, sourceUrl: source.sourceUrl, sourceNote: source.sourceNote, rightsStatus: 'approved_for_demo', rightsNote: source.kind === 'subtitle' ? 'Prepared within this user-requested internal POC. AR copy requires native review; no customer approval claimed.' : 'User authorized official-site product sourcing and supplied the Logo for this internal Demo. This records project permission, not a transfer of copyright or permission for public advertising.', productIds: source.productIds });
}
for (const [key, kind, file, mimeType] of [['mp4-en', 'video', 'signature-en.mp4', 'video/mp4'], ['poster-en', 'poster', 'signature-en-poster.jpg', 'image/jpeg']]) {
  // Intentionally invalid runnable asset metadata: these are requirements, not files.
  assets.push({ id: A[key], kind, mimeType, uri: `/scenario-media/scent-layering/1.0.0/${file}`, bytes: null, sha256: null, width: 1080, height: 1920, durationMs: kind === 'video' ? 15000 : null, sourceUrl: null, sourceNote: 'PENDING: customer will supply a matching pre-produced MP4; poster must be supplied or extracted from the approved film. No file received.', rightsStatus: 'pending', rightsNote: 'Await actual file, provenance and project usage confirmation. Do not infer rights or claim this asset exists.', productIds: [P.oud, P.perla] });
}

const dataFiles = { brand, discovery, analysis, script, video, delivery, events: wrap({ events }), assets: wrap({ assets }), expected };
for (const [name, value] of Object.entries(dataFiles)) await save(name, value);
const files = [];
for (const name of Object.keys(dataFiles)) {
  const bytes = await readFile(path.join(dir, `${name}.json`));
  files.push({ path: `${name}.json`, bytes: bytes.length, sha256: hash(bytes) });
}
await save('manifest', { schemaVersion: '1.0.0', scenarioId: sid, scenarioVersion: version, title: 'Scent Layering — Your signature. In layers.', slug: 'scent-layering', mode: 'mock', timeZone: 'Asia/Dubai', locales: ['en', 'ar'], stages: ['discovery', 'analysis', 'video', 'delivery'], entryBriefId: briefId, entryScriptVersionId: scriptId('en'), entryVideoId: videoId, entryDeliveryId: planId, authoring: { producer: 'ChatGPT', authoredAt, reasoningSummary: 'Synthetic guide and self-expression signals motivate an exploratory two-product concept; a stable gifting control keeps the recommendation selective. Verified product descriptions support narrative contrast, not a proven blended result. Four timed shots, a preset render narrative and an explicitly simulated review email share one ID chain.', assumptions: analysis.data.analyses[0].assumptions, limitations: ['DRAFT ONLY: not a runnable or approved customer package.', ...analysis.data.analyses[0].uncertainties, 'Missing MP4/poster assets deliberately have null byte/hash and pending rights, violating runnable Schema until real media is received.', 'Only the English script is the proposed entry video; Arabic script/VTT do not imply an Arabic film exists.', 'Synthetic time-series and event durations are designed demonstration pacing, not observations or processing-time claims.'], reviewStatus: 'pending' }, files });

const receipt = { recordedOn: '2026-11-05', purpose: 'Internal Lavish AI Marketing POC', instruction: 'User: 产品原图可以到lavish的官网去找。广告MP4暂无，我之后会提供。', review: 'Original product files viewed; identity/label and proportions checked against official product pages. No edits.', usageScope: 'User-authorized internal demo sourcing only; no public advertising license inferred.', assets: assets.filter(a => a.kind === 'product_image').map(a => ({ ...a, originalLocalPath: localSources.find(s => A[s.key] === a.id).from })), videoStatus: 'Awaiting customer-provided MP4; no production service called.' };
await mkdir(path.join(root, 'evidence/brand'), { recursive: true });
await writeFile(path.join(root, 'evidence/brand/product-images-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log('Wrote ten DRAFT JSON files, five real media files and product-source receipt. Catalog/public untouched. MP4/poster intentionally pending.');
