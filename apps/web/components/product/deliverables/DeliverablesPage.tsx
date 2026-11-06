'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Badge, Button, Overlay, StateBlock, ToastRegion, type ToastMessage } from '../../poc';
import { formatBytes, formatDate, getBrowserApi, triggerDownload } from '../../poc/browser-api';
import { useNavigationGuard } from '../NavigationGuard';
import { SocialStage } from '../journey/social/SocialStage';
import { ScriptPreview, VersionBadges, confirmationLabel, versionOriginLabel } from '../shared/PreviewBlocks';
import { ProvidedAssetShowcase, SERENITY_PROVIDED_TARGET } from '../shared/ProvidedAssets';
import type { CampaignJourney, ListSocialPostsResult } from '../../../demo/poc/api/flow-contract';
import type {
  CampaignCard,
  DeliverableItem,
  ProductExportRecord,
  ProductVersion,
} from '../../../demo/poc/api/product-contract';
import type { CommandContext, SessionView } from '../../../demo/poc/api/types';
import type { ContentDeliveryAttempt, ContentDeliveryView } from '../../../demo/poc/api/types';
import styles from '../workspace.module.css';

type LoadState = 'loading' | 'ready' | 'error';

function apiCtx(session: SessionView, key: string): CommandContext {
  return { sessionId: session.id, expectedRevision: session.revision, idempotencyKey: key };
}

