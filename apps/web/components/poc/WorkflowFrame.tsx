'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  Badge,
  Button,
  Overlay,
  ReplayControls,
  StateBlock,
  Stepper,
  Tabs,
  ToastRegion,
  type StepperStep,
  type ToastMessage,
} from './index';
import { getBrowserApi, formatDate } from './browser-api';
import type { EntityData, Event, ReplaySpeed, SessionView, StageData, StageName } from '../../demo/poc/api/types';
import styles from './workflow.module.css';

export type WorkflowStep = 'discovery' | 'analysis' | 'video' | 'delivery';
export type WorkflowView = 'workflow' | 'replay';

const STEPS: Array<{ id: WorkflowStep; label: string; meta: string }> = [
  { id: 'discovery', label: 'Discovery', meta: 'Signals and trends' },
  { id: 'analysis', label: 'Analysis & script', meta: 'Brief and script' },
  { id: 'video', label: 'Script to video', meta: 'Preview and asset check' },
  { id: 'delivery', label: 'Automated delivery', meta: 'Simulated delivery record' },
];

const STEP_LABEL: Record<WorkflowStep, string> = {
  discovery: 'Discovery',
  analysis: 'Analysis & script',
  video: 'Script to video',
  delivery: 'Automated delivery',
};

type Props = {
  sessionId: string;
  preview: boolean;
  scenarioId?: string;
  initialStep: WorkflowStep;
  initialView: WorkflowView;
};

function normalizeStep(value: string | undefined): WorkflowStep {
  return value === 'analysis' || value === 'video' || value === 'delivery' ? value : 'discovery';
}

function normalizeView(value: string | undefined): WorkflowView {
  return value === 'replay' ? 'replay' : 'workflow';
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((entry) => displayValue(entry)).join(', ');
  return JSON.stringify(value);
}

function entityTitle(entity: EntityData): string {
  const value = entity.value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['title', 'name', 'headline', 'label', 'summary']) {
      if (typeof record[key] === 'string' && record[key]) return record[key];
    }
  }
  return entity.id;
}

function entityEntries(entity: EntityData): Array<[string, unknown]> {
  const value = entity.value;
  if (!value || typeof value !== 'object') return [['id', entity.id]];
  return Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !['id', 'scenarioId', 'scenarioVersion'].includes(key))
    .slice(0, 18);
}

function stageOf(status: SessionView['workflow'][StageName]): 'completed' | 'current' | 'future' {
  if (status === 'completed') return 'completed';
  if (status === 'locked' || status === 'stale') return 'future';
  return 'current';
}

