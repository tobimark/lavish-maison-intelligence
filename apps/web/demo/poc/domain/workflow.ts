import { collectEntityIndex, INVALID_EMAIL_PATTERN } from '../validation/semantic-rules.mjs';
import type {
  AdvanceDeliveryAttemptInput,
  ConfirmScriptInput,
  CreateStateOptions,
  DeliveryAttempt,
  DeliveryDraft,
  DeliveryOutcome,
  DeliveryRecipientSnapshot,
  DomainResult,
  DomainState,
  Event,
  ExecuteStageInput,
  FailStageInput,
  PendingDeliveryAttempt,
  ReplayState,
  ResetSessionInput,
  RetryStageInput,
  SaveDeliveryDraftInput,
  SaveScriptDraftInput,
  ScriptEditable,
  SelectScriptInput,
  SimulatedDeliveryRecord,
  SimulateDeliveryInput,
  StageAttempt,
  StageName,
  UserScriptVersion,
  WorkflowState,
  ScenarioPackage,
} from './types';
import {
  STAGES,
  anyStageRunning,
  appendHistory,
  cloneContent,
  expandScriptVisible,
  fail,
  findPackageScript,
  findPlan,
  findScript,
  findUserVersion,
  findVideo,
  findVideoForScript,
  initialWorkflow,
  ok,
  scriptEditable,
  sortUnique,
  validateEditableScript,
} from './core';
import {
  canonicalEventIssue,
  discoveryOutputsComplete,
  packageStageRange,
  stageStartIssue,
  videoBoundToScript,
  videoOutputComplete,
} from './guards';
import { createReplayState } from './replay';

function nextState(state: DomainState, patch: Partial<DomainState>): DomainState {
  return { ...state, ...patch, revision: state.revision + 1 };
}

function withWorkflow(state: DomainState, patch: Partial<WorkflowState>): WorkflowState {
  return { ...state.workflow, ...patch };
}

function resetVideoAvailability(
  availability: Readonly<Record<string, 'queued' | 'available'>>,
  videoId: string,
): Record<string, 'queued' | 'available'> {
  const next = { ...availability };
  delete next[videoId];
  return next;
}

function runningAttempt(state: DomainState, stage: StageName): StageAttempt | null {
  return state.stageAttempts.find((attempt) => attempt.stage === stage && attempt.status === 'running') ?? null;
}

function stageOrdinal(state: DomainState, stage: StageName): number {
  return state.stageAttempts.filter((attempt) => attempt.stage === stage).length + 1;
}

function startAttempt(
  state: DomainState,
  pkg: ScenarioPackage,
  stage: StageName,
  nowIso: string,
  inputRefs: string[],
): { attempt: StageAttempt; attempts: StageAttempt[] } {
  const range = packageStageRange(pkg, stage);
  const attempt: StageAttempt = {
    id: `usr.${state.sessionId}.attempt.${stage}.${stageOrdinal(state, stage)}`,
    stage,
    ordinal: stageOrdinal(state, stage),
    inputRefs: sortUnique(inputRefs),
    status: 'running',
    lastSequence: range.start - 1,
    sourceStartSequence: range.start,
    sourceEndSequence: range.end,
    lastEventJson: null,
    lastAtMs: 0,
    startedAt: nowIso,
    finishedAt: null,
    errorCode: null,
  };
  return { attempt, attempts: [...state.stageAttempts, attempt] };
}

function finishAttempt(
  attempts: StageAttempt[],
  stage: StageName,
  nowIso: string,
  status: 'completed' | 'failed' | 'canceled',
  errorCode: string | null = null,
): StageAttempt[] {
  let changed = false;
  const next = attempts.map((attempt) => {
    if (!changed && attempt.stage === stage && attempt.status === 'running') {
      changed = true;
      return { ...attempt, status, finishedAt: nowIso, errorCode };
    }
    return attempt;
  });
  return next;
}

function attemptHistoryIds(attempt: StageAttempt): string[] {
  return [attempt.id];
}

function touchAttempt(attempts: StageAttempt[], stage: StageName, event: Event): StageAttempt[] {
  return attempts.map((attempt) =>
    attempt.stage === stage && attempt.status === 'running'
      ? {
          ...attempt,
          lastSequence: event.sequence,
          lastEventJson: JSON.stringify(event),
          lastAtMs: event.atMs,
        }
      : attempt,
  );
}

function ensureNotRunning(state: DomainState): DomainResult<null> {
  if (anyStageRunning(state.workflow)) {
    const running = STAGES.filter((stage) => state.workflow[stage] === 'running');
    return fail('INVALID_TRANSITION', `Cannot change inputs while stage(s) are running: ${running.join(', ')}.`);
  }
  return ok(null);
}

function resolveScript(
  state: DomainState,
  pkg: ScenarioPackage,
  scriptVersionId: string,
): { id: string; briefId: string; language: 'en' | 'ar'; content: ScriptEditable; kind: 'package' | 'user'; sourceScriptVersionId: string } | null {
  const found = findScript(state, pkg, scriptVersionId);
  if (!found) return null;
  const content = scriptEditable(found.version);
  return {
    id: found.version.id,
    briefId: found.version.briefId,
    language: found.version.language,
    content,
    kind: found.kind,
    sourceScriptVersionId:
      'sourceScriptVersionId' in found.version ? found.version.sourceScriptVersionId : found.version.id,
  };
}

function checkPackageVideoAssets(pkg: ScenarioPackage, videoId: string): DomainResult<null> {
  const video = findVideo(pkg, videoId);
  if (!video) return fail('NOT_FOUND', `Unknown video ${videoId}.`);
  const index = collectEntityIndex(pkg);
  for (const assetId of [video.mp4AssetId, video.posterAssetId, ...video.subtitleAssetIds]) {
    if (!index.byId.has(assetId)) {
      return fail('INVALID_INPUT', `Video ${video.id} references unknown asset ${assetId}.`);
    }
  }
  return ok(null);
}

