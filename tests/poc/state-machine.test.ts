import { describe, expect, test } from 'vitest';
import { createFixture, IDS } from '../fixtures/poc/build-fixture';
import {
  advanceDeliveryAttempt,
  applyWorkflowEvent,
  confirmScript,
  createInitialState,
  createReplayState,
  discoveryOutputsComplete,
  executeStage,
  failStage,
  getActiveDraft,
  reduceReplay,
  reduceReplayEvent,
  resetSession,
  retryStage,
  saveDeliveryDraft,
  saveScriptDraft,
  selectScript,
  setReplayTransport,
  simulateDelivery,
  videoOutputComplete,
  type DomainResult,
  type DomainState,
  type ExecuteStageInput,
  type ScenarioPackage,
  type ScriptEditable,
  type Event,
} from '../../apps/web/demo/poc/domain';

const SESSION_ID = 'usr.test-session';
const PACKAGE_HASH = 'TEST_ONLY_PACKAGE_HASH_0000000000000000000000000000000000000000000000000000000000000000';
const CREATED_AT = '2026-11-04T00:00:00.000Z';
const NOW = '2026-11-04T00:00:01.000Z';

function buildPackage(): ScenarioPackage {
  const fixture = createFixture();
  const files = fixture.files as Record<string, any>;
  return {
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
  } as ScenarioPackage;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function unwrap<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message} ${JSON.stringify(result.error.fieldErrors ?? [])}`);
  return result.value;
}

const pkg = deepFreeze(buildPackage());
const events = pkg.events.data.events as Event[];

function initialState(): DomainState {
  return createInitialState(pkg, { sessionId: SESSION_ID, packageHash: PACKAGE_HASH, createdAt: CREATED_AT });
}

function apply(state: DomainState, event: Event): DomainState {
  return unwrap(applyWorkflowEvent(state, pkg, event));
}

function stageInput(stage: 'discovery' | 'analysis' | 'video', virtualMs = 0): ExecuteStageInput {
  return { stage, nowIso: NOW, virtualMs, runKey: `TEST_ONLY-${stage}` };
}

function discoveryCompleted(): DomainState {
  let state = unwrap(executeStage(initialState(), pkg, stageInput('discovery')));
  for (const event of events.filter((item) => item.sequence <= 4)) state = apply(state, event);
  return state;
}

function analysisPresented(): DomainState {
  let state = discoveryCompleted();
  state = unwrap(executeStage(state, pkg, stageInput('analysis', 5000)));
  for (const event of events.filter((item) => item.sequence >= 5 && item.sequence <= 9)) state = apply(state, event);
  return state;
}

function confirmedEntryScript(): DomainState {
  return unwrap(
    confirmScript(analysisPresented(), pkg, {
      scriptVersionId: IDS.scriptEn,
      nowIso: NOW,
    }),
  );
}

function videoCompleted(): DomainState {
  let state = unwrap(executeStage(confirmedEntryScript(), pkg, stageInput('video', 13000)));
  for (const event of events.filter((item) => item.sequence >= 12 && item.sequence <= 17)) state = apply(state, event);
  return state;
}

function editableFromEntry(): ScriptEditable {
  const version = pkg.script.data.versions.find((item) => item.id === IDS.scriptEn);
  if (!version) throw new Error('Missing entry script');
  return {
    title: version.title,
    hook: version.hook,
    message: version.message,
    cta: version.cta,
    shots: version.shots.map((shot) => ({ ...shot, assetIds: [...shot.assetIds] })),
    subtitles: version.subtitles.map((subtitle) => ({ ...subtitle })),
    caption: version.caption,
    hashtags: [...version.hashtags],
  };
}

function deliveryDraftInput(overrides: Partial<Parameters<typeof saveDeliveryDraft>[2]> = {}) {
  return {
    planId: IDS.plan,
    subject: 'TEST_ONLY subject',
    body: 'TEST_ONLY body. Simulated delivery; no email is sent.',
    scheduledVirtualMs: 60000,
    nowIso: NOW,
    ...overrides,
  };
}

function withSavedDraft(): DomainState {
  return unwrap(saveDeliveryDraft(videoCompleted(), pkg, deliveryDraftInput()));
}

describe('POC-003 four-stage pure domain state machine', () => {
  test('initial workflow and replay projections are separate and deterministic', () => {
    const state = initialState();
    expect(state.workflow).toEqual({ discovery: 'ready', analysis: 'locked', video: 'locked', delivery: 'locked' });
    expect(state.history).toEqual([]);
    expect(state.replay.cursorSequence).toBe(0);
    expect(state.replay.projection.workflow).toEqual(state.workflow);
    expect(state.replay.transport).toBe('idle');

    const replay = createReplayState();
    expect(replay.projection.workflow).toEqual({ discovery: 'ready', analysis: 'locked', video: 'locked', delivery: 'locked' });
    expect(replay.projection.visibleEntityIds).toEqual([]);
  });

  test('discovery runs only from ready and completes only after all signals/trends are visible', () => {
    const before = initialState();
    const prematureAnalysis = executeStage(before, pkg, stageInput('analysis'));
    expect(prematureAnalysis.ok).toBe(false);
    if (!prematureAnalysis.ok) expect(prematureAnalysis.error.code).toBe('INVALID_TRANSITION');

    let state = unwrap(executeStage(before, pkg, stageInput('discovery')));
    state = apply(state, events[0]);
    state = apply(state, events[1]);
    // A queued/visible signal alone is not enough for discovery completion; the
    // shared guard names the missing trend without relying on a fabricated event.
    expect(discoveryOutputsComplete(pkg, state.workflowVisibleEntityIds)).toContain(IDS.trend);

    let complete = unwrap(executeStage(before, pkg, stageInput('discovery')));
    for (const event of events.filter((item) => item.sequence >= 1 && item.sequence <= 4)) complete = apply(complete, event);
    state = complete;
    expect(state.workflow.discovery).toBe('completed');
    expect(state.workflow.analysis).toBe('ready');
    expect(state.stageAttempts.find((attempt) => attempt.stage === 'discovery')?.status).toBe('completed');
  });

  test('analysis stops at script presented awaiting confirmation; video cannot start before confirmation', () => {
    const state = analysisPresented();
    expect(state.workflow.analysis).toBe('awaiting_confirmation');
    expect(state.workflow.video).toBe('locked');
    expect(state.activeScriptVersionId).toBe(IDS.scriptEn);
    expect(state.workflowVisibleEntityIds).toEqual(expect.arrayContaining([IDS.scriptEn, IDS.scriptAr]));

    const prematureVideo = executeStage(state, pkg, stageInput('video'));
    expect(prematureVideo.ok).toBe(false);
    if (!prematureVideo.ok) expect(prematureVideo.error.code).toBe('INVALID_TRANSITION');

    const confirmed = confirmedEntryScript();
    expect(confirmed.workflow.analysis).toBe('completed');
    expect(confirmed.workflow.video).toBe('ready');
    expect(confirmed.activeVideoId).toBe(IDS.video);
    expect(confirmed.workflowCursor).toBe(9);
  });

  test('confirmScript rejects a script that was not presented; replay-only preset decisions do not drive workflow', () => {
    const state = analysisPresented();
    const wrongScript = confirmScript(state, pkg, { scriptVersionId: IDS.scriptAr, nowIso: NOW });
    expect(wrongScript.ok).toBe(false);
    if (!wrongScript.ok) expect(wrongScript.error.code).toBe('INVALID_INPUT');

    const directCompletion = applyWorkflowEvent(state, pkg, events[9]);
    expect(directCompletion.ok).toBe(false);
    if (!directCompletion.ok) expect(directCompletion.error.code).toBe('REPLAY_ONLY_EVENT');
  });

  test('saveScriptDraft creates a new ID even for a one-character edit and stales video/delivery', () => {
    const state = confirmedEntryScript();
    const content = editableFromEntry();
    content.title = `${content.title}!`;
    const next = unwrap(saveScriptDraft(state, pkg, { baseVersionId: IDS.scriptEn, content, nowIso: NOW }));
    expect(next.userVersions).toHaveLength(1);
    const user = next.userVersions[0];
    expect(user.id).not.toBe(IDS.scriptEn);
    expect(user.parentVersionId).toBe(IDS.scriptEn);
    expect(user.sourceScriptVersionId).toBe(IDS.scriptEn);
    expect(user.content.title).toBe(`${editableFromEntry().title}!`);
    expect(next.activeScriptVersionId).toBe(user.id);
    expect(next.activeVideoId).toBeNull();
    expect(next.deliveryDraftId).toBeNull();
    expect(next.workflow.video).toBe('stale');
    expect(next.workflow.delivery).toBe('stale');
    expect(next.workflow.analysis).toBe('awaiting_confirmation');
    expect(next.history.at(-1)).toMatchObject({ action: 'saveScriptDraft', outcome: 'applied' });
  });

  test('user draft has no preset video until an explicit preset script selection and re-confirmation', () => {
    const state = confirmedEntryScript();
    const content = editableFromEntry();
    content.message = `${content.message} (edited)`;
    const withUserDraft = unwrap(saveScriptDraft(state, pkg, { baseVersionId: IDS.scriptEn, content, nowIso: NOW }));
    const confirmDraft = unwrap(
      confirmScript(withUserDraft, pkg, { scriptVersionId: withUserDraft.activeScriptVersionId as string, nowIso: NOW }),
    );
    expect(confirmDraft.workflow.analysis).toBe('completed');
    expect(confirmDraft.workflow.video).toBe('stale');
    expect(confirmDraft.activeVideoId).toBeNull();
    expect(confirmDraft.warnings).not.toBeDefined();

    const executeVideo = executeStage(confirmDraft, pkg, stageInput('video'));
    expect(executeVideo.ok).toBe(false);
    if (!executeVideo.ok) expect(executeVideo.error.code).toBe('INVALID_TRANSITION');

    const selected = unwrap(selectScript(confirmDraft, pkg, { scriptVersionId: IDS.scriptEn, nowIso: NOW }));
    expect(selected.workflow.analysis).toBe('awaiting_confirmation');
    expect(selected.workflow.video).toBe('stale');
    const reconfirmed = unwrap(confirmScript(selected, pkg, { scriptVersionId: IDS.scriptEn, nowIso: NOW }));
    expect(reconfirmed.workflow.video).toBe('ready');
    expect(reconfirmed.activeVideoId).toBe(IDS.video);
    expect(reconfirmed.userVersions).toHaveLength(1);
  });

  test('video flow uses the confirmed script/video and completes only after video.available', () => {
    const state = confirmedEntryScript();
    let running = unwrap(executeStage(state, pkg, stageInput('video', 13000)));
    expect(running.workflow.video).toBe('running');
    expect(running.activeVideoId).toBe(IDS.video);

    const queuedOnlyIssue = videoOutputComplete(
      pkg,
      IDS.video,
      { [IDS.video]: 'queued' },
      { [IDS.video]: 100 },
      [IDS.video],
    );
    expect(queuedOnlyIssue).toMatch(/available/i);

    for (const event of events.filter((item) => item.sequence >= 12 && item.sequence <= 17)) running = apply(running, event);
    expect(running.workflow.video).toBe('completed');
    expect(running.workflow.delivery).toBe('ready');
    expect(running.workflowVisibleEntityIds).toContain(IDS.video);
  });

  test('saveDeliveryDraft keeps exact .invalid recipients and video attachments, and edits revoke confirmation', () => {
    const state = videoCompleted();
    const invalidDraft = saveDeliveryDraft(state, pkg, deliveryDraftInput({ subject: '' }));
    expect(invalidDraft.ok).toBe(false);
    if (!invalidDraft.ok) expect(invalidDraft.error.code).toBe('INVALID_INPUT');

    const first = unwrap(saveDeliveryDraft(state, pkg, deliveryDraftInput({ subject: 'TEST_ONLY first draft' })));
    expect(first.workflow.delivery).toBe('awaiting_confirmation');
    const draft = getActiveDraft(first);
    expect(draft).not.toBeNull();
    expect(draft?.recipientSnapshot[0].email).toBe('reviewer@example.invalid');
    expect(draft?.attachmentAssetIds).toEqual([IDS.mp4, IDS.vtt]);
    expect(draft?.attachmentAssetIds).toContain(IDS.mp4);
    expect(draft?.confirmedRevision).toBeNull();

    const edited = unwrap(saveDeliveryDraft(first, pkg, deliveryDraftInput({ subject: 'TEST_ONLY edited draft' })));
    const editedDraft = getActiveDraft(edited);
    expect(editedDraft?.id).not.toBe(draft?.id);
    expect(editedDraft?.confirmedRevision).toBeNull();
    expect(edited.deliveryDrafts).toHaveLength(2);
    expect(edited.deliveryDrafts[0]).toEqual(draft);
  });

  test('simulateDelivery starts a running attempt; advance settles at/after schedule and writes one immutable record', () => {
    const state = withSavedDraft();
    const draft = getActiveDraft(state);
    expect(draft).not.toBeNull();
    const wrongVideo = simulateDelivery(state, pkg, {
      draftId: draft!.id,
      confirmedVideoId: 'scn-scent-layering.video.wrong',
      failureCase: null,
      nowIso: NOW,
      virtualTimeMs: 61000,
    });
    expect(wrongVideo.ok).toBe(false);
    if (!wrongVideo.ok) expect(wrongVideo.error.code).toBe('VIDEO_VERSION_MISMATCH');

    const started = unwrap(
      simulateDelivery(state, pkg, {
        draftId: draft!.id,
        confirmedVideoId: IDS.video,
        failureCase: null,
        nowIso: NOW,
        virtualTimeMs: 60000,
      }),
    );
    expect(started.workflow.delivery).toBe('running');
    expect(started.pendingDeliveryAttempts).toHaveLength(1);
    expect(started.deliveryAttempts).toHaveLength(0);
    expect(started.deliveryRecords).toHaveLength(0);
    const attemptId = started.pendingDeliveryAttempts[0].id;

    const beforeDue = unwrap(
      advanceDeliveryAttempt(started, pkg, { attemptId, virtualTimeMs: 59999, nowIso: NOW }),
    );
    expect(beforeDue.workflow.delivery).toBe('running');
    expect(beforeDue.deliveryRecords).toHaveLength(0);
    expect(beforeDue.pendingDeliveryAttempts[0].status).toBe('running');

    const delivered = unwrap(
      advanceDeliveryAttempt(beforeDue, pkg, { attemptId, virtualTimeMs: 60000, nowIso: NOW }),
    );
    expect(delivered.workflow.delivery).toBe('completed');
    expect(delivered.deliveryAttempts).toHaveLength(1);
    expect(delivered.deliveryRecords).toHaveLength(1);
    expect(delivered.pendingDeliveryAttempts[0]).toMatchObject({ status: 'settled', outcome: 'simulated_delivered' });
    expect(delivered.deliveryAttempts[0]).toMatchObject({
      scriptVersionId: IDS.scriptEn,
      videoId: IDS.video,
      attachmentAssetIds: [IDS.mp4, IDS.vtt],
      outcome: 'simulated_delivered',
      mode: 'mock',
    });
    expect(delivered.deliveryRecords[0]).toMatchObject({
      planId: IDS.plan,
      scriptVersionId: IDS.scriptEn,
      videoId: IDS.video,
      attachmentAssetIds: [IDS.mp4, IDS.vtt],
      outcome: 'simulated_delivered',
      mode: 'mock',
    });
    expect(delivered.deliveryDrafts[0].confirmedRevision).toBe(delivered.deliveryDrafts[0].revision);

    const settledAgain = unwrap(
      advanceDeliveryAttempt(delivered, pkg, { attemptId, virtualTimeMs: 62000, nowIso: NOW }),
    );
    expect(settledAgain.deliveryRecords).toHaveLength(1);
    const duplicate = simulateDelivery(delivered, pkg, {
      draftId: draft!.id,
      confirmedVideoId: IDS.video,
      failureCase: null,
      nowIso: NOW,
      virtualTimeMs: 61000,
    });
    expect(duplicate.ok).toBe(false);
  });

  test('failure attempts preserve reasons and retry appends a new attempt without overwriting the old one', () => {
    const running = unwrap(executeStage(confirmedEntryScript(), pkg, stageInput('video', 13000)));
    const failed = unwrap(failStage(running, pkg, { stage: 'video', errorCode: 'media_decode_failed', nowIso: NOW }));
    expect(failed.workflow.video).toBe('failed');
    const failedAttempt = failed.stageAttempts.find((attempt) => attempt.stage === 'video' && attempt.status === 'failed');
    expect(failedAttempt).toBeDefined();

    const parallel = retryStage(failed, pkg, {
      stage: 'video',
      failedAttemptId: 'usr.test-session.attempt.video.999',
      nowIso: NOW,
      virtualMs: 14000,
    });
    expect(parallel.ok).toBe(false);

    const retried = unwrap(
      retryStage(failed, pkg, { stage: 'video', failedAttemptId: failedAttempt!.id, nowIso: NOW, virtualMs: 14000 }),
    );
    expect(retried.workflow.video).toBe('running');
    expect(retried.stageAttempts.filter((attempt) => attempt.stage === 'video')).toHaveLength(2);
    expect(retried.stageAttempts.find((attempt) => attempt.id === failedAttempt!.id)).toEqual(failedAttempt);
    expect(retried.stageAttempts.find((attempt) => attempt.stage === 'video' && attempt.status === 'running')?.ordinal).toBe(2);

    const retryNotFailed = retryStage(confirmedEntryScript(), pkg, {
      stage: 'video',
      failedAttemptId: failedAttempt!.id,
      nowIso: NOW,
      virtualMs: 14000,
    });
    expect(retryNotFailed.ok).toBe(false);
  });

  test('delivery failure settles at schedule, retry reuses the failed input snapshot, and succeeds via advance', () => {
    const state = withSavedDraft();
    const draft = getActiveDraft(state)!;
    const startedFailure = unwrap(
      simulateDelivery(state, pkg, {
        draftId: draft.id,
        confirmedVideoId: IDS.video,
        failureCase: 'delivery_failed',
        nowIso: NOW,
        virtualTimeMs: 60000,
      }),
    );
    expect(startedFailure.workflow.delivery).toBe('running');
    expect(startedFailure.deliveryAttempts).toHaveLength(0);
    const failed = unwrap(
      advanceDeliveryAttempt(startedFailure, pkg, {
        attemptId: startedFailure.pendingDeliveryAttempts[0].id,
        virtualTimeMs: 60000,
        nowIso: NOW,
      }),
    );
    expect(failed.workflow.delivery).toBe('failed');
    expect(failed.deliveryAttempts).toHaveLength(1);
    expect(failed.deliveryAttempts[0].outcome).toBe('failed');
    expect(failed.deliveryAttempts[0].failureCode).toBe('delivery_failed');
    expect(failed.deliveryRecords).toHaveLength(0);
    const oldAttempt = failed.deliveryAttempts[0];

    const retried = unwrap(
      retryStage(failed, pkg, {
        stage: 'delivery',
        failedAttemptId: failed.stageAttempts.find((attempt) => attempt.stage === 'delivery' && attempt.status === 'failed')!.id,
        nowIso: NOW,
        virtualMs: 61000,
      }),
    );
    expect(retried.workflow.delivery).toBe('running');
    expect(retried.deliveryAttempts).toHaveLength(1);
    expect(retried.deliveryAttempts[0]).toEqual(oldAttempt);
    expect(retried.deliveryRecords).toHaveLength(0);
    expect(retried.pendingDeliveryAttempts).toHaveLength(2);
    const runningPending = retried.pendingDeliveryAttempts.find((attempt) => attempt.status === 'running')!;
    expect(runningPending).toBeDefined();
    expect(runningPending).toMatchObject({
      scriptVersionId: oldAttempt.scriptVersionId,
      videoId: oldAttempt.videoId,
      attachmentAssetIds: oldAttempt.attachmentAssetIds,
      recipientIds: oldAttempt.recipientIds,
      failureCase: null,
    });

    const completed = unwrap(
      advanceDeliveryAttempt(retried, pkg, {
        attemptId: runningPending.id,
        virtualTimeMs: 61000,
        nowIso: NOW,
      }),
    );
    expect(completed.workflow.delivery).toBe('completed');
    expect(completed.deliveryAttempts).toHaveLength(2);
    expect(completed.deliveryAttempts[0]).toEqual(oldAttempt);
    expect(completed.deliveryAttempts[1].outcome).toBe('simulated_delivered');
    expect(completed.deliveryRecords).toHaveLength(1);
    expect(completed.deliveryRecords[0].attachmentAssetIds).toEqual(oldAttempt.attachmentAssetIds);
  });

  test('advanceDeliveryAttempt ignores an older settled attempt and never settles the current running retry', () => {
    const state = withSavedDraft();
    const started = unwrap(
      simulateDelivery(state, pkg, {
        draftId: state.deliveryDraftId as string,
        confirmedVideoId: IDS.video,
        failureCase: 'delivery_failed',
        nowIso: NOW,
        virtualTimeMs: 60000,
      }),
    );
    const failed = unwrap(
      advanceDeliveryAttempt(started, pkg, {
        attemptId: started.pendingDeliveryAttempts[0].id,
        virtualTimeMs: 60000,
        nowIso: NOW,
      }),
    );
    const oldPendingId = failed.pendingDeliveryAttempts[0].id;
    const retried = unwrap(
      retryStage(failed, pkg, {
        stage: 'delivery',
        failedAttemptId: failed.stageAttempts.find((attempt) => attempt.stage === 'delivery' && attempt.status === 'failed')!.id,
        nowIso: NOW,
        virtualMs: 61000,
      }),
    );
    const oldAdvance = unwrap(
      advanceDeliveryAttempt(retried, pkg, {
        attemptId: oldPendingId,
        virtualTimeMs: 61000,
        nowIso: NOW,
      }),
    );
    expect(oldAdvance.workflow.delivery).toBe('running');
    expect(oldAdvance.deliveryRecords).toHaveLength(0);
    expect(oldAdvance.pendingDeliveryAttempts.filter((attempt) => attempt.status === 'running')).toHaveLength(1);
  });

  test('invalid jumps are rejected across every stage boundary', () => {
    const initial = initialState();
    expect(executeStage(initial, pkg, stageInput('analysis')).ok).toBe(false);
    expect(executeStage(initial, pkg, stageInput('video')).ok).toBe(false);
    expect(confirmScript(initial, pkg, { scriptVersionId: IDS.scriptEn, nowIso: NOW }).ok).toBe(false);
    expect(saveDeliveryDraft(initial, pkg, deliveryDraftInput()).ok).toBe(false);
    expect(simulateDelivery(initial, pkg, { draftId: 'missing', confirmedVideoId: IDS.video, failureCase: null, nowIso: NOW, virtualTimeMs: 0 }).ok).toBe(false);
    expect(retryStage(initial, pkg, { stage: 'discovery', failedAttemptId: 'missing', nowIso: NOW, virtualMs: 0 }).ok).toBe(false);

    const runningVideo = unwrap(executeStage(confirmedEntryScript(), pkg, stageInput('video')));
    const editWhileRunning = saveScriptDraft(runningVideo, pkg, {
      baseVersionId: IDS.scriptEn,
      content: editableFromEntry(),
      nowIso: NOW,
    });
    expect(editWhileRunning.ok).toBe(false);
    if (!editWhileRunning.ok) expect(editWhileRunning.error.code).toBe('INVALID_TRANSITION');
  });

  test('video/plan script-version mismatches are rejected with VIDEO_VERSION_MISMATCH', () => {
    const state = confirmedEntryScript();
    const mismatchedPackage = {
      ...pkg,
      video: {
        ...pkg.video,
        data: { videos: [{ ...pkg.video.data.videos[0], scriptVersionId: IDS.scriptAr }] },
      },
    } as ScenarioPackage;
    const videoMismatch = executeStage(state, mismatchedPackage, stageInput('video'));
    expect(videoMismatch.ok).toBe(false);
    if (!videoMismatch.ok) expect(videoMismatch.error.code).toBe('VIDEO_VERSION_MISMATCH');

    const planMismatchPackage = {
      ...pkg,
      delivery: {
        ...pkg.delivery,
        data: {
          ...pkg.delivery.data,
          plans: [{ ...pkg.delivery.data.plans[0], videoId: 'scn-scent-layering.video.wrong' }],
        },
      },
    } as ScenarioPackage;
    const planMismatch = saveDeliveryDraft(videoCompleted(), planMismatchPackage, deliveryDraftInput());
    expect(planMismatch.ok).toBe(false);
    if (!planMismatch.ok) expect(planMismatch.error.code).toBe('VIDEO_VERSION_MISMATCH');
  });

  test('resetSession while a stage is running atomically cancels it and leaves an audit trail', () => {
    const running = unwrap(executeStage(initialState(), pkg, stageInput('discovery')));
    const reset = unwrap(resetSession(running, pkg, { confirmation: 'RESET_THIS_SESSION', nowIso: NOW }));
    expect(reset.workflow.discovery).toBe('ready');
    expect(reset.stageAttempts).toEqual([]);
    expect(reset.history.map((record) => record.outcome)).toEqual(expect.arrayContaining(['canceled', 'reset']));
    expect(reset.history.some((record) => record.action === 'cancelRunning:discovery')).toBe(true);
  });

  test('saveScriptDraft reuses POC-001 script semantics and rejects invalid shots/assets', () => {
    const state = confirmedEntryScript();
    const broken = editableFromEntry();
    broken.shots[1] = { ...broken.shots[1], startMs: broken.shots[1].startMs + 1 };
    const gap = saveScriptDraft(state, pkg, { baseVersionId: IDS.scriptEn, content: broken, nowIso: NOW });
    expect(gap.ok).toBe(false);
    if (!gap.ok) expect(gap.error.code).toBe('INVALID_INPUT');

    const unknownAsset = editableFromEntry();
    unknownAsset.shots[0] = { ...unknownAsset.shots[0], assetIds: ['scn-scent-layering.asset.unknown'] };
    const badAsset = saveScriptDraft(state, pkg, { baseVersionId: IDS.scriptEn, content: unknownAsset, nowIso: NOW });
    expect(badAsset.ok).toBe(false);
    if (!badAsset.ok) expect(badAsset.error.code).toBe('INVALID_INPUT');
    expect(state.userVersions).toHaveLength(0);
  });

  test('every command is pure: frozen inputs are not mutated and old history/results stay unchanged', () => {
    const before = deepFreeze(confirmedEntryScript());
    const beforeJson = JSON.stringify(before);
    const beforeHistory = before.history;
    const content = editableFromEntry();
    content.hook = `${content.hook} (frozen input test)`;
    const after = unwrap(saveScriptDraft(before, pkg, { baseVersionId: IDS.scriptEn, content, nowIso: NOW }));

    expect(JSON.stringify(before)).toBe(beforeJson);
    expect(before.history).toBe(beforeHistory);
    expect(after.history.slice(0, beforeHistory.length)).toEqual(beforeHistory);
    expect(after).not.toBe(before);
    expect(after.userVersions).not.toBe(before.userVersions);

    const recordsBefore = JSON.stringify(withSavedDraft());
    const saved = deepFreeze(withSavedDraft());
    const started = unwrap(
      simulateDelivery(saved, pkg, {
        draftId: saved.deliveryDraftId as string,
        confirmedVideoId: IDS.video,
        failureCase: null,
        nowIso: NOW,
        virtualTimeMs: 60000,
      }),
    );
    expect(JSON.stringify(saved)).toBe(recordsBefore);
    expect(started.deliveryRecords).toHaveLength(0);
    const delivered = unwrap(
      advanceDeliveryAttempt(started, pkg, {
        attemptId: started.pendingDeliveryAttempts[0].id,
        virtualTimeMs: 60000,
        nowIso: NOW,
      }),
    );
    expect(delivered.deliveryRecords).toHaveLength(1);
    expect(JSON.stringify(saved)).toBe(recordsBefore);
  });

  test('a derived script can be confirmed before the first preset confirmation and has no matching video', () => {
    const presented = analysisPresented();
    const edited = editableFromEntry();
    edited.hook = `${edited.hook} (edited before first confirmation)`;
    const draft = unwrap(saveScriptDraft(presented, pkg, { baseVersionId: IDS.scriptEn, content: edited, nowIso: NOW }));
    expect(draft.activeScriptVersionId).toMatch(/^usr\./);
    const confirmedResult = confirmScript(draft, pkg, { scriptVersionId: draft.activeScriptVersionId as string, nowIso: NOW });
    expect(confirmedResult.ok).toBe(true);
    if (!confirmedResult.ok) throw new Error('expected derived script confirmation');
    const confirmedDraft = confirmedResult.value;
    expect(confirmedDraft.workflow.analysis).toBe('completed');
    expect(confirmedDraft.workflow.video).toBe('stale');
    expect(confirmedDraft.activeVideoId).toBeNull();
    expect(confirmedResult.warnings?.join(' ')).toMatch(/暂无对应预置视频/);
  });

  test('non-entry presented scripts can be confirmed and correctly have no preset video', () => {
    const presented = analysisPresented();
    const selectedAr = unwrap(selectScript(presented, pkg, { scriptVersionId: IDS.scriptAr, nowIso: NOW }));
    expect(selectedAr.activeScriptVersionId).toBe(IDS.scriptAr);
    const confirmed = unwrap(confirmScript(selectedAr, pkg, { scriptVersionId: IDS.scriptAr, nowIso: NOW }));
    expect(confirmed.workflow.analysis).toBe('completed');
    expect(confirmed.workflow.video).toBe('stale');
    expect(confirmed.activeVideoId).toBeNull();
  });

  test('after completing video, selecting the preset script can replay the complete video event sequence', () => {
    const completed = videoCompleted();
    const oldVideoAttempt = completed.stageAttempts.find((attempt) => attempt.stage === 'video' && attempt.status === 'completed');
    expect(oldVideoAttempt).toBeDefined();

    const selected = unwrap(selectScript(completed, pkg, { scriptVersionId: IDS.scriptEn, nowIso: NOW }));
    expect(selected.workflow.analysis).toBe('awaiting_confirmation');
    expect(selected.workflow.video).toBe('stale');
    const reconfirmed = unwrap(confirmScript(selected, pkg, { scriptVersionId: IDS.scriptEn, nowIso: NOW }));
    expect(reconfirmed.workflow.video).toBe('ready');

    let rerun = unwrap(executeStage(reconfirmed, pkg, stageInput('video', 13000)));
    expect(rerun.stageAttempts.filter((attempt) => attempt.stage === 'video')).toHaveLength(2);
    expect(rerun.stageAttempts.find((attempt) => attempt.id === oldVideoAttempt!.id)).toEqual(oldVideoAttempt);
    for (const event of events.filter((item) => item.sequence >= 12 && item.sequence <= 17)) rerun = apply(rerun, event);
    expect(rerun.workflow.video).toBe('completed');
    expect(rerun.workflow.delivery).toBe('ready');
    expect(rerun.replay.cursorSequence).toBe(0);
  });

  test('queued alone cannot complete video in replay; canonical tampering is rejected', () => {
    const queuedReplay = unwrap(reduceReplay(pkg, events, 13));
    expect(queuedReplay.projection.videoAvailability[IDS.video]).toBe('queued');
    expect(
      videoOutputComplete(
        pkg,
        IDS.video,
        queuedReplay.projection.videoAvailability,
        { [IDS.video]: 100 },
        queuedReplay.projection.visibleEntityIds,
      ),
    ).toMatch(/available/i);

    const fakeCompletion = reduceReplayEvent(pkg, queuedReplay, {
      ...events[13],
      type: 'stage.completed',
      stage: 'video',
      sequence: 14,
      payload: { stage: 'video' },
    } as unknown as Event);
    expect(fakeCompletion.ok).toBe(false);
    if (!fakeCompletion.ok) expect(fakeCompletion.error.code).toBe('CORRUPT_EVENT');

    let workflow = unwrap(executeStage(initialState(), pkg, stageInput('discovery')));
    workflow = apply(workflow, events[0]);
    const tampered = applyWorkflowEvent(workflow, pkg, {
      ...events[1],
      payload: { signalId: 'scn-scent-layering.signal.tampered' },
    } as Event);
    expect(tampered.ok).toBe(false);
    if (!tampered.ok) expect(tampered.error.code).toBe('CORRUPT_EVENT');
  });

  test('editing source anchors and entity types is rejected', () => {
    const state = confirmedEntryScript();
    const changedShotId = editableFromEntry();
    changedShotId.shots[0] = { ...changedShotId.shots[0], id: 'scn-scent-layering.shot.changed' };
    const shotResult = saveScriptDraft(state, pkg, { baseVersionId: IDS.scriptEn, content: changedShotId, nowIso: NOW });
    expect(shotResult.ok).toBe(false);

    const changedSubtitleId = editableFromEntry();
    changedSubtitleId.subtitles[0] = { ...changedSubtitleId.subtitles[0], id: 'scn-scent-layering.subtitle.changed' };
    const subtitleResult = saveScriptDraft(state, pkg, { baseVersionId: IDS.scriptEn, content: changedSubtitleId, nowIso: NOW });
    expect(subtitleResult.ok).toBe(false);

    const productAsAsset = editableFromEntry();
    productAsAsset.shots[0] = { ...productAsAsset.shots[0], assetIds: [IDS.product] };
    const productResult = saveScriptDraft(state, pkg, { baseVersionId: IDS.scriptEn, content: productAsAsset, nowIso: NOW });
    expect(productResult.ok).toBe(false);
    if (!productResult.ok) {
      expect(productResult.error.code).toBe('INVALID_INPUT');
      expect(productResult.error.fieldErrors?.some((issue) => /expected asset/.test(issue.message))).toBe(true);
    }
  });

  test('delivery retry can explicitly re-run the package failure sample or take the default success path', () => {
    const state = withSavedDraft();
    const started = unwrap(
      simulateDelivery(state, pkg, {
        draftId: state.deliveryDraftId as string,
        confirmedVideoId: IDS.video,
        failureCase: 'delivery_failed',
        nowIso: NOW,
        virtualTimeMs: 60000,
      }),
    );
    const failed = unwrap(
      advanceDeliveryAttempt(started, pkg, {
        attemptId: started.pendingDeliveryAttempts[0].id,
        virtualTimeMs: 60000,
        nowIso: NOW,
      }),
    );
    const firstFailedStageAttempt = failed.stageAttempts.find(
      (attempt) => attempt.stage === 'delivery' && attempt.status === 'failed',
    )!;
    const retriedFailure = unwrap(
      retryStage(failed, pkg, {
        stage: 'delivery',
        failedAttemptId: firstFailedStageAttempt.id,
        nowIso: NOW,
        virtualMs: 61000,
        failureCase: 'delivery_failed',
      }),
    );
    expect(retriedFailure.pendingDeliveryAttempts.find((attempt) => attempt.status === 'running')?.failureCase).toBe('delivery_failed');
    const settledFailure = unwrap(
      advanceDeliveryAttempt(retriedFailure, pkg, {
        attemptId: retriedFailure.pendingDeliveryAttempts.find((attempt) => attempt.status === 'running')!.id,
        virtualTimeMs: 61000,
        nowIso: NOW,
      }),
    );
    expect(settledFailure.workflow.delivery).toBe('failed');
    expect(settledFailure.deliveryAttempts.map((attempt) => attempt.outcome)).toEqual(['failed', 'failed']);
    expect(settledFailure.deliveryRecords).toHaveLength(0);
  });

  test('advanceDeliveryAttempt rejects unknown attempts, invalid time and cannot settle another current attempt', () => {
    const started = unwrap(
      simulateDelivery(withSavedDraft(), pkg, {
        draftId: withSavedDraft().deliveryDraftId as string,
        confirmedVideoId: IDS.video,
        failureCase: null,
        nowIso: NOW,
        virtualTimeMs: 60000,
      }),
    );
    const unknown = advanceDeliveryAttempt(started, pkg, { attemptId: 'usr.test-session.attempt.delivery.999', virtualTimeMs: 60000, nowIso: NOW });
    expect(unknown.ok).toBe(false);
    const invalidTime = advanceDeliveryAttempt(started, pkg, {
      attemptId: started.pendingDeliveryAttempts[0].id,
      virtualTimeMs: Number.NaN,
      nowIso: NOW,
    });
    expect(invalidTime.ok).toBe(false);

    const beforeDue = unwrap(
      advanceDeliveryAttempt(started, pkg, {
        attemptId: started.pendingDeliveryAttempts[0].id,
        virtualTimeMs: 59999,
        nowIso: NOW,
      }),
    );
    expect(beforeDue.deliveryRecords).toHaveLength(0);
    const completed = unwrap(
      advanceDeliveryAttempt(beforeDue, pkg, {
        attemptId: beforeDue.pendingDeliveryAttempts[0].id,
        virtualTimeMs: 60000,
        nowIso: NOW,
      }),
    );
    expect(completed.deliveryRecords).toHaveLength(1);
    const oldSettled = unwrap(
      advanceDeliveryAttempt(completed, pkg, {
        attemptId: completed.pendingDeliveryAttempts[0].id,
        virtualTimeMs: 61000,
        nowIso: NOW,
      }),
    );
    expect(oldSettled.deliveryRecords).toHaveLength(1);
  });

  test('duplicate workflow events are idempotent only for the same sequence/id; other duplicates fail', () => {
    let state = unwrap(executeStage(initialState(), pkg, stageInput('discovery')));
    state = apply(state, events[0]);
    const duplicate = applyWorkflowEvent(state, pkg, events[0]);
    expect(duplicate.ok).toBe(true);
    if (duplicate.ok) expect(duplicate.value.workflowCursor).toBe(1);

    const conflicting = applyWorkflowEvent(state, pkg, { ...events[0], id: 'scn-scent-layering.event.conflict' } as Event);
    expect(conflicting.ok).toBe(false);
    if (!conflicting.ok) expect(conflicting.error.code).toBe('CORRUPT_EVENT');

    const mutatedSameId = applyWorkflowEvent(state, pkg, { ...events[0], atMs: 999 } as Event);
    expect(mutatedSameId.ok).toBe(false);
    if (!mutatedSameId.ok) expect(mutatedSameId.error.code).toBe('CORRUPT_EVENT');

    const gap = applyWorkflowEvent(state, pkg, events[2]);
    expect(gap.ok).toBe(false);
    if (!gap.ok) expect(gap.error.code).toBe('CORRUPT_EVENT');
  });

  test('workflow rejects replay-only preset decisions; replay allows them without touching workflow state', () => {
    const state = analysisPresented();
    const replayOnly = applyWorkflowEvent(state, pkg, events[9]);
    expect(replayOnly.ok).toBe(false);
    if (!replayOnly.ok) expect(replayOnly.error.code).toBe('REPLAY_ONLY_EVENT');

    const replay = createReplayState();
    const replayBeforeConfirmation = unwrap(reduceReplay(pkg, events, 9));
    const confirmed = reduceReplayEvent(pkg, replayBeforeConfirmation, events[9]);
    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) {
      expect(confirmed.value.projection.activeScriptVersionId).toBe(IDS.scriptEn);
      expect(confirmed.value.projection.confirmedScriptVersionId).toBe(IDS.scriptEn);
    }
    expect(state.replay.cursorSequence).toBe(0);
  });

  test('replay reducer folds to the final preset projection and validates duplicates/gaps/corruption', () => {
    const finalReplay = unwrap(reduceReplay(pkg, events, events.length));
    expect(finalReplay.cursorSequence).toBe(events.length);
    expect(finalReplay.projection.workflow).toEqual({
      discovery: 'completed',
      analysis: 'completed',
      video: 'completed',
      delivery: 'completed',
    });
    expect(finalReplay.projection.activeScriptVersionId).toBe(IDS.scriptEn);
    expect(finalReplay.projection.activeVideoId).toBe(IDS.video);
    expect(finalReplay.projection.deliveryRecordIds).toEqual([IDS.recordSuccess]);
    expect(finalReplay.projection.visibleEntityIds).toEqual(expect.arrayContaining([IDS.scriptEn, IDS.shots[0], IDS.video, IDS.recordSuccess]));
    expect(finalReplay.projection.visibleEntityIds).toEqual([...finalReplay.projection.visibleEntityIds].sort());

    const cursor0 = unwrap(reduceReplay(pkg, events, 0));
    expect(cursor0.projection.visibleEntityIds).toEqual([]);
    expect(cursor0.projection.workflow.discovery).toBe('ready');

    const duplicate = reduceReplayEvent(pkg, finalReplay, events[20]);
    expect(duplicate.ok).toBe(true);
    if (duplicate.ok) expect(duplicate.value.cursorSequence).toBe(events.length);

    const corrupt = reduceReplayEvent(pkg, finalReplay, { ...events[20], id: 'scn-scent-layering.event.corrupt' } as Event);
    expect(corrupt.ok).toBe(false);
    if (!corrupt.ok) expect(corrupt.error.code).toBe('CORRUPT_EVENT');

    const gapReplay = unwrap(reduceReplay(pkg, events, 4));
    const gap = reduceReplayEvent(pkg, gapReplay, events[6]);
    expect(gap.ok).toBe(false);
    if (!gap.ok) expect(gap.error.code).toBe('CORRUPT_EVENT');
  });

  test('replay projection matches POC-001 expected checkpoint fields at every published cursor', () => {
    const checkpoints = pkg.expected.data.checkpoints;
    for (const checkpoint of checkpoints) {
      const replay = unwrap(reduceReplay(pkg, events, checkpoint.cursorSequence));
      expect(replay.projection.workflow, `workflow@${checkpoint.cursorSequence}`).toEqual(checkpoint.workflow);
      expect(replay.projection.visibleEntityIds, `visible@${checkpoint.cursorSequence}`).toEqual(checkpoint.visibleEntityIds);
      expect(replay.projection.activeScriptVersionId, `script@${checkpoint.cursorSequence}`).toBe(checkpoint.activeScriptVersionId);
      expect(replay.projection.activeVideoId, `video@${checkpoint.cursorSequence}`).toBe(checkpoint.activeVideoId);
      expect(replay.projection.deliveryRecordIds, `records@${checkpoint.cursorSequence}`).toEqual(checkpoint.deliveryRecordIds);
    }
  });

  test('replay transport is independent from workflow state', () => {
    const replay = unwrap(reduceReplay(pkg, events, 4));
    const playing = unwrap(setReplayTransport(replay, 'playing'));
    expect(playing.transport).toBe('playing');
    expect(replay.transport).toBe('idle');
    expect(playing.projection).toEqual(replay.projection);

    const workflow = discoveryCompleted();
    const workflowBefore = JSON.stringify(workflow);
    unwrap(setReplayTransport(workflow.replay, 'playing'));
    expect(JSON.stringify(workflow)).toBe(workflowBefore);
  });

  test('resetSession requires explicit confirmation, clears derived data, and keeps a reset audit', () => {
    const state = withSavedDraft();
    const rejected = resetSession(state, pkg, { confirmation: 'RESET' as 'RESET_THIS_SESSION', nowIso: NOW });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error.code).toBe('CONFIRMATION_REQUIRED');

    const reset = unwrap(resetSession(state, pkg, { confirmation: 'RESET_THIS_SESSION', nowIso: NOW }));
    expect(reset.workflow).toEqual({ discovery: 'ready', analysis: 'locked', video: 'locked', delivery: 'locked' });
    expect(reset.userVersions).toEqual([]);
    expect(reset.deliveryDrafts).toEqual([]);
    expect(reset.stageAttempts).toEqual([]);
    expect(reset.deliveryAttempts).toEqual([]);
    expect(reset.deliveryRecords).toEqual([]);
    expect(reset.activeScriptVersionId).toBeNull();
    expect(reset.activeVideoId).toBeNull();
    expect(reset.deliveryDraftId).toBeNull();
    expect(reset.workflowCursor).toBe(0);
    expect(reset.history.at(-1)).toMatchObject({ action: 'resetSession', outcome: 'reset' });
    expect(reset.history.length).toBeGreaterThan(state.history.length);
  });

  test('editing a script after a saved delivery draft invalidates the old draft confirmation', () => {
    const state = withSavedDraft();
    const oldDraftId = state.deliveryDraftId as string;
    const edited = unwrap(
      saveScriptDraft(state, pkg, {
        baseVersionId: IDS.scriptEn,
        content: editableFromEntry(),
        nowIso: NOW,
      }),
    );
    expect(edited.workflow.analysis).toBe('awaiting_confirmation');
    expect(edited.workflow.video).toBe('stale');
    expect(edited.workflow.delivery).toBe('stale');
    expect(edited.activeVideoId).toBeNull();
    expect(edited.deliveryDraftId).toBeNull();

    const oldDraftSimulation = simulateDelivery(edited, pkg, {
      draftId: oldDraftId,
      confirmedVideoId: IDS.video,
      failureCase: null,
      nowIso: NOW,
      virtualTimeMs: 61000,
    });
    expect(oldDraftSimulation.ok).toBe(false);
    if (!oldDraftSimulation.ok) expect(oldDraftSimulation.error.code).toBe('INVALID_TRANSITION');
  });
});

