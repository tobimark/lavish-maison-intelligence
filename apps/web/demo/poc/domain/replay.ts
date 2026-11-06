import type {
  DeliveryRecord,
  DomainResult,
  Event,
  ReplayProjection,
  ReplayState,
  ScenarioPackage,
  StageName,
} from './types';
import {
  expandScriptVisible,
  fail,
  findPackageScript,
  findPlan,
  findRecord,
  findVideo,
  initialReplayProjection,
  ok,
  sortUnique,
} from './core';
import {
  canonicalEventIssue,
  discoveryOutputsComplete,
  stageStartIssue,
  videoOutputComplete,
} from './guards';

type ReplayEvent = Event & { payload: Record<string, unknown> };

function eventOf(event: Event): ReplayEvent {
  return event as ReplayEvent;
}

function payloadId(event: ReplayEvent, key: string): string | null {
  const value = event.payload?.[key];
  return typeof value === 'string' ? value : null;
}

export function createReplayState(): ReplayState {
  return {
    cursorSequence: 0,
    transport: 'idle',
    projection: initialReplayProjection(),
    lastAtMs: 0,
    lastEventId: null,
    lastEventJson: null,
  };
}

function stageFrom(event: ReplayEvent): StageName {
  return event.stage;
}

function requireStage(projection: ReplayProjection, stage: StageName, expected: string, code: 'INVALID_TRANSITION' | 'NOT_FOUND' = 'INVALID_TRANSITION'): DomainResult<null> {
  if (projection.workflow[stage] !== expected) {
    return fail(code, `Stage ${stage} must be ${expected} for this event; found ${projection.workflow[stage]}.`);
  }
  return ok(null);
}

function withWorkflow(projection: ReplayProjection, patch: Partial<ReplayProjection['workflow']>): ReplayProjection {
  return { ...projection, workflow: { ...projection.workflow, ...patch } };
}

function reveal(projection: ReplayProjection, ids: readonly string[]): ReplayProjection {
  return { ...projection, visibleEntityIds: sortUnique([...projection.visibleEntityIds, ...ids]) };
}

function requireRecord(pkg: ScenarioPackage, id: string | null): DeliveryRecord | null {
  if (!id) return null;
  return findRecord(pkg, id);
}