function startStage(
  state: DomainState,
  pkg: ScenarioPackage,
  input: ExecuteStageInput,
): DomainResult<DomainState> {
  const stage = input.stage;
  if (!['discovery', 'analysis', 'video'].includes(stage)) {
    return fail('INVALID_TRANSITION', `executeStage is not valid for ${String(stage)}.`);
  }
  if (state.workflow[stage] !== 'ready') {
    return fail('INVALID_TRANSITION', `Stage ${stage} must be ready; found ${state.workflow[stage]}.`);
  }
  const sharedStageIssue = stageStartIssue(pkg, state.workflow, stage, 'workflow');
  if (sharedStageIssue) return fail('INVALID_TRANSITION', sharedStageIssue);
  if (stage === 'analysis' && state.workflow.discovery !== 'completed') {
    return fail('INVALID_TRANSITION', 'Analysis requires discovery completed.');
  }
  if (stage === 'video') {
    if (state.workflow.analysis !== 'completed') {
      return fail('INVALID_TRANSITION', 'Video requires analysis completed and script confirmed.');
    }
    if (!state.activeScriptVersionId || !state.activeVideoId) {
      return fail('INVALID_TRANSITION', 'Video requires an active confirmed script and matching preset video.');
    }
    const video = findVideo(pkg, state.activeVideoId);
    if (!video) return fail('NOT_FOUND', `Unknown video ${state.activeVideoId}.`);
    if (!videoBoundToScript(pkg, video.id, state.activeScriptVersionId)) {
      return fail('VIDEO_VERSION_MISMATCH', 'The preset video is not bound to the active script version.');
    }
    const assets = checkPackageVideoAssets(pkg, video.id);
    if (!assets.ok) return assets;
    const { attempt, attempts } = startAttempt(state, pkg, stage, input.nowIso, [
      state.activeScriptVersionId,
      video.id,
      video.mp4AssetId,
      video.posterAssetId,
      ...video.subtitleAssetIds,
    ]);
    const next = nextState(state, {
      workflow: withWorkflow(state, { video: 'running' }),
      stageAttempts: attempts,
      // A fresh video attempt must earn available/progress again; old results
      // from a previous attempt cannot let it skip video.available.
      videoAvailability: resetVideoAvailability(state.videoAvailability, video.id),
      videoProgress: { ...state.videoProgress, [video.id]: 0 },
      history: appendHistory(state, 'executeStage:video', [state.activeScriptVersionId, video.id], input.nowIso, 'applied'),
      lastWorkflowAtMs: Math.max(state.lastWorkflowAtMs, input.virtualMs),
    });
    return ok(next, [`attemptId=${attempt.id}`]);
  }

  if (stage === 'analysis') {
    const { attempt, attempts } = startAttempt(state, pkg, stage, input.nowIso, []);
    const next = nextState(state, {
      workflow: withWorkflow(state, { analysis: 'running' }),
      stageAttempts: attempts,
      history: appendHistory(state, 'executeStage:analysis', [attempt.id], input.nowIso, 'applied'),
      lastWorkflowAtMs: Math.max(state.lastWorkflowAtMs, input.virtualMs),
    });
    return ok(next);
  }

  const { attempt, attempts } = startAttempt(state, pkg, stage, input.nowIso, []);
  const next = nextState(state, {
    workflow: withWorkflow(state, { discovery: 'running' }),
    stageAttempts: attempts,
    history: appendHistory(state, 'executeStage:discovery', [attempt.id], input.nowIso, 'applied'),
    lastWorkflowAtMs: Math.max(state.lastWorkflowAtMs, input.virtualMs),
  });
  return ok(next);
}

export function createInitialState(pkg: ScenarioPackage, options: CreateStateOptions): DomainState {
  return {
    sessionId: options.sessionId,
    scenarioId: pkg.manifest.scenarioId,
    scenarioVersion: pkg.manifest.scenarioVersion,
    packageHash: options.packageHash,
    revision: 0,
    createdAt: options.createdAt,
    workflow: initialWorkflow(),
    activeBriefId: null,
    activeScriptVersionId: null,
    activeVideoId: null,
    deliveryDraftId: null,
    userVersions: [],
    deliveryDrafts: [],
    stageAttempts: [],
    deliveryAttempts: [],
    pendingDeliveryAttempts: [],
    deliveryRecords: [],
    workflowCursor: 0,
    workflowVisibleEntityIds: [],
    lastWorkflowEventId: null,
    lastWorkflowEventJson: null,
    lastWorkflowAtMs: 0,
    videoAvailability: {},
    videoProgress: {},
    history: [],
    replay: createReplayState() as ReplayState,
  };
}

export function executeStage(
  state: DomainState,
  pkg: ScenarioPackage,
  input: ExecuteStageInput,
): DomainResult<DomainState> {
  return startStage(state, pkg, input);
}

