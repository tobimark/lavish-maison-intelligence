'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  Badge,
  Button,
  Input,
  Overlay,
  ReplayControls,
  StateBlock,
  Stepper,
  Textarea,
  ToastRegion,
  type StepperStep,
  type ToastMessage,
} from './index';
import { formatDate, getBrowserApi } from './browser-api';
import type {
  ContentDeliveryAttempt,
  ContentDeliveryDraft,
  ContentDeliveryView,
  ContentPackageInput,
  Event,
  ReplaySpeed,
  ScenarioView,
  ScriptEditable,
  SessionView,
  UserScriptVersion,
} from '../../demo/poc/api/types';
import workflowStyles from './workflow.module.css';
import styles from './content.module.css';

type Step = 'discovery' | 'analysis' | 'video' | 'delivery';
type View = 'workflow' | 'replay';

const STEP_ORDER: Step[] = ['discovery', 'analysis', 'video', 'delivery'];

interface Props {
  initialSession: SessionView;
  initialStep: Step;
  initialView: View;
}

function normalizeStep(value: string): Step {
  return value === 'analysis' || value === 'video' || value === 'delivery' ? value : 'discovery';
}
function normalizeView(value: string): View {
  return value === 'replay' ? 'replay' : 'workflow';
}
function formatMs(ms: number): string {
  const total = Math.max(0, Math.round(ms));
  return `${String(Math.floor(total / 60000)).padStart(2, '0')}:${String(Math.floor((total % 60000) / 1000)).padStart(2, '0')}.${String(total % 1000).padStart(3, '0')}`;
}
function editableFromScript(content: ScriptEditable): ScriptEditable {
  return {
    title: content.title,
    hook: content.hook,
    message: content.message,
    cta: content.cta,
    shots: content.shots.map((shot) => ({ ...shot, assetIds: [...shot.assetIds] })),
    subtitles: content.subtitles.map((subtitle) => ({ ...subtitle })),
    caption: content.caption,
    hashtags: [...content.hashtags],
  };
}
function userEditable(version: UserScriptVersion): ScriptEditable {
  return editableFromScript(version.content);
}
function allScripts(session: SessionView, pkg: ContentPackageInput) {
  return [
    ...pkg.script.data.versions.map((version) => ({ id: version.id, label: `Preset ${version.language.toUpperCase()} v${version.version}`, language: version.language, content: editableFromScript({ ...version }), preset: true })),
    ...session.userVersions.map((version) => ({ id: version.id, label: `Saved ${version.language.toUpperCase()} v${version.revision}`, language: version.language, content: userEditable(version), preset: false })),
  ];
}
function assetById(scenario: ScenarioView, id: string) {
  return scenario.assets.find((asset) => asset.id === id) ?? null;
}