export function WorkflowFrame({ sessionId, preview, scenarioId, initialStep, initialView }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<WorkflowStep>(normalizeStep(initialStep));
  const [view, setView] = useState<WorkflowView>(normalizeView(initialView));
  const [session, setSession] = useState<SessionView | null>(null);
  const [stageData, setStageData] = useState<StageData | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(!preview);
  const [stageLoading, setStageLoading] = useState(!preview);
  const [error, setError] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<EntityData | null>(null);
  const [previewDrawer, setPreviewDrawer] = useState(false);
  const [locale, setLocale] = useState<'en' | 'ar'>('en');
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const sessionRef = useRef<SessionView | null>(null);
  const playingRef = useRef(false);
  const speedRef = useRef<ReplaySpeed>(1);
  const targetRef = useRef(0);
  const lastTickRef = useRef(0);
  const tickBusyRef = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const toastSequence = useRef(0);

  const pushToast = useCallback((message: string, tone: ToastMessage['tone'] = 'neutral') => {
    toastSequence.current += 1;
    setToasts((current) => [...current, { id: `wf-${toastSequence.current}`, message, tone }].slice(-3));
  }, []);

  const updateSession = useCallback((next: SessionView) => {
    sessionRef.current = next;
    setSession(next);
    setSpeed(next.replay.speed);
    speedRef.current = next.replay.speed;
  }, []);

  useEffect(() => {
    if (preview) {
      setLoading(false);
      setStageLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    const api = getBrowserApi();
    void (async () => {
      const result = await api.getSession({ sessionId });
      if (cancelled) return;
      if (!result.ok) {
        setError(`${result.error.code}: ${result.error.message}`);
        setLoading(false);
        return;
      }
      updateSession(result.data);
      const eventResult = await api.getEvents({ sessionId, afterSequence: 0, limit: 100 });
      if (cancelled) return;
      if (eventResult.ok) setEvents(eventResult.data.items);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [preview, sessionId, updateSession]);

  useEffect(() => {
    if (preview || !session) return;
    let cancelled = false;
    setStageLoading(true);
    const api = getBrowserApi();
    void api.getStageData({ sessionId: session.id, stage: step, view }).then((result) => {
      if (cancelled) return;
      if (result.ok) setStageData(result.data);
      else setStageData(null);
      setStageLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [preview, session?.id, session?.revision, step, view]);

  useEffect(() => {
    if (preview || !session || step !== 'video' || view !== 'workflow') {
      setMediaUrl(null);
      return;
    }
    if (session.workflow.video !== 'completed' || !session.activeVideoId) {
      setMediaUrl(null);
      return;
    }
    let cancelled = false;
    let url: string | null = null;
    void getBrowserApi()
      .getDownload({ sessionId: session.id, kind: 'video', entityId: session.activeVideoId })
      .then((result) => {
        if (cancelled || !result.ok) return;
        const blob = new Blob([new Uint8Array(result.data.blob)], { type: result.data.mimeType });
        url = URL.createObjectURL(blob);
        setMediaUrl(url);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview, session, step, view]);

  const stopDriver = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pauseServerTransport = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || current.replay.transport !== 'playing') return;
    const result = await getBrowserApi().replayCommand(
      { sessionId: current.id, expectedRevision: current.revision, idempotencyKey: `replay-pause-${current.revision}` },
      { action: 'pause' },
    );
    if (result.ok) updateSession(result.data.session);
  }, [updateSession]);

  const pausePlayback = useCallback(async () => {
    stopDriver();
    await pauseServerTransport();
  }, [pauseServerTransport, stopDriver]);

  const tick = useCallback(async () => {
    const current = sessionRef.current;
    if (!playingRef.current || !current || tickBusyRef.current) return;
    const total = events.length > 0 ? events[events.length - 1].sequence : 0;
    const now = performance.now();
    const delta = lastTickRef.current === 0 ? 0 : now - lastTickRef.current;
    lastTickRef.current = now;
    targetRef.current += delta * speedRef.current;
    const lastAt = events.length > 0 ? events[events.length - 1].atMs : 0;
    const target = Math.min(Math.round(targetRef.current), lastAt);
    if (target <= current.replay.virtualMs) return;
    tickBusyRef.current = true;
    const result = await getBrowserApi().advanceReplay(
      { sessionId: current.id, expectedRevision: current.revision, idempotencyKey: `replay-tick-${current.revision}` },
      { targetVirtualMs: target },
    );
    tickBusyRef.current = false;
    if (!result.ok) {
      stopDriver();
      pushToast(`${result.error.code}: ${result.error.message}`, 'error');
      return;
    }
    updateSession(result.data.session);
    if (result.data.session.replay.cursorSequence >= total) {
      stopDriver();
      await pauseServerTransport();
    }
  }, [events, pauseServerTransport, pushToast, stopDriver, updateSession]);

  const startPlayback = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || events.length === 0) return;
    const total = events[events.length - 1].sequence;
    let nextSession = current;
    if (nextSession.replay.cursorSequence >= total) {
      const restarted = await getBrowserApi().replayCommand(
        { sessionId: nextSession.id, expectedRevision: nextSession.revision, idempotencyKey: `replay-restart-play-${nextSession.revision}` },
        { action: 'restart' },
      );
      if (!restarted.ok) {
        pushToast(`${restarted.error.code}: ${restarted.error.message}`, 'error');
        return;
      }
      nextSession = restarted.data.session;
      updateSession(nextSession);
    }
    if (nextSession.replay.transport !== 'playing') {
      const played = await getBrowserApi().replayCommand(
        { sessionId: nextSession.id, expectedRevision: nextSession.revision, idempotencyKey: `replay-play-${nextSession.revision}` },
        { action: 'play' },
      );
      if (!played.ok) {
        pushToast(`${played.error.code}: ${played.error.message}`, 'error');
        return;
      }
      nextSession = played.data.session;
      updateSession(nextSession);
    }
    targetRef.current = nextSession.replay.virtualMs;
    lastTickRef.current = performance.now();
    playingRef.current = true;
    setPlaying(true);
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => void tick(), 250);
  }, [events, pushToast, tick, updateSession]);

  const stepReplay = useCallback(async (action: 'step' | 'restart' | 'seek', cursorSequence?: number) => {
    const current = sessionRef.current;
    if (!current) return;
    stopDriver();
    const input = action === 'seek'
      ? { action: 'seek' as const, cursorSequence: cursorSequence ?? 0 }
      : action === 'restart'
        ? { action: 'restart' as const }
        : { action: 'step' as const };
    const result = await getBrowserApi().replayCommand(
      { sessionId: current.id, expectedRevision: current.revision, idempotencyKey: `replay-${action}-${current.revision}-${cursorSequence ?? ''}` },
      input,
    );
    if (!result.ok) pushToast(`${result.error.code}: ${result.error.message}`, 'error');
    else updateSession(result.data.session);
  }, [pushToast, stopDriver, updateSession]);

  const changeSpeed = useCallback(async (value: 1 | 2 | 4) => {
    const current = sessionRef.current;
    if (!current) return;
    const result = await getBrowserApi().replayCommand(
      { sessionId: current.id, expectedRevision: current.revision, idempotencyKey: `replay-speed-${current.revision}-${value}` },
      { action: 'setSpeed', speed: value },
    );
    if (!result.ok) pushToast(`${result.error.code}: ${result.error.message}`, 'error');
    else {
      speedRef.current = value;
      updateSession(result.data.session);
    }
  }, [pushToast, updateSession]);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    };
  }, []);

  const navigate = (nextStep: WorkflowStep, nextView: WorkflowView = view) => {
    setStep(nextStep);
    setView(nextView);
    const params = new URLSearchParams({ step: nextStep, view: nextView });
    if (preview && scenarioId) params.set('scenarioId', scenarioId);
    const target = preview ? `/poc/preview?${params.toString()}` : `/poc/${encodeURIComponent(sessionId)}?${params.toString()}`;
    router.push(target);
  };

  const nextAction = useMemo((): { stage: 'discovery' | 'analysis' | 'video'; label: string } | null => {
    if (!session) return null;
    if (session.workflow.discovery === 'ready') return { stage: 'discovery', label: 'Run discovery' };
    if (session.workflow.analysis === 'ready') return { stage: 'analysis', label: 'Run analysis' };
    if (session.workflow.video === 'ready') return { stage: 'video', label: 'Run video preview' };
    return null;
  }, [session]);

  const runStage = async () => {
    if (!session || !nextAction) return;
    setBusy(true);
    try {
      const result = await getBrowserApi().executeStage(
        { sessionId: session.id, expectedRevision: session.revision, idempotencyKey: `stage-${nextAction.stage}-${session.revision}` },
        { stage: nextAction.stage },
      );
      if (!result.ok) {
        pushToast(`${result.error.code}: ${result.error.message}`, 'error');
        return;
      }
      updateSession(result.data);
      const nextStep = nextAction.stage === 'discovery' ? 'analysis' : nextAction.stage === 'analysis' ? 'video' : 'delivery';
      pushToast(`${nextAction.stage} completed in mock mode.`, 'success');
      navigate(nextStep);
    } finally {
      setBusy(false);
    }
  };

  const exportVideo = async () => {
    if (!session?.activeVideoId) return;
    const result = await getBrowserApi().getDownload({ sessionId: session.id, kind: 'video', entityId: session.activeVideoId });
    if (!result.ok) {
      pushToast(`${result.error.code}: ${result.error.message}`, 'error');
      return;
    }
    const blob = new Blob([new Uint8Array(result.data.blob)], { type: result.data.mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = result.data.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const stepperSteps: StepperStep[] = STEPS.map((entry) => ({
    id: entry.id,
    label: entry.label,
    meta: preview ? (entry.id === step ? 'Layout preview' : 'Awaiting content') : entry.meta,
    state: preview ? (entry.id === step ? 'current' : 'future') : (() => {
      if (entry.id === step) return 'current';
      return stageOf(session?.workflow[entry.id as StageName] ?? 'locked');
    })(),
  }));

  if (loading) {
    return (
      <div className={styles.loadingPage} aria-busy="true">
        <StateBlock kind="loading" title="Loading demo session" body="Reading the local mock session and its approved package metadata." />
      </div>
    );
  }

  if (!preview && error) {
    return (
      <div className={styles.page}>
        <StateBlock
          kind="error"
          title="Demo session unavailable"
          body={error}
          action={<Link className={styles.previewLink} href="/">Back to Home</Link>}
        />
      </div>
    );
  }

  const activeEntities = stageData?.entities ?? [];
  const currentStepLabel = preview ? `Layout preview · ${STEP_LABEL[step]}` : `${STEP_LABEL[step]} · ${session?.scenarioId ?? ''}`;
  const replayMode = view === 'replay';
  const atEnd = Boolean(session && events.length > 0 && session.replay.cursorSequence >= events[events.length - 1].sequence);

  return (
    <div className={styles.page} data-testid="workflow-frame">
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderMain}>
          <p className={styles.eyebrow}>{preview ? 'LAYOUT PREVIEW · NOT A STARTED SCENARIO · DEMO' : 'MOCK WORKFLOW · DEMO'}</p>
          <h1 className={styles.title}>{preview ? 'Four-step layout preview' : 'Lavish AI Marketing workflow'}</h1>
          <p className={styles.lede}>
            {preview
              ? 'This composition-only preview shows the four workflow stages with empty and locked states. No scenario package, session, media or generated content is present.'
              : 'A locally stored mock session. Workflow actions and replay use the same domain reducer; no live platform, model, renderer or email is connected.'}
          </p>
          <div className={styles.breadcrumbMeta}>
            <Badge tone="mock">Mock / Demo</Badge>
            <Badge tone="neutral">{preview ? 'Layout preview' : `${session?.storageMode ?? 'indexeddb'} storage`}</Badge>
            {!preview && session ? <span className={styles.modeNote}>revision {session.revision} · updated {formatDate(session.updatedAt)}</span> : null}
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.modeSwitch} role="group" aria-label="Data mode">
            <button
              type="button"
              className={styles.modeButton}
              aria-pressed={view === 'workflow'}
              onClick={() => navigate(step, 'workflow')}
              data-testid="mode-workflow"
            >
              Operation mode
            </button>
            <button
              type="button"
              className={styles.modeButton}
              aria-pressed={view === 'replay'}
              disabled={preview}
              onClick={() => navigate(step, 'replay')}
              data-testid="mode-replay"
              title={preview ? 'Replay requires an approved scenario package and a started session.' : undefined}
            >
              Replay mode
            </button>
          </div>
          <Link className={styles.modeNote} href="/">Back to Home</Link>
        </div>
      </header>

      {preview ? (
        <div className={styles.previewBanner} role="note" data-testid="preview-banner">
          <strong>Layout preview only.</strong>
          <span>No scenario has been started. Buttons are disabled until the approved A content package is received and reviewed.</span>
        </div>
      ) : null}

      {replayMode && session ? (
        <div className={styles.previewBanner} role="note" data-testid="replay-banner">
          <strong>Replay mode.</strong>
          <span>Playback projects the preset mock event stream; it does not add user delivery records, scripts or history.</span>
        </div>
      ) : null}

      <div className={styles.stepNav}>
        <Stepper
          steps={stepperSteps}
          label="Four-step workflow"
          onSelect={(entry) => navigate(entry.id as WorkflowStep, view)}
        />
      </div>

      <div className={styles.stageLayout}>
        <div className={styles.stack}>
          {renderStage({
            step,
            preview,
            stageLoading,
            stageData,
            session,
            locale,
            setLocale,
            setSelectedEntity,
            setPreviewDrawer,
            mediaUrl,
            exportVideo,
            playing,
            speed,
            total: events.length > 0 ? events[events.length - 1].sequence : 0,
            atEnd,
            startPlayback: () => void startPlayback(),
            pausePlayback: () => void pausePlayback(),
            stepReplay: () => void stepReplay('step'),
            restartReplay: () => void stepReplay('restart'),
            seekReplay: (sequence) => void stepReplay('seek', sequence),
            changeSpeed: (value) => void changeSpeed(value),
          })}
          {replayMode && session ? (
            <section className={styles.panel} aria-labelledby="replay-title">
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle} id="replay-title">Replay</h2>
                <Badge tone="mock">Preset event projection</Badge>
              </div>
              <ReplayControls
                playing={playing}
                speed={speed}
                cursorSequence={session.replay.cursorSequence}
                totalSequences={events.length > 0 ? events[events.length - 1].sequence : 0}
                onPlay={() => void startPlayback()}
                onPause={() => void pausePlayback()}
                onStep={() => void stepReplay('step')}
                onRestart={() => void stepReplay('restart')}
                onSeek={(sequence) => void stepReplay('seek', sequence)}
                onSpeed={(value) => void changeSpeed(value)}
              />
              <p className={styles.modeNote} style={{ marginTop: 8 }}>
                {atEnd ? 'Replay ended at the final preset event.' : `Virtual time ${Math.round(session.replay.virtualMs)} ms · cursor ${session.replay.cursorSequence}/${events.length > 0 ? events[events.length - 1].sequence : 0}`}
              </p>
            </section>
          ) : null}
        </div>
        <aside className={styles.stack}>
          <section className={styles.panel} aria-labelledby="context-title">
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle} id="context-title">Stage context</h2>
              <Badge tone={preview ? 'mock' : 'neutral'}>{currentStepLabel}</Badge>
            </div>
            {preview ? (
              <StateBlock
                kind="empty"
                title="Awaiting approved package"
                body="The stage has no approved entities, evidence or media yet. The preview shows layout and disabled states only."
              />
            ) : (
              <div className={styles.stack}>
                <p className={styles.panelNote}>
                  Scenario {session?.scenarioId} · version {session?.scenarioVersion} · revision {session?.revision}
                </p>
                <p className={styles.panelNote}>
                  Package hash <span className={styles.entityMeta}>{session?.packageHash}</span>
                </p>
                <StateBlock kind="empty" title="Package-backed content" body="This stage renders only entities returned by the Mock API. Test fixtures are never published as customer scenarios." />
              </div>
            )}
          </section>
          <section className={styles.panel} aria-labelledby="truth-title">
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle} id="truth-title">Truthfulness</h2>
            </div>
            <p className={styles.panelNote}>
              DEMO and Mock labels stay visible. No live model, renderer, delivery platform or tracking pixel is
              called. “Simulated” means a local mock outcome, not a real platform result.
            </p>
          </section>
        </aside>
      </div>

      <div className={styles.actionBar}>
        <div className={styles.actionHint}>
          <strong>{preview ? 'Start unavailable' : replayMode ? (atEnd ? 'Replay ended' : 'Replay controls active') : nextAction?.label ?? 'Action unavailable'}</strong>
          <span>
            {preview
              ? 'The approved A content package and matching media have not been received. Layout preview does not create a session.'
              : replayMode
                ? 'Switch to Operation mode to use workflow actions. Replay never writes user delivery records.'
                : nextAction
                  ? 'This action uses the local Mock API and domain guards.'
                  : 'The next action is not implemented in this limited prototype or requires an editor step.'}
          </span>
        </div>
        <div className={styles.actionButtons}>
          {preview ? (
            <Button variant="primary" disabled>Start unavailable — awaiting content</Button>
          ) : (
            <Button variant="primary" onClick={() => void runStage()} disabled={!nextAction || busy || replayMode} pending={busy} data-testid="workflow-run">
              {nextAction?.label ?? 'Action unavailable'}
            </Button>
          )}
        </div>
      </div>

      <Overlay
        open={Boolean(selectedEntity)}
        onClose={() => setSelectedEntity(null)}
        variant="drawer"
        title={selectedEntity ? entityTitle(selectedEntity) : 'Evidence'}
        description={selectedEntity ? `${selectedEntity.kind} · ${selectedEntity.id}` : undefined}
        testId="workflow-evidence-drawer"
        footer={<Button variant="secondary" onClick={() => setSelectedEntity(null)}>Close</Button>}
      >
        {selectedEntity ? (
          <dl className={styles.entityDetail}>
            {entityEntries(selectedEntity).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{displayValue(value)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Overlay>

      <Overlay
        open={previewDrawer}
        onClose={() => setPreviewDrawer(false)}
        variant="drawer"
        title="Preview evidence drawer"
        description="Layout preview · no approved evidence is attached"
        testId="preview-evidence-drawer"
        footer={<Button variant="secondary" onClick={() => setPreviewDrawer(false)}>Close</Button>}
      >
        <StateBlock kind="empty" title="No evidence available" body="The evidence drawer will show reviewed source material after the approved package is received. This preview only verifies the drawer interaction." />
      </Overlay>

      <ToastRegion toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </div>
  );
}

interface StageProps {
  step: WorkflowStep;
  preview: boolean;
  stageLoading: boolean;
  stageData: StageData | null;
  session: SessionView | null;
  locale: 'en' | 'ar';
  setLocale: (locale: 'en' | 'ar') => void;
  setSelectedEntity: (entity: EntityData) => void;
  setPreviewDrawer: (open: boolean) => void;
  mediaUrl: string | null;
  exportVideo: () => Promise<void>;
  playing: boolean;
  speed: ReplaySpeed;
  total: number;
  atEnd: boolean;
  startPlayback: () => void;
  pausePlayback: () => void;
  stepReplay: () => void;
  restartReplay: () => void;
  seekReplay: (sequence: number) => void;
  changeSpeed: (speed: 1 | 2 | 4) => void;
}

function renderStage(props: StageProps) {
  const { step, preview, stageLoading } = props;
  if (step === 'discovery') return <DiscoveryStage {...props} />;
  if (step === 'analysis') return <AnalysisStage {...props} />;
  if (step === 'video') return <VideoStage {...props} />;
  if (step === 'delivery') return <DeliveryStage {...props} />;
  return <StateBlock kind="loading" title="Loading stage" body={String(stageLoading)} />;
}

function stageEmpty(preview: boolean, title: string, body: string, action?: ReactNode) {
  return (
    <div className={styles.emptyStage}>
      <StateBlock kind="empty" title={preview ? `Awaiting content · ${title}` : title} body={body} action={action} />
      {preview ? <p className={styles.modeNote}>Layout preview: this is an intentional absent-content state, not an empty customer result.</p> : null}
    </div>
  );
}

function EntityCards({ entities, onSelect }: { entities: EntityData[]; onSelect: (entity: EntityData) => void }) {
  return (
    <div className={styles.entityList}>
      {entities.map((entity) => (
        <button type="button" className={styles.entityCard} key={entity.id} onClick={() => onSelect(entity)} data-testid="entity-card">
          <span className={styles.entityKind}>{entity.kind}</span>
          <span className={styles.entityTitle}>{entityTitle(entity)}</span>
          <span className={styles.entityMeta}>{entity.id}</span>
        </button>
      ))}
    </div>
  );
}

function DiscoveryStage({ preview, stageLoading, stageData, setSelectedEntity, setPreviewDrawer }: StageProps) {
  if (stageLoading && !preview) return <StateBlock kind="loading" title="Loading discovery" body="Reading visible discovery entities." />;
  const entities = stageData?.entities ?? [];
  const signals = entities.filter((entity) => entity.kind === 'signal' || entity.kind === 'trend');
  return (
    <section className={styles.panel} aria-labelledby="discovery-title">
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle} id="discovery-title">Discovery</h2>
        <Badge tone="mock">Preset / Simulated</Badge>
      </div>
      {preview ? (
        <div className={styles.stack}>
          {stageEmpty(true, 'Signals and trends', 'Approved A signals, trends and evidence will appear here. No hotspot or trend text is invented for this preview.')}
          <Button variant="secondary" size="small" className={styles.inlineAction} onClick={() => setPreviewDrawer(true)}>Preview evidence drawer</Button>
        </div>
      ) : signals.length === 0 ? (
        stageEmpty(false, 'No visible discovery signal', 'The stage has not produced visible signals yet. Run discovery in Operation mode.')
      ) : (
        <EntityCards entities={signals} onSelect={setSelectedEntity} />
      )}
    </section>
  );
}

function AnalysisStage({ preview, stageLoading, stageData, locale, setLocale, setSelectedEntity }: StageProps) {
  if (stageLoading && !preview) return <StateBlock kind="loading" title="Loading analysis" body="Reading visible brief and script entities." />;
  const entities = stageData?.entities ?? [];
  const scripts = entities.filter((entity) => entity.kind === 'scriptVersion' || entity.kind === 'userScriptVersion');
  const briefs = entities.filter((entity) => entity.kind === 'brief');
  return (
    <section className={styles.panel} aria-labelledby="analysis-title">
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle} id="analysis-title">Analysis & script</h2>
        <div className={styles.segmented} role="group" aria-label="Script language">
          {(['en', 'ar'] as const).map((value) => (
            <button key={value} type="button" className={styles.segment} aria-pressed={locale === value} onClick={() => setLocale(value)}>
              {value.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {preview ? (
        <div className={styles.stack}>
          <Tabs
            items={[
              { id: 'brief', label: 'Brief', panel: stageEmpty(true, 'Brief', 'The reviewed A brief will appear here after content reception; no customer copy is invented.') },
              { id: 'script', label: 'Script', panel: stageEmpty(true, 'Script', 'The EN/AR script and shots will appear here after content reception.') },
            ]}
          />
          <div className={styles.arabicPreview} lang="ar" dir="rtl">لا يوجد محتوى معتمد بعد.<br />هذا عرض تخطيطي فقط.</div>
        </div>
      ) : entities.length === 0 ? (
        stageEmpty(false, 'No visible analysis content', 'Run analysis in Operation mode after discovery completes.')
      ) : (
        <div className={styles.stack}>
          <Tabs
            items={[
              { id: 'brief', label: 'Brief', panel: briefs.length ? <EntityCards entities={briefs} onSelect={setSelectedEntity} /> : <p className={styles.panelNote}>No visible brief yet.</p> },
              { id: 'script', label: 'Script', panel: scripts.length ? <EntityCards entities={scripts} onSelect={setSelectedEntity} /> : <p className={styles.panelNote}>No visible script yet.</p> },
            ]}
          />
        </div>
      )}
    </section>
  );
}

function VideoStage({ preview, stageLoading, stageData, mediaUrl, exportVideo, session }: StageProps) {
  if (stageLoading && !preview) return <StateBlock kind="loading" title="Loading video" body="Reading the current video and asset metadata." />;
  const entities = stageData?.entities ?? [];
  const videos = entities.filter((entity) => entity.kind === 'video');
  const shots = entities.filter((entity) => entity.kind === 'shot');
  return (
    <section className={styles.panel} aria-labelledby="video-title">
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle} id="video-title">Script to video</h2>
        <Badge tone="mock">Simulated render</Badge>
      </div>
      <div className={styles.stageLayoutVideo} style={{ display: 'grid' }}>
        <div className={styles.videoFrame} data-testid="video-frame">
          {preview ? (
            <div className={styles.videoPlaceholder}>
              <strong>No matching video</strong>
              <span>Awaiting approved MP4 and poster. No placeholder bottle or generated footage is shown.</span>
            </div>
          ) : mediaUrl ? (
            <video controls playsInline preload="metadata" src={mediaUrl} data-testid="video-player">
              Your browser cannot play this video.
            </video>
          ) : (
            <div className={styles.videoPlaceholder}>
              <strong>Video unavailable</strong>
              <span>{session?.workflow.video === 'completed' ? 'The asset is not available in the local mock media adapter.' : 'Video is not ready yet.'}</span>
            </div>
          )}
        </div>
        <div className={styles.videoSide}>
          {preview ? (
            stageEmpty(true, 'Shot list', 'Approved shot metadata will appear here with the video package.')
          ) : videos.length === 0 && shots.length === 0 ? (
            stageEmpty(false, 'No visible video metadata', 'Run the video stage after the script is confirmed.')
          ) : (
            <>
              {videos.length > 0 ? <EntityCards entities={videos} onSelect={() => undefined} /> : null}
              {shots.length > 0 ? (
                <div className={styles.shotList}>
                  {shots.map((shot) => (
                    <div className={styles.shot} key={shot.id}><span>{entityTitle(shot)}</span><span>{shot.id}</span></div>
                  ))}
                </div>
              ) : null}
              <Button variant="secondary" size="small" onClick={() => void exportVideo()} disabled={!session?.activeVideoId}>Download video</Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function DeliveryStage({ preview, stageLoading, stageData }: StageProps) {
  if (stageLoading && !preview) return <StateBlock kind="loading" title="Loading delivery" body="Reading the simulated delivery records." />;
  const entities = stageData?.entities ?? [];
  const records = entities.filter((entity) => entity.kind === 'deliveryRecord');
  const plans = entities.filter((entity) => entity.kind === 'deliveryPlan');
  return (
    <section className={styles.panel} aria-labelledby="delivery-title">
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle} id="delivery-title">Automated delivery</h2>
        <Badge tone="mock">Simulated</Badge>
      </div>
      <div className={styles.deliveryGrid}>
        <div className={styles.mailPreview}>
          <div className={styles.mailHeader}>
            <span className={styles.mailSubject}>{preview ? 'Email preview awaits approved content' : 'Simulated delivery preview'}</span>
            <span className={styles.mailMeta}>No email is sent; this is a local mock record.</span>
          </div>
          <p className={styles.mailBody}>
            {preview
              ? 'The approved recipient, subject, body and attachments will be previewed here. This layout does not invent customer copy or an address.'
              : records.length
                ? 'Simulated delivery records are listed below. No real delivery platform status is implied.'
                : 'No simulated delivery has been recorded yet.'}
          </p>
        </div>
        <div className={styles.stack}>
          {preview ? (
            stageEmpty(true, 'Delivery records', 'Success and failure samples from the approved package will appear here.')
          ) : plans.length === 0 && records.length === 0 ? (
            stageEmpty(false, 'No delivery records', 'Delivery is not implemented in this limited prototype. No simulated success is shown.')
          ) : (
            <div>
              <p className={styles.panelNote}>{plans.length} visible plan(s) · {records.length} record(s)</p>
              <table className={styles.recordTable}>
                <thead><tr><th>Record</th><th>Kind</th><th>Status</th></tr></thead>
                <tbody>
                  {entities.map((entity) => {
                    const value = entity.value && typeof entity.value === 'object' ? (entity.value as Record<string, unknown>) : {};
                    return (
                      <tr key={entity.id}>
                        <td>{entityTitle(entity)}</td>
                        <td>{entity.kind}</td>
                        <td>{displayValue(value.outcome ?? value.status ?? '—')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