export function applyWorkflowEvent(
  state: DomainState,
  pkg: ScenarioPackage,
  event: Event,
): DomainResult<DomainState> {
  const replayOnly = new Set(['script.confirmed', 'delivery.queued', 'delivery.simulated']);
  if (replayOnly.has(event.type)) {
    return fail('REPLAY_ONLY_EVENT', `${event.type} is preset replay data and cannot drive user workflow.`);
  }
  if (event.stage === 'delivery') {
    return fail('REPLAY_ONLY_EVENT', 'Delivery workflow is driven by saveDeliveryDraft/simulateDelivery, not preset events.');
  }
  if (event.scenarioId !== pkg.manifest.scenarioId || event.scenarioVersion !== pkg.manifest.scenarioVersion) {
    return fail('CORRUPT_EVENT', 'Workflow event scenario id/version does not match the loaded package.');
  }
  if (event.mode !== 'mock') return fail('CORRUPT_EVENT', 'Only mock events are accepted.');

  const canonicalIssue = canonicalEventIssue(pkg, event);
  if (canonicalIssue) return fail('CORRUPT_EVENT', canonicalIssue);

  const stage = event.stage;
  const isStartEvent = event.type === 'stage.started' && state.workflow[stage] === 'ready';
  let runningAttempt = state.stageAttempts.find((attempt) => attempt.stage === stage && attempt.status === 'running') ?? null;
  if (!runningAttempt && !isStartEvent) {
    if (state.lastWorkflowEventId === event.id && state.lastWorkflowEventJson === JSON.stringify(event)) {
      return ok(state);
    }
    return fail('INVALID_TRANSITION', `No running ${stage} attempt accepts event ${event.id}.`);
  }
  if (runningAttempt) {
    if (event.sequence === runningAttempt.lastSequence) {
      if (runningAttempt.lastEventJson === JSON.stringify(event)) return ok(state);
      return fail('CORRUPT_EVENT', `Event at attempt sequence ${event.sequence} has changed content.`);
    }
    if (event.sequence !== runningAttempt.lastSequence + 1) {
      return fail(
        'CORRUPT_EVENT',
        `Attempt ${runningAttempt.id} expects sequence ${runningAttempt.lastSequence + 1}, found ${event.sequence}.`,
      );
    }
    if (event.sequence < runningAttempt.sourceStartSequence || event.sequence > runningAttempt.sourceEndSequence) {
      return fail('INVALID_TRANSITION', `Event sequence ${event.sequence} is outside the ${stage} attempt source range.`);
    }
    if (event.atMs < runningAttempt.lastAtMs) {
      return fail('CORRUPT_EVENT', `Attempt ${runningAttempt.id} event atMs must be non-decreasing.`);
    }
  }

  const payload = (event as Event & { payload: Record<string, unknown> }).payload ?? {};
  const id = (key: string): string | null => (typeof payload[key] === 'string' ? (payload[key] as string) : null);
  let workflow = state.workflow;
  let attempts = state.stageAttempts;
  let visible = state.workflowVisibleEntityIds;
  let activeBriefId = state.activeBriefId;
  let activeScriptVersionId = state.activeScriptVersionId;
  let activeVideoId = state.activeVideoId;
  let videoAvailability = state.videoAvailability;
  let videoProgress = state.videoProgress;
  let action: { name: string; ids: string[] } | null = null;

  if (event.type === 'stage.started') {
    if (workflow[stage] === 'running') {
      action = { name: `event:${event.type}`, ids: [event.id] };
    } else if (workflow[stage] === 'ready') {
      const started = startStage({ ...state, workflowVisibleEntityIds: visible }, pkg, {
        stage: stage as ExecuteStageInput['stage'],
        nowIso: state.createdAt,
        virtualMs: event.atMs,
      });
      if (!started.ok) return started;
      attempts = started.value.stageAttempts;
      workflow = withWorkflow(state, { [stage]: 'running' });
      action = { name: `event:${event.type}`, ids: [event.id] };
    } else {
      return fail('INVALID_TRANSITION', `Stage ${stage} cannot start from ${workflow[stage]}.`);
    }
  } else if (event.type === 'signal.discovered') {
    if (workflow.discovery !== 'running') return fail('INVALID_TRANSITION', 'signal.discovered requires discovery running.');
    const signalId = id('signalId');
    const signal = pkg.discovery.data.signals.find((item) => item.id === signalId);
    if (!signal) return fail('NOT_FOUND', `Unknown signal ${String(signalId)}.`);
    visible = sortUnique([...visible, signal.id]);
    action = { name: `event:${event.type}`, ids: [signal.id] };
  } else if (event.type === 'trend.summarized') {
    if (workflow.discovery !== 'running') return fail('INVALID_TRANSITION', 'trend.summarized requires discovery running.');
    const trendId = id('trendId');
    const trend = pkg.discovery.data.trends.find((item) => item.id === trendId);
    if (!trend) return fail('NOT_FOUND', `Unknown trend ${String(trendId)}.`);
    const missingSignals = trend.signalIds.filter((signalId) => !visible.includes(signalId));
    if (missingSignals.length) {
      return fail('INVALID_TRANSITION', `Trend dependencies are not visible yet: ${missingSignals.join(', ')}.`);
    }
    visible = sortUnique([...visible, trend.id]);
    action = { name: `event:${event.type}`, ids: [trend.id] };
  } else if (event.type === 'analysis.presented') {
    if (workflow.analysis !== 'running') return fail('INVALID_TRANSITION', 'analysis.presented requires analysis running.');
    const analysisId = id('analysisId');
    const analysis = pkg.analysis.data.analyses.find((item) => item.id === analysisId);
    if (!analysis) return fail('NOT_FOUND', `Unknown analysis ${String(analysisId)}.`);
    visible = sortUnique([...visible, analysis.id]);
    action = { name: `event:${event.type}`, ids: [analysis.id] };
  } else if (event.type === 'brief.presented') {
    if (workflow.analysis !== 'running') return fail('INVALID_TRANSITION', 'brief.presented requires analysis running.');
    const briefId = id('briefId');
    const brief = pkg.analysis.data.briefs?.find((item) => item.id === briefId);
    if (!brief) return fail('NOT_FOUND', `Unknown brief ${String(briefId)}.`);
    activeBriefId = brief.id;
    visible = sortUnique([...visible, brief.id]);
    action = { name: `event:${event.type}`, ids: [brief.id] };
  } else if (event.type === 'script.presented') {
    if (!['running', 'awaiting_confirmation'].includes(workflow.analysis)) {
      return fail('INVALID_TRANSITION', 'script.presented requires analysis running/awaiting_confirmation.');
    }
    const scriptId = id('scriptVersionId');
    const script = scriptId ? findPackageScript(pkg, scriptId) : null;
    if (!script) return fail('NOT_FOUND', `Unknown script version ${String(scriptId)}.`);
    if (!activeScriptVersionId || script.id === pkg.manifest.entryScriptVersionId) {
      activeScriptVersionId = script.id;
    }
    workflow = { ...workflow, analysis: 'awaiting_confirmation' };
    visible = sortUnique([...visible, ...expandScriptVisible(script)]);
    action = { name: `event:${event.type}`, ids: [script.id] };
  } else if (event.type === 'stage.completed') {
    if (stage === 'discovery') {
      if (workflow.discovery !== 'running') return fail('INVALID_TRANSITION', 'discovery completion requires running.');
      const missingDiscoveryOutputs = discoveryOutputsComplete(pkg, visible);
      if (missingDiscoveryOutputs.length) {
        return fail('INVALID_TRANSITION', `Discovery cannot complete with hidden outputs: ${missingDiscoveryOutputs.join(', ')}.`);
      }
      attempts = touchAttempt(attempts, 'discovery', event);
      workflow = { ...workflow, discovery: 'completed', analysis: 'ready' };
      attempts = finishAttempt(attempts, 'discovery', state.createdAt, 'completed');
    } else if (stage === 'analysis') {
      return fail('CONFIRMATION_REQUIRED', 'Analysis must be completed by confirmScript, not by a preset stage.completed event.');
    } else if (stage === 'video') {
      if (workflow.video !== 'running') return fail('INVALID_TRANSITION', 'video completion requires running.');
      const videoIssue = videoOutputComplete(pkg, activeVideoId, videoAvailability, videoProgress, visible);
      if (videoIssue) return fail('INVALID_TRANSITION', videoIssue);
      attempts = touchAttempt(attempts, 'video', event);
      workflow = { ...workflow, video: 'completed', delivery: 'ready' };
      attempts = finishAttempt(attempts, 'video', state.createdAt, 'completed');
    } else {
      return fail('INVALID_TRANSITION', `Unsupported workflow stage.completed stage ${stage}.`);
    }
    action = { name: `event:${event.type}:${stage}`, ids: [event.id] };
  } else if (event.type === 'video.queued') {
    if (workflow.video !== 'running') return fail('INVALID_TRANSITION', 'video.queued requires video running.');
    const videoId = id('videoId');
    if (!videoId || !findVideo(pkg, videoId)) return fail('NOT_FOUND', `Unknown video ${String(videoId)}.`);
    if (videoId !== activeVideoId) return fail('VIDEO_VERSION_MISMATCH', 'video.queued must reference the active script-bound video.');
    videoAvailability = { ...videoAvailability, [videoId]: 'queued' };
    videoProgress = { ...videoProgress, [videoId]: 0 };
    action = { name: `event:${event.type}`, ids: [videoId] };
  } else if (event.type === 'video.progressed') {
    if (workflow.video !== 'running') return fail('INVALID_TRANSITION', 'video.progressed requires video running.');
    const videoId = id('videoId');
    if (!videoId || !findVideo(pkg, videoId)) return fail('NOT_FOUND', `Unknown video ${String(videoId)}.`);
    if (videoId !== activeVideoId) return fail('VIDEO_VERSION_MISMATCH', 'video.progressed must reference the active script-bound video.');
    const progress = Number(payload.progress);
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
      return fail('CORRUPT_EVENT', 'video.progressed progress must be an integer 0..100.');
    }
    if (progress < (videoProgress[videoId] ?? 0)) {
      return fail('CORRUPT_EVENT', 'video.progressed must be non-decreasing.');
    }
    videoProgress = { ...videoProgress, [videoId]: progress };
    action = { name: `event:${event.type}`, ids: [videoId] };
  } else if (event.type === 'video.available') {
    if (workflow.video !== 'running') return fail('INVALID_TRANSITION', 'video.available requires video running.');
    const videoId = id('videoId');
    if (!videoId || !findVideo(pkg, videoId)) return fail('NOT_FOUND', `Unknown video ${String(videoId)}.`);
    if (videoId !== activeVideoId) return fail('VIDEO_VERSION_MISMATCH', 'video.available must reference the active script-bound video.');
    if ((videoProgress[videoId] ?? 0) !== 100) {
      return fail('INVALID_TRANSITION', 'video.available requires 100% progress on the same attempt.');
    }
    videoAvailability = { ...videoAvailability, [videoId]: 'available' };
    visible = sortUnique([...visible, videoId]);
    action = { name: `event:${event.type}`, ids: [videoId] };
  } else if (event.type === 'stage.failed') {
    if (workflow[stage] !== 'running') return fail('INVALID_TRANSITION', `Stage ${stage} can only fail from running.`);
    const errorCode = typeof payload.code === 'string' ? payload.code : 'STAGE_FAILED';
    attempts = touchAttempt(attempts, stage, event);
    workflow = { ...workflow, [stage]: 'failed' };
    attempts = finishAttempt(attempts, stage, state.createdAt, 'failed', errorCode);
    action = { name: `event:${event.type}:${stage}`, ids: [event.id] };
  } else {
    return fail('CORRUPT_EVENT', `Unsupported workflow event type ${String(event.type)}.`);
  }

  attempts = touchAttempt(attempts, stage, event);
  return ok(
    nextState(state, {
      workflow,
      stageAttempts: attempts,
      workflowVisibleEntityIds: visible,
      activeBriefId,
      activeScriptVersionId,
      activeVideoId,
      videoAvailability,
      videoProgress,
      workflowCursor: Math.max(state.workflowCursor, event.sequence),
      lastWorkflowEventId: event.id,
      lastWorkflowEventJson: JSON.stringify(event),
      lastWorkflowAtMs: Math.max(state.lastWorkflowAtMs, event.atMs),
      history: action
        ? appendHistory(state, action.name, action.ids, state.createdAt, 'applied')
        : state.history,
    }),
  );
}

