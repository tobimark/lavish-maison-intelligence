'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Badge, Button, Overlay, StateBlock } from '../../poc';
import { getBrowserApi } from '../../poc/browser-api';
import type {
  ActivityEventView,
  CampaignCard,
  ProductSignalView,
  ProductSource,
} from '../../../demo/poc/api/product-contract';
import type { SessionView as Session } from '../../../demo/poc/api/types';
import type { CampaignJourney } from '../../../demo/poc/api/flow-contract';
import { InsightStage } from '../journey/InsightStage';
import { useCampaignWorkspace } from '../shared/useCampaignWorkspace';
import { TrendChart } from './TrendChart';
import styles from '../workspace.module.css';

const SOURCE_LABELS: Record<ProductSource, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  pinterest: 'Pinterest',
  youtube: 'YouTube',
  other: 'Other',
};

const EVENT_LABELS: Record<string, string> = {
  'stage.started': 'Stage started',
  'stage.completed': 'Stage completed',
  'signal.discovered': 'Signal captured',
  'signal.clustered': 'Signals grouped into a theme',
  'evidence.attached': 'Evidence attached',
  'trend.identified': 'Trend prepared',
  'analysis.started': 'Analysis started',
  'analysis.completed': 'Analysis completed',
  'brief.created': 'Campaign brief drafted',
  'script.presented': 'Script version presented',
  'analysis.insight': 'Insight recorded',
  'analysis.recommendation': 'Recommendation recorded',
};

