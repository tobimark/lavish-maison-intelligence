'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Badge, Button, Overlay, StateBlock, ToastRegion, type ToastMessage } from './index';
import { getBrowserApi, formatDate } from './browser-api';
import type { ScenarioListItem, SessionSummary } from '../../demo/poc/api/types';
import styles from './home.module.css';

type LoadState = 'loading' | 'ready' | 'error';

const LETTERS = ['A', 'B', 'C'];

export function HomeDashboard() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [scenarios, setScenarios] = useState<ScenarioListItem[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<SessionSummary | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastSequence = useRef(0);

  const load = useCallback(async () => {
    setLoadState('loading');
    setError('');
    try {
      const api = getBrowserApi();
      const [scenarioResult, sessionResult] = await Promise.all([api.listScenarios(), api.listSessions()]);
      if (!scenarioResult.ok) throw new Error(`${scenarioResult.error.code}: ${scenarioResult.error.message}`);
      if (!sessionResult.ok) throw new Error(`${sessionResult.error.code}: ${sessionResult.error.message}`);
      setScenarios(scenarioResult.data.items);
      setSessions(sessionResult.data.items);
      setLoadState('ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const titleById = useMemo(() => Object.fromEntries(scenarios.map((scenario) => [scenario.scenarioId, scenario.title])), [scenarios]);

  const pushToast = (message: string, tone: ToastMessage['tone'] = 'neutral') => {
    toastSequence.current += 1;
    setToasts((current) => [...current, { id: `home-${toastSequence.current}`, message, tone }].slice(-3));
  };

  const startScenario = async (scenario: ScenarioListItem) => {
    if ((scenario.readiness !== 'ready' && scenario.readiness !== 'content_ready') || !scenario.scenarioVersion) return;
    setBusyId(scenario.scenarioId);
    try {
      const api = getBrowserApi();
      const creationKey = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const result = await api.createSession({
        scenarioId: scenario.scenarioId,
        scenarioVersion: scenario.scenarioVersion,
        creationKey,
      });
      if (!result.ok) {
        pushToast(`${result.error.code}: ${result.error.message}`, 'error');
        return;
      }
      router.push(`/poc/${encodeURIComponent(result.data.id)}?step=discovery&view=workflow`);
    } finally {
      setBusyId(null);
    }
  };

  const exportSession = async (session: SessionSummary) => {
    const result = await getBrowserApi().getDownload({ sessionId: session.id, kind: 'run_record', entityId: session.id });
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
    pushToast('Local session recovery record exported.', 'success');
  };

  const resetSession = async () => {
    if (!resetTarget) return;
    const target = resetTarget;
    setResetTarget(null);
    const result = await getBrowserApi().resetSession(
      { sessionId: target.id, expectedRevision: target.revision, idempotencyKey: `reset-${Date.now()}` },
      { confirmation: 'RESET_THIS_SESSION' },
    );
    if (!result.ok) {
      pushToast(`${result.error.code}: ${result.error.message}`, 'error');
      return;
    }
    pushToast('This local demo session was reset.', 'success');
    await load();
  };

  if (loadState === 'loading') {
    return (
      <div className={styles.page} aria-busy="true">
        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>LAVISH AI MARKETING · DEMO</p>
          <h1 className={styles.title}>Lavish AI Marketing</h1>
        </header>
        <StateBlock kind="loading" title="Loading workspace" body="Reading the approved scenario catalog and local demo sessions." />
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>LAVISH AI MARKETING · DEMO</p>
          <h1 className={styles.title}>Lavish AI Marketing</h1>
        </header>
        <StateBlock
          kind="error"
          title="Workspace unavailable"
          body={error}
          action={<Button variant="secondary" onClick={() => void load()}>Try again</Button>}
        />
      </div>
    );
  }

  return (
    <div className={styles.page} data-testid="home-dashboard">
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>LAVISH AI MARKETING · DEMO</p>
        <h1 className={styles.title}>Lavish AI Marketing</h1>
        <p className={styles.lede}>
          A content-only mock workspace for discovery, analysis and script, storyboard, and simulated
          content delivery. Video production is intentionally deferred; every result is labelled Mock or
          Simulated and no live platform or model is connected.
        </p>
        <p className={styles.metaRow}>
          <span>Mock API · local browser storage</span>
          <span>No customer data</span>
          <span>DEMO / Simulated</span>
        </p>
      </header>

      <section className={styles.section} aria-labelledby="scenarios-title">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} id="scenarios-title">Scenarios</h2>
          <p className={styles.sectionNote}>Only a locally published content package can start the content demo; author review status remains pending and video stays deferred.</p>
        </div>
        {scenarios.length === 0 ? (
          <StateBlock kind="empty" title="No approved scenarios" body="The scenario catalog returned no entries. Content must be approved before it can appear here." />
        ) : (
          <div className={styles.scenarioList}>
            {scenarios.map((scenario, index) => {
              const ready = (scenario.readiness === 'ready' || scenario.readiness === 'content_ready') && Boolean(scenario.scenarioVersion);
              const contentOnly = scenario.profile === 'content_only';
              return (
                <article className={styles.scenarioRow} key={scenario.scenarioId} data-testid="home-scenario-row">
                  <span className={styles.scenarioLetter} aria-hidden="true">{LETTERS[index] ?? '·'}</span>
                  <div className={styles.scenarioBody}>
                    <div className={styles.scenarioTitleRow}>
                      <h3 className={styles.scenarioTitle}>{scenario.title}</h3>
                      <Badge tone={ready ? 'success' : scenario.readiness === 'invalid' ? 'error' : 'mock'}>
                        {ready ? (contentOnly ? 'Content demo' : 'Ready') : scenario.readiness === 'invalid' ? 'Invalid' : 'Awaiting content'}
                      </Badge>
                      <Badge tone="neutral">Mock / Demo</Badge>
                      {contentOnly ? <Badge tone="info">Video deferred</Badge> : null}
                    </div>
                    <div className={styles.scenarioMeta}>
                      <span>{scenario.scenarioId}</span>
                      <span>{scenario.scenarioVersion ?? 'No package version'}</span>
                      <span>Content package ready · video deferred</span>
                    </div>
                    {scenario.issues.length > 0 ? (
                      <ul className={styles.scenarioIssues}>
                        <li>
                          {ready
                            ? 'Content, EN/AR scripts, product images and simulated delivery data are ready. Video is intentionally deferred — no MP4 is required for the content demo.'
                            : 'Awaiting the complete scenario package and script-matched media from the content owner.'}
                        </li>
                      </ul>
                    ) : null}
                  </div>
                  <div className={styles.scenarioActions}>
                    <Link
                      className={styles.previewLink}
                      href={`/poc/preview?scenarioId=${encodeURIComponent(scenario.scenarioId)}&step=discovery&view=workflow`}
                      data-testid="home-preview-link"
                    >
                      Layout preview
                    </Link>
                    <Button
                      variant="primary"
                      size="small"
                      disabled={!ready}
                      pending={busyId === scenario.scenarioId}
                      onClick={() => void startScenario(scenario)}
                      data-testid={ready ? 'home-start-enabled' : 'home-start-disabled'}
                    >
                      {ready ? 'Start content demo' : 'Start unavailable'}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="sessions-title">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} id="sessions-title">Recent local demo sessions</h2>
          <p className={styles.sectionNote}>Stored in this browser only. Reset affects only the selected session.</p>
        </div>
        {sessions.length === 0 ? (
          <div data-testid="home-sessions-empty">
            <StateBlock
              kind="empty"
              title="No local sessions yet"
              body="Start a content demo above. Your locally stored demo sessions will appear here with Continue, Export and Reset actions."
              action={<Button size="small" variant="secondary" onClick={() => void load()}>Refresh</Button>}
            />
          </div>
        ) : (
          <div className={styles.sessionList}>
            {sessions.map((session) => (
              <div className={styles.sessionRow} key={session.id} data-testid="home-session-row">
                <div className={styles.sessionMain}>
                  <span className={styles.sessionTitle}>{titleById[session.scenarioId] ?? session.scenarioId}</span>
                  <span className={styles.sessionMeta}>
                    {session.id} · revision {session.revision} · updated {formatDate(session.updatedAt)}
                  </span>
                </div>
                <div className={styles.sessionActions}>
                  <Link className={styles.previewLink} href={`/poc/${encodeURIComponent(session.id)}?step=discovery&view=workflow`}>
                    Continue
                  </Link>
                  <Button size="small" variant="secondary" onClick={() => void exportSession(session)} data-testid="home-session-export">Export</Button>
                  <Button size="small" variant="ghost" onClick={() => setResetTarget(session)} data-testid="home-session-reset">Reset</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className={styles.footerNote}>
        <span>All scenario data is mock; no live model, renderer, email or platform is called.</span>
        <span>MAISON INTELLIGENCE · DEMO</span>
      </div>

      <Overlay
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        variant="dialog"
        title="Reset this local demo session?"
        description="Only the selected session audit is reset. Other local sessions and the approved catalog are unchanged."
        testId="home-reset-dialog"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => void resetSession()}>Reset session</Button>
          </>
        }
      >
        <p className={styles.sectionNote}>
          {resetTarget ? `${resetTarget.id} · revision ${resetTarget.revision}` : ''}
        </p>
      </Overlay>

      <ToastRegion toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </div>
  );
}