export function saveScriptDraft(
  state: DomainState,
  pkg: ScenarioPackage,
  input: SaveScriptDraftInput,
): DomainResult<DomainState> {
  const notRunning = ensureNotRunning(state);
  if (!notRunning.ok) return notRunning;
  if (!['awaiting_confirmation', 'completed', 'stale'].includes(state.workflow.analysis)) {
    return fail('INVALID_TRANSITION', `Script drafts require analysis awaiting_confirmation/completed/stale; found ${state.workflow.analysis}.`);
  }
  const base = resolveScript(state, pkg, input.baseVersionId);
  if (!base) return fail('NOT_FOUND', `Unknown base script version ${input.baseVersionId}.`);
  const index = collectEntityIndex(pkg);
  const userVersionNumber = state.userVersions.length + 1;
  const candidateId = `usr.${state.sessionId}.script.${userVersionNumber}`;
  const sourceVersion = findPackageScript(pkg, base.sourceScriptVersionId);
  if (!sourceVersion) return fail('NOT_FOUND', `Source script version ${base.sourceScriptVersionId} is missing.`);
  const validated = validateEditableScript(
    pkg,
    index,
    input.content,
    {
      id: candidateId,
      briefId: base.briefId,
      language: base.language,
      version: userVersionNumber,
    },
    scriptEditable(sourceVersion),
  );
  if (!validated.ok) return validated;

  const userVersion: UserScriptVersion = {
    id: candidateId,
    briefId: base.briefId,
    language: base.language,
    sourceScriptVersionId: base.sourceScriptVersionId,
    parentVersionId: base.id,
    revision: userVersionNumber,
    content: cloneContent(input.content),
    createdAt: input.nowIso,
  };
  const next = nextState(state, {
    workflow: {
      ...state.workflow,
      analysis: 'awaiting_confirmation',
      video: 'stale',
      delivery: 'stale',
    },
    userVersions: [...state.userVersions, userVersion],
    activeBriefId: base.briefId,
    activeScriptVersionId: userVersion.id,
    activeVideoId: null,
    deliveryDraftId: null,
    history: appendHistory(state, 'saveScriptDraft', [base.id, userVersion.id], input.nowIso, 'applied'),
  });
  return ok(next, ['此稿暂无对应预置视频；请选择预置脚本版本继续或重新确认后重走视频演示。']);
}

