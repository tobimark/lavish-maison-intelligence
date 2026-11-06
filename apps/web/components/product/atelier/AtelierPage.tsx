'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Badge, Button, Overlay, StateBlock, ToastRegion, type ToastMessage } from '../../poc';
import { getBrowserApi } from '../../poc/browser-api';
import { useNavigationGuard } from '../NavigationGuard';
import { ScriptPreview, StoryboardPreview, VersionBadges, confirmationLabel, versionOriginLabel } from '../shared/PreviewBlocks';
import { CreativeStage } from '../journey/CreativeStage';
import { useCampaignWorkspace } from '../shared/useCampaignWorkspace';
import type {
  CampaignCard,
  CampaignView,
  ProductVersion,
} from '../../../demo/poc/api/product-contract';
import type { CampaignJourney } from '../../../demo/poc/api/flow-contract';
import type { CommandContext, SessionView } from '../../../demo/poc/api/types';
import type { ScriptEditable } from '../../../demo/poc/domain';
import styles from '../workspace.module.css';

type LoadState = 'loading' | 'ready' | 'error' | 'notfound';
type TabId = 'brief' | 'copy' | 'storyboard';

interface EditorFields {
  title: string;
  hook: string;
  message: string;
  cta: string;
  caption: string;
  hashtags: string;
  shots: Array<{ id: string; onScreenText: string; startMs: number; durationMs: number; visual: string; transition: string; assetIds: string[]; voiceover: string }>;
  subtitles: Array<{ id: string; startMs: number; endMs: number; text: string }>;
}

function fieldsFrom(content: ScriptEditable): EditorFields {
  return {
    title: content.title,
    hook: content.hook,
    message: content.message,
    cta: content.cta,
    caption: content.caption,
    hashtags: content.hashtags.join(', '),
    shots: content.shots.map((shot) => ({
      id: shot.id,
      onScreenText: shot.onScreenText,
      startMs: shot.startMs,
      durationMs: shot.durationMs,
      visual: shot.visual,
      transition: shot.transition,
      assetIds: [...shot.assetIds],
      voiceover: shot.voiceover,
    })),
    subtitles: content.subtitles.map((subtitle) => ({ ...subtitle })),
  };
}

function contentFrom(fields: EditorFields): ScriptEditable {
  return {
    title: fields.title.trim(),
    hook: fields.hook.trim(),
    message: fields.message.trim(),
    cta: fields.cta.trim(),
    caption: fields.caption.trim(),
    hashtags: fields.hashtags.split(',').map((tag) => tag.trim()).filter(Boolean),
    shots: fields.shots.map((shot) => ({
      id: shot.id,
      startMs: Number(shot.startMs) || 0,
      durationMs: Number(shot.durationMs) || 0,
      visual: shot.visual,
      voiceover: shot.voiceover,
      onScreenText: shot.onScreenText,
      transition: shot.transition,
      assetIds: [...shot.assetIds] as [string, ...string[]],
    })),
    subtitles: fields.subtitles.map((subtitle) => ({
      id: subtitle.id,
      startMs: Number(subtitle.startMs) || 0,
      endMs: Number(subtitle.endMs) || 0,
      text: subtitle.text,
    })),
  };
}

function ctx(session: SessionView, key: string): CommandContext {
  return { sessionId: session.id, expectedRevision: session.revision, idempotencyKey: key };
}