function humanizeEvent(event: ActivityEventView): string {
  const base = EVENT_LABELS[event.type] ?? event.type.replace(/[._]/g, ' ');
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function eventDetail(event: ActivityEventView): string {
  const refs = [...event.inputRefs, ...event.outputRefs].filter(Boolean);
  return refs.length > 0 ? refs.map((ref) => ref.split('.').slice(-2).join('.')).join(', ') : 'No linked content reference';
}

type LoadState = 'loading' | 'ready' | 'error';

export function RadarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspace = useCampaignWorkspace();
  const sourceParam = searchParams.get('source') as ProductSource | null;
  const topicParam = searchParams.get('topic') ?? '';
  const campaignParam = searchParams.get('campaignId') ?? '';
  const signalParam = searchParams.get('signalId') ?? '';
  const activityParam = searchParams.get('activity') === '1';

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState('');
  const [items, setItems] = useState<ProductSignalView[]>([]);
  const [sources, setSources] = useState<ProductSource[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignCard[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<ProductSignalView | null>(null);
  const [signalError, setSignalError] = useState('');
  const [detailOpen, setDetailOpen] = useState(Boolean(signalParam));
  const [activityOpen, setActivityOpen] = useState(activityParam);

  const [activityCampaignId, setActivityCampaignId] = useState(campaignParam);
  const [activityEvents, setActivityEvents] = useState<ActivityEventView[]>([]);
  const [activityHistory, setActivityHistory] = useState<Session['history']>([]);
  const [activityView, setActivityView] = useState<'preset' | 'mine'>('preset');
  const [activitySession, setActivitySession] = useState<Session | null>(null);
  const [activityCursor, setActivityCursor] = useState(0);
  const [activityBusy, setActivityBusy] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [caseJourney, setCaseJourney] = useState<CampaignJourney | null>(null);
  const [caseJourneyError, setCaseJourneyError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const activityKeyRef = useRef('');
  const activitySessionRef = useRef<Session | null>(null);
  const activityQueueRef = useRef<Promise<void>>(Promise.resolve());
  const playingRef = useRef(false);

  const enqueueActivity = useCallback((task: () => Promise<void>): Promise<void> => {
    activityQueueRef.current = activityQueueRef.current.then(task, task);
    return activityQueueRef.current;
  }, []);

  const updateQuery = useCallback((next: { source?: string; topic?: string; campaignId?: string; signalId?: string; activity?: boolean }) => {
    const params = new URLSearchParams();
    const source = next.source ?? sourceParam ?? '';
    const topic = next.topic ?? topicParam;
    const campaignId = next.campaignId ?? campaignParam;
    const signalId = next.signalId ?? (detailOpen ? signalParam : '');
    const activity = next.activity ?? activityOpen;
    if (source) params.set('source', source);
    if (topic) params.set('topic', topic);
    if (campaignId) params.set('campaignId', campaignId);
    const scenarioVersion = searchParams.get('scenarioVersion');
    if (scenarioVersion) params.set('scenarioVersion', scenarioVersion);
    if (signalId) params.set('signalId', signalId);
    if (activity) params.set('activity', '1');
    const query = params.toString();
    router.replace(query ? `/radar?${query}` : '/radar', { scroll: false });
  }, [activityOpen, campaignParam, detailOpen, router, searchParams, signalParam, sourceParam, topicParam]);

  const loadSignals = useCallback(async () => {
    setLoadState('loading');
    setLoadError('');
    try {
      const api = getBrowserApi();
      const [signals, campaignsResult] = await Promise.all([
        api.listSignals({
          source: sourceParam ?? undefined,
          topic: topicParam || undefined,
          campaignId: campaignParam || undefined,
        }),
        api.listCampaigns(),
      ]);
      if (!signals.ok) throw new Error(`${signals.error.code}: ${signals.error.message}`);
      if (!campaignsResult.ok) throw new Error(`${campaignsResult.error.code}: ${campaignsResult.error.message}`);
      setItems(signals.data.items);
      setSources(signals.data.sources);
      setTopics(signals.data.topics);
      setCampaigns(campaignsResult.data.items);
      setLoadState('ready');
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : String(cause));
      setLoadState('error');
    }
  }, [campaignParam, sourceParam, topicParam]);

  useEffect(() => {
    let cancelled = false;
    const campaignId = campaignParam || workspace.campaignId;
    if (!campaignId) return;
    setCaseJourneyError('');
    (async () => {
      try {
        const result = await getBrowserApi().getCampaignJourney({ campaignId, scenarioVersion: workspace.scenarioVersion });
        if (cancelled) return;
        if (result.ok) setCaseJourney(result.data);
        else { setCaseJourney(null); setCaseJourneyError(`${result.error.code}: ${result.error.message}`); }
      } catch (cause) {
        if (!cancelled) { setCaseJourney(null); setCaseJourneyError(cause instanceof Error ? cause.message : String(cause)); }
      }
    })();
    return () => { cancelled = true; };
  }, [campaignParam, workspace.campaignId, workspace.scenarioVersion]);

  useEffect(() => {
    void loadSignals();
  }, [loadSignals]);

  useEffect(() => {
    if (!signalParam) {
      setSelectedSignal(null);
      setSignalError('');
      setDetailOpen(false);
      return;
    }
    let cancelled = false;
    void getBrowserApi().getSignal({ signalId: signalParam }).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setSelectedSignal(null);
        setSignalError(`Signal not found (${result.error.code}). It may belong to another workspace or filter.`);
        setDetailOpen(false);
        return;
      }
      setSelectedSignal(result.data);
      setSignalError('');
      setDetailOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [signalParam]);

  const activeSignal = selectedSignal ?? items[0] ?? null;

  const openSignal = (signalId: string) => {
    updateQuery({ signalId });
  };

  const closeDetail = () => {
    setDetailOpen(false);
    const params = new URLSearchParams(window.location.search);
    params.delete('signalId');
    const query = params.toString();
    router.replace(query ? `/radar?${query}` : '/radar', { scroll: false });
  };

  const applySignalFilter = (signal: ProductSignalView) => {
    const related = signal.opportunities[0];
    if (!related) return;
    router.push(`/opportunities/${encodeURIComponent(related.opportunityId)}`);
  };

  // -------------------------------------------------------- Agent activity
  const ensureActivitySession = useCallback(async (campaignId: string): Promise<Session | null> => {
    if (activitySessionRef.current) return activitySessionRef.current;
    if (!activityKeyRef.current) activityKeyRef.current = `radar-${Date.now().toString(36)}`;
    const opened = await getBrowserApi().openActivityReplay({ campaignId, creationKey: activityKeyRef.current });
    if (!opened.ok) {
      setActivityError(`${opened.error.code}: ${opened.error.message}`);
      return null;
    }
    activitySessionRef.current = opened.data.session;
    setActivitySession(opened.data.session);
    setActivityCursor(opened.data.session.replay.cursorSequence);
    return opened.data.session;
  }, []);

  const loadActivity = useCallback(async (campaignId: string) => {
    setActivityError('');
    const result = await getBrowserApi().getAgentActivity({ campaignId });
    if (!result.ok) {
      setActivityError(`${result.error.code}: ${result.error.message}`);
      return;
    }
    setActivityEvents(result.data.events);
    setActivityHistory(result.data.editingHistory);
    setActivityCursor(0);
    activitySessionRef.current = null;
    setActivitySession(null);
    setPlaying(false);
    playingRef.current = false;
  }, []);

  useEffect(() => {
    if (!activityOpen) return;
    const campaignId = activityCampaignId || campaignParam || campaigns[0]?.campaignId;
    if (!campaignId) return;
    if (!activityCampaignId) setActivityCampaignId(campaignId);
    void loadActivity(campaignId);
  }, [activityCampaignId, activityOpen, campaignParam, campaigns, loadActivity]);

  const runActivityCommand = useCallback((command: 'play' | 'pause' | 'step' | 'restart' | 'seek' | 'setSpeed', extra?: { cursorSequence?: number; speed?: 1 | 2 | 4 }): Promise<void> => {
    return enqueueActivity(async () => {
      setActivityBusy(true);
      setActivityError('');
      try {
        const campaignId = activityCampaignId || campaigns[0]?.campaignId;
        if (!campaignId) return;
        const session = await ensureActivitySession(campaignId);
        const latest = activitySessionRef.current;
        if (!session || !latest) return;
        if (command === 'seek' && extra?.cursorSequence === undefined) return;
        const result = await getBrowserApi().replayCommand(
          { sessionId: latest.id, expectedRevision: latest.revision, idempotencyKey: `act-${command}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}` },
          command === 'seek'
            ? { action: 'seek', cursorSequence: extra?.cursorSequence }
            : command === 'setSpeed'
              ? { action: 'setSpeed', speed: extra?.speed }
              : { action: command },
        );
        if (!result.ok) {
          setActivityError(`${result.error.code}: ${result.error.message}`);
          return;
        }
        activitySessionRef.current = result.data.session;
        setActivitySession(result.data.session);
        setActivityCursor(result.data.session.replay.cursorSequence);
        if (command === 'pause') {
          setPlaying(false);
          playingRef.current = false;
        }
      } finally {
        setActivityBusy(false);
      }
    });
  }, [activityCampaignId, campaigns, enqueueActivity, ensureActivitySession]);

  useEffect(() => {
    if (!playing) {
      playingRef.current = false;
      return;
    }
    playingRef.current = true;
    const timer = window.setInterval(() => {
      void enqueueActivity(async () => {
        if (!playingRef.current) return;
        const campaignId = activityCampaignId || campaigns[0]?.campaignId;
        if (!campaignId) return;
        const session = await ensureActivitySession(campaignId);
        const latest = activitySessionRef.current;
        if (!session || !latest) {
          setPlaying(false);
          playingRef.current = false;
          return;
        }
        const target = latest.replay.virtualMs + 1000 * speed;
        const advanced = await getBrowserApi().advanceReplay(
          { sessionId: latest.id, expectedRevision: latest.revision, idempotencyKey: `act-advance-${target}-${Date.now().toString(36)}` },
          { targetVirtualMs: target },
        );
        if (!advanced.ok) {
          setPlaying(false);
          playingRef.current = false;
          return;
        }
        activitySessionRef.current = advanced.data.session;
        setActivitySession(advanced.data.session);
        setActivityCursor(advanced.data.session.replay.cursorSequence);
        if (advanced.data.session.replay.transport === 'ended') {
          setPlaying(false);
          playingRef.current = false;
        }
      });
    }, 700);
    return () => window.clearInterval(timer);
  }, [activityCampaignId, campaigns, enqueueActivity, ensureActivitySession, playing, speed]);

  const visibleEvents = useMemo(
    () => activityEvents.filter((event) => event.sequence <= activityCursor),
    [activityCursor, activityEvents],
  );
  const latestSequence = activityEvents.length > 0 ? activityEvents[activityEvents.length - 1].sequence : 0;

  const campaignFilterOptions = campaigns;
  const activeCampaign = campaigns.find((campaign) => campaign.campaignId === (activityCampaignId || campaignParam)) ?? null;

  const panelSignal = activeSignal;
  const panelOpportunity = panelSignal?.opportunities[0] ?? null;

  const selectedTrends = panelSignal?.trends ?? [];

  return (
    <div className={styles.page} data-testid="radar-page">
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Intelligence Radar</p>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Intelligence Radar</h1>
            <p className={styles.lede}>Explore fragrance signals and the opportunities they inspire.</p>
          </div>
          <div className={styles.pageActions}>
            <Badge tone="mock">Demo · Mock data</Badge>
            <Button variant="secondary" onClick={() => { setActivityOpen(true); updateQuery({ activity: true }); }} data-control-id="ACT-open" data-testid="ACT-open">
              Agent activity
            </Button>
          </div>
        </div>
      </header>

      <section className={styles.caseSection} aria-label="Current case insight" data-testid="radar-current-case">
        {caseJourney ? (
          <InsightStage
            journey={caseJourney}
            mode="workspace"
            nextHref={workspace.hrefFor('/opportunities')}
          />
        ) : caseJourneyError ? (
          <div className={styles.notice} data-testid="radar-case-unavailable">
            <strong>No prepared case summary is available for this campaign version.</strong>
            <p>{caseJourneyError}</p>
            <p>Nothing was borrowed from the SERENITY case. The prepared signals below remain readable.</p>
          </div>
        ) : (
          <StateBlock kind="loading" title="Reading the current case" body="Loading the prepared insight for this campaign version." />
        )}
      </section>

      <section className={styles.toolbar} aria-label="Signal filters">
        <div className={styles.field}>
          <span className={styles.label} id="radar-source-label">Source</span>
          <div className={styles.chipRow} role="group" aria-labelledby="radar-source-label">
            <button
              type="button"
              className={`${styles.chip} ${!sourceParam ? styles.chipActive : ''}`}
              onClick={() => updateQuery({ source: '' })}
              data-control-id="RAD-source-all"
              data-testid="RAD-source-all"
              aria-pressed={!sourceParam}
            >
              All sources
            </button>
            {sources.map((source) => (
              <button
                key={source}
                type="button"
                className={`${styles.chip} ${sourceParam === source ? styles.chipActive : ''}`}
                onClick={() => updateQuery({ source })}
                data-control-id={`RAD-source-${source}`}
                data-testid={`RAD-source-${source}`}
                aria-pressed={sourceParam === source}
              >
                {SOURCE_LABELS[source]}
              </button>
            ))}
          </div>
        </div>
        <label className={styles.field}>
          <span className={styles.label}>Topic</span>
          <select
            className={styles.select}
            value={topicParam}
            onChange={(event) => updateQuery({ topic: event.target.value })}
            data-control-id="RAD-topic"
            data-testid="RAD-topic"
          >
            <option value="">All topics</option>
            {topics.map((topic) => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Campaign</span>
          <select
            className={styles.select}
            value={campaignParam}
            onChange={(event) => updateQuery({ campaignId: event.target.value })}
            data-control-id="RAD-campaign"
            data-testid="RAD-campaign"
          >
            <option value="">All campaigns</option>
            {campaignFilterOptions.map((campaign) => (
              <option key={campaign.campaignId} value={campaign.campaignId}>{campaign.name}</option>
            ))}
          </select>
        </label>
        <Button
          variant="ghost"
          onClick={() => updateQuery({ source: '', topic: '', campaignId: '' })}
          data-control-id="RAD-clear"
          data-testid="RAD-clear"
        >
          Clear filters
        </Button>
      </section>

      {signalError ? (
        <div className={styles.notice} role="status" data-testid="RAD-signal-error">
          {signalError}
        </div>
      ) : null}

      {loadState === 'loading' ? (
        <StateBlock kind="loading" title="Loading signals" body="Reading the prepared fragrance signals, evidence and trends." />
      ) : loadState === 'error' ? (
        <StateBlock kind="error" title="Signals unavailable" body={loadError} action={<Button variant="secondary" onClick={() => void loadSignals()}>Try again</Button>} />
      ) : items.length === 0 ? (
        <div className={styles.emptyState} data-testid="RAD-empty">
          <p className={styles.cardText}>No signals match these filters.</p>
          <Button
            variant="secondary"
            onClick={() => updateQuery({ source: '', topic: '', campaignId: '' })}
            data-control-id="RAD-clear-empty"
            data-testid="RAD-clear-empty"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className={styles.gridTwo}>
          <div className={styles.signalList} data-testid="radar-signal-list">
            {items.map((item) => (
              <button
                key={item.signal.id}
                type="button"
                className={`${styles.signalCard} ${detailOpen && signalParam === item.signal.id ? styles.signalActive : ''}`}
                onClick={() => openSignal(item.signal.id)}
                data-control-id={`RAD-signal-${item.signal.id}`}
                data-testid={`RAD-signal-${item.signal.id}`}
              >
                <div className={styles.signalTitleRow}>
                  <h2 className={styles.signalTitle}>{item.signal.title}</h2>
                  <span className={styles.tag}>{item.signal.topic}</span>
                </div>
                <div className={styles.metaRow}>
                  <span>{item.sourceKeys.map((source) => SOURCE_LABELS[source]).join(' · ')}</span>
                  <span>{item.signal.region}</span>
                  <span>{item.evidence.length} evidence {item.evidence.length === 1 ? 'item' : 'items'}</span>
                </div>
                <p className={styles.signalSummary}>{item.signal.summary.replace(/^MOCK [^/]+\/ /, '')}</p>
                <span className={styles.link} aria-hidden="true">View evidence</span>
              </button>
            ))}
          </div>

          <aside className={styles.panel} aria-label="Selected theme">
            <h2 className={styles.panelTitle}>Theme context</h2>
            {panelSignal ? (
              <>
                <div>
                  <p className={styles.eyebrow}>Selected signal</p>
                  <p className={styles.cardTitle}>{panelSignal.signal.title}</p>
                  <p className={styles.muted}>{panelSignal.signal.region} · {panelSignal.signal.topic}</p>
                </div>
                <TrendChart trends={selectedTrends} />
                {panelOpportunity ? (
                  <div className={styles.drawerSection}>
                    <h3 className={styles.drawerTitle}>Insight and recommendation</h3>
                    <ul className={styles.insightList}>
                      {panelSignal.trends.map((trend) => (
                        <li key={`${trend.id}-interpretation`}>{trend.interpretation}</li>
                      ))}
                    </ul>
                    <Link
                      href={workspace.hrefFor(`/opportunities/${encodeURIComponent(panelOpportunity.opportunityId)}`)}
                      className={styles.link}
                      data-control-id={`RAD-opportunity-${panelOpportunity.opportunityId}`}
                      data-testid={`RAD-opportunity-${panelOpportunity.opportunityId}`}
                    >
                      View related opportunity
                    </Link>
                  </div>
                ) : null}
              </>
            ) : (
              <p className={styles.muted}>Select a signal to read its evidence and related theme.</p>
            )}
          </aside>
        </div>
      )}

      <Overlay
        open={detailOpen && Boolean(selectedSignal)}
        onClose={closeDetail}
        variant="drawer"
        title={selectedSignal?.signal.title ?? 'Signal detail'}
        description={selectedSignal ? `${selectedSignal.sourceKeys.map((source) => SOURCE_LABELS[source]).join(' · ')} · ${selectedSignal.signal.region}` : undefined}
        testId="radar-signal-drawer"
        footer={<Button variant="secondary" onClick={closeDetail} data-control-id="RAD-drawer-close" data-testid="RAD-drawer-close">Close</Button>}
      >
        {selectedSignal ? (
          <div className={styles.detailDrawer}>
            <div className={styles.drawerSection}>
              <Badge tone="mock">Simulated evidence</Badge>
              <p className={styles.cardText}>{selectedSignal.signal.summary.replace(/^MOCK [^/]+\/ /, '')}</p>
              <p className={styles.muted}>{selectedSignal.signal.topic} · {selectedSignal.signal.region}</p>
            </div>

            <div className={styles.drawerSection}>
              <h3 className={styles.drawerTitle}>Evidence ({selectedSignal.evidence.length})</h3>
              {selectedSignal.evidence.map((evidence) => (
                <div key={evidence.id} className={styles.evidenceCard} data-control-id={`RAD-evidence-${evidence.id}`} data-testid={`RAD-evidence-${evidence.id}`}>
                  <p className={styles.evidenceTitle}>{evidence.title}</p>
                  <p className={styles.muted}>{evidence.platform} · {new Date(evidence.simulatedAt).toLocaleDateString('en-GB')}</p>
                  <p className={styles.cardText}>{evidence.summary}</p>
                  <p className={styles.muted}>{evidence.disclosure}</p>
                </div>
              ))}
            </div>

            <div className={styles.drawerSection}>
              <h3 className={styles.drawerTitle}>Related trends</h3>
              <TrendChart trends={selectedSignal.trends} />
            </div>

            <div className={styles.drawerSection}>
              <h3 className={styles.drawerTitle}>Opportunity this evidence supports</h3>
              {selectedSignal.opportunities.map((opportunity) => (
                <div key={opportunity.campaignId} className={styles.cardActions}>
                  <Link
                    href={`/opportunities/${encodeURIComponent(opportunity.opportunityId)}`}
                    className={styles.link}
                    data-control-id={`RAD-opportunity-${opportunity.opportunityId}`}
                    data-testid={`RAD-opportunity-drawer-${opportunity.opportunityId}`}
                  >
                    View related opportunity
                  </Link>
                  <button
                    type="button"
                    className={styles.chip}
                    onClick={() => applySignalFilter(selectedSignal)}
                  >
                    Open strategy detail
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Overlay>

      <Overlay
        open={activityOpen}
        onClose={() => { setPlaying(false); setActivityOpen(false); updateQuery({ activity: false }); }}
        variant="drawer"
        title="Agent activity"
        description="Demo replay · preset discovery and analysis prefix only. Opening this panel does not run the agent."
        testId="radar-activity-drawer"
        footer={<Button variant="secondary" onClick={() => { setPlaying(false); setActivityOpen(false); updateQuery({ activity: false }); }} data-control-id="ACT-close" data-testid="ACT-close">Close</Button>}
      >
        <div className={styles.detailDrawer}>
          <div className={styles.drawerSection}>
            <label className={styles.field}>
              <span className={styles.label}>Activity source</span>
              <select
                className={styles.select}
                value={activityCampaignId || campaignParam}
                onChange={(event) => { setActivityCampaignId(event.target.value); activitySessionRef.current = null; setActivitySession(null); setPlaying(false); playingRef.current = false; }}
                data-control-id="ACT-campaign"
                data-testid="ACT-campaign"
              >
                {campaigns.map((campaign) => (
                  <option key={campaign.campaignId} value={campaign.campaignId}>{campaign.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.tabsRow} role="tablist" aria-label="Activity view" data-control-id="ACT-view">
            <button
              type="button"
              role="tab"
              aria-selected={activityView === 'preset'}
              className={`${styles.tabButton} ${activityView === 'preset' ? styles.tabActive : ''}`}
              onClick={() => setActivityView('preset')}
              data-testid="ACT-view-preset"
              data-control-id="ACT-view-preset"
            >
              Preset Agent demo
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activityView === 'mine'}
              className={`${styles.tabButton} ${activityView === 'mine' ? styles.tabActive : ''}`}
              onClick={() => setActivityView('mine')}
              data-testid="ACT-view-mine"
              data-control-id="ACT-view-mine"
            >
              Your actions
            </button>
          </div>

          {activityError ? (
            <div className={styles.notice} role="alert">{activityError}</div>
          ) : null}

          {activityView === 'preset' ? (
            <>
              <div className={styles.toolbar} aria-label="Demo replay controls">
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => { if (playing) { setPlaying(false); void runActivityCommand('pause'); } else { setPlaying(true); void runActivityCommand('play'); } }}
                  pending={activityBusy}
                  data-control-id="ACT-play"
                  data-testid="ACT-play"
                >
                  {playing ? 'Pause' : 'Play'}
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => void runActivityCommand('step')}
                  data-control-id="ACT-step"
                  data-testid="ACT-step"
                >
                  Step
                </Button>
                {([1, 2, 4] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`${styles.chip} ${speed === value ? styles.chipActive : ''}`}
                    onClick={() => { setSpeed(value); void runActivityCommand('setSpeed', { speed: value }); }}
                    data-control-id={`ACT-speed${value}`}
                    data-testid={`ACT-speed${value}`}
                    aria-pressed={speed === value}
                  >
                    {value}×
                  </button>
                ))}
                <Button variant="ghost" size="small" onClick={() => void runActivityCommand('restart')} data-control-id="ACT-restart" data-testid="ACT-restart">
                  Restart
                </Button>
              </div>
              <label className={styles.field}>
                <span className={styles.label}>Timeline (event {Math.min(activityCursor, latestSequence)} of {latestSequence})</span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(latestSequence, 1)}
                  value={Math.min(activityCursor, latestSequence)}
                  onChange={(event) => void runActivityCommand('seek', { cursorSequence: Number(event.target.value) })}
                  data-control-id="ACT-seek"
                  data-testid="ACT-seek"
                />
              </label>
              <div className={styles.drawerSection}>
                <h3 className={styles.drawerTitle}>Preset events</h3>
                {visibleEvents.length === 0 ? (
                  <p className={styles.muted}>No events shown yet. Press Play or Step to walk the prepared discovery and analysis prefix.</p>
                ) : (
                  <ul className={styles.insightList}>
                    {visibleEvents.map((event) => (
                      <li key={event.id}>
                        <strong>{humanizeEvent(event)}</strong>
                        <span className={styles.muted}> · {Math.round(event.atMs / 100) / 10}s · {eventDetail(event)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className={styles.drawerSection}>
              <h3 className={styles.drawerTitle}>Your actions</h3>
              {activityHistory.length === 0 ? (
                <p className={styles.muted}>No working actions recorded for this campaign yet. Editing, saving or confirming a script will appear here.</p>
              ) : (
                <ul className={styles.insightList}>
                  {activityHistory.map((record) => (
                    <li key={record.id}>
                      <strong>{record.action}</strong>
                      <span className={styles.muted}> · {new Date(record.occurredAt).toLocaleString('en-GB')} · {record.outcome}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className={styles.muted}>Preset demo events are separate from your actions; replaying the demo never confirms, exports or delivers a script.</p>
            </div>
          )}
          <p className={styles.muted}>
            {activeCampaign ? `Source campaign: ${activeCampaign.name}. ` : ''}
            Demo replay ends at the prepared analysis prefix. No video is played and no delivery is sent.
          </p>
        </div>
      </Overlay>
    </div>
  );
}