export function selectScript(
  state: DomainState,
  pkg: ScenarioPackage,
  input: SelectScriptInput,
): DomainResult<DomainState> {
  const notRunning = ensureNotRunning(state);
  if (!notRunning.ok) return notRunning;
  if (!['awaiting_confirmation', 'completed', 'stale'].includes(state.workflow.analysis)) {
    return fail('INVALID_TRANSITION', `selectScript is not valid while analysis is ${state.workflow.analysis}.`);
  }
  const found = resolveScript(state, pkg, input.scriptVersionId);
  if (!found) return fail('NOT_FOUND', `Unknown script version ${input.scriptVersionId}.`);
  const next = nextState(state, {
    workflow: { ...state.workflow, analysis: 'awaiting_confirmation', video: 'stale', delivery: 'stale' },
    activeBriefId: found.briefId,
    activeScriptVersionId: found.id,
    activeVideoId: null,
    deliveryDraftId: null,
    history: appendHistory(state, 'selectScript', [found.id], input.nowIso, 'applied'),
  });
  return ok(next);
}

export function confirmScript(
  state: DomainState,
  pkg: ScenarioPackage,
  input: ConfirmScriptInput,
): DomainResult<DomainState> {
  if (!['awaiting_confirmation', 'stale'].includes(state.workflow.analysis)) {
    return fail('INVALID_TRANSITION', `confirmScript requires analysis awaiting_confirmation/stale; found ${state.workflow.analysis}.`);
  }
  if (!state.activeScriptVersionId || state.activeScriptVersionId !== input.scriptVersionId) {
    return fail('INVALID_INPUT', 'confirmScript must confirm the currently presented script version.');
  }
  const found = resolveScript(state, pkg, input.scriptVersionId);
  if (!found) return fail('NOT_FOUND', `Unknown script version ${input.scriptVersionId}.`);
  if (found.kind === 'user') {
    const sourceVersion = findPackageScript(pkg, found.sourceScriptVersionId);
    const validated = validateEditableScript(
      pkg,
      collectEntityIndex(pkg),
      found.content,
      {
        id: found.id,
        briefId: found.briefId,
        language: found.language,
        version: state.userVersions.length,
      },
      sourceVersion ? scriptEditable(sourceVersion) : undefined,
    );
    if (!validated.ok) return validated;
  }

  const matchingVideo = findVideoForScript(pkg, found.id);
  const warnings = matchingVideo
    ? []
    : ['此稿暂无对应预置视频；video阶段为stale，需选择预置脚本版本继续。'];

  // User confirmation is independent from package replay decisions. A derived
  // or non-entry presented script may be confirmed; the package's fixed
  // script.confirmed event is never used to veto the user's selection.
  const next = nextState(state, {
    workflow: {
      ...state.workflow,
      analysis: 'completed',
      video: matchingVideo ? 'ready' : 'stale',
      delivery: 'locked',
    },
    activeBriefId: found.briefId,
    activeScriptVersionId: found.id,
    activeVideoId: matchingVideo?.id ?? null,
    deliveryDraftId: null,
    stageAttempts: finishAttempt(state.stageAttempts, 'analysis', input.nowIso, 'completed'),
    history: appendHistory(state, 'confirmScript', [found.id, ...(matchingVideo ? [matchingVideo.id] : [])], input.nowIso, 'applied'),
  });
  return ok(next, warnings);
}