function keyed(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultSubject(version: ProductVersion, campaign: CampaignCard): string {
  return `[SIMULATED · NOT SENT] ${campaign.name} · ${version.title}`;
}

function defaultBody(version: ProductVersion, campaign: CampaignCard): string {
  return [
    'SIMULATED DELIVERY — NO EMAIL WAS SENT.',
    '',
    `Please review the prepared ${version.language.toUpperCase()} script for "${campaign.name}".`,
    `Version: ${version.title} (${versionOriginLabel(version)}).`,
    '',
    'Attached content includes the script JSON, subtitle VTT and a README. No video, poster or rendered advertisement is attached.',
    'Recipient addresses use the reserved .invalid domain. No platform, renderer or email service is contacted.',
  ].join('\n');
}

export function DeliverablesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioVersionParam = (searchParams.get('scenarioVersion') ?? '').trim();
  const guard = useNavigationGuard();

  const campaignParam = searchParams.get('campaignId') ?? '';
  const languageParam = searchParams.get('language') === 'ar' ? 'ar' : searchParams.get('language') === 'en' ? 'en' : '';
  const versionParam = searchParams.get('versionId') ?? '';
  const sessionParam = searchParams.get('sessionId') ?? '';
  const exportParam = searchParams.get('exportId') ?? '';

  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState('');
  const [items, setItems] = useState<DeliverableItem[]>([]);
  const [exports, setExports] = useState<ProductExportRecord[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignCard[]>([]);
  const [socialPosts, setSocialPosts] = useState<ListSocialPostsResult>({ drafts: [], attempts: [] });
  const [socialHistoryError, setSocialHistoryError] = useState('');
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [detailsExportId, setDetailsExportId] = useState(exportParam);
  const [exportBusy, setExportBusy] = useState(false);
  const [bilingualBusy, setBilingualBusy] = useState(false);
  const [bilingualError, setBilingualError] = useState('');
  const [packLanguages, setPackLanguages] = useState<Array<'en' | 'ar'>>(['en', 'ar']);
  const [exportError, setExportError] = useState('');
  const [redownloadBusy, setRedownloadBusy] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [socialJourney, setSocialJourney] = useState<CampaignJourney | null>(null);
  const [socialJourneyError, setSocialJourneyError] = useState('');
  const [mailOpen, setMailOpen] = useState(false);
  const [mailSession, setMailSession] = useState<SessionView | null>(null);
  const [mailView, setMailView] = useState<ContentDeliveryView | null>(null);
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');
  const [mailError, setMailError] = useState('');
  const [mailNotice, setMailNotice] = useState('');
  const [mailBusy, setMailBusy] = useState(false);
  const [mailConfirmOpen, setMailConfirmOpen] = useState(false);
  const mailDirtyRef = useRef(false);
  const mailSaveRef = useRef<() => Promise<boolean>>(async () => true);
  const mailDiscardRef = useRef<() => void>(() => undefined);

  const pushToast = (message: string, tone: ToastMessage['tone'] = 'neutral') => {
    setToasts((current) => [...current, { id: `del-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, message, tone }].slice(-3));
  };

  const selectedItem = items.find((item) => `${item.version.versionId}|${item.version.sessionId ?? 'preset'}` === selectedKey)
    ?? items[0]
    ?? null;
  const selectedVersion = selectedItem?.version ?? null;

  const updateQuery = useCallback((next: Partial<Record<'campaignId' | 'language' | 'versionId' | 'sessionId' | 'exportId', string>>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    router.replace(query ? `/deliverables?${query}` : '/deliverables', { scroll: false });
  }, [router, searchParams]);

  const load = useCallback(async () => {
    setState('loading');
    setError('');
    setSocialHistoryError('');
    try {
      const api = getBrowserApi();
      const [deliverables, campaignResult, socialResult] = await Promise.all([
        api.listDeliverables({
          campaignId: campaignParam || undefined,
          language: languageParam || undefined,
        }),
        api.listCampaigns(),
        // Secondary history for the bound SERENITY campaign only. Read-only; no
        // draft is created and nothing is sent to Instagram.
        api.listSocialPosts({
          campaignId: SERENITY_PROVIDED_TARGET.campaignId,
          scenarioVersion: SERENITY_PROVIDED_TARGET.scenarioVersion,
        }),
      ]);
      if (!deliverables.ok) throw new Error(`${deliverables.error.code}: ${deliverables.error.message}`);
      if (!campaignResult.ok) throw new Error(`${campaignResult.error.code}: ${campaignResult.error.message}`);
      setItems(deliverables.data.items);
      setExports(deliverables.data.exports);
      setCampaigns(campaignResult.data.items);
      if (socialResult.ok) {
        setSocialPosts({
          drafts: socialResult.data.drafts,
          attempts: [...socialResult.data.attempts].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
        });
      } else {
        setSocialPosts({ drafts: [], attempts: [] });
        setSocialHistoryError(`${socialResult.error.code}: ${socialResult.error.message}`);
      }
      const exact = deliverables.data.items.find(
        (item) => item.version.versionId === versionParam
          && (item.version.sessionId ?? null) === (sessionParam || null),
      );
      const first = exact ?? deliverables.data.items[0];
      if (first) setSelectedKey(`${first.version.versionId}|${first.version.sessionId ?? 'preset'}`);
      setState('ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setState('error');
    }
  }, [campaignParam, languageParam, sessionParam, versionParam]);

  const loadSocialJourney = useCallback(async () => {
    const journeyCampaignId = campaignParam || SERENITY_PROVIDED_TARGET.campaignId;
    const journeyVersion = scenarioVersionParam || SERENITY_PROVIDED_TARGET.scenarioVersion;
    // Only the prepared SERENITY package has a social presentation. B/C keep
    // their existing downloads and show an honest missing state, never A's post.
    if (journeyCampaignId !== SERENITY_PROVIDED_TARGET.campaignId) {
      setSocialJourney(null);
      setSocialJourneyError('No social post is prepared for this campaign version. Existing exports and downloads remain available.');
      return;
    }
    try {
      const result = await getBrowserApi().getCampaignJourney({ campaignId: journeyCampaignId, scenarioVersion: journeyVersion });
      if (result.ok) { setSocialJourney(result.data); setSocialJourneyError(''); }
      else { setSocialJourney(null); setSocialJourneyError(`${result.error.code}: ${result.error.message}`); }
    } catch (cause) {
      setSocialJourney(null);
      setSocialJourneyError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [campaignParam, scenarioVersionParam]);

  useEffect(() => {
    void loadSocialJourney();
  }, [loadSocialJourney]);


  useEffect(() => {
    void load();
  }, [load]);

  const selectVersion = (item: DeliverableItem) => {
    setSelectedKey(`${item.version.versionId}|${item.version.sessionId ?? 'preset'}`);
    updateQuery({
      campaignId: item.version.campaignId,
      language: item.version.language,
      versionId: item.version.versionId,
      sessionId: item.version.sessionId ?? '',
    });
  };

  // ------------------------------------------------------------- export flow
  const downloadSelected = async () => {
    if (!selectedVersion || !selectedItem) return;
    setExportBusy(true);
    setExportError('');
    try {
      const prepared = await getBrowserApi().exportScriptPack({
        campaignId: selectedVersion.campaignId,
        versionId: selectedVersion.versionId,
        sessionId: selectedVersion.sessionId,
        idempotencyKey: keyed('deliverables-export'),
      });
      if (!prepared.ok) {
        setExportError(`${prepared.error.code}: ${prepared.error.message}`);
        pushToast(`Download not prepared: ${prepared.error.message}`, 'error');
        return;
      }
      triggerDownload(prepared.data.download);
      const marked = await getBrowserApi().markProductExportTriggered({ exportId: prepared.data.record.id });
      if (!marked.ok) {
        pushToast('The download started, but the local export record could not be marked.', 'error');
      } else {
        pushToast(`Download started · ${marked.data.archiveFilename}`, 'success');
      }
      await load();
      setDetailsExportId(prepared.data.record.id);
      updateQuery({ exportId: prepared.data.record.id });
    } finally {
      setExportBusy(false);
    }
  };

  const downloadBilingual = async () => {
    if (!selectedVersion || !selectedItem) return;
    setBilingualBusy(true);
    setBilingualError('');
    try {
      const api = getBrowserApi();
      const campaignResult = await api.getCampaign({ campaignId: selectedVersion.campaignId });
      if (!campaignResult.ok) {
        setBilingualError(`${campaignResult.error.code}: ${campaignResult.error.message}`);
        return;
      }
      const campaignView = campaignResult.data;
      const selected = campaignView.versions.filter((version) => version.origin === 'preset' && packLanguages.includes(version.language));
      if (selected.length === 0) {
        setBilingualError('Select at least one language before preparing the pack.');
        return;
      }
      const languages = new Set<string>();
      const chosen = selected.filter((version) => {
        if (languages.has(version.language)) return false;
        languages.add(version.language);
        return true;
      });
      if (chosen.length === 0) {
        setBilingualError('This campaign has no preset script versions to pack.');
        return;
      }
      const provided = await api.getProvidedAssets({
        campaignId: campaignView.campaign.campaignId,
        scenarioVersion: campaignView.campaign.scenarioVersion,
      });
      const includeProvidedAssets = Boolean(provided.ok && provided.data?.contentStatus === 'bound');
      const prepared = await api.exportCampaignPack({
        campaignId: campaignView.campaign.campaignId,
        versions: chosen.map((version) => ({
          campaignId: version.campaignId,
          versionId: version.versionId,
          sessionId: version.sessionId,
          scenarioVersion: campaignView.campaign.scenarioVersion,
        })),
        includeProvidedAssets,
        idempotencyKey: keyed('deliverables-bilingual'),
      });
      if (!prepared.ok) {
        setBilingualError(`${prepared.error.code}: ${prepared.error.message}`);
        pushToast(`Bilingual pack not prepared: ${prepared.error.message}`, 'error');
        return;
      }
      triggerDownload(prepared.data.download);
      const marked = await api.markCampaignPackExportTriggered({ exportId: prepared.data.record.id });
      if (!marked.ok) pushToast('The download started, but the bilingual export record could not be marked.', 'error');
      else pushToast(`Bilingual pack started · ${marked.data.archiveFilename}`, 'success');
    } finally {
      setBilingualBusy(false);
    }
  };

  const redownload = async (record: ProductExportRecord) => {
    setRedownloadBusy(record.id);
    try {
      const stored = await getBrowserApi().getProductExport({ exportId: record.id });
      if (!stored.ok) {
        pushToast(`Original pack unavailable: ${stored.error.message}`, 'error');
        return;
      }
      triggerDownload(stored.data.download);
      pushToast(`Download started · ${stored.data.download.filename} (original snapshot)`, 'success');
    } finally {
      setRedownloadBusy(null);
    }
  };

  // ---------------------------------------------------------------- mail flow
  const selectedConfirmed = selectedVersion?.confirmation === 'confirmed_current';

  const loadMailDelivery = useCallback(async (sessionId: string) => {
    const delivery = await getBrowserApi().getContentDelivery(sessionId);
    if (!delivery.ok) {
      setMailError(`${delivery.error.code}: ${delivery.error.message}`);
      return null;
    }
    const latestSession = await getBrowserApi().getSession({ sessionId });
    if (latestSession.ok) setMailSession(latestSession.data);
    setMailView(delivery.data);
    if (delivery.data.delivery.draft) {
      setMailSubject(delivery.data.delivery.draft.subject);
      setMailBody(delivery.data.delivery.draft.body);
    }
    return delivery.data;
  }, []);

  const openMail = async () => {
    if (!selectedVersion || !selectedItem) return;
    setMailOpen(true);
    setMailError('');
    setMailNotice('');
    setMailConfirmOpen(false);
    setMailView(null);
    setMailSession(null);
    mailDirtyRef.current = false;
    if (!selectedConfirmed) {
      const campaign = await getBrowserApi().getCampaign({ campaignId: selectedVersion.campaignId });
      if (campaign.ok && campaign.data.workingSession) {
        setMailSession(campaign.data.workingSession);
      }
      setMailSubject(defaultSubject(selectedVersion, selectedItem.campaign));
      setMailBody(defaultBody(selectedVersion, selectedItem.campaign));
      return;
    }
    let sessionId = selectedVersion.sessionId;
    if (!sessionId) {
      const campaign = await getBrowserApi().getCampaign({ campaignId: selectedVersion.campaignId });
      sessionId = campaign.ok ? campaign.data.workingSession?.id ?? null : null;
    }
    if (!sessionId) {
      setMailError('No confirmed working session was found for this campaign.');
      return;
    }
    setMailSubject(defaultSubject(selectedVersion, selectedItem.campaign));
    setMailBody(defaultBody(selectedVersion, selectedItem.campaign));
    await loadMailDelivery(sessionId);
  };

  const confirmForMail = async () => {
    if (!selectedVersion || !selectedItem) return;
    setMailBusy(true);
    setMailError('');
    try {
      const edited = await getBrowserApi().beginCampaignEdit({
        campaignId: selectedVersion.campaignId,
        versionId: selectedVersion.versionId,
        sessionId: selectedVersion.sessionId,
        idempotencyKey: keyed('mail-confirm-edit'),
      });
      if (!edited.ok) {
        setMailError(`${edited.error.code}: ${edited.error.message}`);
        return;
      }
      const confirmed = await getBrowserApi().confirmScript(
        apiCtx(edited.data.session, keyed('mail-confirm-script')),
        { scriptVersionId: edited.data.session.activeScriptVersionId ?? selectedVersion.versionId },
      );
      if (!confirmed.ok) {
        setMailError(`${confirmed.error.code}: ${confirmed.error.message}`);
        return;
      }
      setMailSession(confirmed.data);
      setMailSubject(defaultSubject(selectedVersion, selectedItem.campaign));
      setMailBody(defaultBody(selectedVersion, selectedItem.campaign));
      await loadMailDelivery(confirmed.data.id);
      setMailNotice('Script confirmed for this local demo only. No Lavish approval is implied.');
      await load();
    } finally {
      setMailBusy(false);
    }
  };

  const seasonalDirty = Boolean(mailView?.delivery.draft)
    && (mailSubject !== mailView?.delivery.draft?.subject || mailBody !== mailView?.delivery.draft?.body);
  const mailHasDraft = Boolean(mailView?.delivery.draft);
  const mailDirty = mailHasDraft ? seasonalDirty : Boolean(mailView && (mailSubject || mailBody));
  mailDirtyRef.current = mailDirty;

  const saveMailDraft = useCallback(async (): Promise<boolean> => {
    if (!mailSession || !mailView?.sourcePlan) {
      setMailError('A confirmed working session and delivery plan are required before saving this draft.');
      return false;
    }
    if (!mailSession.activeScriptVersionId) {
      setMailError('No active script version is prepared for this draft.');
      return false;
    }
    setMailBusy(true);
    setMailError('');
    try {
      const saved = await getBrowserApi().saveContentDeliveryDraft(
        apiCtx(mailSession, keyed('mail-save')),
        {
          sourcePlanId: mailView.sourcePlan.id,
          scriptVersionId: mailSession.activeScriptVersionId,
          recipientSnapshot: mailView.sourcePlan.recipients,
          subject: mailSubject.trim(),
          body: mailBody.trim(),
        },
      );
      if (!saved.ok) {
        setMailError(`${saved.error.code}: ${saved.error.message}`);
        return false;
      }
      setMailSession(saved.data.session);
      await loadMailDelivery(saved.data.session.id);
      setMailNotice('Draft saved with this exact revision and attachment manifest.');
      return true;
    } finally {
      setMailBusy(false);
    }
  }, [loadMailDelivery, mailBody, mailSession, mailSubject, mailView]);

  const discardMail = useCallback(() => {
    if (mailView?.delivery.draft) {
      setMailSubject(mailView.delivery.draft.subject);
      setMailBody(mailView.delivery.draft.body);
    } else if (selectedVersion && selectedItem) {
      setMailSubject(defaultSubject(selectedVersion, selectedItem.campaign));
      setMailBody(defaultBody(selectedVersion, selectedItem.campaign));
    }
    setMailError('');
    setMailNotice('Unsaved mail changes discarded.');
  }, [mailView, selectedItem, selectedVersion]);

  mailSaveRef.current = saveMailDraft;
  mailDiscardRef.current = discardMail;

  useEffect(() => {
    if (!mailOpen) {
      guard.register(null);
      return () => guard.register(null);
    }
    guard.register({
      isDirty: () => mailDirtyRef.current,
      save: async () => mailSaveRef.current(),
      discard: () => mailDiscardRef.current(),
    });
    return () => guard.register(null);
  }, [guard, mailOpen]);

  const closeMail = () => {
    if (mailDirty) {
      guard.requestLeave(() => { setMailOpen(false); setMailConfirmOpen(false); }, 'Close the simulated delivery drawer');
      return;
    }
    setMailOpen(false);
    setMailConfirmOpen(false);
  };

  const simulate = async (failureCase: 'delivery_failed' | null) => {
    if (!mailSession || !mailView?.delivery.draft) return;
    if (mailDirty) {
      setMailError('Save the draft before simulating delivery; success and failure actions are disabled while dirty.');
      return;
    }
    setMailBusy(true);
    setMailError('');
    try {
      const result = await getBrowserApi().simulateContentDelivery(
        apiCtx(mailSession, keyed(failureCase ? 'mail-fail' : 'mail-send')),
        { draftRevision: mailView.delivery.draft.revision, confirmed: true, ...(failureCase ? { failureCase } : {}) },
      );
      if (!result.ok) {
        setMailError(`${result.error.code}: ${result.error.message}`);
        return;
      }
      setMailSession(result.data.session);
      await loadMailDelivery(result.data.session.id);
      setMailConfirmOpen(false);
      setMailNotice(
        result.data.attempt.outcome === 'failed'
          ? 'Simulated delivery failed. No email was sent. Retry records a new attempt.'
          : 'Simulated delivery recorded. No email was actually sent.',
      );
    } finally {
      setMailBusy(false);
    }
  };

  const exportAttempt = async (attempt: ContentDeliveryAttempt) => {
    if (!mailSession) return;
    setMailBusy(true);
    setMailError('');
    try {
      const result = await getBrowserApi().exportContentPack(
        apiCtx(mailSession, keyed('mail-export')),
        { attemptId: attempt.id },
      );
      if (!result.ok) {
        setMailError(`${result.error.code}: ${result.error.message}`);
        return;
      }
      triggerDownload(result.data);
      pushToast(`Download started · ${result.data.filename}`, 'success');
    } finally {
      setMailBusy(false);
    }
  };

  const attempts = mailView?.delivery.attempts ?? [];
  const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;

  if (state === 'loading') {
    return <StateBlock kind="loading" title="Loading Deliverables" body="Reading prepared content packages and local export history." />;
  }

  if (state === 'error') {
    return <StateBlock kind="error" title="Deliverables unavailable" body={error} action={<Button variant="secondary" onClick={() => void load()}>Try again</Button>} />;
  }

  return (
    <div className={styles.page} data-testid="deliverables-page">
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Deliverables</p>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Deliverables</h1>
            <p className={styles.lede}>Review your video and copy, then simulate a social post. Download content packs and the original MP4 as secondary actions.</p>
          </div>
          <Badge tone="mock">Demo · Mock data</Badge>
        </div>
      </header>

      <section className={styles.socialWorkbench} aria-label="Social post review and simulated publish" data-testid="deliverables-social-workbench">
        {socialJourney ? (
          <SocialStage journey={socialJourney} surface="deliverables" onChanged={() => { void loadSocialJourney(); }} />
        ) : socialJourneyError ? (
          <div className={styles.notice} data-testid="deliverables-social-unavailable">
            <strong>The social post for this campaign version is not available.</strong>
            <p>{socialJourneyError}</p>
            <p>No SERENITY video or caption was borrowed. Existing exports and downloads remain available below.</p>
          </div>
        ) : (
          <StateBlock kind="loading" title="Reading the social post" body="Loading the prepared video, EN/AR copy and simulated post records for this campaign version." />
        )}
      </section>

      <details className={styles.downloadsDisclosure} data-testid="deliverables-downloads">
        <summary className={styles.downloadsSummary}>Downloads and content packs</summary>
        <p className={styles.muted}>Secondary actions: prepare a real content pack or download the provided original MP4. Simulated email is a separate, lower-priority demo flow.</p>
        <ProvidedAssetShowcase surface="deliverables" compact />

      <section className={styles.toolbar} aria-label="Deliverable filters">
        <label className={styles.field}>
          <span className={styles.label}>Campaign</span>
          <select className={styles.select} value={campaignParam} onChange={(event) => { setSelectedKey(''); updateQuery({ campaignId: event.target.value, versionId: '', sessionId: '' }); }} data-control-id="DEL-campaign" data-testid="DEL-campaign">
            <option value="">All campaigns</option>
            {campaigns.map((campaign) => (
              <option key={campaign.campaignId} value={campaign.campaignId}>{campaign.name}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Language</span>
          <select className={styles.select} value={languageParam} onChange={(event) => { setSelectedKey(''); updateQuery({ language: event.target.value, versionId: '', sessionId: '' }); }} data-control-id="DEL-language" data-testid="DEL-language">
            <option value="">All languages</option>
            <option value="en">English</option>
            <option value="ar">Arabic</option>
          </select>
        </label>
      </section>

      {items.length === 0 ? (
        <div className={styles.emptyState} data-testid="DEL-empty">
          <p className={styles.cardText}>No deliverable versions match these filters.</p>
          <Button variant="secondary" onClick={() => updateQuery({ campaignId: '', language: '', versionId: '', sessionId: '' })}>Clear filters</Button>
        </div>
      ) : (
        <div className={styles.deliverableLayout}>
          <section aria-label="Deliverable versions">
            <div className={styles.deliverableList} data-testid="deliverable-list" data-control-id="DEL-version">
              {items.map((item) => {
                const key = `${item.version.versionId}|${item.version.sessionId ?? 'preset'}`;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.deliverableRow} ${selectedItem && key === `${selectedItem.version.versionId}|${selectedItem.version.sessionId ?? 'preset'}` ? styles.deliverableActive : ''}`}
                    onClick={() => selectVersion(item)}
                    data-control-id={`DEL-version-${item.version.versionId}-${item.version.sessionId ?? 'preset'}`}
                    data-testid={`DEL-version-${item.version.versionId}-${item.version.sessionId ?? 'preset'}`}
                    aria-pressed={selectedItem ? key === `${selectedItem.version.versionId}|${selectedItem.version.sessionId ?? 'preset'}` : false}
                  >
                    <span className={styles.deliverableMain}>
                      <span className={styles.deliverableTitle}>{item.version.title}</span>
                      <span className={styles.deliverableMeta}>
                        {item.campaign.name} · {item.version.language.toUpperCase()} · {versionOriginLabel(item.version)} · {confirmationLabel(item.version)}
                      </span>
                    </span>
                    <span className={styles.tag}>{item.version.confirmation === 'confirmed_current' ? 'Confirmed' : 'Draft'}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={styles.packageCard} aria-label="Selected package" data-testid="deliverable-package">
            {selectedVersion && selectedItem ? (
              <>
                <div className={styles.packageHeader}>
                  <div>
                    <p className={styles.eyebrow}>{selectedItem.campaign.name}</p>
                    <h2 className={styles.cardTitle}>{selectedVersion.title}</h2>
                    <div className={styles.badgeRow}>
                      <VersionBadges version={selectedVersion} />
                    </div>
                  </div>
                  <div className={styles.pageActions}>
                    <div className={styles.chipRow} role="group" aria-label="Bilingual pack languages" data-control-id="AS-PACK-VERSIONS" data-testid="AS-PACK-VERSIONS">
                      {(['en', 'ar'] as const).map((language) => (
                        <label key={language} className={styles.chip}>
                          <input
                            type="checkbox"
                            checked={packLanguages.includes(language)}
                            onChange={(event) => setPackLanguages((current) => event.target.checked
                              ? [...new Set([...current, language])]
                              : current.filter((value) => value !== language))}
                            data-control-id={`AS-PACK-VERSION-${language}`}
                            data-testid={`AS-PACK-VERSION-${language}`}
                          />
                          {language.toUpperCase()}
                        </label>
                      ))}
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => void downloadSelected()}
                      pending={exportBusy}
                      data-control-id="DEL-download"
                      data-testid="DEL-download"
                    >
                      Download content pack
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => void downloadBilingual()}
                      pending={bilingualBusy}
                      data-control-id="AS-PACK-DOWNLOAD"
                      data-testid="DEL-bilingual"
                    >
                      Download bilingual pack
                    </Button>
                    <Button variant="secondary" onClick={() => void openMail()} data-control-id="MAIL-open" data-testid="MAIL-open">
                      Simulate email delivery
                    </Button>
                  </div>
                </div>

                <p className={styles.muted}>
                  The bilingual pack includes the selected campaign&apos;s EN and AR preset scripts, each with its matching VTT, storyboard and real referenced images. Provided SERENITY Hero/identity/MP4 are added only after the new 1.1.0 content is bound.
                </p>
                {bilingualError ? <p className={styles.errorText} role="alert" data-testid="DEL-bilingual-error">{bilingualError}</p> : null}

                <p className={styles.muted}>
                  {selectedVersion.confirmation === 'confirmed_current'
                    ? 'Confirmed current version. The pack records Confirmed at export.'
                    : 'This version is unconfirmed. The pack records Draft / Not confirmed and nothing is silently confirmed by downloading.'}
                </p>

                <ul className={styles.contentsList}>
                  <li className={styles.contentItem}>Campaign brief (brief.json)</li>
                  <li className={styles.contentItem}>Script JSON · {selectedVersion.language.toUpperCase()}</li>
                  <li className={styles.contentItem}>Subtitles · subtitles-{selectedVersion.language}.vtt</li>
                  <li className={styles.contentItem}>Static storyboard.html</li>
                  <li className={styles.contentItem}>Real product & logo media</li>
                  <li className={styles.contentItem}>README.txt + EXPORT.json</li>
                </ul>
                <p className={styles.muted}>
                  {selectedVersion.content.shots.length} static shots · no MP4, poster or rendered video. Simulated email is a separate secondary flow.
                </p>

                {exportError ? (
                  <div className={styles.drawerSection}>
                    <p className={styles.errorText} role="alert">{exportError}</p>
                    <Button variant="secondary" onClick={() => void downloadSelected()} data-control-id="DEL-retry" data-testid="DEL-retry">Retry download</Button>
                  </div>
                ) : null}

                <details className={styles.drawerSection}>
                  <summary className={styles.advancedToggle} data-control-id="DEL-preview">Read the selected script</summary>
                  <ScriptPreview version={selectedVersion} campaign={selectedItem.campaign} />
                </details>
              </>
            ) : null}
          </section>
        </div>
      )}

      <section className={styles.section} aria-labelledby="recent-exports-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle} id="recent-exports-title">Recent exports</h2>
            <p className={styles.sectionNote}>Ordinary content-pack downloads only. Simulated email attempts are separate and never appear as deliveries.</p>
          </div>
        </div>
        {exports.length === 0 ? (
          <div className={styles.emptyState} data-testid="DEL-exports-empty">
            <p className={styles.cardText}>No content packs prepared yet.</p>
            <p className={styles.muted}>Use Download content pack above. Your downloads will appear here with their original snapshot.</p>
          </div>
        ) : (
          <div className={styles.exportTable} data-testid="export-table">
            {exports.map((record) => (
              <div key={record.id}>
                <div className={styles.exportRow}>
                  <span>
                    <strong>{record.title}</strong>
                    <br />
                    <span className={styles.muted}>{record.language.toUpperCase()} · {record.origin === 'preset' ? 'Preset' : 'Saved version'} · {record.confirmationAtExport === 'confirmed_current' ? 'Confirmed at export' : 'Draft / Not confirmed'}</span>
                  </span>
                  <span className={styles.libraryCell}>{record.status === 'download_triggered' ? 'Download started' : 'Prepared'}</span>
                  <span className={styles.libraryCell}>{formatDate(record.createdAt)}</span>
                  <span className={styles.libraryActions}>
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => {
                        const next = detailsExportId === record.id ? '' : record.id;
                        setDetailsExportId(next);
                        updateQuery({ exportId: next });
                      }}
                      data-control-id={`DEL-details-${record.id}`}
                      data-testid={`DEL-details-${record.id}`}
                    >
                      {detailsExportId === record.id ? 'Hide details' : 'Details'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      pending={redownloadBusy === record.id}
                      onClick={() => void redownload(record)}
                      data-control-id={`DEL-redownload-${record.id}`}
                      data-testid={`DEL-redownload-${record.id}`}
                    >
                      Download again
                    </Button>
                  </span>
                </div>
                {detailsExportId === record.id ? (
                  <div className={styles.cardPadded} data-testid={`DEL-detail-panel-${record.id}`}>
                    <dl className={styles.kv}>
                      <dt>File</dt>
                      <dd>{record.archiveFilename}</dd>
                      <dt>Version</dt>
                      <dd>{record.version.versionId}{record.version.sessionId ? ` · session ${record.version.sessionId}` : ' · preset'}</dd>
                      <dt>Status</dt>
                      <dd>{record.status === 'download_triggered' ? 'Download triggered (browser only)' : 'Prepared, not yet downloaded'}</dd>
                      <dt>Created</dt>
                      <dd>{formatDate(record.createdAt)}</dd>
                      <dt>Archive size</dt>
                      <dd>{formatBytes(record.archiveBytes)}</dd>
                      <dt>Archive SHA-256</dt>
                      <dd className={styles.mono}>{record.archiveSha256}</dd>
                      <dt>Attachments</dt>
                      <dd>{record.attachments.map((attachment) => attachment.filename).join(' · ')}</dd>
                    </dl>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
      </details>


      <Overlay
        open={mailOpen}
        onClose={closeMail}
        variant="drawer"
        title="Simulated email delivery"
        description="Secondary demo flow. No real email is sent; recipient addresses use the reserved .invalid domain."
        testId="deliverables-mail"
        footer={
          <div className={styles.editorActions}>
            <Button variant="secondary" onClick={closeMail} data-control-id="MAIL-close" data-testid="MAIL-close">Close</Button>
            <Button variant="ghost" onClick={discardMail} data-control-id="MAIL-discard" data-testid="MAIL-discard">Discard changes</Button>
            <Button
              variant="secondary"
              onClick={() => void saveMailDraft()}
              pending={mailBusy}
              data-control-id="MAIL-save"
              data-testid="MAIL-save"
            >
              Save draft
            </Button>
            <Button
              variant="primary"
              onClick={() => setMailConfirmOpen(true)}
              disabled={!mailHasDraft || mailDirty}
              data-control-id="MAIL-simulate"
              data-testid="MAIL-simulate"
            >
              Confirm simulated delivery
            </Button>
          </div>
        }
      >
        <div className={styles.mailForm}>
          {mailError ? <p className={styles.errorText} role="alert">{mailError}</p> : null}
          {mailNotice ? <p className={styles.successText}>{mailNotice}</p> : null}

          {!selectedConfirmed && !mailView ? (
            <div className={styles.deliverableMain}>
              <p className={styles.cardText}>Confirm this script to simulate delivery.</p>
              <p className={styles.muted}>
                Simulation requires a confirmed working version. Confirming here only changes this local demo; it is not a Lavish approval.
              </p>
              <Button
                variant="primary"
                onClick={() => void confirmForMail()}
                pending={mailBusy}
                data-control-id="MAIL-confirm-script"
                data-testid="MAIL-confirm-script"
              >
                Confirm this script
              </Button>
            </div>
          ) : null}

          {mailView?.sourcePlan ? (
            <>
              <div className={styles.drawerSection}>
                <h3 className={styles.drawerTitle}>Recipients (simulated)</h3>
                <ul className={styles.insightList}>
                  {mailView.sourcePlan.recipients.map((recipient) => (
                    <li key={recipient.id}>{recipient.displayName} · {recipient.email}</li>
                  ))}
                </ul>
              </div>
              <label className={styles.field}>
                <span className={styles.label}>Subject</span>
                <input
                  className={styles.input}
                  value={mailSubject}
                  onChange={(event) => { setMailSubject(event.target.value); setMailConfirmOpen(false); }}
                  data-control-id="MAIL-field-subject"
                  data-testid="MAIL-field-subject"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Body</span>
                <textarea
                  className={styles.textarea}
                  value={mailBody}
                  onChange={(event) => { setMailBody(event.target.value); setMailConfirmOpen(false); }}
                  data-control-id="MAIL-field-body"
                  data-testid="MAIL-field-body"
                />
              </label>
              {mailDirty ? (
                <p className={styles.noticeWarn}>You have unsaved mail changes. Save the draft before confirming success or failure.</p>
              ) : null}
              {mailView.delivery.draft ? (
                <p className={styles.muted}>
                  Saved draft revision {mailView.delivery.draft.revision} · {mailView.delivery.draft.attachmentManifest.length} attachments · {mailView.delivery.draft.recipientSnapshot.length} simulated recipients
                </p>
              ) : null}

              {mailConfirmOpen ? (
                <div className={styles.cardPadded} data-testid="MAIL-confirmation">
                  <p className={styles.cardText}>
                    Record one simulated delivery for the saved draft revision {mailView.delivery.draft?.revision ?? '—'}? No email will be sent.
                  </p>
                  <div className={styles.cardActions}>
                    <Button variant="secondary" onClick={() => setMailConfirmOpen(false)} data-control-id="MAIL-cancel" data-testid="MAIL-cancel">Cancel</Button>
                    <Button variant="primary" pending={mailBusy} onClick={() => void simulate(null)} data-control-id="MAIL-record" data-testid="MAIL-record">
                      Record simulated delivery
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className={styles.cardActions}>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => void simulate('delivery_failed')}
                  disabled={!mailHasDraft || mailDirty || mailBusy}
                  data-control-id="MAIL-failure"
                  data-testid="MAIL-failure"
                >
                  Simulate failure
                </Button>
                {lastAttempt?.outcome === 'failed' ? (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => void simulate(null)}
                    disabled={mailDirty || mailBusy}
                    data-control-id="MAIL-retry"
                    data-testid="MAIL-retry"
                  >
                    Retry simulated delivery
                  </Button>
                ) : null}
              </div>

              <div className={styles.drawerSection}>
                <h3 className={styles.drawerTitle}>Simulation records</h3>
                {attempts.length === 0 ? (
                  <p className={styles.muted}>No simulated attempts yet.</p>
                ) : (
                  <div className={styles.mailAttempts}>
                    {attempts.map((attempt) => (
                      <div className={styles.mailAttempt} key={attempt.id} data-testid={`MAIL-attempt-${attempt.id}`}>
                        <span>
                          <strong>Attempt {attempt.attempt}</strong> · {attempt.outcome === 'failed' ? 'Failed' : 'Simulated'} · {formatDate(attempt.createdAt)}
                          <br />
                          <span className={styles.muted}>{attempt.subject}</span>
                        </span>
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => void exportAttempt(attempt)}
                          pending={mailBusy}
                          data-control-id={`MAIL-export-attempt-${attempt.id}`}
                          data-testid={`MAIL-export-attempt-${attempt.id}`}
                        >
                          Export record
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : selectedConfirmed && !mailView && !mailError ? (
            <StateBlock kind="loading" title="Preparing simulated delivery" body="Reading the confirmed working version and its simulated delivery plan." />
          ) : null}
        </div>
      </Overlay>

      <ToastRegion toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </div>
  );
}