export function ContentOnlyFrame({ initialSession, initialStep, initialView }: Props) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [scenario, setScenario] = useState<ScenarioView | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [step, setStep] = useState<Step>(normalizeStep(initialStep));
  const [view, setView] = useState<View>(normalizeView(initialView));
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastSeq = useRef(0);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const [selectedEvidence, setSelectedEvidence] = useState<{ id: string; title: string; summary: string; disclosure: string; platform: string } | null>(null);
  const [eventsOpen, setEventsOpen] = useState(false);

  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(initialSession.activeScriptVersionId);
  const [draftContent, setDraftContent] = useState<ScriptEditable | null>(null);
  const draftContentRef = useRef<ScriptEditable | null>(null);
  const selectedScriptIdRef = useRef<string | null>(initialSession.activeScriptVersionId);
  const [dirty, setDirty] = useState(false);

  const [deliveryView, setDeliveryView] = useState<ContentDeliveryView | null>(null);
  const [deliverySubject, setDeliverySubject] = useState('');
  const [deliveryBody, setDeliveryBody] = useState('');
  const [deliveryRecipients, setDeliveryRecipients] = useState<Array<{ id: string; displayName: string; email: string }>>([]);
  const [deliveryDirty, setDeliveryDirty] = useState(false);
  const deliverySubjectRef = useRef('');
  const deliveryBodyRef = useRef('');
  const deliveryRecipientsRef = useRef<Array<{ id: string; displayName: string; email: string }>>([]);
  const deliveryDirtyRef = useRef(false);
  const [deliveryConfirm, setDeliveryConfirm] = useState<'success' | 'failure' | null>(null);
  const [deliveryError, setDeliveryError] = useState('');
  const [pendingNavigation, setPendingNavigation] = useState<{ step: Step; view: View; scriptId?: string } | null>(null);

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  const playingRef = useRef(false);
  const speedRef = useRef<ReplaySpeed>(1);
  const targetRef = useRef(0);
  const lastTickRef = useRef(0);
  const tickBusyRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  const pushToast = useCallback((message: string, tone: ToastMessage['tone'] = 'neutral') => {
    toastSeq.current += 1;
    setToasts((current) => [...current, { id: `content-${toastSeq.current}`, message, tone }].slice(-3));
  }, []);
  const updateSession = useCallback((next: SessionView) => {
    sessionRef.current = next;
    setSession(next);
    setSpeed(next.replay.speed);
    speedRef.current = next.replay.speed;
  }, []);

  const refreshDelivery = useCallback(async (target?: SessionView) => {
    const current = target ?? sessionRef.current;
    const result = await getBrowserApi().getContentDelivery(current.id);
    if (!result.ok) {
      setDeliveryError(`${result.error.code}: ${result.error.message}`);
      return;
    }
    setDeliveryView(result.data);
    const draft = result.data.delivery.draft;
    if (deliveryDirtyRef.current) return;
    setDeliveryDirty(false);
    if (draft) {
      setDeliverySubject(draft.subject);
      setDeliveryBody(draft.body);
      setDeliveryRecipients(draft.recipientSnapshot);
      deliverySubjectRef.current = draft.subject;
      deliveryBodyRef.current = draft.body;
      deliveryRecipientsRef.current = draft.recipientSnapshot;
    } else if (result.data.sourcePlan) {
      const plan = result.data.sourcePlan;
      const script = scenario?.contentPackage
        ? allScripts(current, scenario.contentPackage).find((entry) => entry.id === sessionRef.current.activeScriptVersionId)
        : undefined;
      setDeliverySubject(`[SIMULATED · CONTENT ONLY] ${script?.content.title ?? 'Lavish content review'}`);
      setDeliveryBody(
        `SIMULATED CONTENT-ONLY DELIVERY — NO EMAIL WAS SENT.\n\nScenario: ${scenario?.manifest.title ?? current.scenarioId}\nScript: ${script?.label ?? current.activeScriptVersionId ?? 'Not confirmed'}\n\nThis content demo has no video and no poster. No MP4 is attached or implied. Review the selected script, subtitles and product images.\n\nNo real email service was contacted. Recipient addresses use .invalid.`,
      );
      setDeliveryRecipients(plan.recipients);
      deliverySubjectRef.current = `[SIMULATED · CONTENT ONLY] ${script?.content.title ?? 'Lavish content review'}`;
      deliveryBodyRef.current = `SIMULATED CONTENT-ONLY DELIVERY — NO EMAIL WAS SENT.\n\nScenario: ${scenario?.manifest.title ?? current.scenarioId}\nScript: ${script?.label ?? current.activeScriptVersionId ?? 'Not confirmed'}\n\nThis content demo has no video and no poster. No MP4 is attached or implied. Review the selected script, subtitles and product images.\n\nNo real email service was contacted. Recipient addresses use .invalid.`;
      deliveryRecipientsRef.current = plan.recipients;
    }
  }, [scenario]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const api = getBrowserApi();
      const [scenarioResult, eventResult] = await Promise.all([
        api.getScenario({ scenarioId: session.scenarioId, scenarioVersion: session.scenarioVersion }),
        api.getEvents({ sessionId: session.id, afterSequence: 0, limit: 100 }),
      ]);
      if (cancelled) return;
      if (!scenarioResult.ok) setLoadError(`${scenarioResult.error.code}: ${scenarioResult.error.message}`);
      else setScenario(scenarioResult.data);
      if (eventResult.ok) setEvents(eventResult.data.items);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session.id, session.scenarioId, session.scenarioVersion]);

  useEffect(() => {
    if (!scenario?.contentPackage) return;
    const scripts = allScripts(sessionRef.current, scenario.contentPackage);
    const current = scripts.find((script) => script.id === selectedScriptId)
      ?? scripts.find((script) => script.id === sessionRef.current.activeScriptVersionId)
      ?? scripts[0];
    if (!current) return;
    setSelectedScriptId(current.id);
    selectedScriptIdRef.current = current.id;
    setDraftContent(current.content);
    draftContentRef.current = current.content;
    setDirty(false);
    // Only initialise when the package becomes available; explicit selection
    // and save handlers own subsequent form state and must not overwrite edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]);

  useEffect(() => {
    if (step !== 'delivery' || !scenario) return;
    void refreshDelivery(sessionRef.current);
  }, [step, session.revision, scenario, refreshDelivery]);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    };
  }, []);

  const totalEvents = events.length > 0 ? events[events.length - 1].sequence : 0;
  const currentPackage = useMemo(() => scenario?.contentPackage ?? null, [scenario]);
  const activeScript = useMemo(() => {
    if (!currentPackage) return null;
    const scripts = allScripts(session, currentPackage);
    return scripts.find((script) => script.id === selectedScriptId) ?? scripts[0] ?? null;
  }, [currentPackage, session.userVersions, selectedScriptId]);

  const updateDraft = (patch: Partial<ScriptEditable>) => {
    setDraftContent((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      draftContentRef.current = next;
      return next;
    });
    setDirty(true);
  };

  const restoreActiveScriptDraft = () => {
    if (!currentPackage) return;
    const scripts = allScripts(sessionRef.current, currentPackage);
    const current = scripts.find((script) => script.id === selectedScriptIdRef.current)
      ?? scripts.find((script) => script.id === sessionRef.current.activeScriptVersionId)
      ?? scripts[0];
    if (!current) return;
    setSelectedScriptId(current.id);
    selectedScriptIdRef.current = current.id;
    setDraftContent(current.content);
    draftContentRef.current = current.content;
    setDirty(false);
  };

  const markDeliveryDirty = () => {
    deliveryDirtyRef.current = true;
    setDeliveryDirty(true);
  };

  const discardDeliveryEdits = () => {
    deliveryDirtyRef.current = false;
    setDeliveryDirty(false);
    setDeliveryError('');
    void refreshDelivery(sessionRef.current);
  };

  const navigate = (nextStep: Step, nextView: View = view, force = false) => {
    if (!force && dirty) {
      setPendingNavigation({ step: nextStep, view: nextView });
      return;
    }
    setDirty(false);
    setStep(nextStep);
    setView(nextView);
    const params = new URLSearchParams({ step: nextStep, view: nextView });
    router.push(`/poc/${encodeURIComponent(session.id)}?${params.toString()}`);
  };

  const runStage = async (stage: 'discovery' | 'analysis') => {
    setBusy(true);
    try {
      const result = await getBrowserApi().executeStage(
        { sessionId: session.id, expectedRevision: session.revision, idempotencyKey: `stage-${stage}-${session.revision}` },
        { stage },
      );
      if (!result.ok) {
        pushToast(`${result.error.code}: ${result.error.message}`, 'error');
        return;
      }
      updateSession(result.data);
      pushToast(stage === 'discovery' ? 'Discovery completed in mock mode.' : 'Analysis prepared; review and confirm the script.', 'success');
    } finally {
      setBusy(false);
    }
  };

  const saveScript = async () => {
    const live = sessionRef.current;
    const scripts = currentPackage ? allScripts(live, currentPackage) : [];
    const scriptToSave = scripts.find((script) => script.id === selectedScriptIdRef.current) ?? activeScript;
    const contentToSave = draftContentRef.current ?? draftContent;
    if (!scriptToSave || !contentToSave) return;
    setBusy(true);
    try {
      const result = await getBrowserApi().saveScriptDraft(
        { sessionId: live.id, expectedRevision: live.revision, idempotencyKey: `save-${scriptToSave.id}-${live.revision}` },
        { baseVersionId: scriptToSave.id, content: contentToSave },
      );
      if (!result.ok) {
        pushToast(`${result.error.code}: ${result.error.message}`, 'error');
        return;
      }
      updateSession(result.data.session);
      setSelectedScriptId(result.data.version.id);
      selectedScriptIdRef.current = result.data.version.id;
      const nextContent = editableFromScript(result.data.version.content);
      setDraftContent(nextContent);
      draftContentRef.current = nextContent;
      setDirty(false);
      pushToast(`Saved ${result.data.version.language.toUpperCase()} script v${result.data.version.revision}.`, 'success');
      await refreshDelivery(result.data.session);
    } finally {
      setBusy(false);
    }
  };

  const selectScript = async (scriptId: string, force = false) => {
    if (dirty && !force) {
      setPendingNavigation({ step, view, scriptId });
      return;
    }
    const live = sessionRef.current;
    setBusy(true);
    try {
      const result = await getBrowserApi().selectScript(
        { sessionId: live.id, expectedRevision: live.revision, idempotencyKey: `select-${scriptId}-${live.revision}` },
        { scriptVersionId: scriptId },
      );
      if (!result.ok) {
        pushToast(`${result.error.code}: ${result.error.message}`, 'error');
        return;
      }
      updateSession(result.data);
      setSelectedScriptId(scriptId);
      selectedScriptIdRef.current = scriptId;
      const script = allScripts(result.data, currentPackage!).find((entry) => entry.id === scriptId);
      if (script) {
        setDraftContent(script.content);
        draftContentRef.current = script.content;
        setDirty(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmSelectedScript = async () => {
    const live = sessionRef.current;
    const scripts = currentPackage ? allScripts(live, currentPackage) : [];
    const scriptToConfirm = scripts.find((script) => script.id === selectedScriptIdRef.current) ?? activeScript;
    if (!scriptToConfirm) return;
    const result = await getBrowserApi().confirmScript(
      { sessionId: live.id, expectedRevision: live.revision, idempotencyKey: `confirm-${scriptToConfirm.id}-${live.revision}` },
      { scriptVersionId: scriptToConfirm.id },
    );
    if (!result.ok) {
      pushToast(`${result.error.code}: ${result.error.message}`, 'error');
      return;
    }
    updateSession(result.data);
    setDirty(false);
    pushToast('Script confirmed. Video remains deferred; content delivery is now available.', 'success');
    await refreshDelivery(result.data);
  };

  const saveDelivery = async () => {
    if (!deliveryView?.sourcePlan) return;
    const recipients = deliveryRecipientsRef.current;
    if (!recipients.length || recipients.some((recipient) => !/\.invalid$/i.test(recipient.email))) {
      setDeliveryError('Every recipient must use a .invalid demo address.');
      return;
    }
    setBusy(true);
    setDeliveryError('');
    const live = sessionRef.current;
    const subjectInput = document.querySelector<HTMLInputElement>('[data-testid="delivery-subject"]');
    const bodyInput = document.querySelector<HTMLTextAreaElement>('[data-testid="delivery-body"]');
    const subject = subjectInput?.value ?? deliverySubjectRef.current;
    const body = bodyInput?.value ?? deliveryBodyRef.current;
    try {
      const result = await getBrowserApi().saveContentDeliveryDraft(
        { sessionId: live.id, expectedRevision: live.revision, idempotencyKey: `content-draft-${live.revision}` },
        {
          sourcePlanId: deliveryView.sourcePlan.id,
          scriptVersionId: live.activeScriptVersionId!,
          recipientSnapshot: recipients,
          subject,
          body,
        },
      );
      if (!result.ok) {
        setDeliveryError(`${result.error.code}: ${result.error.message}`);
        return;
      }
      updateSession(result.data.session);
      setDeliveryView((current) => (current ? { ...current, delivery: result.data.session.contentDelivery ?? current.delivery } : current));
      deliveryDirtyRef.current = false;
      setDeliveryDirty(false);
      setDeliverySubject(result.data.draft.subject);
      setDeliveryBody(result.data.draft.body);
      setDeliveryRecipients(result.data.draft.recipientSnapshot);
      deliverySubjectRef.current = result.data.draft.subject;
      deliveryBodyRef.current = result.data.draft.body;
      deliveryRecipientsRef.current = result.data.draft.recipientSnapshot;
      pushToast('Content delivery draft saved. Confirm the actual attachment list before simulating.', 'success');
    } finally {
      setBusy(false);
    }
  };

  const simulateDelivery = async (mode: 'success' | 'failure') => {
    const draft = deliveryView?.delivery.draft;
    if (!draft) return;
    setDeliveryConfirm(null);
    setBusy(true);
    setDeliveryError('');
    const live = sessionRef.current;
    try {
      const result = await getBrowserApi().simulateContentDelivery(
        { sessionId: live.id, expectedRevision: live.revision, idempotencyKey: `content-simulate-${mode}-${draft.revision}-${(deliveryView?.delivery.attempts.length ?? 0) + 1}` },
        { draftRevision: draft.revision, confirmed: true, ...(mode === 'failure' ? { failureCase: 'delivery_failed' as const } : {}) },
      );
      if (!result.ok) {
        setDeliveryError(`${result.error.code}: ${result.error.message}`);
        return;
      }
      updateSession(result.data.session);
      setDeliveryView((current) => (current ? { ...current, delivery: result.data.session.contentDelivery ?? current.delivery } : current));
      pushToast(mode === 'failure' ? 'Simulated failure recorded. The snapshot is retained for retry.' : 'Simulated content delivery recorded. No email was sent.', mode === 'failure' ? 'error' : 'success');
    } finally {
      setBusy(false);
    }
  };

  const exportAttempt = async (attempt: ContentDeliveryAttempt) => {
    const result = await getBrowserApi().exportContentPack(
      { sessionId: session.id, expectedRevision: session.revision, idempotencyKey: `content-export-${attempt.id}` },
      { attemptId: attempt.id },
    );
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
    pushToast(`Downloaded real content ZIP (${result.data.bytes} bytes, SHA-256 ${result.data.sha256.slice(0, 12)}…).`, 'success');
  };

  const runReplayCommand = useCallback(async (input: Parameters<ReturnType<typeof getBrowserApi>['replayCommand']>[1], keySuffix: string) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const current = sessionRef.current;
      const result = await getBrowserApi().replayCommand(
        { sessionId: current.id, expectedRevision: current.revision, idempotencyKey: `content-${keySuffix}-${current.revision}-${attempt}` },
        input,
      );
      if (result.ok) {
        updateSession(result.data.session);
        return result;
      }
      if (result.error.code === 'REVISION_CONFLICT') {
        const fresh = await getBrowserApi().getSession({ sessionId: current.id });
        if (fresh.ok) updateSession(fresh.data);
        continue;
      }
      pushToast(`${result.error.code}: ${result.error.message}`, 'error');
      return result;
    }
    return null;
  }, [pushToast, updateSession]);

  const stopDriver = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pauseReplay = useCallback(async () => {
    stopDriver();
    const current = sessionRef.current;
    if (current.replay.transport === 'playing') {
      await runReplayCommand({ action: 'pause' }, 'pause');
    }
  }, [runReplayCommand, stopDriver]);

  const tick = useCallback(async () => {
    const current = sessionRef.current;
    if (!playingRef.current || !current || tickBusyRef.current || events.length === 0) return;
    const lastAt = events[events.length - 1].atMs;
    const now = performance.now();
    const delta = lastTickRef.current === 0 ? 0 : now - lastTickRef.current;
    lastTickRef.current = now;
    targetRef.current = Math.min(lastAt, targetRef.current + delta * speedRef.current);
    if (Math.round(targetRef.current) <= current.replay.virtualMs) return;
    tickBusyRef.current = true;
    const result = await getBrowserApi().advanceReplay(
      { sessionId: current.id, expectedRevision: current.revision, idempotencyKey: `content-tick-${current.revision}` },
      { targetVirtualMs: Math.round(targetRef.current) },
    );
    tickBusyRef.current = false;
    if (!result.ok) {
      if (result.error.code === 'REVISION_CONFLICT') {
        const fresh = await getBrowserApi().getSession({ sessionId: current.id });
        if (fresh.ok) updateSession(fresh.data);
        return;
      }
      stopDriver();
      pushToast(`${result.error.code}: ${result.error.message}`, 'error');
      return;
    }
    updateSession(result.data.session);
    if (result.data.session.replay.cursorSequence >= events[events.length - 1].sequence) {
      stopDriver();
      await pauseReplay();
    }
  }, [events, pauseReplay, pushToast, stopDriver, updateSession]);

  const startReplay = async () => {
    const current = sessionRef.current;
    if (events.length === 0) return;
    const total = events[events.length - 1].sequence;
    let next = current;
    if (next.replay.cursorSequence >= total) {
      const restarted = await runReplayCommand({ action: 'restart' }, 'restart-play');
      if (!restarted || !restarted.ok) return;
      next = restarted.data.session;
    }
    if (next.replay.transport !== 'playing') {
      const played = await runReplayCommand({ action: 'play' }, 'play');
      if (!played || !played.ok) return;
      next = played.data.session;
    }
    targetRef.current = next.replay.virtualMs;
    lastTickRef.current = performance.now();
    playingRef.current = true;
    setPlaying(true);
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => void tick(), 250);
  };

  const replayAction = async (action: 'step' | 'restart' | 'seek', cursorSequence?: number) => {
    stopDriver();
    const input = action === 'seek'
      ? { action: 'seek' as const, cursorSequence: cursorSequence ?? 0 }
      : action === 'restart'
        ? { action: 'restart' as const }
        : { action: 'step' as const };
    await runReplayCommand(input, `${action}-${cursorSequence ?? ''}`);
  };

  const changeSpeed = async (value: 1 | 2 | 4) => {
    speedRef.current = value;
    await runReplayCommand({ action: 'setSpeed', speed: value }, `speed-${value}`);
  };

  const stepperSteps: StepperStep[] = STEP_ORDER.map((entry) => {
    if (entry === 'discovery') return { id: entry, label: 'Discovery', meta: session.workflow.discovery === 'completed' ? 'Complete' : 'Signals & evidence', state: session.workflow.discovery === 'completed' ? 'completed' : entry === step ? 'current' : 'future' };
    if (entry === 'analysis') return { id: entry, label: 'Analysis & script', meta: session.workflow.analysis === 'completed' ? 'Confirmed' : 'Brief + EN/AR', state: session.workflow.analysis === 'completed' ? 'completed' : entry === step ? 'current' : 'future' };
    if (entry === 'video') return { id: entry, label: 'Storyboard', meta: 'Video deferred', state: entry === step ? 'current' : 'future' };
    return { id: entry, label: 'Content delivery', meta: 'Simulated pack', state: entry === step ? 'current' : session.workflow.analysis === 'completed' ? 'future' : 'future' };
  });

  if (loading) return <StateBlock kind="loading" title="Loading content demo" body="Reading the approved content-only package and local session." />;
  if (loadError) return <StateBlock kind="error" title="Content demo unavailable" body={loadError} action={<Link href="/">Back to Home</Link>} />;
  if (!currentPackage) return <StateBlock kind="error" title="Content package unavailable" body="The approved content package is not loaded." />;

  const packageData = currentPackage;
  const visible = new Set(session.replay.projection.visibleEntityIds);
  const replayMode = view === 'replay';
  const discoveryVisible = replayMode ? packageData.discovery.data.signals.filter((signal) => visible.has(signal.id)) : [];
  const trendVisible = replayMode ? packageData.discovery.data.trends.filter((trend) => visible.has(trend.id)) : packageData.discovery.data.trends;
  const evidenceById = new Map(packageData.discovery.data.evidence.map((evidence) => [evidence.id, evidence]));
  const selectedScript = activeScript;
  const atEnd = totalEvents > 0 && session.replay.cursorSequence >= totalEvents;

  return (
    <div className={workflowStyles.page} data-testid="content-workflow" data-dirty={dirty ? 'true' : 'false'}>
      <header className={workflowStyles.pageHeader}>
        <div className={workflowStyles.pageHeaderMain}>
          <p className={workflowStyles.eyebrow}>CONTENT-ONLY DEMO · MOCK · VIDEO DEFERRED</p>
          <h1 className={workflowStyles.title}>{scenario?.manifest.title ?? session.scenarioId}</h1>
          <p className={workflowStyles.lede}>
            {scenario?.manifest.authoring?.reasoningSummary ?? 'Approved content-only demo. Signals, analysis, scripts and storyboard are real authored content; video is deferred.'}
          </p>
          <div className={workflowStyles.breadcrumbMeta}>
            <Badge tone="mock">Mock / Demo</Badge>
            <Badge tone="info">Video deferred</Badge>
            <Badge tone="neutral">{session.profile === 'content_only' ? 'Content only' : 'Full profile'}</Badge>
            <span className={workflowStyles.modeNote}>revision {session.revision} · updated {formatDate(session.updatedAt)}</span>
          </div>
        </div>
        <div className={workflowStyles.headerActions}>
          <div className={workflowStyles.modeSwitch} role="group" aria-label="Data mode">
            <button type="button" className={workflowStyles.modeButton} aria-pressed={view === 'workflow'} onClick={() => navigate(step, 'workflow')} data-testid="content-mode-workflow">Operation mode</button>
            <button type="button" className={workflowStyles.modeButton} aria-pressed={view === 'replay'} onClick={() => navigate('analysis', 'replay')} data-testid="content-mode-replay">Replay mode</button>
          </div>
          <Link className={workflowStyles.modeNote} href="/">Back to Home</Link>
        </div>
      </header>

      <div className={styles.banner} role="note" data-testid="content-only-banner">
        <strong>Content-only Demo.</strong>
        <span>Video production is intentionally deferred. No MP4, poster, renderer or fake playback is used; scripts, product images, storyboard and the simulated content pack are real local data.</span>
      </div>

      <div className={workflowStyles.stepNav}>
        <Stepper
          steps={stepperSteps}
          label="Content demo workflow"
          onSelect={(entry) => {
            const target = entry.id as Step;
            if (replayMode && (target === 'video' || target === 'delivery')) {
              pushToast('Replay covers intelligence and script only; video/delivery are not replayed.', 'error');
              return;
            }
            navigate(target, replayMode ? 'replay' : 'workflow');
          }}
        />
      </div>

      {replayMode ? (
        <section className={workflowStyles.panel} aria-labelledby="replay-title">
          <div className={workflowStyles.panelHeader}>
            <h2 className={workflowStyles.panelTitle} id="replay-title">Intelligence & script replay</h2>
            <Badge tone="mock">Preset prefix · paused on refresh</Badge>
          </div>
          <ReplayControls
            playing={playing}
            speed={speed}
            cursorSequence={session.replay.cursorSequence}
            totalSequences={totalEvents}
            onPlay={() => void startReplay()}
            onPause={() => void pauseReplay()}
            onStep={() => void replayAction('step')}
            onRestart={() => void replayAction('restart')}
            onSeek={(sequence) => void replayAction('seek', sequence)}
            onSpeed={(value) => void changeSpeed(value)}
          />
          <p className={workflowStyles.modeNote} style={{ marginTop: 8 }}>
            {atEnd ? 'Replay ended at the analysis prefix. Video and delivery events are not replayed.' : `Virtual time ${Math.round(session.replay.virtualMs)} ms · cursor ${session.replay.cursorSequence}/${totalEvents}`}
          </p>
          <div className={styles.replayNotice} style={{ marginTop: 12 }}>
            Replay shows only the discovery and analysis prefix. It does not edit scripts, add delivery attempts or change operation-mode drafts.
          </div>
          <div className={styles.replayEntities} style={{ marginTop: 12 }} data-testid="replay-entities">
            {discoveryVisible.length === 0
              && trendVisible.length === 0
              && packageData.analysis.data.analyses.filter((entry) => visible.has(entry.id)).length === 0
              && packageData.analysis.data.briefs.filter((entry) => visible.has(entry.id)).length === 0
              && packageData.script.data.versions.filter((entry) => visible.has(entry.id)).length === 0
              && !atEnd ? (
                <div className={styles.replayEntity}>
                  <strong>Replay cursor {session.replay.cursorSequence}</strong>
                  Play or step to reveal the approved signals, analysis and script prefix. Editing is disabled in replay.
                </div>
              ) : null}
            {discoveryVisible.map((signal) => (
              <div className={styles.replayEntity} key={signal.id}><strong>Signal</strong>{signal.title}</div>
            ))}
            {trendVisible.map((trend) => (
              <div className={styles.replayEntity} key={trend.id}><strong>Trend</strong>{trend.title}</div>
            ))}
            {packageData.analysis.data.analyses.filter((entry) => visible.has(entry.id)).map((entry) => (
              <div className={styles.replayEntity} key={entry.id}><strong>Analysis</strong>{entry.recommendation}</div>
            ))}
            {packageData.analysis.data.briefs.filter((entry) => visible.has(entry.id)).map((entry) => (
              <div className={styles.replayEntity} key={entry.id}><strong>Brief</strong>{entry.name}</div>
            ))}
            {packageData.script.data.versions.filter((entry) => visible.has(entry.id)).map((entry) => (
              <div className={styles.replayEntity} key={entry.id}><strong>{entry.language.toUpperCase()} script</strong>{entry.title}</div>
            ))}
            {atEnd ? <div className={styles.replayEntity}><strong>Replay status</strong>Ended before video/delivery; no preset success is shown.</div> : null}
          </div>
        </section>
      ) : null}

      {!replayMode && step === 'discovery' ? (
        <section className={workflowStyles.panel} aria-labelledby="discovery-title">
          <div className={workflowStyles.panelHeader}>
            <h2 className={workflowStyles.panelTitle} id="discovery-title">Social Trend Discovery</h2>
            <div className={styles.statusRow}><Badge tone="mock">Synthetic signals</Badge><Badge tone="neutral">{packageData.discovery.data.signals.length} signals</Badge></div>
          </div>
          {session.workflow.discovery !== 'completed' ? (
            <div className={workflowStyles.stack}>
              <StateBlock kind="empty" title="Discovery is ready" body="Run the approved discovery replay to expose five synthetic signals, two illustrative trends and their evidence." action={<Button variant="primary" onClick={() => void runStage('discovery')} pending={busy} data-testid="run-discovery">Run discovery</Button>} />
            </div>
          ) : (
            <div className={styles.contentGrid}>
              <div className={workflowStyles.stack}>
                {packageData.discovery.data.signals.map((signal) => (
                  <button
                    type="button"
                    className={styles.signalCard}
                    key={signal.id}
                    onClick={() => {
                      const evidence = evidenceById.get(signal.evidenceIds[0]);
                      if (evidence) setSelectedEvidence({ id: evidence.id, title: evidence.title, summary: evidence.summary, disclosure: evidence.disclosure, platform: evidence.platform });
                    }}
                    data-testid="signal-card"
                  >
                    <span className={styles.signalTop}><span className={styles.signalTitle}>{signal.title}</span><span className={styles.signalTopic}>{signal.region}</span></span>
                    <span className={styles.signalSummary}>{signal.summary}</span>
                    <span className={styles.signalMeta}>{signal.topic} · evidence {signal.evidenceIds.length} · open evidence</span>
                  </button>
                ))}
              </div>
              <div className={workflowStyles.stack}>
                {packageData.discovery.data.trends.map((trend) => {
                  const points = trend.points;
                  const width = 260;
                  const height = 80;
                  const values = points.map((point) => point.value);
                  const min = Math.min(...values);
                  const max = Math.max(...values);
                  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${(index / Math.max(1, points.length - 1)) * width},${height - ((point.value - min) / Math.max(1, max - min)) * (height - 12) - 6}`).join(' ');
                  return (
                    <div className={styles.trendCard} key={trend.id}>
                      <div className={styles.trendHeader}><span className={styles.trendTitle}>{trend.title}</span><Badge tone="info">{trend.direction}</Badge></div>
                      <svg className={styles.trendChart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${trend.title}; synthetic illustrative index`}>
                        <path d={path} fill="none" stroke="var(--brand-gold-deep)" strokeWidth="2" />
                      </svg>
                      <div className={styles.trendFoot}><span>{trend.unit}</span><span>{points.length} synthetic points</span></div>
                    </div>
                  );
                })}
                <button type="button" className={styles.eventToggle} onClick={() => setEventsOpen((open) => !open)} aria-expanded={eventsOpen} data-testid="events-toggle">
                  <span>Event timeline · {events.length} prefix events</span><span>{eventsOpen ? 'Hide' : 'Show'}</span>
                </button>
                {eventsOpen ? (
                  <ul className={styles.eventList} data-testid="event-list">
                    {events.map((event) => (
                      <li className={styles.eventItem} key={event.id}>
                        <span className={styles.eventSeq}>{event.sequence}</span>
                        <span className={styles.eventType}>{event.stage} · {event.type}</span>
                        <span className={styles.eventTime}>{formatMs(event.atMs)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          )}
        </section>
      ) : null}

      {!replayMode && step === 'analysis' ? (
        <section className={workflowStyles.panel} aria-labelledby="analysis-title">
          <div className={workflowStyles.panelHeader}>
            <h2 className={workflowStyles.panelTitle} id="analysis-title">AI Analysis & Script</h2>
            <div className={styles.statusRow}>
              <Badge tone="mock">Mock analysis</Badge>
              <Badge tone={session.workflow.analysis === 'completed' ? 'success' : 'neutral'}>{session.workflow.analysis === 'completed' ? 'Script confirmed' : 'Draft / confirm'}</Badge>
            </div>
          </div>
          {session.workflow.analysis === 'ready' ? (
            <StateBlock kind="empty" title="Analysis is ready" body="Run the approved analysis replay, then review the brief and edit the EN/AR script." action={<Button variant="primary" onClick={() => void runStage('analysis')} pending={busy} data-testid="run-analysis">Run analysis</Button>} />
          ) : session.workflow.analysis === 'locked' ? (
            <StateBlock kind="empty" title="Discovery required" body="Complete discovery before analysis." />
          ) : (
            <div className={workflowStyles.stack}>
              <div className={styles.briefList}>
                {packageData.analysis.data.briefs.map((brief) => (
                  <div className={styles.briefItem} key={brief.id}><strong>{brief.name}</strong>{brief.objective}<br /><span className={styles.signalMeta}>{brief.concept}</span></div>
                ))}
              </div>
              {selectedScript && draftContent ? (
                <>
                  <div className={styles.scriptHeader}>
                    <div className={styles.scriptVersions}>
                      {allScripts(session, packageData).map((script) => (
                        <button key={script.id} type="button" className={styles.versionChip} aria-pressed={script.id === selectedScriptId} disabled={busy} onClick={() => void selectScript(script.id)} data-testid="version-chip">
                          {script.label}
                        </button>
                      ))}
                    </div>
                    <div className={styles.statusRow}><Badge tone={activeScript?.preset ? 'neutral' : 'success'}>{activeScript?.preset ? 'Preset version' : 'Saved version'}</Badge></div>
                  </div>
                  <div className={styles.editorGrid}>
                    <Input label="Script title" value={draftContent.title} onChange={(event) => updateDraft({ title: event.target.value })} />
                    <Input label="Hook" value={draftContent.hook} onChange={(event) => updateDraft({ hook: event.target.value })} />
                    <div className={styles.editorFull}><Textarea label="Message" value={draftContent.message} onChange={(event) => updateDraft({ message: event.target.value })} rows={3} /></div>
                    <Input label="CTA" value={draftContent.cta} onChange={(event) => updateDraft({ cta: event.target.value })} />
                    <Input label="Hashtags" value={draftContent.hashtags.join(' ')} onChange={(event) => updateDraft({ hashtags: event.target.value.split(/\s+/).filter(Boolean) })} />
                    <div className={styles.editorFull}><Textarea label="Caption" value={draftContent.caption} onChange={(event) => updateDraft({ caption: event.target.value })} rows={2} /></div>
                  </div>
                  <div className={styles.scriptSection}>
                    <h3 className={styles.scriptSectionTitle}>Four shots · timecoded</h3>
                    <div className={workflowStyles.stack}>
                      {draftContent.shots.map((shot, index) => (
                        <div className={styles.shotEditor} key={shot.id}>
                          <div className={styles.shotEditorHeader}><span>{index + 1} · {shot.id}</span><span>start {shot.startMs}ms · duration {shot.durationMs}ms</span></div>
                          <div className={styles.editorGrid}>
                            <Input label="Start ms" type="number" value={String(shot.startMs)} onChange={(event) => updateDraft({ shots: draftContent.shots.map((current) => current.id === shot.id ? { ...current, startMs: Number(event.target.value) } : current) })} />
                            <Input label="Duration ms" type="number" value={String(shot.durationMs)} onChange={(event) => updateDraft({ shots: draftContent.shots.map((current) => current.id === shot.id ? { ...current, durationMs: Number(event.target.value) } : current) })} />
                            <Input label="On-screen text" value={shot.onScreenText} onChange={(event) => updateDraft({ shots: draftContent.shots.map((current) => current.id === shot.id ? { ...current, onScreenText: event.target.value } : current) })} />
                            <Input label="Asset IDs" value={shot.assetIds.join(', ')} readOnly />
                            <div className={styles.editorFull}><Textarea label="Visual direction" value={shot.visual} onChange={(event) => updateDraft({ shots: draftContent.shots.map((current) => current.id === shot.id ? { ...current, visual: event.target.value } : current) })} rows={2} /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.scriptSection}>
                    <h3 className={styles.scriptSectionTitle}>Subtitles · EN/AR selected script</h3>
                    <div className={workflowStyles.stack}>
                      {draftContent.subtitles.map((subtitle) => (
                        <div className={styles.shotEditor} key={subtitle.id}>
                          <div className={styles.shotEditorHeader}><span>{subtitle.id}</span><span>{subtitle.startMs}–{subtitle.endMs}ms</span></div>
                          <div className={styles.editorGrid}>
                            <Input label="Start ms" type="number" value={String(subtitle.startMs)} onChange={(event) => updateDraft({ subtitles: draftContent.subtitles.map((current) => current.id === subtitle.id ? { ...current, startMs: Number(event.target.value) } : current) })} />
                            <Input label="End ms" type="number" value={String(subtitle.endMs)} onChange={(event) => updateDraft({ subtitles: draftContent.subtitles.map((current) => current.id === subtitle.id ? { ...current, endMs: Number(event.target.value) } : current) })} />
                            <div className={styles.editorFull}><Input label="Subtitle text" value={subtitle.text} onChange={(event) => updateDraft({ subtitles: draftContent.subtitles.map((current) => current.id === subtitle.id ? { ...current, text: event.target.value } : current) })} /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.scriptActions}>
                    {dirty ? <span className={styles.dirtyNote}>Unsaved changes — save a new version or discard before leaving.</span> : null}
                    <Button variant="secondary" onClick={restoreActiveScriptDraft} disabled={!dirty} data-testid="discard-script-edits">Discard edits</Button>
                    <Button variant="primary" onClick={() => void saveScript()} pending={busy} disabled={busy} data-testid="save-script">Save new version</Button>
                    <Button variant="primary" onClick={() => void confirmSelectedScript()} disabled={session.workflow.analysis === 'completed' || dirty || busy} data-testid="confirm-script">Confirm script</Button>
                  </div>
                  <p className={workflowStyles.modeNote}>Editing creates a derived user version; preset content is never overwritten. Arabic copy remains subject to native review.</p>
                </>
              ) : <StateBlock kind="empty" title="No script visible" body="The analysis prefix has not exposed a script yet." />}
            </div>
          )}
        </section>
      ) : null}

      {!replayMode && step === 'video' ? (
        <section className={workflowStyles.panel} aria-labelledby="storyboard-title">
          <div className={workflowStyles.panelHeader}>
            <h2 className={workflowStyles.panelTitle} id="storyboard-title">Storyboard</h2>
            <Badge tone="info">Video production deferred</Badge>
          </div>
          {session.workflow.analysis !== 'completed' ? (
            <StateBlock kind="empty" title="Confirm the script first" body="Storyboard review becomes available after the active script is confirmed." />
          ) : activeScript ? (
            <div className={workflowStyles.stack}>
              <div className={styles.deferredPanel}>
                <div className={styles.deferredTitle}><Badge tone="mock">No MP4 / poster</Badge> Video is intentionally deferred</div>
                <p className={workflowStyles.modeNote}>There is no player, render progress or download button. Shot timing, on-screen text, visuals and subtitles below are the approved authored storyboard; product images are real received assets.</p>
              </div>
              <div className={styles.storyboardGrid}>
                {activeScript.content.shots.map((shot, index) => {
                  const asset = assetById(scenario!, shot.assetIds.find((id) => assetById(scenario!, id)?.kind === 'product_image' || assetById(scenario!, id)?.kind === 'logo') ?? '');
                  return (
                    <article className={styles.shotCard} key={shot.id} data-testid="shot-card">
                      <div className={styles.shotMedia}>
                        {asset ? <img src={asset.uri} alt={asset.kind === 'logo' ? 'Lavish Perfumes logo' : 'Approved Lavish product image'} /> : <span>No received image for this shot</span>}
                      </div>
                      <div className={styles.shotHead}><span className={styles.shotName}>Shot {index + 1} · {formatMs(shot.startMs)}</span><span className={styles.shotTime}>{shot.durationMs}ms</span></div>
                      <p className={styles.shotText}>{shot.onScreenText}</p>
                      <p className={styles.shotVisual}>{shot.visual}</p>
                      {activeScript.content.subtitles[index] ? <p className={styles.shotVisual} dir={activeScript.language === 'ar' ? 'rtl' : 'ltr'}>{activeScript.content.subtitles[index].text}</p> : null}
                    </article>
                  );
                })}
              </div>
              <div className={workflowStyles.actionBar}>
                <div className={workflowStyles.actionHint}><strong>Video deferred</strong><span>Continue to the simulated content-only delivery; no video is required.</span></div>
                <Button variant="primary" onClick={() => navigate('delivery', 'workflow')} data-testid="go-content-delivery">Continue to content delivery</Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {!replayMode && step === 'delivery' ? (
        <section className={workflowStyles.panel} aria-labelledby="content-delivery-title">
          <div className={workflowStyles.panelHeader}>
            <h2 className={workflowStyles.panelTitle} id="content-delivery-title">Content Delivery / Simulated</h2>
            <div className={styles.statusRow}><Badge tone="mock">Content pack</Badge><Badge tone="info">No email sent</Badge></div>
          </div>
          {session.workflow.analysis !== 'completed' ? (
            <StateBlock kind="empty" title="Confirm the script first" body="Content delivery uses the confirmed active script and its actual subtitles." />
          ) : !deliveryView ? (
            <StateBlock kind="loading" title="Loading content delivery" body="Reading the current draft and attempt history." />
          ) : (
            <div className={workflowStyles.stack}>
              <div className={styles.deliveryGrid}>
                <div className={styles.mailPreview} data-testid="mail-preview">
                  <div className={styles.mailHead}>
                    <span className={styles.mailSubject}>{deliverySubject || 'No subject yet'}</span>
                    <span className={styles.mailMeta}>To: {deliveryRecipients.map((recipient) => `${recipient.displayName} <${recipient.email}>`).join(', ') || 'No recipient'}</span>
                    <span className={styles.mailMeta}>Simulated content-only email — no email sent, no video attached.</span>
                  </div>
                  <p className={styles.mailBody}>{deliveryBody || 'No body yet.'}</p>
                </div>
                <div className={workflowStyles.stack}>
                  <Input label="Subject" value={deliverySubject} onChange={(event) => { setDeliverySubject(event.target.value); deliverySubjectRef.current = event.target.value; markDeliveryDirty(); }} data-testid="delivery-subject" />
                  <Textarea label="Body" value={deliveryBody} onChange={(event) => { setDeliveryBody(event.target.value); deliveryBodyRef.current = event.target.value; markDeliveryDirty(); }} rows={6} data-testid="delivery-body" />
                  <div className={styles.recipientEditor}>
                    {deliveryRecipients.map((recipient, index) => (
                      <div className={styles.recipientRow} key={recipient.id}>
                        <Input label={`Recipient ${index + 1}`} value={recipient.displayName} onChange={(event) => setDeliveryRecipients((current) => { const next = current.map((entry) => entry.id === recipient.id ? { ...entry, displayName: event.target.value } : entry); deliveryRecipientsRef.current = next; markDeliveryDirty(); return next; })} />
                        <Input label=".invalid email" value={recipient.email} onChange={(event) => setDeliveryRecipients((current) => { const next = current.map((entry) => entry.id === recipient.id ? { ...entry, email: event.target.value } : entry); deliveryRecipientsRef.current = next; markDeliveryDirty(); return next; })} />
                      </div>
                    ))}
                  </div>
                  <div className={styles.statusRow}>
                    <Button variant="secondary" onClick={() => void saveDelivery()} pending={busy} data-testid="save-content-draft">Save draft</Button>
                    <Button variant="primary" onClick={() => setDeliveryConfirm('success')} disabled={!deliveryView.delivery.draft || busy || deliveryDirty} data-testid="confirm-content-delivery">Confirm simulated delivery</Button>
                    <Button variant="ghost" onClick={() => setDeliveryConfirm('failure')} disabled={!deliveryView.delivery.draft || busy || deliveryDirty} data-testid="fail-content-delivery">Simulate failure</Button>
                    {deliveryDirty ? <Button variant="ghost" onClick={discardDeliveryEdits} disabled={busy} data-testid="discard-delivery-edits">Discard changes</Button> : null}
                  </div>
                  {deliveryDirty ? <p className={styles.dirtyNote} role="status" data-testid="delivery-dirty-hint">Unsaved changes — save this draft before confirming or simulating. The confirmation uses the saved revision only.</p> : null}
                  {deliveryError ? <p className={styles.dirtyNote} role="alert">{deliveryError}</p> : null}
                  <div>
                    <h3 className={styles.scriptSectionTitle}>Actual attachments</h3>
                    {deliveryView.delivery.draft ? (
                      <ul className={styles.attachmentList} data-testid="content-attachments">
                        {deliveryView.delivery.draft.attachmentManifest.map((attachment) => (
                          <li className={styles.attachmentItem} key={attachment.filename}><code>{attachment.filename}</code><span>{attachment.bytes} B · {attachment.sha256.slice(0, 10)}…</span></li>
                        ))}
                      </ul>
                    ) : (
                      <p className={workflowStyles.modeNote}>Save a draft to generate the actual script JSON, VTT, email text and README attachment manifest. No MP4/poster is ever added.</p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <h3 className={styles.scriptSectionTitle}>Attempt history</h3>
                {deliveryView.delivery.attempts.length === 0 ? (
                  <p className={workflowStyles.modeNote} data-testid="no-attempts">No attempts yet. The simulated result is written only after explicit confirmation.</p>
                ) : (
                  <table className={styles.attemptTable} data-testid="attempt-table">
                    <thead><tr><th>Attempt</th><th>Result</th><th>Script</th><th>Snapshot</th><th /></tr></thead>
                    <tbody>
                      {deliveryView.delivery.attempts.map((attempt) => (
                        <tr key={attempt.id}>
                          <td>{attempt.attempt}</td>
                          <td>{attempt.outcome === 'failed' ? 'Simulated failure' : 'Simulated delivered'}</td>
                          <td>{attempt.scriptVersionId}</td>
                          <td>{attempt.attachmentManifest.length} files · {attempt.subject}</td>
                          <td><Button size="small" variant="secondary" onClick={() => void exportAttempt(attempt)} data-testid="export-attempt">{attempt.outcome === 'failed' ? 'Export failure record' : 'Export ZIP'}</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </section>
      ) : null}

      <Overlay
        open={Boolean(selectedEvidence)}
        onClose={() => setSelectedEvidence(null)}
        variant="drawer"
        title={selectedEvidence?.title ?? 'Evidence'}
        description={selectedEvidence ? `${selectedEvidence.platform} · synthetic evidence` : undefined}
        testId="content-evidence-drawer"
        footer={<Button variant="secondary" onClick={() => setSelectedEvidence(null)}>Close</Button>}
      >
        {selectedEvidence ? (
          <div className={workflowStyles.stack}>
            <p className={workflowStyles.modeNote}>{selectedEvidence.summary}</p>
            <p className={workflowStyles.modeNote}>{selectedEvidence.disclosure}</p>
            <Badge tone="mock">MOCK · not a real platform post</Badge>
          </div>
        ) : null}
      </Overlay>

      <Overlay
        open={deliveryConfirm !== null}
        onClose={() => setDeliveryConfirm(null)}
        variant="dialog"
        title={deliveryConfirm === 'failure' ? 'Simulate a failed content delivery?' : 'Confirm simulated content delivery?'}
        description="This writes a local mock attempt only. No email is sent and no video is attached."
        testId="content-delivery-confirm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeliveryConfirm(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => void simulateDelivery(deliveryConfirm ?? 'success')} disabled={!deliveryView?.delivery.draft || busy || deliveryDirty} data-testid="confirm-content-simulate">
              {deliveryConfirm === 'failure' ? 'Record simulated failure' : 'Record simulated delivery'}
            </Button>
          </>
        }
      >
        <div className={workflowStyles.stack}>
          <p className={workflowStyles.modeNote}>Saved draft revision {deliveryView?.delivery.draft?.revision ?? '—'} — the exact snapshot below is what will be recorded and exported.</p>
          <p className={workflowStyles.modeNote}>Subject: {deliveryView?.delivery.draft?.subject ?? 'No saved subject'}</p>
          <p className={workflowStyles.modeNote}>Recipients: {deliveryView?.delivery.draft?.recipientSnapshot.map((recipient) => recipient.email).join(', ') || 'None'}</p>
          <p className={workflowStyles.modeNote}>Body: {deliveryView?.delivery.draft?.body ?? 'No saved body'}</p>
          <ul className={styles.attachmentList}>
            {deliveryView?.delivery.draft?.attachmentManifest.map((attachment) => (
              <li className={styles.attachmentItem} key={attachment.filename}><code>{attachment.filename}</code><span>{attachment.bytes} B</span></li>
            ))}
            <li className={styles.attachmentItem}><code>SIMULATED-DELIVERY.json</code><span>written on export</span></li>
          </ul>
          <p className={workflowStyles.modeNote}>No MP4 or poster is included. This is not a real email delivery.</p>
        </div>
      </Overlay>

      <Overlay
        open={pendingNavigation !== null}
        onClose={() => setPendingNavigation(null)}
        variant="dialog"
        title="Discard unsaved script changes?"
        description="Saving a new version keeps the previous version. Leaving now discards only this unsaved edit."
        testId="content-dirty-dialog"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingNavigation(null)}>Keep editing</Button>
            <Button variant="primary" onClick={() => {
              const target = pendingNavigation;
              setPendingNavigation(null);
              restoreActiveScriptDraft();
              if (!target) return;
              if (target.scriptId) void selectScript(target.scriptId, true);
              else navigate(target.step, target.view, true);
            }}>Discard and leave</Button>
          </>
        }
      >
        <p className={workflowStyles.modeNote}>The confirmed/saved versions remain available; only the current unsaved form changes are discarded.</p>
      </Overlay>

      <ToastRegion toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </div>
  );
}