export function saveDeliveryDraft(
  state: DomainState,
  pkg: ScenarioPackage,
  input: SaveDeliveryDraftInput,
): DomainResult<DomainState> {
  const notRunning = ensureNotRunning(state);
  if (!notRunning.ok) return notRunning;
  if (!['ready', 'awaiting_confirmation', 'failed'].includes(state.workflow.delivery)) {
    return fail('INVALID_TRANSITION', `saveDeliveryDraft requires delivery ready/awaiting_confirmation/failed; found ${state.workflow.delivery}.`);
  }
  if (state.workflow.video !== 'completed' || !state.activeVideoId || !state.activeScriptVersionId) {
    return fail('INVALID_TRANSITION', 'Delivery draft requires a completed video bound to the active script.');
  }
  const plan = findPlan(pkg, input.planId);
  if (!plan) return fail('NOT_FOUND', `Unknown delivery plan ${input.planId}.`);
  const video = findVideo(pkg, state.activeVideoId);
  if (!video) return fail('NOT_FOUND', `Unknown active video ${state.activeVideoId}.`);
  if (plan.videoId !== video.id) return fail('VIDEO_VERSION_MISMATCH', 'Delivery plan video does not match the active video.');
  if (plan.scriptVersionId !== state.activeScriptVersionId) {
    return fail('VIDEO_VERSION_MISMATCH', 'Delivery plan script does not match the active script version.');
  }
  if (!input.subject.trim() || !input.body.trim()) {
    return fail('INVALID_INPUT', 'Delivery subject and body are required.', [
      ...(input.subject.trim() ? [] : [{ path: '/subject', message: 'subject is required' }]),
      ...(input.body.trim() ? [] : [{ path: '/body', message: 'body is required' }]),
    ]);
  }
  if (!Number.isInteger(input.scheduledVirtualMs) || input.scheduledVirtualMs < 0) {
    return fail('INVALID_INPUT', 'scheduledVirtualMs must be a non-negative integer.');
  }

  const index = collectEntityIndex(pkg);
  const recipientIds = input.recipientIds ?? [...plan.recipientIds];
  if (!recipientIds.length) return fail('INVALID_INPUT', 'At least one recipient is required.');
  const recipientSnapshot: DeliveryRecipientSnapshot[] = [];
  for (const recipientId of recipientIds) {
    const override = input.recipientsOverride?.find((recipient) => recipient.id === recipientId);
    const packageRecipient = index.byId.get(recipientId);
    if (!override && (!packageRecipient || packageRecipient.kind !== 'recipient')) {
      return fail('NOT_FOUND', `Unknown recipient ${recipientId}.`);
    }
    const value = override ?? (packageRecipient?.value as { displayName?: string; email?: string });
    const displayName = String(value?.displayName ?? '');
    const email = String(value?.email ?? '');
    if (!INVALID_EMAIL_PATTERN.test(email)) {
      return fail('INVALID_INPUT', `Recipient ${recipientId} must use a .invalid demo address.`);
    }
    recipientSnapshot.push({ id: recipientId, displayName, email });
  }

  const attachmentAssetIds = [...plan.attachmentAssetIds];
  if (!attachmentAssetIds.includes(video.mp4AssetId)) {
    return fail('DELIVERY_ATTACHMENT_MISMATCH', 'Delivery attachments must include the active video MP4.');
  }
  for (const assetId of attachmentAssetIds) {
    if (!index.byId.has(assetId)) return fail('NOT_FOUND', `Unknown attachment asset ${assetId}.`);
  }

  const draftRevision = state.deliveryDrafts.filter((draft) => draft.planId === plan.id).length + 1;
  const draft: DeliveryDraft = {
    id: `usr.${state.sessionId}.draft.${state.deliveryDrafts.length + 1}`,
    planId: plan.id,
    revision: draftRevision,
    scriptVersionId: state.activeScriptVersionId,
    videoId: video.id,
    recipientSnapshot,
    subject: input.subject,
    body: input.body,
    attachmentAssetIds,
    scheduledVirtualMs: input.scheduledVirtualMs,
    confirmedRevision: null,
  };
  const next = nextState(state, {
    workflow: { ...state.workflow, delivery: 'awaiting_confirmation' },
    deliveryDraftId: draft.id,
    deliveryDrafts: [...state.deliveryDrafts, draft],
    history: appendHistory(state, 'saveDeliveryDraft', [plan.id, draft.id, ...attachmentAssetIds], input.nowIso, 'applied'),
  });
  return ok(next);
}

export function simulateDelivery(
  state: DomainState,
  pkg: ScenarioPackage,
  input: SimulateDeliveryInput,
): DomainResult<DomainState> {
  if (state.workflow.delivery !== 'awaiting_confirmation') {
    return fail('INVALID_TRANSITION', `simulateDelivery requires delivery awaiting_confirmation; found ${state.workflow.delivery}.`);
  }
  if (!Number.isInteger(input.virtualTimeMs) || input.virtualTimeMs < 0) {
    return fail('INVALID_INPUT', 'virtualTimeMs must be a finite non-negative integer.');
  }
  const draft = state.deliveryDrafts.find((item) => item.id === input.draftId);
  if (!draft) return fail('NOT_FOUND', `Unknown delivery draft ${input.draftId}.`);
  if (state.deliveryDraftId !== draft.id) {
    return fail('INVALID_INPUT', 'Only the active delivery draft can be simulated.');
  }
  if (!state.activeVideoId || draft.videoId !== state.activeVideoId || input.confirmedVideoId !== draft.videoId) {
    return fail('VIDEO_VERSION_MISMATCH', 'Delivery confirmation must reference the exact active video.');
  }
  if (draft.scriptVersionId !== state.activeScriptVersionId) {
    return fail('VIDEO_VERSION_MISMATCH', 'Delivery draft script does not match the active script version.');
  }
  const video = findVideo(pkg, draft.videoId);
  if (!video) return fail('NOT_FOUND', `Unknown video ${draft.videoId}.`);
  if (!draft.attachmentAssetIds.includes(video.mp4AssetId)) {
    return fail('DELIVERY_ATTACHMENT_MISMATCH', 'Delivery draft attachments do not include the active MP4.');
  }
  if (!draft.recipientSnapshot.length || draft.recipientSnapshot.some((recipient) => !INVALID_EMAIL_PATTERN.test(recipient.email))) {
    return fail('INVALID_INPUT', 'All simulated recipients must have valid .invalid addresses.');
  }
  if (input.failureCase === 'delivery_failed') {
    const failureSample = pkg.delivery.data.records.find(
      (record) => record.outcome === 'failed' && record.planId === draft.planId,
    );
    if (!failureSample) {
      return fail('INVALID_INPUT', 'No package failure sample exists for this plan; failureCase is not allowed.');
    }
  }

  const { attempt, attempts } = startAttempt(state, pkg, 'delivery', input.nowIso, [
    draft.scriptVersionId,
    video.id,
    ...draft.attachmentAssetIds,
  ]);
  const pending: PendingDeliveryAttempt = {
    id: attempt.id,
    stageAttemptId: attempt.id,
    draftId: draft.id,
    planId: draft.planId,
    scriptVersionId: draft.scriptVersionId,
    videoId: draft.videoId,
    attachmentAssetIds: [...draft.attachmentAssetIds],
    recipientIds: draft.recipientSnapshot.map((recipient) => recipient.id),
    subject: draft.subject,
    body: draft.body,
    scheduledVirtualMs: draft.scheduledVirtualMs,
    failureCase: input.failureCase,
    status: 'running',
    outcome: null,
    startedAt: input.nowIso,
    settledAt: null,
  };
  const next = nextState(state, {
    workflow: { ...state.workflow, delivery: 'running' },
    stageAttempts: attempts,
    pendingDeliveryAttempts: [...state.pendingDeliveryAttempts, pending],
    history: appendHistory(state, 'simulateDelivery:started', [draft.id, attempt.id], input.nowIso, 'applied'),
  });
  return ok(next, [`attemptId=${attempt.id}`, `scheduledVirtualMs=${draft.scheduledVirtualMs}`]);
}