export function reduceReplayEvent(
  pkg: ScenarioPackage,
  replay: ReplayState,
  event: Event,
): DomainResult<ReplayState> {
  const current = eventOf(event);
  if (!current || typeof current.sequence !== 'number' || typeof current.id !== 'string' || typeof current.type !== 'string') {
    return fail('CORRUPT_EVENT', 'Event envelope is malformed.');
  }
  if (current.scenarioId !== pkg.manifest.scenarioId || current.scenarioVersion !== pkg.manifest.scenarioVersion) {
    return fail('CORRUPT_EVENT', 'Event scenario id/version does not match the loaded package.');
  }
  if (current.sequence <= replay.cursorSequence) {
    if (
      current.sequence === replay.cursorSequence &&
      current.id === replay.lastEventId &&
      replay.lastEventJson === JSON.stringify(current)
    ) {
      return ok(replay); // exact same event/sequence re-delivery is idempotently ignored
    }
    return fail('CORRUPT_EVENT', `Event sequence ${current.sequence} is at/behind cursor ${replay.cursorSequence} or its content changed.`);
  }
  if (current.sequence !== replay.cursorSequence + 1) {
    return fail('CORRUPT_EVENT', `Event sequence must be ${replay.cursorSequence + 1}, found ${current.sequence}.`);
  }
  if (current.atMs < replay.lastAtMs) {
    return fail('CORRUPT_EVENT', `Event atMs must be non-decreasing; found ${current.atMs} after ${replay.lastAtMs}.`);
  }
  if (current.mode !== 'mock') return fail('CORRUPT_EVENT', 'Only mock events are accepted.');
  const canonicalIssue = canonicalEventIssue(pkg, current);
  if (canonicalIssue) return fail('CORRUPT_EVENT', canonicalIssue);

  let projection = replay.projection;
  const stage = stageFrom(current);
  const payload = current.payload ?? {};
  const id = (key: string): string | null => payloadId(current, key);

  if (current.type === 'stage.started') {
    const stageIssue = stageStartIssue(pkg, projection.workflow, stage, 'replay');
    if (stageIssue) return fail('INVALID_TRANSITION', stageIssue);
    projection = withWorkflow(projection, { [stage]: 'running' });
  } else if (current.type === 'signal.discovered') {
    const signalId = id('signalId');
    if (!signalId || !pkg.discovery.data.signals.some((signal) => signal.id === signalId)) {
      return fail('NOT_FOUND', `Unknown discovery signal ${String(signalId)}.`);
    }
    const required = requireStage(projection, 'discovery', 'running');
    if (!required.ok) return required;
    projection = reveal(projection, [signalId]);
  } else if (current.type === 'trend.summarized') {
    const trendId = id('trendId');
    const trend = pkg.discovery.data.trends.find((item) => item.id === trendId);
    if (!trend) return fail('NOT_FOUND', `Unknown discovery trend ${String(trendId)}.`);
    const required = requireStage(projection, 'discovery', 'running');
    if (!required.ok) return required;
    projection = reveal(projection, [trend.id]);
  } else if (current.type === 'analysis.presented') {
    const analysisId = id('analysisId');
    if (!analysisId || !pkg.analysis.data.analyses.some((item) => item.id === analysisId)) {
      return fail('NOT_FOUND', `Unknown analysis ${String(analysisId)}.`);
    }
    const required = requireStage(projection, 'analysis', 'running');
    if (!required.ok) return required;
    projection = reveal(projection, [analysisId]);
  } else if (current.type === 'brief.presented') {
    const briefId = id('briefId');
    if (!briefId || !pkg.analysis.data.briefs?.some((item) => item.id === briefId)) {
      return fail('NOT_FOUND', `Unknown brief ${String(briefId)}.`);
    }
    const required = requireStage(projection, 'analysis', 'running');
    if (!required.ok) return required;
    projection = reveal(projection, [briefId]);
  } else if (current.type === 'script.presented') {
    const scriptId = id('scriptVersionId');
    const script = scriptId ? findPackageScript(pkg, scriptId) : null;
    if (!script) return fail('NOT_FOUND', `Unknown script version ${String(scriptId)}.`);
    if (!['running', 'awaiting_confirmation'].includes(projection.workflow.analysis)) {
      return fail('INVALID_TRANSITION', 'script.presented requires analysis running/awaiting_confirmation.');
    }
    projection = reveal(projection, expandScriptVisible(script));
    const activeScriptVersionId =
      !projection.activeScriptVersionId || script.id === pkg.manifest.entryScriptVersionId
        ? script.id
        : projection.activeScriptVersionId;
    projection = {
      ...projection,
      activeScriptVersionId,
      workflow: { ...projection.workflow, analysis: 'awaiting_confirmation' },
    };
  } else if (current.type === 'script.confirmed') {
    const scriptId = id('scriptVersionId');
    if (!scriptId || projection.activeScriptVersionId !== scriptId) {
      return fail('INVALID_TRANSITION', 'Replay script.confirmed must reference the currently presented script version.');
    }
    if (projection.workflow.analysis !== 'awaiting_confirmation') {
      return fail('INVALID_TRANSITION', `script.confirmed requires analysis awaiting_confirmation; found ${projection.workflow.analysis}.`);
    }
    projection = { ...projection, confirmedScriptVersionId: scriptId };
  } else if (current.type === 'video.queued') {
    const videoId = id('videoId');
    if (!videoId || !findVideo(pkg, videoId)) return fail('NOT_FOUND', `Unknown video ${String(videoId)}.`);
    if (videoId !== pkg.manifest.entryVideoId) return fail('VIDEO_VERSION_MISMATCH', 'Replay video must be the entry video.');
    const required = requireStage(projection, 'video', 'running');
    if (!required.ok) return required;
    projection = reveal(projection, [videoId]);
    projection = {
      ...projection,
      videoAvailability: { ...projection.videoAvailability, [videoId]: 'queued' },
      videoProgress: { ...projection.videoProgress, [videoId]: 0 },
    };
  } else if (current.type === 'video.progressed') {
    const videoId = id('videoId');
    if (!videoId || !findVideo(pkg, videoId)) return fail('NOT_FOUND', `Unknown video ${String(videoId)}.`);
    if (videoId !== pkg.manifest.entryVideoId) return fail('VIDEO_VERSION_MISMATCH', 'Replay video must be the entry video.');
    const required = requireStage(projection, 'video', 'running');
    if (!required.ok) return required;
    const progress = Number(payload.progress);
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
      return fail('CORRUPT_EVENT', `video.progressed progress must be an integer 0..100; found ${String(payload.progress)}.`);
    }
    if (progress < (projection.videoProgress[videoId] ?? 0)) {
      return fail('CORRUPT_EVENT', 'video.progressed must be non-decreasing.');
    }
    projection = {
      ...projection,
      videoProgress: { ...projection.videoProgress, [videoId]: progress },
    };
  } else if (current.type === 'video.available') {
    const videoId = id('videoId');
    if (!videoId || !findVideo(pkg, videoId)) return fail('NOT_FOUND', `Unknown video ${String(videoId)}.`);
    if (videoId !== pkg.manifest.entryVideoId) return fail('VIDEO_VERSION_MISMATCH', 'Replay video must be the entry video.');
    const required = requireStage(projection, 'video', 'running');
    if (!required.ok) return required;
    if ((projection.videoProgress[videoId] ?? 0) !== 100) {
      return fail('INVALID_TRANSITION', 'video.available requires 100% progress on the same replay attempt.');
    }
    projection = reveal(projection, [videoId]);
    projection = {
      ...projection,
      videoAvailability: { ...projection.videoAvailability, [videoId]: 'available' },
    };
  } else if (current.type === 'delivery.queued') {
    const planId = id('planId');
    const plan = planId ? findPlan(pkg, planId) : null;
    if (!plan) return fail('NOT_FOUND', `Unknown delivery plan ${String(planId)}.`);
    const required = requireStage(projection, 'delivery', 'running');
    if (!required.ok) return required;
    projection = reveal(projection, [plan.id]);
    projection = { ...projection, activeVideoId: plan.videoId };
  } else if (current.type === 'delivery.simulated') {
    const recordId = id('recordId');
    const record = requireRecord(pkg, recordId);
    if (!record) return fail('NOT_FOUND', `Unknown delivery record ${String(recordId)}.`);
    const required = requireStage(projection, 'delivery', 'running');
    if (!required.ok) return required;
    const plan = findPlan(pkg, record.planId);
    projection = reveal(projection, [record.id]);
    projection = {
      ...projection,
      activeVideoId: plan?.videoId ?? projection.activeVideoId,
      deliveryRecordIds: sortUnique([...projection.deliveryRecordIds, record.id]),
    };
  } else if (current.type === 'stage.completed') {
    if (current.stage === 'discovery') {
      const required = requireStage(projection, 'discovery', 'running');
      if (!required.ok) return required;
      const missingDiscoveryOutputs = discoveryOutputsComplete(pkg, projection.visibleEntityIds);
      if (missingDiscoveryOutputs.length) {
        return fail('INVALID_TRANSITION', `Discovery cannot complete with hidden outputs: ${missingDiscoveryOutputs.join(', ')}.`);
      }
      projection = withWorkflow(projection, { discovery: 'completed', analysis: 'ready' });
    } else if (current.stage === 'analysis') {
      if (projection.workflow.analysis !== 'awaiting_confirmation') {
        return fail('INVALID_TRANSITION', `Analysis cannot complete from ${projection.workflow.analysis}; script confirmation is required.`);
      }
      if (!projection.confirmedScriptVersionId || projection.confirmedScriptVersionId !== projection.activeScriptVersionId) {
        return fail('CONFIRMATION_REQUIRED', 'Analysis cannot complete before the entry script is confirmed.');
      }
      projection = withWorkflow(projection, { analysis: 'completed', video: 'ready' });
    } else if (current.stage === 'video') {
      const required = requireStage(projection, 'video', 'running');
      if (!required.ok) return required;
      const videoIssue = videoOutputComplete(
        pkg,
        pkg.manifest.entryVideoId,
        projection.videoAvailability,
        projection.videoProgress,
        projection.visibleEntityIds,
      );
      if (videoIssue) return fail('INVALID_TRANSITION', videoIssue);
      projection = withWorkflow(projection, { video: 'completed', delivery: 'ready' });
    } else if (current.stage === 'delivery') {
      const required = requireStage(projection, 'delivery', 'running');
      if (!required.ok) return required;
      if (projection.deliveryRecordIds.length === 0) {
        return fail('INVALID_TRANSITION', 'Delivery cannot complete before a simulated record is exposed.');
      }
      projection = withWorkflow(projection, { delivery: 'completed' });
    } else {
      return fail('INVALID_TRANSITION', `Unknown stage for stage.completed: ${String((current as { stage?: string }).stage)}.`);
    }
  } else if (current.type === 'stage.failed') {
    if (projection.workflow[stage] !== 'running') {
      return fail('INVALID_TRANSITION', `Stage ${stage} can only fail from running; found ${projection.workflow[stage]}.`);
    }
    projection = withWorkflow(projection, { [stage]: 'failed' });
  } else {
    return fail('CORRUPT_EVENT', `Unknown/unsupported event type ${String((current as { type?: string }).type)} for replay.`);
  }

  return ok({
    cursorSequence: current.sequence,
    transport: replay.transport,
    projection,
    lastAtMs: current.atMs,
    lastEventId: current.id,
    lastEventJson: JSON.stringify(current),
  });
}