function safeIdempotency(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AtelierPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspace = useCampaignWorkspace();
  const guard = useNavigationGuard();

  const campaignParam = searchParams.get('campaignId') ?? '';
  const versionParam = searchParams.get('versionId') ?? '';
  const sessionParam = searchParams.get('sessionId') ?? '';
  const languageParam = searchParams.get('language') === 'ar' ? 'ar' : searchParams.get('language') === 'en' ? 'en' : '';
  const tabParam = searchParams.get('tab');
  const tab: TabId = tabParam === 'copy' || tabParam === 'storyboard' ? tabParam : 'brief';

  const [campaigns, setCampaigns] = useState<CampaignCard[]>([]);
  const [campaignsError, setCampaignsError] = useState('');
  const [state, setState] = useState<LoadState>('loading');
  const [view, setView] = useState<CampaignView | null>(null);
  const [loadError, setLoadError] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastSequence = useRef(0);
  const [busy, setBusy] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSession, setEditorSession] = useState<SessionView | null>(null);
  const [editorBaseline, setEditorBaseline] = useState<EditorFields | null>(null);
  const [editorFields, setEditorFields] = useState<EditorFields | null>(null);
  const [editorError, setEditorError] = useState('');
  const [editorNotice, setEditorNotice] = useState('');
  const [editorAdvanced, setEditorAdvanced] = useState(false);
  const [creativeJourney, setCreativeJourney] = useState<CampaignJourney | null>(null);
  const [creativeJourneyError, setCreativeJourneyError] = useState('');
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorConfirming, setEditorConfirming] = useState(false);
  const editorDirtyRef = useRef(false);
  const editorSaveRef = useRef<() => Promise<boolean>>(async () => true);
  const editorDiscardRef = useRef<() => void>(() => undefined);
  const editorVersionRef = useRef<ProductVersion | null>(null);
  const editorSessionRef = useRef<SessionView | null>(null);

  editorSessionRef.current = editorSession;
  const editorDirty = Boolean(editorFields && editorBaseline && JSON.stringify(editorFields) !== JSON.stringify(editorBaseline));
  editorDirtyRef.current = editorDirty;

  const pushToast = useCallback((message: string, tone: ToastMessage['tone'] = 'neutral') => {
    toastSequence.current += 1;
    setToasts((current) => [...current, { id: `atelier-${toastSequence.current}`, message, tone }].slice(-3));
  }, []);

  const buildQuery = useCallback((next: {
    campaignId?: string;
    language?: string;
    versionId?: string;
    sessionId?: string;
    tab?: TabId;
  }) => {
    const params = new URLSearchParams();
    const campaignId = next.campaignId ?? campaignParam;
    const language = next.language ?? languageParam;
    const versionId = next.versionId ?? (next.versionId === '' ? '' : versionParam);
    const sessionId = next.sessionId ?? (next.sessionId === '' ? '' : sessionParam);
    if (campaignId) params.set('campaignId', campaignId);
    if (language) params.set('language', language);
    if (versionId) params.set('versionId', versionId);
    if (sessionId) params.set('sessionId', sessionId);
    const nextTab = next.tab ?? tab;
    if (nextTab !== 'brief') params.set('tab', nextTab);
    return `/atelier${params.toString() ? `?${params.toString()}` : ''}`;
  }, [campaignParam, languageParam, sessionParam, tab, versionParam]);

  const navigate = useCallback((url: string) => {
    guard.requestLeave(() => router.replace(url, { scroll: false }), 'Switch campaign preview');
  }, [guard, router]);

  // Load the campaign list once so the selector is always available.
  useEffect(() => {
    let cancelled = false;
    void getBrowserApi().listCampaigns().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setCampaignsError(`${result.error.code}: ${result.error.message}`);
        setState('error');
        setLoadError(result.error.message);
        return;
      }
      setCampaigns(result.data.items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCampaign = useCallback(async () => {
    if (campaigns.length === 0) return;
    if (campaignParam && !campaigns.some((campaign) => campaign.campaignId === campaignParam)) {
      setState('notfound');
      return;
    }
    const campaignId = campaignParam || campaigns[0].campaignId;
    setState('loading');
    setLoadError('');
    try {
      const result = await getBrowserApi().getCampaign({
        campaignId,
        language: languageParam || undefined,
        versionId: versionParam || undefined,
        sessionId: versionParam ? (sessionParam || undefined) : undefined,
      });
      if (!result.ok) {
        if (result.error.code === 'NOT_FOUND') {
          setState('notfound');
          return;
        }
        throw new Error(`${result.error.code}: ${result.error.message}`);
      }
      setView(result.data);
      setState('ready');
      if (!campaignParam) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('campaignId', campaignId);
        router.replace(`/atelier?${params.toString()}`, { scroll: false });
      }
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : String(cause));
      setState('error');
    }
  }, [campaignParam, campaigns, languageParam, router, searchParams, sessionParam, versionParam]);

  useEffect(() => {
    void loadCampaign();
  }, [loadCampaign]);

  // Register the global save/discard/cancel guard while the editor holds a possible draft.
  useEffect(() => {
    if (!editorOpen) {
      guard.register(null);
      return () => guard.register(null);
    }
    guard.register({
      isDirty: () => editorDirtyRef.current,
      save: async () => editorSaveRef.current(),
      discard: () => editorDiscardRef.current(),
    });
    return () => guard.register(null);
  }, [editorOpen, guard]);

  const selectedVersion = view?.selectedVersion ?? null;

  const openEditor = async (version: ProductVersion) => {
    setBusy(true);
    setEditorError('');
    setEditorNotice('');
    try {
      const result = await getBrowserApi().beginCampaignEdit({
        campaignId: version.campaignId,
        versionId: version.versionId,
        sessionId: version.sessionId,
        idempotencyKey: safeIdempotency('atelier-edit'),
      });
      if (!result.ok) {
        setEditorError(`${result.error.code}: ${result.error.message}`);
        pushToast(`Could not open the editor: ${result.error.message}`, 'error');
        return;
      }
      const fields = fieldsFrom(result.data.version.content);
      editorVersionRef.current = result.data.version;
      setEditorSession(result.data.session);
      setEditorBaseline(fields);
      setEditorFields(fields);
      setEditorOpen(true);
      setEditorError('');
    } finally {
      setBusy(false);
    }
  };

  const closeEditor = () => {
    if (editorDirty) {
      guard.requestLeave(() => setEditorOpen(false), 'Close the script editor');
      return;
    }
    setEditorOpen(false);
    setEditorError('');
    setEditorNotice('');
  };

  const saveEditor = useCallback(async (): Promise<boolean> => {
    if (!editorFields || !editorSessionRef.current) return true;
    setEditorSaving(true);
    setEditorError('');
    setEditorNotice('');
    try {
      const content = contentFrom(editorFields);
      if (!content.title) {
        setEditorError('Title is required before saving.');
        return false;
      }
      const baseVersionId = editorSessionRef.current.activeScriptVersionId;
      if (!baseVersionId) {
        setEditorError('No working script version is prepared. Reopen the editor and try again.');
        return false;
      }
      const result = await getBrowserApi().saveScriptDraft(
        ctx(editorSessionRef.current, safeIdempotency('atelier-save')),
        { baseVersionId, content },
      );
      if (!result.ok) {
        setEditorError(`${result.error.code}: ${result.error.message}`);
        return false;
      }
      const savedFields = fieldsFrom(result.data.version.content);
      editorVersionRef.current = {
        ...(editorVersionRef.current as ProductVersion),
        versionId: result.data.version.id,
        sessionId: result.data.session.id,
        origin: 'saved',
        confirmation: 'unconfirmed',
        title: result.data.version.content.title,
        content: result.data.version.content,
        confirmedInSessionId: null,
      };
      setEditorSession(result.data.session);
      setEditorBaseline(savedFields);
      setEditorFields(savedFields);
      setEditorNotice(`Saved version ${result.data.version.content.title}. It is unconfirmed until you confirm it.`);
      pushToast('New version saved in this browser.', 'success');
      const language = result.data.version.language;
      const savedCampaignId = editorVersionRef.current?.campaignId ?? campaignParam;
      router.replace(
        `/atelier?campaignId=${encodeURIComponent(savedCampaignId)}&language=${language}&versionId=${encodeURIComponent(result.data.version.id)}&sessionId=${encodeURIComponent(result.data.session.id)}&tab=copy`,
        { scroll: false },
      );
      return true;
    } finally {
      setEditorSaving(false);
    }
  }, [campaignParam, editorFields, pushToast, router]);

  const discardEditor = useCallback(() => {
    if (editorBaseline) setEditorFields(editorBaseline);
    setEditorError('');
    setEditorNotice('Unsaved changes discarded.');
  }, [editorBaseline]);

  editorSaveRef.current = saveEditor;
  editorDiscardRef.current = discardEditor;

  const confirmEditor = async () => {
    const session = editorSessionRef.current;
    if (!session || !session.activeScriptVersionId) return;
    setEditorConfirming(true);
    setEditorError('');
    try {
      const result = await getBrowserApi().confirmScript(
        ctx(session, safeIdempotency('atelier-confirm')),
        { scriptVersionId: session.activeScriptVersionId },
      );
      if (!result.ok) {
        setEditorError(`${result.error.code}: ${result.error.message}`);
        return;
      }
      setEditorSession(result.data);
      setEditorNotice('This script is confirmed in this browser for the selected version. It is not a Lavish formal approval.');
      pushToast('Script confirmed for this local demo.', 'success');
      await loadCampaign();
    } finally {
      setEditorConfirming(false);
    }
  };

  const campaignOptions = campaigns;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getBrowserApi().getCampaignJourney({
          campaignId: campaignParam || workspace.campaignId,
          scenarioVersion: workspace.scenarioVersion,
        });
        if (cancelled) return;
        if (result.ok) setCreativeJourney(result.data);
        else { setCreativeJourney(null); setCreativeJourneyError(`${result.error.code}: ${result.error.message}`); }
      } catch (cause) {
        if (!cancelled) { setCreativeJourney(null); setCreativeJourneyError(cause instanceof Error ? cause.message : String(cause)); }
      }
    })();
    return () => { cancelled = true; };
  }, [campaignParam, workspace.campaignId, workspace.scenarioVersion]);

  const activeCampaign = view?.campaign ?? campaigns.find((campaign) => campaign.campaignId === campaignParam) ?? null;
  const versions = view?.versions ?? [];
  const artistNote = useMemo(() => {
    if (!selectedVersion) return '';
    return `${versionOriginLabel(selectedVersion)} · ${confirmationLabel(selectedVersion)}`;
  }, [selectedVersion]);

  if (campaignsError) {
    return <StateBlock kind="error" title="Campaigns unavailable" body={campaignsError} />;
  }

  if (state === 'notfound') {
    return (
      <div className={styles.page} data-testid="atelier-not-found">
        <StateBlock
          kind="error"
          title="Campaign or version not found"
          body="The requested campaign, version or session does not belong to a prepared campaign. Nothing was switched automatically."
          action={<Link href="/atelier" className={styles.link} data-testid="atelier-reset">Open the default campaign</Link>}
        />
      </div>
    );
  }

  return (
    <div className={styles.page} data-testid="atelier-page">
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Creative Atelier</p>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>{activeCampaign?.name ?? 'Creative Atelier'}</h1>
            <p className={styles.lede}>Campaign workspace · read the prepared brief, bilingual copy and static storyboard. Edit only when you choose to.</p>
          </div>
          <Badge tone="mock">Demo · Mock data</Badge>
        </div>
        <div className={styles.campaignSwitcher} data-control-id="AT-campaign" role="group" aria-label="Campaign">
          {campaignOptions.map((campaign, index) => (
            <button
              key={campaign.campaignId}
              type="button"
              className={`${styles.campaignButton} ${campaign.campaignId === activeCampaign?.campaignId ? styles.campaignButtonActive : ''}`}
              onClick={() => navigate(`/atelier?campaignId=${encodeURIComponent(campaign.campaignId)}&tab=brief`)}
              data-testid={`AT-campaign-${campaign.campaignId}`}
              data-control-id={`AT-campaign-${campaign.campaignId}`}
              aria-pressed={campaign.campaignId === activeCampaign?.campaignId}
            >
              <strong>{campaign.name}</strong>
              <span>Option {String.fromCharCode(65 + index)} · {campaign.products.map((product) => product.officialName).join(' · ')}</span>
            </button>
          ))}
        </div>
      </header>

      <section className={styles.caseSection} aria-label="Current creative result" data-testid="atelier-current-creative">
        {creativeJourney ? (
          <CreativeStage journey={creativeJourney} mode="workspace" nextHref={workspace.hrefFor('/deliverables')} />
        ) : creativeJourneyError ? (
          <div className={styles.notice} data-testid="atelier-creative-unavailable">
            <strong>No authored creative result is available for this campaign version.</strong>
            <p>{creativeJourneyError}</p>
            <p>Nothing was borrowed from the SERENITY case. The prepared script editor below remains available.</p>
          </div>
        ) : null}
      </section>

      {state === 'loading' ? (
        <StateBlock kind="loading" title="Loading campaign" body="Reading the prepared brief, script versions and static storyboard." />
      ) : state === 'error' ? (
        <StateBlock kind="error" title="Campaign unavailable" body={loadError} action={<Button variant="secondary" onClick={() => void loadCampaign()}>Try again</Button>} />
      ) : view && selectedVersion ? (
        <div className={styles.atelierLayout}>
          <div className={styles.atelierMain}>
            <div className={styles.tabsRow} role="tablist" aria-label="Campaign sections">
              {([
                { id: 'brief', label: 'Campaign brief', control: 'AT-tab-brief' },
                { id: 'copy', label: 'Copy & script', control: 'AT-tab-copy' },
                { id: 'storyboard', label: 'Storyboard', control: 'AT-tab-storyboard' },
              ] as Array<{ id: TabId; label: string; control: string }>).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={`${styles.tabButton} ${tab === item.id ? styles.tabActive : ''}`}
                  onClick={() => navigate(buildQuery({ tab: item.id }))}
                  data-control-id={item.control}
                  data-testid={item.control}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab === 'brief' ? (
              <section className={styles.card} aria-label="Campaign brief result">
                <div className={styles.cardBody}>
                  <div className={styles.badgeRow}>
                    <Badge tone="mock">Prepared campaign</Badge>
                    <VersionBadges version={selectedVersion} />
                  </div>
                  <h2 className={styles.cardTitle}>{view.brief.name}</h2>
                  <p className={styles.cardText}>{view.brief.objective}</p>
                  <div className={styles.briefGrid}>
                    <div className={styles.briefField}>
                      <span className={styles.briefLabel}>Markets & audience</span>
                      <p className={styles.briefValue}>{view.brief.markets.join(' · ')}</p>
                      <p className={styles.muted}>{view.brief.audience}</p>
                    </div>
                    <div className={styles.briefField}>
                      <span className={styles.briefLabel}>Product</span>
                      <p className={styles.briefValue}>{view.campaign.products.map((product) => product.officialName).join(' · ')}</p>
                      <p className={styles.muted}>SKU {view.campaign.products.map((product) => product.sku).join(' · ')}</p>
                    </div>
                    <div className={styles.briefField}>
                      <span className={styles.briefLabel}>Concept & tone</span>
                      <p className={styles.briefValue}>{view.brief.concept}</p>
                      <p className={styles.muted}>{view.brief.tone}</p>
                    </div>
                    <div className={styles.briefField}>
                      <span className={styles.briefLabel}>Channels & languages</span>
                      <p className={styles.briefValue}>{view.brief.channels.join(' · ')}</p>
                      <p className={styles.muted}>{view.brief.languages.map((language) => language.toUpperCase()).join(' / ')}</p>
                    </div>
                    <div className={styles.briefField}>
                      <span className={styles.briefLabel}>Key message</span>
                      <p className={styles.briefValue}>{view.brief.keyMessage}</p>
                    </div>
                    <div className={styles.briefField}>
                      <span className={styles.briefLabel}>Call to action</span>
                      <p className={styles.briefValue}>{view.brief.cta}</p>
                    </div>
                  </div>
                  <div className={styles.disclosure}>
                    <span aria-hidden="true">i</span>
                    <span>
                      Recommendation: {view.analysis.recommendation}
                    </span>
                  </div>
                </div>
              </section>
            ) : tab === 'copy' ? (
              <ScriptPreview version={selectedVersion} campaign={view.campaign} />
            ) : (
              <StoryboardPreview version={selectedVersion} campaign={view.campaign} />
            )}
          </div>

          <aside className={styles.atelierPanel} aria-label="Versions and actions">
            <div>
              <p className={styles.eyebrow}>Language</p>
              <div className={styles.chipRow} role="group" aria-label="Preview language">
                <button
                  type="button"
                  className={`${styles.chip} ${selectedVersion.language === 'en' ? styles.chipActive : ''}`}
                  onClick={() => navigate(buildQuery({ language: 'en', versionId: '', sessionId: '' }))}
                  data-control-id="AT-language-en"
                  data-testid="AT-language-en"
                  aria-pressed={selectedVersion.language === 'en'}
                >
                  EN
                </button>
                <button
                  type="button"
                  className={`${styles.chip} ${selectedVersion.language === 'ar' ? styles.chipActive : ''}`}
                  onClick={() => navigate(buildQuery({ language: 'ar', versionId: '', sessionId: '' }))}
                  data-control-id="AT-language-ar"
                  data-testid="AT-language-ar"
                  aria-pressed={selectedVersion.language === 'ar'}
                >
                  AR
                </button>
              </div>
            </div>

            <div>
              <p className={styles.eyebrow}>Preview version</p>
              <p className={styles.muted}>{artistNote}</p>
              <div className={styles.versionList}>
                {versions.map((version) => {
                  const active = version.versionId === selectedVersion.versionId && (version.sessionId ?? null) === (selectedVersion.sessionId ?? null);
                  return (
                    <button
                      key={`${version.versionId}-${version.sessionId ?? 'preset'}`}
                      type="button"
                      className={`${styles.versionButton} ${active ? styles.versionActive : ''}`}
                      onClick={() => navigate(buildQuery({ language: version.language, versionId: version.versionId, sessionId: version.sessionId ?? '' }))}
                      data-control-id={`AT-version-${version.versionId}-${version.sessionId ?? 'preset'}`}
                      data-testid={`AT-version-${version.versionId}-${version.sessionId ?? 'preset'}`}
                      aria-pressed={active}
                    >
                      <span data-control-id={`AT-version-${version.versionId}`}>{version.title}</span>
                      <span className={styles.muted}>
                        {version.language.toUpperCase()} · {versionOriginLabel(version)} · {confirmationLabel(version)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className={styles.muted}>Switching preview never selects a working version or removes a confirmation.</p>
            </div>

            <div className={styles.drawerSection}>
              <p className={styles.eyebrow}>Exports</p>
              {(() => {
                const versionExports = view.exports.filter(
                  (record) => record.version.versionId === selectedVersion.versionId
                    && (record.version.sessionId ?? null) === (selectedVersion.sessionId ?? null),
                );
                return versionExports.length === 0 ? (
                  <p className={styles.muted}>No content pack prepared for this exact version yet.</p>
                ) : (
                  <p className={styles.muted}>{versionExports.length} content pack(s) prepared · latest {new Date(versionExports[0].createdAt).toLocaleString('en-GB')}</p>
                );
              })()}
            </div>

            <div className={styles.drawerSection}>
              <Button
                variant="primary"
                onClick={() => void openEditor(selectedVersion)}
                pending={busy}
                data-control-id="AT-edit"
                data-testid="AT-edit"
              >
                Edit script
              </Button>
              <p className={styles.muted}>
                Edit opens a working session for this exact version. Nothing is saved or confirmed until you choose.
              </p>
              <Link
                href={`/deliverables?campaignId=${encodeURIComponent(selectedVersion.campaignId)}&language=${selectedVersion.language}&versionId=${encodeURIComponent(selectedVersion.versionId)}${selectedVersion.sessionId ? `&sessionId=${encodeURIComponent(selectedVersion.sessionId)}` : ''}`}
                className={styles.link}
                data-control-id="AT-deliverables"
                data-testid="AT-deliverables"
              >
                View deliverables
              </Link>
            </div>
          </aside>
        </div>
      ) : null}

      <Overlay
        open={editorOpen}
        onClose={closeEditor}
        variant="drawer"
        title="Edit script"
        description={selectedVersion ? `${selectedVersion.title} · ${selectedVersion.language.toUpperCase()} · ${selectedVersion.origin === 'preset' ? 'Preset' : 'Saved version'}` : undefined}
        testId="atelier-editor"
        footer={
          <div className={styles.editorActions}>
            <Button variant="secondary" onClick={closeEditor} data-control-id="AT-editor-close" data-testid="AT-editor-close">Close</Button>
            <Button variant="ghost" onClick={() => discardEditor()} data-control-id="AT-discard" data-testid="AT-discard">Discard edits</Button>
            <Button
              variant="secondary"
              onClick={() => void confirmEditor()}
              pending={editorConfirming}
              disabled={editorDirty || editorSaving}
              data-control-id="AT-confirm"
              data-testid="AT-confirm"
            >
              Confirm script
            </Button>
            <Button
              variant="primary"
              onClick={() => void saveEditor()}
              pending={editorSaving}
              data-control-id="AT-save"
              data-testid="AT-save"
            >
              Save new version
            </Button>
          </div>
        }
      >
        {editorFields ? (
          <div className={styles.editor}>
            {editorError ? <p className={styles.errorText} role="alert">{editorError}</p> : null}
            {editorNotice ? <p className={styles.successText}>{editorNotice}</p> : null}
            {editorDirty ? (
              <div className={`${styles.notice} ${styles.noticeWarn}`}>
                Unsaved changes. Confirm is disabled until you save this draft.
              </div>
            ) : null}
            <div className={styles.fieldGrid}>
              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.label}>Title</span>
                <input
                  className={styles.input}
                  value={editorFields.title}
                  dir={selectedVersion?.language === 'ar' ? 'rtl' : 'ltr'}
                  onChange={(event) => setEditorFields({ ...editorFields, title: event.target.value })}
                  data-control-id="AT-field-title"
                  data-testid="AT-field-title"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Hook</span>
                <input
                  className={styles.input}
                  value={editorFields.hook}
                  dir={selectedVersion?.language === 'ar' ? 'rtl' : 'ltr'}
                  onChange={(event) => setEditorFields({ ...editorFields, hook: event.target.value })}
                  data-control-id="AT-field-hook"
                  data-testid="AT-field-hook"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Call to action</span>
                <input
                  className={styles.input}
                  value={editorFields.cta}
                  dir={selectedVersion?.language === 'ar' ? 'rtl' : 'ltr'}
                  onChange={(event) => setEditorFields({ ...editorFields, cta: event.target.value })}
                  data-control-id="AT-field-cta"
                  data-testid="AT-field-cta"
                />
              </label>
              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.label}>Message</span>
                <textarea
                  className={styles.textarea}
                  value={editorFields.message}
                  dir={selectedVersion?.language === 'ar' ? 'rtl' : 'ltr'}
                  onChange={(event) => setEditorFields({ ...editorFields, message: event.target.value })}
                  data-control-id="AT-field-message"
                  data-testid="AT-field-message"
                />
              </label>
              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.label}>Caption</span>
                <textarea
                  className={styles.textarea}
                  value={editorFields.caption}
                  dir={selectedVersion?.language === 'ar' ? 'rtl' : 'ltr'}
                  onChange={(event) => setEditorFields({ ...editorFields, caption: event.target.value })}
                  data-control-id="AT-field-caption"
                  data-testid="AT-field-caption"
                />
              </label>
              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.label}>Hashtags (comma separated)</span>
                <input
                  className={styles.input}
                  value={editorFields.hashtags}
                  onChange={(event) => setEditorFields({ ...editorFields, hashtags: event.target.value })}
                  data-control-id="AT-field-hashtags"
                  data-testid="AT-field-hashtags"
                />
              </label>
            </div>

            <button
              type="button"
              className={styles.advancedToggle}
              onClick={() => setEditorAdvanced((current) => !current)}
              aria-expanded={editorAdvanced}
              data-control-id="AT-advanced"
              data-testid="AT-advanced"
            >
              {editorAdvanced ? 'Hide advanced timing' : 'Show advanced timing'}
            </button>

            {editorAdvanced ? (
              <div className={styles.drawerSection}>
                <h3 className={styles.drawerTitle}>Shot timing & on-screen text</h3>
                {editorFields.shots.map((shot, index) => (
                  <div className={styles.shotBody} key={shot.id}>
                    <p className={styles.shotTiming}>Shot {index + 1}</p>
                    <label className={styles.field}>
                      <span className={styles.label}>On-screen text</span>
                      <input
                        className={styles.input}
                        value={shot.onScreenText}
                        onChange={(event) => {
                          const shots = editorFields.shots.map((candidate) => candidate.id === shot.id ? { ...candidate, onScreenText: event.target.value } : candidate);
                          setEditorFields({ ...editorFields, shots });
                        }}
                        data-control-id={`AT-advanced-field-shot-text-${index + 1}`} data-testid={`AT-shot-text-${index + 1}`}
                      />
                    </label>
                    <div className={styles.fieldGrid}>
                      <label className={styles.field}>
                        <span className={styles.label}>Start ms</span>
                        <input
                          className={styles.input}
                          type="number"
                          value={shot.startMs}
                          onChange={(event) => {
                            const shots = editorFields.shots.map((candidate) => candidate.id === shot.id ? { ...candidate, startMs: Number(event.target.value) } : candidate);
                            setEditorFields({ ...editorFields, shots });
                          }}
                          data-control-id={`AT-advanced-field-shot-start-${index + 1}`} data-testid={`AT-shot-start-${index + 1}`}
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>Duration ms</span>
                        <input
                          className={styles.input}
                          type="number"
                          value={shot.durationMs}
                          onChange={(event) => {
                            const shots = editorFields.shots.map((candidate) => candidate.id === shot.id ? { ...candidate, durationMs: Number(event.target.value) } : candidate);
                            setEditorFields({ ...editorFields, shots });
                          }}
                          data-control-id={`AT-advanced-field-shot-duration-${index + 1}`} data-testid={`AT-shot-duration-${index + 1}`}
                        />
                      </label>
                    </div>
                  </div>
                ))}
                <h3 className={styles.drawerTitle}>Subtitles</h3>
                {editorFields.subtitles.map((subtitle, index) => (
                  <div className={styles.shotBody} key={subtitle.id}>
                    <div className={styles.fieldGrid}>
                      <label className={styles.field}>
                        <span className={styles.label}>Start ms</span>
                        <input
                          className={styles.input}
                          type="number"
                          value={subtitle.startMs}
                          onChange={(event) => {
                            const subtitles = editorFields.subtitles.map((candidate) => candidate.id === subtitle.id ? { ...candidate, startMs: Number(event.target.value) } : candidate);
                            setEditorFields({ ...editorFields, subtitles });
                          }}
                          data-control-id={`AT-advanced-field-subtitle-start-${index + 1}`} data-testid={`AT-subtitle-start-${index + 1}`}
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>End ms</span>
                        <input
                          className={styles.input}
                          type="number"
                          value={subtitle.endMs}
                          onChange={(event) => {
                            const subtitles = editorFields.subtitles.map((candidate) => candidate.id === subtitle.id ? { ...candidate, endMs: Number(event.target.value) } : candidate);
                            setEditorFields({ ...editorFields, subtitles });
                          }}
                          data-control-id={`AT-advanced-field-subtitle-end-${index + 1}`} data-testid={`AT-subtitle-end-${index + 1}`}
                        />
                      </label>
                    </div>
                    <label className={styles.field}>
                      <span className={styles.label}>Subtitle text</span>
                      <input
                        className={styles.input}
                        value={subtitle.text}
                        onChange={(event) => {
                          const subtitles = editorFields.subtitles.map((candidate) => candidate.id === subtitle.id ? { ...candidate, text: event.target.value } : candidate);
                          setEditorFields({ ...editorFields, subtitles });
                        }}
                        data-control-id={`AT-advanced-field-subtitle-text-${index + 1}`} data-testid={`AT-subtitle-text-${index + 1}`}
                      />
                    </label>
                  </div>
                ))}
                <p className={styles.muted}>Asset IDs and raw subtitle IDs stay out of the normal reading view.</p>
              </div>
            ) : null}
          </div>
        ) : (
          <StateBlock kind="loading" title="Preparing editor" body="Preparing the selected script version for editing." />
        )}
      </Overlay>

      <ToastRegion toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </div>
  );
}