export function advanceDeliveryAttempt(
  state: DomainState,
  _pkg: ScenarioPackage,
  input: AdvanceDeliveryAttemptInput,
): DomainResult<DomainState> {
  if (!Number.isInteger(input.virtualTimeMs) || input.virtualTimeMs < 0) {
    return fail('INVALID_INPUT', 'virtualTimeMs must be a finite non-negative integer.');
  }
  const pending = state.pendingDeliveryAttempts.find((item) => item.id === input.attemptId);
  if (!pending) return fail('ATTEMPT_NOT_FOUND', `Unknown delivery attempt ${input.attemptId}.`);
  if (pending.status === 'settled') return ok(state); // already settled; never writes a second record

  if (state.workflow.delivery !== 'running') {
    return fail('INVALID_TRANSITION', `Delivery is ${state.workflow.delivery}, not running.`);
  }
  const currentStageAttempt = state.stageAttempts.find(
    (attempt) => attempt.id === pending.stageAttemptId && attempt.stage === 'delivery' && attempt.status === 'running',
  );
  if (!currentStageAttempt) {
    return fail('INVALID_TRANSITION', `Attempt ${input.attemptId} is not the current running delivery attempt.`);
  }
  if (input.virtualTimeMs < pending.scheduledVirtualMs) {
    return ok(state); // not due yet: stay running with no terminal record
  }

  const outcome: DeliveryOutcome = pending.failureCase === 'delivery_failed' ? 'failed' : 'simulated_delivered';
  const attemptNumber = state.deliveryAttempts.length + 1;
  const terminal: DeliveryAttempt = {
    id: `usr.${state.sessionId}.delivery-attempt.${attemptNumber}`,
    stageAttemptId: pending.stageAttemptId,
    draftId: pending.draftId,
    planId: pending.planId,
    scriptVersionId: pending.scriptVersionId,
    videoId: pending.videoId,
    attachmentAssetIds: [...pending.attachmentAssetIds],
    recipientIds: [...pending.recipientIds],
    subject: pending.subject,
    body: pending.body,
    outcome,
    failureCode: outcome === 'failed' ? 'delivery_failed' : null,
    attempt: attemptNumber,
    virtualTimeMs: input.virtualTimeMs,
    mode: 'mock',
  };
  const settledPending: PendingDeliveryAttempt = {
    ...pending,
    status: 'settled',
    outcome,
    settledAt: input.nowIso,
  };
  const pendingDeliveryAttempts = state.pendingDeliveryAttempts.map((item) =>
    item.id === settledPending.id ? settledPending : item,
  );

  if (outcome === 'failed') {
    const next = nextState(state, {
      workflow: { ...state.workflow, delivery: 'failed' },
      stageAttempts: finishAttempt(state.stageAttempts, 'delivery', input.nowIso, 'failed', 'delivery_failed'),
      deliveryAttempts: [...state.deliveryAttempts, terminal],
      pendingDeliveryAttempts,
      history: appendHistory(state, 'advanceDeliveryAttempt:failed', [terminal.id], input.nowIso, 'failed'),
    });
    return ok(next);
  }

  const record: SimulatedDeliveryRecord = {
    id: `usr.${state.sessionId}.record.${state.deliveryRecords.length + 1}`,
    planId: pending.planId,
    scriptVersionId: pending.scriptVersionId,
    videoId: pending.videoId,
    attachmentAssetIds: [...pending.attachmentAssetIds],
    recipientIds: [...pending.recipientIds],
    subject: pending.subject,
    body: pending.body,
    outcome: 'simulated_delivered',
    attempt: attemptNumber,
    virtualTimeMs: input.virtualTimeMs,
    mode: 'mock',
  };
  const next = nextState(state, {
    workflow: { ...state.workflow, delivery: 'completed' },
    stageAttempts: finishAttempt(state.stageAttempts, 'delivery', input.nowIso, 'completed'),
    deliveryAttempts: [...state.deliveryAttempts, terminal],
    pendingDeliveryAttempts,
    deliveryRecords: [...state.deliveryRecords, record],
    deliveryDrafts: state.deliveryDrafts.map((item) =>
      item.id === pending.draftId ? { ...item, confirmedRevision: item.revision } : item,
    ),
    history: appendHistory(state, 'advanceDeliveryAttempt:simulated_delivered', [terminal.id, record.id], input.nowIso, 'applied'),
  });
  return ok(next);
}

export function failStage(
  state: DomainState,
  _pkg: ScenarioPackage,
  input: FailStageInput,
): DomainResult<DomainState> {
  if (state.workflow[input.stage] !== 'running') {
    return fail('INVALID_TRANSITION', `Only a running stage can fail; ${input.stage} is ${state.workflow[input.stage]}.`);
  }
  const next = nextState(state, {
    workflow: { ...state.workflow, [input.stage]: 'failed' },
    stageAttempts: finishAttempt(state.stageAttempts, input.stage, input.nowIso, 'failed', input.errorCode),
    history: appendHistory(state, `failStage:${input.stage}`, [input.errorCode], input.nowIso, 'failed'),
  });
  return ok(next);
}