export function reduceReplay(
  pkg: ScenarioPackage,
  events: readonly Event[],
  cursorSequence: number,
): DomainResult<ReplayState> {
  if (!Number.isInteger(cursorSequence) || cursorSequence < 0 || cursorSequence > events.length) {
    return fail('INVALID_INPUT', `cursorSequence must be 0..${events.length}.`);
  }
  let replay: ReplayState = createReplayState();
  for (const event of events) {
    if (event.sequence > cursorSequence) break;
    const applied = reduceReplayEvent(pkg, replay, event);
    if (!applied.ok) return applied;
    replay = applied.value;
  }
  if (replay.cursorSequence !== cursorSequence) {
    return fail('CORRUPT_EVENT', `Replay reduced to sequence ${replay.cursorSequence}, expected ${cursorSequence}.`);
  }
  return ok(replay);
}

export function setReplayTransport(
  replay: ReplayState,
  transport: ReplayState['transport'],
): DomainResult<ReplayState> {
  if (!['idle', 'playing', 'paused', 'ended', 'error'].includes(transport)) {
    return fail('INVALID_INPUT', `Unknown replay transport ${String(transport)}.`);
  }
  return ok({ ...replay, transport });
}

export function initialProjection(): ReplayProjection {
  return initialReplayProjection();
}
