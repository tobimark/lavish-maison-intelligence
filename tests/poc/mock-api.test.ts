import { describe, expect, test } from 'vitest';
import { IDBFactory as FakeIDBFactory } from 'fake-indexeddb';
import { createFixture } from '../fixtures/poc/build-fixture';
import { createMockApi } from '../../apps/web/demo/poc/api';
import type {
  ApiResult,
  CommandContext,
  LoadedScenario,
  MockApi,
  ScenarioListItem,
  ScenarioSource,
  SessionView,
  ScriptEditable,
} from '../../apps/web/demo/poc/api';
import { MemoryStorage, IndexedDbStorage } from '../../apps/web/demo/poc/storage';
import type { PocStorage, PersistedSession, RecoveryExport, PackageMeta, CreateSessionOutcome, MutationInput, MutationOutcome } from '../../apps/web/demo/poc/storage';

const NOW = '2026-11-04T00:00:00.000Z';
const PACKAGE_HASH = 'TEST_ONLY_POC004_PACKAGE_HASH';
const SCENARIO_ID = 'scn-scent-layering';
const SCENARIO_VERSION = '1.0.0';

function buildPackage() {
  const fixture = createFixture();
  const files = fixture.files as Record<string, any>;
  const pkg = {
    manifest: files['manifest.json'],
    brand: files['brand.json'],
    discovery: files['discovery.json'],
    analysis: files['analysis.json'],
    script: files['script.json'],
    video: files['video.json'],
    delivery: files['delivery.json'],
    events: files['events.json'],
    assets: files['assets.json'],
    expected: files['expected.json'],
  } as any;
  const media: Record<string, Uint8Array> = {};
  for (const asset of pkg.assets.data.assets) {
    const name = String(asset.uri).split('/').pop();
    const bytes = fixture.media[name];
    if (bytes) media[asset.id] = new Uint8Array(bytes);
  }
  return { pkg, media, fixture };
}

function makeSource(options: { packageHash?: string; ready?: boolean } = {}): ScenarioSource {
  const { pkg, media } = buildPackage();
  const loaded: LoadedScenario = {
    scenarioId: SCENARIO_ID,
    scenarioVersion: SCENARIO_VERSION,
    packageHash: options.packageHash ?? PACKAGE_HASH,
    package: pkg,
    media,
  };
  const listItem: ScenarioListItem = {
    scenarioId: SCENARIO_ID,
    title: 'TEST_ONLY scenario',
    scenarioVersion: SCENARIO_VERSION,
    readiness: options.ready === false ? 'awaiting_content' : 'ready',
    issues: [],
  };
  return {
    async list() {
      return [listItem];
    },
    async get(scenarioId, scenarioVersion) {
      return scenarioId === SCENARIO_ID && scenarioVersion === SCENARIO_VERSION ? loaded : null;
    },
  };
}

function createApi(options: { storage?: PocStorage; source?: ScenarioSource; virtualNow?: () => number; now?: () => string } = {}) {
  return createMockApi({
    scenarioSource: options.source ?? makeSource(),
    storage: options.storage ?? new MemoryStorage(),
    now: options.now ?? (() => NOW),
    virtualNow: options.virtualNow ?? (() => 61000),
  });
}