export function retryStage(
  state: DomainState,
  pkg: ScenarioPackage,
  input: RetryStageInput,
): DomainResult<DomainState> {
  if (state.workflow[input.stage] !== 'failed') {
    return fail('INVALID_TRANSITION', `retryStage requires ${input.stage} failed; found ${state.workflow[input.stage]}.`);
  }
  const failedAttempt = state.stageAttempts.find(
    (attempt) => attempt.id === input.failedAttemptId && attempt.stage === input.stage && attempt.status === 'failed',
  );
  if (!failedAttempt) return fail('ATTEMPT_NOT_FOUND', `Unknown failed attempt ${input.failedAttemptId}.`);
  if (anyStageRunning(state.workflow)) {
    return fail('INVALID_TRANSITION', 'A stage is already running; parallel retry is not allowed.');
  }
  if (input.stage === 'analysis' && state.workflow.discovery !== 'completed') {
    return fail('INVALID_TRANSITION', 'Analysis retry requires discovery completed.');
  }
  if (input.stage === 'video') {
    if (state.workflow.analysis !== 'completed' || !state.activeScriptVersionId || !state.activeVideoId) {
      return fail('INVALID_TRANSITION', 'Video retry requires the same confirmed script/video input.');
    }
    const video = findVideo(pkg, state.activeVideoId);
    if (!video || video.scriptVersionId !== state.activeScriptVersionId) {
      return fail('VIDEO_VERSION_MISMATCH', 'Video retry input no longer matches the active script.');
    }
  }
  if (input.stage === 'delivery') {
    const failedDeliveryAttempt = state.deliveryAttempts.find(
      (attempt) => attempt.stageAttemptId === failedAttempt.id && attempt.outcome === 'failed',
    );
    if (!failedDeliveryAttempt) {
      return fail('ATTEMPT_NOT_FOUND', 'Delivery retry requires a terminal failed delivery attempt with its input snapshot.');
    }
    const draft = state.deliveryDrafts.find((item) => item.id === failedDeliveryAttempt.draftId);
    if (!draft) return fail('NOT_FOUND', `Unknown delivery draft ${failedDeliveryAttempt.draftId}.`);
    const retryFailureCase = input.failureCase ?? null;
    if (retryFailureCase === 'delivery_failed') {
      const failureSample = pkg.delivery.data.records.find(
        (record) => record.outcome === 'failed' && record.planId === failedDeliveryAttempt.planId,
      );
      if (!failureSample) return fail('INVALID_INPUT', 'No package failure sample exists for this plan; failureCase is not allowed.');
    }
    const { attempt, attempts } = startAttempt(state, pkg, 'delivery', input.nowIso, [
      failedDeliveryAttempt.scriptVersionId,
      failedDeliveryAttempt.videoId,
      ...failedDeliveryAttempt.attachmentAssetIds,
    ]);
    const pending: PendingDeliveryAttempt = {
      id: attempt.id,
      stageAttemptId: attempt.id,
      draftId: failedDeliveryAttempt.draftId,
      planId: failedDeliveryAttempt.planId,
      scriptVersionId: failedDeliveryAttempt.scriptVersionId,
      videoId: failedDeliveryAttempt.videoId,
      attachmentAssetIds: [...failedDeliveryAttempt.attachmentAssetIds],
      recipientIds: [...failedDeliveryAttempt.recipientIds],
      subject: failedDeliveryAttempt.subject,
      body: failedDeliveryAttempt.body,
      scheduledVirtualMs: draft.scheduledVirtualMs,
      failureCase: retryFailureCase,
      status: 'running',
      outcome: null,
      startedAt: input.nowIso,
      settledAt: null,
    };
    const next = nextState(state, {
      workflow: { ...state.workflow, delivery: 'running' },
      stageAttempts: attempts,
      pendingDeliveryAttempts: [...state.pendingDeliveryAttempts, pending],
      history: appendHistory(state, 'retryStage:delivery', [failedAttempt.id, attempt.id], input.nowIso, 'applied'),
      lastWorkflowAtMs: Math.max(state.lastWorkflowAtMs, input.virtualMs),
    });
    return ok(next, [`attemptId=${attempt.id}`, `scheduledVirtualMs=${draft.scheduledVirtualMs}`]);
  }

  const { attempt, attempts } = startAttempt(state, pkg, input.stage, input.nowIso, [input.failedAttemptId]);
  const next = nextState(state, {
    workflow: { ...state.workflow, [input.stage]: 'running' },
    stageAttempts: attempts,
    history: appendHistory(state, `retryStage:${input.stage}`, [input.failedAttemptId, attempt.id], input.nowIso, 'applied'),
    lastWorkflowAtMs: Math.max(state.lastWorkflowAtMs, input.virtualMs),
  });
  return ok(next);
}

export function resetSession(
  state: DomainState,
  _pkg: ScenarioPackage,
  input: ResetSessionInput,
): DomainResult<DomainState> {
  if (input.confirmation !== 'RESET_THIS_SESSION') {
    return fail('CONFIRMATION_REQUIRED', 'resetSession requires the explicit RESET_THIS_SESSION confirmation.');
  }
  let history = state.history;
  for (const stage of STAGES) {
    const running = runningAttempt(state, stage);
    if (running) {
      history = appendHistory(
        { ...state, history },
        `cancelRunning:${stage}`,
        attemptHistoryIds(running),
        input.nowIso,
        'canceled',
      );
    }
  }
  history = appendHistory({ ...state, history }, 'resetSession', [], input.nowIso, 'reset');
  const reset: DomainState = {
    ...state,
    revision: state.revision + 1,
    workflow: initialWorkflow(),
    activeBriefId: null,
    activeScriptVersionId: null,
    activeVideoId: null,
    deliveryDraftId: null,
    userVersions: [],
    deliveryDrafts: [],
    stageAttempts: [],
    deliveryAttempts: [],
    pendingDeliveryAttempts: [],
    deliveryRecords: [],
    workflowCursor: 0,
    workflowVisibleEntityIds: [],
    lastWorkflowEventId: null,
    lastWorkflowEventJson: null,
    lastWorkflowAtMs: 0,
    videoAvailability: {},
    videoProgress: {},
    history,
    replay: createReplayState() as ReplayState,
  };
  return ok(reset);
}

export function getStageAttempt(
  state: DomainState,
  stage: StageName,
  status?: StageAttempt['status'],
): StageAttempt[] {
  return state.stageAttempts.filter((attempt) => attempt.stage === stage && (!status || attempt.status === status));
}

export function getActiveDraft(state: DomainState): DeliveryDraft | null {
  return state.deliveryDrafts.find((draft) => draft.id === state.deliveryDraftId) ?? null;
}

export function getVisibleScript(state: DomainState, pkg: ScenarioPackage, scriptVersionId: string): ScriptEditable | null {
  const found = findScript(state, pkg, scriptVersionId);
  return found ? scriptEditable(found.version) : null;
}

export function isUserVersion(state: DomainState, scriptVersionId: string): boolean {
  return Boolean(findUserVersion(state, scriptVersionId));
}

export type { ScenarioPackage };

