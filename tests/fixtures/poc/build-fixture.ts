import { createHash } from 'node:crypto';

/*
 * TEST_ONLY synthetic technical fixture for the POC-001 validator tests.
 *
 * This is NOT customer content, NOT a demo scenario and MUST NOT be copied into
 * scenarios/ or apps/web/public/. It exists only to exercise structural,
 * reference, event-order, timeline and media-hash checks with the smallest
 * possible synthetic package. The corrected v1 schema defines the analysis and
 * video entries as `analysisEntry` / `videoEntry`; this fixture follows that
 * frozen structure.
 */

export const SCENARIO_ID = 'scn-scent-layering';
export const SCENARIO_VERSION = '1.0.0';
export const SLUG = 'scent-layering';

const id = (kind: string, key: string) => `${SCENARIO_ID}.${kind}.${key}`;

export const IDS = {
  brand: id('brand', 'lavish'),
  product: id('product', 'oud'),
  evidence: id('evidence', 'test-only-evidence'),
  signal: id('signal', 'layering-signal'),
  trend: id('trend', 'layering-trend'),
  analysis: id('analysis', 'layering-analysis'),
  brief: id('brief', 'layering-brief'),
  scriptEn: id('scriptversion', 'script-en'),
  scriptAr: id('scriptversion', 'script-ar'),
  shots: [1, 2, 3, 4].map((index) => id('shot', `en-shot-${index}`)),
  subtitles: [1, 2, 3].map((index) => id('subtitle', `en-subtitle-${index}`)),
  arShots: [1, 2, 3, 4].map((index) => id('shot', `ar-shot-${index}`)),
  arSubtitles: [1, 2, 3].map((index) => id('subtitle', `ar-subtitle-${index}`)),
  video: id('video', 'video-en'),
  recipient: id('recipient', 'demo-reviewer'),
  plan: id('deliveryplan', 'plan-a'),
  recordSuccess: id('deliveryrecord', 'record-success'),
  recordFailed: id('deliveryrecord', 'record-failed'),
  logo: id('asset', 'logo'),
  productImage: id('asset', 'product-image'),
  mp4: id('asset', 'video-mp4'),
  poster: id('asset', 'poster'),
  vtt: id('asset', 'subtitles-en'),
};

const SCHEMA = '1.0.0';
const header = {
  schemaVersion: SCHEMA,
  scenarioId: SCENARIO_ID,
  scenarioVersion: SCENARIO_VERSION,
};

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const MP4_PLACEHOLDER = Buffer.from('00000018667479706d703432000000006d7034326d703431', 'hex');
const VTT = Buffer.from('WEBVTT\n\n00:00:00.000 --> 00:00:15.000\nTEST_ONLY synthetic subtitle\n', 'utf8');