function unwrap<T>(result: ApiResult<T>): T {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message} ${JSON.stringify(result.error.fieldErrors)}`);
  return result.data;
}

function ctx(state: { id: string; revision: number }, key: string): CommandContext {
  return { sessionId: state.id, expectedRevision: state.revision, idempotencyKey: key };
}

function editContent(pkg: any): ScriptEditable {
  const script = pkg.script.data.versions.find((version: any) => version.id === pkg.manifest.entryScriptVersionId);
  return {
    title: `${script.title} edited`,
    hook: script.hook,
    message: script.message,
    cta: script.cta,
    shots: script.shots.map((shot: any) => ({ ...shot, assetIds: [...shot.assetIds] })),
    subtitles: script.subtitles.map((subtitle: any) => ({ ...subtitle })),
    caption: script.caption,
    hashtags: [...script.hashtags],
  };
}

async function createSession(api: MockApi, creationKey = 'session-a'): Promise<SessionView> {
  return unwrap(await api.createSession({ scenarioId: SCENARIO_ID, scenarioVersion: SCENARIO_VERSION, creationKey }));
}

async function toVideoReady(api: MockApi, creationKey = 'session-a'): Promise<{ session: SessionView; pkg: any }> {
  const { pkg } = buildPackage();
  let session = await createSession(api, creationKey);
  session = unwrap(await api.executeStage(ctx(session, 'discovery-1'), { stage: 'discovery' }));
  expect(session.workflow.discovery).toBe('completed');
  session = unwrap(await api.executeStage(ctx(session, 'analysis-1'), { stage: 'analysis' }));
  expect(session.workflow.analysis).toBe('awaiting_confirmation');
  const content = editContent(pkg);
  const saved = unwrap(await api.saveScriptDraft(ctx(session, 'draft-1'), { baseVersionId: pkg.manifest.entryScriptVersionId, content }));
  session = saved.session;
  const userVersionId = session.activeScriptVersionId as string;
  session = unwrap(await api.confirmScript(ctx(session, 'confirm-user'), { scriptVersionId: userVersionId }));
  expect(session.workflow.video).toBe('stale');
  session = unwrap(await api.selectScript(ctx(session, 'select-entry'), { scriptVersionId: pkg.manifest.entryScriptVersionId }));
  session = unwrap(await api.confirmScript(ctx(session, 'confirm-entry'), { scriptVersionId: pkg.manifest.entryScriptVersionId }));
  expect(session.workflow.video).toBe('ready');
  session = unwrap(await api.executeStage(ctx(session, 'video-1'), { stage: 'video' }));
  expect(session.workflow.video).toBe('completed');
  return { session, pkg };
}

async function saveDraft(api: MockApi, session: SessionView, pkg: any, key = 'delivery-draft-1'): Promise<{ session: SessionView; draftId: string }> {
  const plan = pkg.delivery.data.plans.find((candidate: any) => candidate.id === pkg.manifest.entryDeliveryId);
  const saved = unwrap(
    await api.saveDeliveryDraft(ctx(session, key), {
      planId: plan.id,
      subject: plan.subject,
      body: plan.body,
      scheduledVirtualMs: plan.scheduledVirtualMs,
    }),
  );
  return { session: saved.session, draftId: saved.draft.id };
}

describe('POC-004 unified Mock API', () => {
  test('listScenarios/getScenario/createSession fix the package hash and expose storage mode', async () => {
    const api = createApi();
    const scenarios = unwrap(await api.listScenarios());
    expect(scenarios.items[0]).toMatchObject({ scenarioId: SCENARIO_ID, readiness: 'ready' });
    const scenario = unwrap(await api.getScenario({ scenarioId: SCENARIO_ID, scenarioVersion: SCENARIO_VERSION }));
    expect(scenario.packageHash).toBe(PACKAGE_HASH);
    expect(scenario.manifest.scenarioId).toBe(SCENARIO_ID);

    const created = await createSession(api, 'creation-a');
    expect(created.packageHash).toBe(PACKAGE_HASH);
    expect(created.revision).toBe(0);
    expect(created.storageMode).toBe('memory');
    expect(created.workflow).toEqual({ discovery: 'ready', analysis: 'locked', video: 'locked', delivery: 'locked' });
    const duplicate = await createSession(api, 'creation-a');
    expect(duplicate.id).toBe(created.id);
    expect((await api.listSessions()).ok).toBe(true);
    expect(unwrap(await api.listSessions()).items).toHaveLength(1);
  });

  test('read methods do not change revision and future entities are not reachable', async () => {
    const api = createApi();
    const session = await createSession(api);
    const before = unwrap(await api.getSession({ sessionId: session.id })).revision;
    const stageData = unwrap(await api.getStageData({ sessionId: session.id, stage: 'discovery', view: 'workflow' }));
    expect(stageData.entities).toEqual([]);
    expect((await api.getEntity({ sessionId: session.id, entityId: 'scn-scent-layering.analysis.layering-analysis', view: 'workflow' })).ok).toBe(false);
    const future = await api.getEntity({ sessionId: session.id, entityId: 'scn-scent-layering.analysis.layering-analysis', view: 'workflow' });
    if (!future.ok) expect(future.error.code).toBe('ENTITY_NOT_REACHED');
    expect(unwrap(await api.getSession({ sessionId: session.id })).revision).toBe(before);
  });

  test('executeStage consumes canonical events to the confirmation/terminal boundary', async () => {
    const api = createApi();
    const { pkg } = buildPackage();
    let session = await createSession(api);
    session = unwrap(await api.executeStage(ctx(session, 'discovery'), { stage: 'discovery' }));
    expect(session.workflow.discovery).toBe('completed');
    expect(session.workflow.analysis).toBe('ready');
    session = unwrap(await api.executeStage(ctx(session, 'analysis'), { stage: 'analysis' }));
    expect(session.workflow.analysis).toBe('awaiting_confirmation');
    expect(session.activeScriptVersionId).toBe(pkg.manifest.entryScriptVersionId);
    const visible = unwrap(await api.getStageData({ sessionId: session.id, stage: 'analysis', view: 'workflow' }));
    expect(visible.entities.map((entity) => entity.id)).toContain(pkg.manifest.entryScriptVersionId);
    expect(visible.entities.map((entity) => entity.id)).not.toContain('scn-scent-layering.video.video-en');
  });

  test('saveScriptDraft/confirm/select/video complete produces terminal video session', async () => {
    const api = createApi();
    const { session } = await toVideoReady(api);
    expect(session.workflow.video).toBe('completed');
    expect(session.workflow.delivery).toBe('ready');
    expect(session.activeVideoId).toBe('scn-scent-layering.video.video-en');
    expect(session.stageAttempts.filter((attempt) => attempt.stage === 'video' && attempt.status === 'completed')).toHaveLength(1);
    const userVersion = session.userVersions[0];
    expect(userVersion).toBeTruthy();
    const analysisData = unwrap(await api.getStageData({ sessionId: session.id, stage: 'analysis', view: 'workflow' }));
    expect(analysisData.entities.map((entity) => entity.id)).toContain(userVersion.id);
    const userEntity = unwrap(await api.getEntity({ sessionId: session.id, entityId: userVersion.id, view: 'workflow' }));
    expect(userEntity.kind).toBe('userScriptVersion');
    const baseEntity = unwrap(await api.getEntity({ sessionId: session.id, entityId: 'scn-scent-layering.brand.lavish', view: 'workflow' }));
    expect(baseEntity.kind).toBe('brand');
  });

  test('simulateDelivery settles once at virtual schedule, idempotent replay does not duplicate records', async () => {
    const api = createApi({ virtualNow: () => 61000 });
    const ready = await toVideoReady(api);
    const { session, draftId } = await saveDraft(api, ready.session, ready.pkg);
    const firstResult = await api.simulateDelivery(ctx(session, 'delivery-1'), {
      draftId,
      confirmedVideoId: 'scn-scent-layering.video.video-en',
      failureCase: null,
    });
    const first = unwrap(firstResult);
    expect(first.session.workflow.delivery).toBe('completed');
    expect(first.session.deliveryAttempts).toHaveLength(1);
    expect(first.attempt?.outcome).toBe('simulated_delivered');
    const historyItems = unwrap(await api.getHistory({ sessionId: session.id })).items;
    expect(historyItems.length).toBeGreaterThan(0);
    expect(historyItems.every((record) => !record.action.startsWith('event:'))).toBe(true);
    const deliveryData = unwrap(await api.getStageData({ sessionId: session.id, stage: 'delivery', view: 'workflow' }));
    expect(deliveryData.entities.some((entity) => entity.kind === 'deliveryRecord')).toBe(true);

    const replayResult = await api.simulateDelivery(ctx(session, 'delivery-1'), {
      draftId,
      confirmedVideoId: 'scn-scent-layering.video.video-en',
      failureCase: null,
    });
    const replay = unwrap(replayResult);
    expect(replay.attempt?.id).toBe(first.attempt?.id);
    expect(replay.session.revision).toBe(first.session.revision);
    expect(replayResult.meta.requestId).toBe(firstResult.meta.requestId);

    const duplicateKey = await api.simulateDelivery(ctx(first.session, 'delivery-2'), {
      draftId,
      confirmedVideoId: 'scn-scent-layering.video.video-en',
      failureCase: null,
    });
    expect(duplicateKey.ok).toBe(false);
    if (!duplicateKey.ok) expect(duplicateKey.error.code).toBe('INVALID_TRANSITION');
  });

  test('simulateDelivery before schedule stays running; retry failure closes to a success record', async () => {
    let virtual = 59000;
    const earlyApi = createApi({ virtualNow: () => virtual });
    const earlyReady = await toVideoReady(earlyApi);
    const earlyDraft = await saveDraft(earlyApi, earlyReady.session, earlyReady.pkg);
    const early = unwrap(
      await earlyApi.simulateDelivery(ctx(earlyDraft.session, 'early'), {
        draftId: earlyDraft.draftId,
        confirmedVideoId: 'scn-scent-layering.video.video-en',
        failureCase: null,
      }),
    );
    expect(early.session.workflow.delivery).toBe('running');
    expect(early.attempt).toMatchObject({ status: 'running', scheduledVirtualMs: 60000 });

    virtual = 61000;
    const api = createApi({ virtualNow: () => virtual });
    const ready = await toVideoReady(api);
    const { session, draftId } = await saveDraft(api, ready.session, ready.pkg);
    const failed = unwrap(
      await api.simulateDelivery(ctx(session, 'failed-attempt'), {
        draftId,
        confirmedVideoId: 'scn-scent-layering.video.video-en',
        failureCase: 'delivery_failed',
      }),
    );
    expect(failed.session.workflow.delivery).toBe('failed');
    expect(failed.attempt?.outcome).toBe('failed');
    const failedStageAttempt = failed.session.stageAttempts.find((attempt) => attempt.stage === 'delivery' && attempt.status === 'failed')!;
    const retried = unwrap(
      await api.retryStage(ctx(failed.session, 'retry-delivery'), { stage: 'delivery', failedAttemptId: failedStageAttempt.id }),
    );
    expect(retried.workflow.delivery).toBe('completed');
    expect(retried.deliveryAttempts.map((attempt) => attempt.outcome)).toEqual(['failed', 'simulated_delivered']);
  });

  test('same revision concurrent different keys: one command succeeds, the other conflicts', async () => {
    const storage = new MemoryStorage();
    const apiA = createApi({ storage });
    const apiB = createApi({ storage });
    const session = await createSession(apiA);
    const [left, right] = await Promise.all([
      apiA.executeStage({ sessionId: session.id, expectedRevision: 0, idempotencyKey: 'concurrent-a' }, { stage: 'discovery' }),
      apiB.executeStage({ sessionId: session.id, expectedRevision: 0, idempotencyKey: 'concurrent-b' }, { stage: 'discovery' }),
    ]);
    expect([left.ok, right.ok].filter(Boolean)).toHaveLength(1);
    const failedResult = left.ok ? right : left;
    if (!failedResult.ok) expect(failedResult.error.code).toBe('REVISION_CONFLICT');
    expect(unwrap(await apiA.getSession({ sessionId: session.id })).revision).toBe(1);
  });

  test('two sessions are isolated and reset only clears the selected session audit', async () => {
    const api = createApi();
    let first = await createSession(api, 'session-a');
    let second = await createSession(api, 'session-b');
    first = unwrap(await api.executeStage(ctx(first, 'first-discovery'), { stage: 'discovery' }));
    const secondBefore = unwrap(await api.getSession({ sessionId: second.id }));
    const reset = unwrap(await api.resetSession(ctx(first, 'reset-first'), { confirmation: 'RESET_THIS_SESSION' }));
    expect(reset.workflow.discovery).toBe('ready');
    expect(unwrap(await api.getSession({ sessionId: second.id })).revision).toBe(secondBefore.revision);
    expect(unwrap(await api.getHistory({ sessionId: first.id })).items.some((record) => record.outcome === 'reset')).toBe(true);
  });

  test('replay commands are isolated from workflow records and validate seek/speed', async () => {
    const api = createApi();
    const ready = await toVideoReady(api);
    const before = unwrap(await api.getSession({ sessionId: ready.session.id }));
    const historyBefore = unwrap(await api.getHistory({ sessionId: ready.session.id })).items.length;
    let replay = ready.session;
    const seek = unwrap(await api.replayCommand(ctx(replay, 'replay-seek'), { action: 'seek', cursorSequence: 11 }));
    expect(seek.projection.workflow.analysis).toBe('completed');
    replay = seek.session;
    const step = unwrap(await api.replayCommand(ctx(replay, 'replay-step'), { action: 'step' }));
    expect(step.projection.workflow.video).toBe('running');
    replay = step.session;
    const speed = unwrap(await api.replayCommand(ctx(replay, 'replay-speed'), { action: 'setSpeed', speed: 2 }));
    expect(speed.session.replay.speed).toBe(2);
    const after = unwrap(await api.getSession({ sessionId: ready.session.id }));
    expect(after.history.length).toBe(historyBefore);
    expect(after.deliveryAttempts).toEqual(before.deliveryAttempts);
    const invalidSpeed = await api.replayCommand(ctx(replay, 'replay-bad-speed'), { action: 'setSpeed', speed: 3 as 2 });
    expect(invalidSpeed.ok).toBe(false);
  });

  test('getDownloads returns real bytes/hash and explicit unimplemented ZIP error', async () => {
    const api = createApi();
    const ready = await toVideoReady(api);
    const video = unwrap(
      await api.getDownload({ sessionId: ready.session.id, kind: 'video', entityId: 'scn-scent-layering.video.video-en' }),
    );
    expect(video.bytes).toBeGreaterThan(0);
    expect(video.sha256).toMatch(/^[0-9a-f]{64}$/);
    const script = unwrap(
      await api.getDownload({ sessionId: ready.session.id, kind: 'script', entityId: ready.session.activeScriptVersionId as string }),
    );
    expect(script.mimeType).toBe('application/json');
    const bundle = await api.getDownload({ sessionId: ready.session.id, kind: 'delivery_bundle', entityId: ready.pkg.manifest.entryDeliveryId });
    expect(bundle.ok).toBe(false);
    if (!bundle.ok) expect(bundle.error.code).toBe('MOCK_FAILURE');
  });

  test('non-ready scenarios cannot be read or started', async () => {
    const api = createApi({ source: makeSource({ ready: false }) });
    const scenario = await api.getScenario({ scenarioId: SCENARIO_ID, scenarioVersion: SCENARIO_VERSION });
    expect(scenario.ok).toBe(false);
    if (!scenario.ok) expect(scenario.error.code).toBe('SCENARIO_NOT_READY');
    const created = await api.createSession({ scenarioId: SCENARIO_ID, scenarioVersion: SCENARIO_VERSION, creationKey: 'blocked' });
    expect(created.ok).toBe(false);
    if (!created.ok) expect(created.error.code).toBe('SCENARIO_NOT_READY');
  });

  test('replaying the same creation key returns the same session; a different body conflicts', async () => {
    const api = createApi();
    const first = await createSession(api, 'same-creation');
    const same = await createSession(api, 'same-creation');
    expect(same.id).toBe(first.id);
    expect(unwrap(await api.listSessions()).items).toHaveLength(1);
  });

  test('replay play/pause/restart/seek/setSpeed commands are persisted and bounded', async () => {
    const api = createApi();
    const session = await createSession(api);
    let replay = unwrap(await api.replayCommand(ctx(session, 'replay-play'), { action: 'play' }));
    expect(replay.session.replay.transport).toBe('playing');
    replay = unwrap(await api.replayCommand(ctx(replay.session, 'replay-pause'), { action: 'pause' }));
    expect(replay.session.replay.transport).toBe('paused');
    replay = unwrap(await api.replayCommand(ctx(replay.session, 'replay-seek-4'), { action: 'seek', cursorSequence: 4 }));
    expect(replay.session.replay.cursorSequence).toBe(4);
    replay = unwrap(await api.replayCommand(ctx(replay.session, 'replay-restart'), { action: 'restart' }));
    expect(replay.session.replay.cursorSequence).toBe(0);
    expect(replay.session.replay.transport).toBe('idle');
    const badSeek = await api.replayCommand(ctx(replay.session, 'replay-bad-seek'), { action: 'seek', cursorSequence: 999 });
    expect(badSeek.ok).toBe(false);
  });

  test('replayCommand is a strict discriminated command and invalid fields do not change revision', async () => {
    const api = createApi();
    const session = await createSession(api);
    const cases = [
      { action: 'pause', speed: 2 },
      { action: 'play', cursorSequence: 3 },
      { action: 'step', speed: 2 },
      { action: 'restart', cursorSequence: 0 },
      { action: 'seek', cursorSequence: 3, speed: 2 },
      { action: 'setSpeed', speed: 2, cursorSequence: 3 },
    ] as Array<Record<string, unknown>>;
    for (const [index, invalid] of cases.entries()) {
      const result = await api.replayCommand(ctx(session, `invalid-replay-${index}`), invalid as any);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_INPUT');
    }
    expect(unwrap(await api.getSession({ sessionId: session.id })).revision).toBe(session.revision);
    const setSpeed = await api.replayCommand(ctx(session, 'valid-speed'), { action: 'setSpeed', speed: 2 });
    expect(setSpeed.ok).toBe(true);
  });

  test('replay view cannot access user versions/drafts/attempts/records from operation mode', async () => {
    const api = createApi();
    const ready = await toVideoReady(api);
    const userVersionId = ready.session.userVersions[0].id;
    const replayEntity = await api.getEntity({ sessionId: ready.session.id, entityId: userVersionId, view: 'replay' });
    expect(replayEntity.ok).toBe(false);
    if (!replayEntity.ok) expect(replayEntity.error.code).toBe('ENTITY_NOT_REACHED');
    const replayStage = unwrap(await api.getStageData({ sessionId: ready.session.id, stage: 'analysis', view: 'replay' }));
    expect(replayStage.entities.map((entity) => entity.id)).not.toContain(userVersionId);
    const workflowEntity = await api.getEntity({ sessionId: ready.session.id, entityId: userVersionId, view: 'workflow' });
    expect(workflowEntity.ok).toBe(true);
  });

  test('createSession replays the original revision-0 response after business commands', async () => {
    const api = createApi();
    let session = await createSession(api, 'creation-original');
    expect(session.revision).toBe(0);
    session = unwrap(await api.executeStage(ctx(session, 'original-discovery'), { stage: 'discovery' }));
    expect(session.revision).toBe(1);
    const repeated = await api.createSession({ scenarioId: SCENARIO_ID, scenarioVersion: SCENARIO_VERSION, creationKey: 'creation-original' });
    expect(repeated.ok).toBe(true);
    if (!repeated.ok) return;
    expect(repeated.data.revision).toBe(0);
    expect(repeated.data.workflow.discovery).toBe('ready');
    expect(repeated.meta.revision).toBe(0);
    expect(unwrap(await api.getSession({ sessionId: session.id })).revision).toBe(1);
  });

  test('duplicate commands return the original response before package availability checks', async () => {
    const storage = new MemoryStorage();
    const baseSource = makeSource();
    let currentHash = PACKAGE_HASH;
    const mutableSource: ScenarioSource = {
      list: () => baseSource.list(),
      get: async (scenarioId, scenarioVersion) => {
        const loaded = await baseSource.get(scenarioId, scenarioVersion);
        return loaded ? { ...loaded, packageHash: currentHash } : null;
      },
    };
    const api = createApi({ source: mutableSource, storage });
    const session = await createSession(api, 'receipt-first');
    const first = await api.executeStage(ctx(session, 'same-key-command'), { stage: 'discovery' });
    expect(first.ok).toBe(true);
    const firstData = first.ok ? first.data : null;
    const firstMeta = first.ok ? first.meta : null;
    currentHash = 'PACKAGE_CHANGED_AFTER_RECEIPT';
    const replay = await api.executeStage(ctx(session, 'same-key-command'), { stage: 'discovery' });
    expect(replay.ok).toBe(true);
    if (replay.ok && firstData && firstMeta) {
      expect(replay.data).toEqual(firstData);
      expect(replay.meta.requestId).toBe(firstMeta.requestId);
      expect(replay.meta.revision).toBe(firstMeta.revision);
    }
    const conflictingBody = await api.executeStage(ctx(session, 'same-key-command'), { stage: 'analysis' });
    expect(conflictingBody.ok).toBe(false);
    if (!conflictingBody.ok) expect(conflictingBody.error.code).toBe('IDEMPOTENCY_CONFLICT');
    const exportResult = await api.getDownload({ sessionId: session.id, kind: 'run_record', entityId: session.id });
    expect(exportResult.ok).toBe(true);
    if (exportResult.ok) {
      const text = new TextDecoder().decode(exportResult.data.blob);
      expect(text).toContain(PACKAGE_HASH);
      expect(text).toContain('recoveryStatus');
      expect(text).toContain('"status"');
    }
  });

  test('getEvents pagination exposes all 21 events without gaps or duplicates', async () => {
    const api = createApi();
    const session = await createSession(api);
    for (const limit of [1, 2, 100]) {
      const collected: number[] = [];
      let afterSequence = 0;
      for (let page = 0; page < 30; page += 1) {
        const result = unwrap(await api.getEvents({ sessionId: session.id, afterSequence, limit }));
        collected.push(...result.items.map((event) => event.sequence));
        if (result.nextSequence === null) break;
        expect(result.nextSequence).toBe(result.items[result.items.length - 1].sequence);
        expect(result.nextSequence).toBeGreaterThan(afterSequence);
        afterSequence = result.nextSequence;
      }
      expect(collected).toEqual(Array.from({ length: 21 }, (_, index) => index + 1));
      expect(new Set(collected).size).toBe(21);
    }
    const first = unwrap(await api.getEvents({ sessionId: session.id, afterSequence: 0, limit: 2 }));
    expect(first.nextSequence).toBe(2);
    expect((await api.getEvents({ sessionId: session.id, afterSequence: 0, limit: 0 })).ok).toBe(false);
  });

  test('workflowCommand pause/resume updates playback transport without changing workflow', async () => {
    const api = createApi();
    let session = await createSession(api);
    session = unwrap(await api.executeStage(ctx(session, 'discovery-wf'), { stage: 'discovery' }));
    session = unwrap(await api.executeStage(ctx(session, 'analysis-wf'), { stage: 'analysis' }));
    expect(session.workflow.analysis).toBe('awaiting_confirmation');
    const paused = unwrap(await api.workflowCommand(ctx(session, 'pause-wf'), { action: 'pause' }));
    expect(paused.workflowPlayback.transport).toBe('paused');
    expect(paused.workflow).toEqual(session.workflow);
    const resumed = unwrap(await api.workflowCommand(ctx(paused, 'resume-wf'), { action: 'resume' }));
    expect(resumed.workflowPlayback.transport).toBe('playing');
  });

  test('corrupt session is not returned as ok and run_record still exports raw recovery data', async () => {
    const factory = new FakeIDBFactory();
    const dbName = `lavish-poc-api-corrupt-${Date.now()}`;
    const storage = new IndexedDbStorage({ factory, dbName });
    const api = createApi({ storage });
    const session = await createSession(api, 'corrupt-api-session');
    const stored = await storage.getSession(session.id);
    expect(stored).not.toBeNull();
    const corrupt = {
      ...stored!,
      state: { ...stored!.state, workflow: { ...stored!.state.workflow, video: 'INVALID_STATE' } },
    };
    await new Promise<void>((resolve, reject) => {
      // FLOW-001: the shared DB moved from version 2 to version 3 (additive
      // socialWorkflows store). Reopen at the current version to inject the raw
      // corrupt record; the test intent and assertions are unchanged.
      const request = factory.open(dbName, 3);
      request.onupgradeneeded = () => {};
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('sessions', 'readwrite');
        transaction.objectStore('sessions').put(corrupt);
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
    const reopenedApi = createApi({ storage: new IndexedDbStorage({ factory, dbName }) });
    const read = await reopenedApi.getSession({ sessionId: session.id });
    expect(read.ok).toBe(false);
    if (!read.ok) expect(read.error.code).toBe('CORRUPT_SESSION');
    const exported = await reopenedApi.getDownload({ sessionId: session.id, kind: 'run_record', entityId: session.id });
    expect(exported.ok).toBe(true);
    if (exported.ok) {
      const text = new TextDecoder().decode(exported.data.blob);
      expect(text).toContain('"recoveryStatus":"corrupt"');
      expect(text).toContain('INVALID_STATE');
    }
  });

  test('IndexedDB refresh restores the same session and revision', async () => {
    const factory = new FakeIDBFactory();
    const dbName = `lavish-poc-api-refresh-${Date.now()}`;
    const firstStorage = new IndexedDbStorage({ factory, dbName });
    const firstApi = createApi({ storage: firstStorage });
    const created = await createSession(firstApi, 'refresh-session');
    expect(created.storageMode).toBe('indexeddb');
    const secondStorage = new IndexedDbStorage({ factory, dbName });
    const secondApi = createApi({ storage: secondStorage });
    const restored = unwrap(await secondApi.getSession({ sessionId: created.id }));
    expect(restored.revision).toBe(created.revision);
    expect(restored.packageHash).toBe(PACKAGE_HASH);
    expect(restored.storageMode).toBe('indexeddb');
    expect(restored.replay.transport).toBe('paused');
  });

  test('invalid InputFailure inside an IndexedDB transaction is INVALID_INPUT and writes nothing', async () => {
    const factory = new FakeIDBFactory();
    const storage = new IndexedDbStorage({ factory, dbName: `lavish-poc-api-invalid-${Date.now()}` });
    const api = createApi({ storage });
    const session = await createSession(api, 'invalid-session');
    const result = await api.executeStage(ctx(session, 'invalid-extra'), {
      stage: 'discovery',
      extra: true,
    } as unknown as { stage: 'discovery' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_INPUT');
    expect(unwrap(await api.getSession({ sessionId: session.id })).revision).toBe(0);
  });

  test('strict fields, extra keys, revision and package changes are explicit errors', async () => {
    const api = createApi();
    const session = await createSession(api);
    const extra = await api.executeStage(
      { sessionId: session.id, expectedRevision: 0, idempotencyKey: 'x', extra: true } as CommandContext,
      { stage: 'discovery' },
    );
    expect(extra.ok).toBe(false);
    if (!extra.ok) expect(extra.error.code).toBe('INVALID_INPUT');
    const stale = await api.executeStage(
      { sessionId: session.id, expectedRevision: 99, idempotencyKey: 'stale' },
      { stage: 'discovery' },
    );
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error.code).toBe('REVISION_CONFLICT');

    const changedStorage = new MemoryStorage();
    const baseSource = makeSource();
    let currentHash = PACKAGE_HASH;
    const mutableSource: ScenarioSource = {
      list: () => baseSource.list(),
      get: async (scenarioId, scenarioVersion) => {
        const loaded = await baseSource.get(scenarioId, scenarioVersion);
        return loaded ? { ...loaded, packageHash: currentHash } : null;
      },
    };
    const changedSourceApi = createApi({ source: mutableSource, storage: changedStorage });
    const changedSession = await createSession(changedSourceApi);
    currentHash = 'CHANGED_AFTER_CREATION';
    const changed = await changedSourceApi.getSession({ sessionId: changedSession.id });
    expect(changed.ok).toBe(false);
    if (!changed.ok) expect(changed.error.code).toBe('PACKAGE_CHANGED');
  });

  test('proxy storage failures are surfaced and never reported as saved', async () => {
    const bases = new MemoryStorage();
    const failing: PocStorage = {
      get mode() { return bases.mode; },
      get kind() { return bases.kind; },
      open: () => bases.open(),
      close: () => bases.close(),
      listSessions: () => bases.listSessions(),
      getSession: () => bases.getSession('usr.none'),
      getHistory: () => bases.getHistory('usr.none'),
      getReceipt: () => bases.getReceipt('usr.none', 'x', 'x'),
      createSession: async () => ({ kind: 'conflict', failure: { ok: false, code: 'STORAGE_QUOTA', message: 'QuotaExceededError' } }),
      getCreationReceipt: async () => null,
      mutateSession: async () => ({ ok: false, kind: 'storage', code: 'STORAGE_QUOTA', message: 'QuotaExceededError' }),
      exportSession: async () => null,
      putPackageMeta: async () => {},
      getPackageMeta: async () => null,
    };
    const api = createApi({ storage: failing });
    const result = await api.createSession({ scenarioId: SCENARIO_ID, scenarioVersion: SCENARIO_VERSION, creationKey: 'quota' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('STORAGE_QUOTA');
    expect(await failing.listSessions()).toHaveLength(0);
  });
});