export function createFixture() {
  const assetFile = (name: string) => `${name}`;
  const assets = [
    {
      id: IDS.logo,
      kind: 'logo',
      mimeType: 'image/png',
      uri: `/scenario-media/${SLUG}/${SCENARIO_VERSION}/${assetFile('logo.png')}`,
      bytes: PNG_1X1.length,
      sha256: sha256(PNG_1X1),
      width: 1,
      height: 1,
      durationMs: null,
      sourceUrl: null,
      sourceNote: 'TEST_ONLY synthetic technical fixture; not a client asset',
      rightsStatus: 'approved_for_demo',
      rightsNote: 'TEST_ONLY fixture only; never ship',
      productIds: [],
    },
    {
      id: IDS.productImage,
      kind: 'product_image',
      mimeType: 'image/png',
      uri: `/scenario-media/${SLUG}/${SCENARIO_VERSION}/${assetFile('product.png')}`,
      bytes: PNG_1X1.length,
      sha256: sha256(PNG_1X1),
      width: 1,
      height: 1,
      durationMs: null,
      sourceUrl: null,
      sourceNote: 'TEST_ONLY synthetic technical fixture; not a client asset',
      rightsStatus: 'approved_for_demo',
      rightsNote: 'TEST_ONLY fixture only; never ship',
      productIds: [IDS.product],
    },
    {
      id: IDS.mp4,
      kind: 'video',
      mimeType: 'video/mp4',
      uri: `/scenario-media/${SLUG}/${SCENARIO_VERSION}/${assetFile('video.mp4')}`,
      bytes: MP4_PLACEHOLDER.length,
      sha256: sha256(MP4_PLACEHOLDER),
      width: 1080,
      height: 1920,
      durationMs: 15000,
      sourceUrl: null,
      sourceNote: 'TEST_ONLY synthetic MP4 bytes; media decoding is L5/POC-002 and NOT_RUN',
      rightsStatus: 'approved_for_demo',
      rightsNote: 'TEST_ONLY fixture only; never ship',
      productIds: [],
    },
    {
      id: IDS.poster,
      kind: 'poster',
      mimeType: 'image/png',
      uri: `/scenario-media/${SLUG}/${SCENARIO_VERSION}/${assetFile('poster.png')}`,
      bytes: PNG_1X1.length,
      sha256: sha256(PNG_1X1),
      width: 1,
      height: 1,
      durationMs: null,
      sourceUrl: null,
      sourceNote: 'TEST_ONLY synthetic technical fixture; not a client asset',
      rightsStatus: 'approved_for_demo',
      rightsNote: 'TEST_ONLY fixture only; never ship',
      productIds: [],
    },
    {
      id: IDS.vtt,
      kind: 'subtitle',
      mimeType: 'text/vtt',
      uri: `/scenario-media/${SLUG}/${SCENARIO_VERSION}/${assetFile('subtitles-en.vtt')}`,
      bytes: VTT.length,
      sha256: sha256(VTT),
      width: null,
      height: null,
      durationMs: 15000,
      sourceUrl: null,
      sourceNote: 'TEST_ONLY synthetic subtitle fixture',
      rightsStatus: 'approved_for_demo',
      rightsNote: 'TEST_ONLY fixture only; never ship',
      productIds: [],
    },
  ];

  const zones = [
    { startMs: 0, durationMs: 3750, visual: 'TEST_ONLY shot 1 visual' },
    { startMs: 3750, durationMs: 3750, visual: 'TEST_ONLY shot 2 visual' },
    { startMs: 7500, durationMs: 3750, visual: 'TEST_ONLY shot 3 visual' },
    { startMs: 11250, durationMs: 3750, visual: 'TEST_ONLY shot 4 visual' },
  ];
  const subtitles = [
    { startMs: 0, endMs: 3000, text: 'TEST_ONLY subtitle 1' },
    { startMs: 3000, endMs: 7500, text: 'TEST_ONLY subtitle 2' },
    { startMs: 7500, endMs: 15000, text: 'TEST_ONLY subtitle 3' },
  ];

  const shots = zones.map((zone, index) => ({
    id: IDS.shots[index],
    startMs: zone.startMs,
    durationMs: zone.durationMs,
    visual: zone.visual,
    voiceover: 'TEST_ONLY voiceover',
    onScreenText: `TEST_ONLY on-screen ${index + 1}`,
    transition: 'cut',
    assetIds: [IDS.productImage],
  }));
  const arShots = shots.map((shot, index) => ({ ...shot, id: IDS.arShots[index] }));

  const scriptVersion = (language: 'en' | 'ar', scriptId: string, title: string) => ({
    id: scriptId,
    briefId: IDS.brief,
    version: 1,
    language,
    title,
    hook: 'TEST_ONLY hook',
    message: 'TEST_ONLY message',
    cta: 'TEST_ONLY CTA',
    durationMs: 15000,
    shots: language === 'en' ? shots : arShots,
    subtitles: subtitles.map((subtitle, index) => ({
      id: language === 'en' ? IDS.subtitles[index] : IDS.arSubtitles[index],
      ...subtitle,
    })),
    caption: 'TEST_ONLY caption',
    hashtags: ['#TEST_ONLY'],
  });

  const files: Record<string, unknown> = {
    'brand.json': {
      ...header,
      data: {
        brand: {
          id: IDS.brand,
          name: 'Lavish Perfumes',
          logoAssetId: IDS.logo,
          tone: ['TEST_ONLY calm'],
          rules: ['TEST_ONLY rule'],
          prohibitedClaims: ['TEST_ONLY prohibited claim'],
        },
        products: [
          {
            id: IDS.product,
            officialName: 'LAVISH OUD',
            sku: '6290360532790',
            factsSourceUrl: 'https://lavishperfumes.com/product/lavish-oud/',
            verifiedFacts: ['TEST_ONLY technical fixture; not authored business content'],
            imageAssetIds: [IDS.productImage],
          },
        ],
      },
    },
    'discovery.json': {
      ...header,
      data: {
        evidence: [
          {
            id: IDS.evidence,
            sourceType: 'MOCK',
            platform: 'TEST_ONLY simulated platform',
            title: 'TEST_ONLY evidence',
            summary: 'TEST_ONLY synthetic summary',
            simulatedAt: '2026-11-03T00:00:00Z',
            disclosure: 'Simulated evidence; TEST_ONLY',
          },
        ],
        signals: [
          {
            id: IDS.signal,
            title: 'TEST_ONLY signal',
            topic: 'TEST_ONLY topic',
            region: 'Dubai',
            evidenceIds: [IDS.evidence],
            summary: 'TEST_ONLY synthetic signal',
          },
        ],
        trends: [
          {
            id: IDS.trend,
            title: 'TEST_ONLY trend',
            signalIds: [IDS.signal],
            direction: 'stable',
            unit: 'TEST_ONLY index',
            window: { start: '2026-11-03T00:00:00Z', end: '2026-11-03T06:00:00Z' },
            points: [
              { at: '2026-11-03T00:00:00Z', value: 1 },
              { at: '2026-11-03T06:00:00Z', value: 1 },
            ],
            interpretation: 'TEST_ONLY synthetic interpretation; no market claim',
            disclosure: 'Simulated trend; TEST_ONLY',
          },
        ],
      },
    },
    'analysis.json': {
      ...header,
      data: {
        analyses: [
          {
            id: IDS.analysis,
            trendIds: [IDS.trend],
            evidenceIds: [IDS.evidence],
            insights: ['TEST_ONLY insight'],
            rationale: 'TEST_ONLY rationale',
            assumptions: ['TEST_ONLY assumption'],
            uncertainties: ['TEST_ONLY uncertainty'],
            recommendation: 'TEST_ONLY recommendation',
          },
        ],
        briefs: [
          {
            id: IDS.brief,
            analysisId: IDS.analysis,
            name: 'TEST_ONLY brief',
            objective: 'TEST_ONLY objective',
            markets: ['UAE'],
            audience: 'TEST_ONLY audience',
            productIds: [IDS.product],
            concept: 'TEST_ONLY concept',
            tone: 'TEST_ONLY tone',
            channels: ['email'],
            languages: ['en', 'ar'],
            keyMessage: 'TEST_ONLY key message',
            cta: 'TEST_ONLY CTA',
          },
        ],
      },
    },
    'script.json': {
      ...header,
      data: {
        versions: [
          scriptVersion('en', IDS.scriptEn, 'TEST_ONLY EN script'),
          scriptVersion('ar', IDS.scriptAr, 'TEST_ONLY AR script'),
        ],
      },
    },
    'video.json': {
      ...header,
      data: {
        videos: [
          {
            id: IDS.video,
            scriptVersionId: IDS.scriptEn,
            storyboardShotIds: IDS.shots,
            mp4AssetId: IDS.mp4,
            posterAssetId: IDS.poster,
            subtitleAssetIds: [IDS.vtt],
            durationMs: 15000,
            width: 1080,
            height: 1920,
            frameRate: 30,
            productionMode: 'preproduced',
            disclosure: 'Pre-produced video (TEST_ONLY fixture); not generated at runtime.',
          },
        ],
      },
    },
    'delivery.json': {
      ...header,
      data: {
        recipients: [
          {
            id: IDS.recipient,
            displayName: 'TEST_ONLY reviewer',
            role: 'reviewer',
            email: 'reviewer@example.invalid',
            isSimulated: true,
          },
        ],
        plans: [
          {
            id: IDS.plan,
            scriptVersionId: IDS.scriptEn,
            videoId: IDS.video,
            recipientIds: [IDS.recipient],
            attachmentAssetIds: [IDS.mp4, IDS.vtt],
            subject: 'TEST_ONLY subject',
            body: 'TEST_ONLY body. Simulated delivery; no email is sent.',
            channel: 'email',
            scheduledVirtualMs: 60000,
            disclosure: 'Simulated delivery; no real email is sent.',
          },
        ],
        records: [
          {
            id: IDS.recordFailed,
            planId: IDS.plan,
            outcome: 'failed',
            attempt: 1,
            atMs: 60000,
            failureCode: 'delivery_failed',
            mode: 'mock',
          },
          {
            id: IDS.recordSuccess,
            planId: IDS.plan,
            outcome: 'simulated_delivered',
            attempt: 2,
            atMs: 61000,
            failureCode: null,
            mode: 'mock',
          },
        ],
      },
    },
    'assets.json': { ...header, data: { assets } },
  };

  const stage = (sequence: number, atMs: number, stageName: string, type: string, payload: Record<string, unknown>, inputRefs: string[] = [], outputRefs: string[] = []) => ({
    id: id('event', `event-${sequence}`),
    scenarioId: SCENARIO_ID,
    scenarioVersion: SCENARIO_VERSION,
    sequence,
    atMs,
    stage: stageName,
    runKey: `TEST_ONLY-${stageName}-run`,
    mode: 'mock',
    type,
    inputRefs,
    outputRefs,
    payload,
  });

  const videoDeps = [IDS.scriptEn, ...IDS.shots, IDS.mp4, IDS.poster, IDS.vtt];
  const progressDeps = [IDS.video, ...videoDeps];
  const planDeps = [IDS.scriptEn, IDS.video, IDS.recipient, IDS.mp4, IDS.vtt];
  const events = [
    stage(1, 0, 'discovery', 'stage.started', { stage: 'discovery' }),
    stage(2, 1000, 'discovery', 'signal.discovered', { signalId: IDS.signal }, [IDS.evidence], [IDS.signal]),
    stage(3, 2000, 'discovery', 'trend.summarized', { trendId: IDS.trend }, [IDS.signal], [IDS.trend]),
    stage(4, 4000, 'discovery', 'stage.completed', { stage: 'discovery' }),
    stage(5, 5000, 'analysis', 'stage.started', { stage: 'analysis' }),
    stage(6, 6000, 'analysis', 'analysis.presented', { analysisId: IDS.analysis }, [IDS.trend, IDS.evidence], [IDS.analysis]),
    stage(7, 7000, 'analysis', 'brief.presented', { briefId: IDS.brief }, [IDS.analysis, IDS.product], [IDS.brief]),
    stage(8, 8000, 'analysis', 'script.presented', { scriptVersionId: IDS.scriptEn }, [IDS.brief], [IDS.scriptEn]),
    stage(9, 8500, 'analysis', 'script.presented', { scriptVersionId: IDS.scriptAr }, [IDS.brief], [IDS.scriptAr]),
    stage(10, 9000, 'analysis', 'script.confirmed', { scriptVersionId: IDS.scriptEn }, [IDS.scriptEn], []),
    stage(11, 12000, 'analysis', 'stage.completed', { stage: 'analysis' }),
    stage(12, 13000, 'video', 'stage.started', { stage: 'video' }),
    stage(13, 14000, 'video', 'video.queued', { videoId: IDS.video }, videoDeps, [IDS.video]),
    stage(14, 15000, 'video', 'video.progressed', { videoId: IDS.video, progress: 50 }, progressDeps, []),
    stage(15, 16000, 'video', 'video.progressed', { videoId: IDS.video, progress: 100 }, progressDeps, []),
    stage(16, 17000, 'video', 'video.available', { videoId: IDS.video }, videoDeps, [IDS.video]),
    stage(17, 20000, 'video', 'stage.completed', { stage: 'video' }),
    stage(18, 21000, 'delivery', 'stage.started', { stage: 'delivery' }),
    stage(19, 61000, 'delivery', 'delivery.queued', { planId: IDS.plan }, planDeps, [IDS.plan]),
    stage(20, 61000, 'delivery', 'delivery.simulated', { recordId: IDS.recordSuccess }, [IDS.plan], [IDS.recordSuccess]),
    stage(21, 62000, 'delivery', 'stage.completed', { stage: 'delivery' }),
  ];

  files['events.json'] = { ...header, data: { events } };

  const visibleAfter = (cursor: number) => {
    const visible = new Set<string>();
    for (const event of events.slice(0, cursor)) {
      for (const outputRef of event.outputRefs) visible.add(outputRef);
      if (event.type === 'script.presented') {
        const version = files['script.json'] as { data: { versions: Array<{ id: string; shots: Array<{ id: string }>; subtitles: Array<{ id: string }> }> } };
        const script = version.data.versions.find((candidate) => candidate.id === event.payload.scriptVersionId);
        script?.shots.forEach((shot) => visible.add(shot.id));
        script?.subtitles.forEach((subtitle) => visible.add(subtitle.id));
      }
    }
    return [...visible].sort();
  };

  const workflow = (completedStages: number) => {
    const stages = ['discovery', 'analysis', 'video', 'delivery'];
    return Object.fromEntries(
      stages.map((stageName, index) => [
        stageName,
        index < completedStages ? 'completed' : index === completedStages ? 'ready' : 'locked',
      ]),
    );
  };

  const checkpoints = [
    {
      cursorSequence: 0,
      workflow: workflow(0),
      visibleEntityIds: [],
      activeScriptVersionId: null,
      activeVideoId: null,
      deliveryRecordIds: [],
    },
    {
      cursorSequence: 4,
      workflow: workflow(1),
      visibleEntityIds: visibleAfter(4),
      activeScriptVersionId: null,
      activeVideoId: null,
      deliveryRecordIds: [],
    },
    {
      cursorSequence: 11,
      workflow: workflow(2),
      visibleEntityIds: visibleAfter(11),
      activeScriptVersionId: IDS.scriptEn,
      activeVideoId: null,
      deliveryRecordIds: [],
    },
    {
      cursorSequence: 17,
      workflow: workflow(3),
      visibleEntityIds: visibleAfter(17),
      activeScriptVersionId: IDS.scriptEn,
      activeVideoId: null,
      deliveryRecordIds: [],
    },
    {
      cursorSequence: 21,
      workflow: workflow(4),
      visibleEntityIds: visibleAfter(21),
      activeScriptVersionId: IDS.scriptEn,
      activeVideoId: IDS.video,
      deliveryRecordIds: [IDS.recordSuccess],
    },
  ];

  files['expected.json'] = { ...header, data: { checkpoints } };

  const listedFiles = ['brand', 'discovery', 'analysis', 'script', 'video', 'delivery', 'events', 'assets', 'expected'];
  files['manifest.json'] = {
    ...header,
    title: 'TEST_ONLY synthetic technical fixture — not customer content',
    slug: SLUG,
    mode: 'mock',
    timeZone: 'Asia/Dubai',
    locales: ['en', 'ar'],
    stages: ['discovery', 'analysis', 'video', 'delivery'],
    entryBriefId: IDS.brief,
    entryScriptVersionId: IDS.scriptEn,
    entryVideoId: IDS.video,
    entryDeliveryId: IDS.plan,
    authoring: {
      producer: 'ChatGPT',
      authoredAt: '2026-11-03T00:00:00Z',
      reasoningSummary: 'TEST_ONLY synthetic fixture for validator tests; contains no authored marketing content.',
      assumptions: ['TEST_ONLY technical fixture'],
      limitations: ['TEST_ONLY fixture, not customer content, not a runnable scenario'],
      reviewStatus: 'pending',
    },
    files: listedFiles.map((name) => {
      const content = serialize(files[`${name}.json`]);
      const buffer = Buffer.from(content, 'utf8');
      return { path: `${name}.json`, bytes: buffer.length, sha256: hash(buffer) };
    }),
  };

  const media: Record<string, Buffer> = {
    'logo.png': PNG_1X1,
    'product.png': PNG_1X1,
    'video.mp4': MP4_PLACEHOLDER,
    'poster.png': PNG_1X1,
    'subtitles-en.vtt': VTT,
  };

  return { files, media };
}

function hash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function sha256(buffer: Buffer): string {
  return hash(buffer);
}

export const TEST_ONLY_MARKER = 'TEST_ONLY';

export function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
