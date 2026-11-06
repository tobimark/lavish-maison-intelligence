'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { Badge, Button, Overlay, StateBlock } from '../../../poc';
import { formatDate, getBrowserApi } from '../../../poc/browser-api';
import { useNavigationGuard } from '../../NavigationGuard';
import type {
  CampaignJourney,
  PresentationLanguage,
  PresentationSocialPost,
  SocialAttempt,
  SocialAttemptSnapshot,
  SocialDraft,
} from '../../../../demo/poc/api/flow-contract';
import type { ProvidedAsset } from '../../../../demo/poc/api/provided-asset-contract';
import type { ProductVersion } from '../../../../demo/poc/api/product-contract';
import type { CommandContext } from '../../../../demo/poc/api/types';
import { SocialPostCard } from './SocialPostCard';
import { SocialSnapshotDetails } from './SocialSnapshotDetails';
import { fieldsEqual, fieldsFromDraft, fieldsFromPreset, parseHashtags, type SocialFields } from './socialFields';
import { captionExcerpt } from './socialText';
import workspace from '../../workspace.module.css';
import styles from './social.module.css';

export interface SocialStageProps {
  /** Closed journey projection for exactly one campaign/scenario version. */
  journey: CampaignJourney;
  /** Re-read the journey after a local write (draft saved, review, publish). */
  onChanged: () => void | Promise<void>;
}

type Language = PresentationLanguage;
const LANGUAGES: readonly Language[] = ['en', 'ar'] as const;

interface ApiFailure {
  error: { code: string; message: string; fieldErrors?: Array<{ path: string; message: string }> };
}

function keyed(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function failureText(result: ApiFailure): string {
  return `${result.error.code}: ${result.error.message}`;
}

function languageLabel(language: Language): string {
  return language === 'ar' ? 'Arabic' : 'English';
}

function mapFieldErrors(result: ApiFailure): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const fieldError of result.error.fieldErrors ?? []) {
    if (fieldError.path.includes('caption')) mapped.caption = fieldError.message;
    else if (fieldError.path.includes('cta')) mapped.cta = fieldError.message;
    else if (fieldError.path.includes('hashtags')) mapped.hashtags = fieldError.message;
  }
  return mapped;
}

function snapshotOf(draft: SocialDraft): SocialAttemptSnapshot {
  return {
    sourceScript: { ...draft.sourceScript },
    video: { ...draft.video },
    channel: draft.channel,
    placement: draft.placement,
    accountLabel: draft.accountLabel,
    language: draft.language,
    caption: draft.caption,
    cta: draft.cta,
    hashtags: [...draft.hashtags],
  };
}

function videoView(asset: ProvidedAsset | null) {
  if (!asset) return null;
  return {
    uri: asset.uri,
    mimeType: asset.mimeType,
    label: asset.label,
    width: asset.metadata?.width ?? null,
    height: asset.metadata?.height ?? null,
    durationMs: asset.metadata?.durationMs ?? null,
    sha256: asset.sha256,
  };
}

function sortAttempts(attempts: readonly SocialAttempt[]): SocialAttempt[] {
  return [...attempts].sort((left, right) => {
    if (left.createdAt === right.createdAt) return left.id.localeCompare(right.id);
    return right.createdAt.localeCompare(left.createdAt);
  });
}

/**
 * FLOW-003 · Journey stage 4: an Instagram video post made from the same
 * provided MP4 plus the EN/AR preset copy. Browse is read-only; prepare, save,
 * review and simulate are explicit user actions on the shared MockApi/social
 * workflow storage. Every success message appears only after the local store
 * has committed, and no content is sent to Instagram.
 */
export function SocialStage({ journey, onChanged, surface = 'journey' }: SocialStageProps & { surface?: 'journey' | 'deliverables' }) {
  const workspaceSurface = surface === 'deliverables';
  const guard = useNavigationGuard();
  const api = getBrowserApi();

  const [activeLanguage, setActiveLanguage] = useState<Language>('en');
  const [fields, setFields] = useState<Record<Language, SocialFields | null>>(() => ({
    en: null,
    ar: null,
  }));
  const [pendingDrafts, setPendingDrafts] = useState<Record<string, SocialDraft>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [confirmingCreative, setConfirmingCreative] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmationNeeded, setConfirmationNeeded] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewDraft, setReviewDraft] = useState<SocialDraft | null>(null);
  const [reviewError, setReviewError] = useState('');
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishDraft, setPublishDraft] = useState<SocialDraft | null>(null);
  const [publishError, setPublishError] = useState('');
  const [publishResult, setPublishResult] = useState<SocialAttempt | null>(null);

  const busy = preparing || saving || reviewing || confirmingCreative || publishing;
  const publishingRef = useRef(false);
  const publishCompletedRef = useRef(false);
  
  const presentation = journey.contentStatus === 'ready' ? journey.presentation : null;
  const campaign = journey.campaign;

  const presetFor = useCallback(
    (language: Language): PresentationSocialPost | null => presentation?.socialPosts.find((post) => post.language === language) ?? null,
    [presentation],
  );
  const scriptFor = useCallback(
    (language: Language): ProductVersion | null => journey.selectedVersions[language] ?? null,
    [journey.selectedVersions],
  );
  const journeyDraftFor = useCallback((language: Language): SocialDraft | null => {
    const preset = presetFor(language);
    if (!preset) return null;
    return journey.socialDrafts.find((draft) => draft.presetPostId === preset.id) ?? null;
  }, [journey.socialDrafts, presetFor]);
  const draftFor = useCallback((language: Language): SocialDraft | null => {
    const preset = presetFor(language);
    if (!preset) return null;
    const journeyDraft = journeyDraftFor(language);
    const pending = pendingDrafts[preset.id];
    if (pending && (!journeyDraft || pending.updatedAt >= journeyDraft.updatedAt)) return pending;
    return journeyDraft;
  }, [journeyDraftFor, pendingDrafts, presetFor]);
  const baselineFor = useCallback((language: Language): SocialFields | null => {
    const draft = draftFor(language);
    if (draft) return fieldsFromDraft(draft);
    const preset = presetFor(language);
    return preset ? fieldsFromPreset(preset) : null;
  }, [draftFor, presetFor]);

  const preset = presetFor(activeLanguage);
  const draft = draftFor(activeLanguage);
  const script = scriptFor(activeLanguage);
  const baseline = baselineFor(activeLanguage);
  const currentFields = fields[activeLanguage] ?? baseline;
  const videoAsset = (() => {
    if (!preset || !journey.providedAssets) return null;
    const activeDraft = draftFor(activeLanguage);
    const assetId = activeDraft?.video.assetId ?? preset.videoAssetId;
    return journey.providedAssets.assets.find((asset) => asset.id === assetId) ?? null;
  })();
  const activeVideo = videoView(videoAsset);

  const dirtyFor = useCallback((language: Language): boolean => {
    const current = fields[language];
    const base = baselineFor(language);
    if (!current || !base) return false;
    return !fieldsEqual(current, base);
  }, [baselineFor, fields]);

  const anyDirty = dirtyFor('en') || dirtyFor('ar');
  const scriptConfirmed = script?.confirmation === 'confirmed_current';

  // Reset the editable fields for a language when its persisted draft identity
  // changes (prepare/save/review/publish or a journey reload). The other
  // language's unsaved edits are deliberately untouched.
  const enSignature = (() => {
    const value = draftFor('en');
    return value ? `${value.id}|${value.revision}|${value.status}|${value.updatedAt}` : 'preset-en';
  })();
  const arSignature = (() => {
    const value = draftFor('ar');
    return value ? `${value.id}|${value.revision}|${value.status}|${value.updatedAt}` : 'preset-ar';
  })();
  const syncRef = useRef<Record<Language, string>>({ en: enSignature, ar: arSignature });

  useEffect(() => {
    if (syncRef.current.en === enSignature) return;
    syncRef.current.en = enSignature;
    setFields((previous) => ({ ...previous, en: baselineFor('en') }));
  }, [baselineFor, enSignature]);

  useEffect(() => {
    if (syncRef.current.ar === arSignature) return;
    syncRef.current.ar = arSignature;
    setFields((previous) => ({ ...previous, ar: baselineFor('ar') }));
  }, [arSignature, baselineFor]);

  // Initialise the form from the real preset/draft on first render.
  useEffect(() => {
    setFields(() => ({ en: baselineFor('en'), ar: baselineFor('ar') }));
    // Only on mount: the per-language effects above keep the form in sync later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirtyRef = useRef(false);
  dirtyRef.current = anyDirty;

  const pushDraft = (next: SocialDraft) => {
    setPendingDrafts((previous) => ({ ...previous, [next.presetPostId]: next }));
  };

  const saveLanguage = useCallback(async (language: Language): Promise<boolean> => {
    const presetPost = presetFor(language);
    const activeDraft = draftFor(language);
    const values = fields[language] ?? baselineFor(language);
    if (!presetPost || !activeDraft || !values) return false;
    const nextFieldErrors: Record<string, string> = {};
    if (values.caption.trim().length === 0) nextFieldErrors.caption = 'Caption is required.';
    if (values.cta.trim().length === 0) nextFieldErrors.cta = 'Call to action is required.';
    const hashtags = parseHashtags(values.hashtags);
    if (hashtags.length === 0) nextFieldErrors.hashtags = 'Add at least one hashtag.';
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError('The social post content is not ready to save.');
      return false;
    }
    setSaving(true);
    setError('');
    setFieldErrors({});
    setNotice('');
    try {
      const result = await api.saveSocialDraft({
        draftId: activeDraft.id,
        expectedRevision: activeDraft.revision,
        idempotencyKey: keyed('social-save'),
        caption: values.caption,
        cta: values.cta.trim(),
        hashtags,
      });
      if (!result.ok) {
        setFieldErrors(mapFieldErrors(result));
        setError(`${failureText(result)} The previous saved revision is unchanged.`);
        return false;
      }
      pushDraft(result.data);
      setFields((previous) => ({ ...previous, [language]: fieldsFromDraft(result.data) }));
      setNotice(`Saved revision ${result.data.revision} in this browser.`);
      await onChanged();
      return true;
    } catch (cause) {
      setError(`STORAGE_UNAVAILABLE: ${cause instanceof Error ? cause.message : String(cause)}`);
      return false;
    } finally {
      setSaving(false);
    }
  }, [api, baselineFor, draftFor, fields, onChanged, presetFor]);

  const discardLanguage = useCallback((language: Language) => {
    setFields((previous) => ({ ...previous, [language]: baselineFor(language) }));
    setFieldErrors({});
    setError('');
    setNotice('Unsaved social changes discarded.');
  }, [baselineFor]);

  const saveAll = useCallback(async (): Promise<boolean> => {
    for (const language of LANGUAGES) {
      if (!dirtyFor(language)) continue;
      const saved = await saveLanguage(language);
      if (!saved) return false;
    }
    return true;
  }, [dirtyFor, saveLanguage]);

  const discardAll = useCallback(() => {
    setFields(() => ({ en: baselineFor('en'), ar: baselineFor('ar') }));
    setFieldErrors({});
    setError('');
    setNotice('Unsaved social changes discarded.');
  }, [baselineFor]);

  const saveAllRef = useRef<() => Promise<boolean>>(async () => true);
  const discardAllRef = useRef<() => void>(() => undefined);
  saveAllRef.current = saveAll;
  discardAllRef.current = discardAll;

  useEffect(() => {
    guard.register({
      isDirty: () => dirtyRef.current,
      save: () => saveAllRef.current(),
      discard: () => discardAllRef.current(),
      describe: () => 'unsaved social post edits',
    });
    return () => guard.register(null);
  }, [guard]);

  const prepareDraft = useCallback(async (): Promise<SocialDraft | null> => {
    const presetPost = presetFor(activeLanguage);
    if (!presetPost) return null;
    setPreparing(true);
    setError('');
    setNotice('');
    try {
      const result = await api.prepareSocialDraft({
        campaignId: campaign.campaignId,
        scenarioVersion: campaign.scenarioVersion,
        presetPostId: presetPost.id,
        idempotencyKey: keyed('social-prepare'),
      });
      if (!result.ok) {
        setError(`${failureText(result)} No draft was created.`);
        return null;
      }
      pushDraft(result.data);
      setFields((previous) => ({ ...previous, [activeLanguage]: fieldsFromDraft(result.data) }));
      setNotice(`Working draft ready at revision ${result.data.revision}. Edit the saved copy, then save.`);
      await onChanged();
      return result.data;
    } catch (cause) {
      setError(`STORAGE_UNAVAILABLE: ${cause instanceof Error ? cause.message : String(cause)}`);
      return null;
    } finally {
      setPreparing(false);
    }
  }, [activeLanguage, api, campaign.campaignId, campaign.scenarioVersion, onChanged, presetFor]);

  const handleEditPost = async () => {
    if (busy || draft) return;
    await prepareDraft();
  };

  const handleReviewClick = async () => {
    if (busy) return;
    if (anyDirty) {
      setError('Save your changes before reviewing. Review always uses the exact saved content.');
      return;
    }
    let current = draftFor(activeLanguage);
    if (!current) {
      current = await prepareDraft();
      if (!current) return;
    }
    const languageScript = scriptFor(activeLanguage);
    if (!languageScript || languageScript.confirmation !== 'confirmed_current') {
      setConfirmationNeeded(true);
      setReviewOpen(false);
      setError(`The ${languageLabel(activeLanguage).toLowerCase()} source script is not confirmed in this browser yet. Confirm it through Review creative, then click Review post again.`);
      return;
    }
    setConfirmationNeeded(false);
    setError('');
    setReviewError('');
    setReviewDraft(current);
    setReviewOpen(true);
  };

  const confirmReview = async () => {
    const current = reviewDraft;
    if (!current || reviewing) return;
    setReviewing(true);
    setReviewError('');
    try {
      const result = await api.reviewSocialDraft({
        draftId: current.id,
        expectedRevision: current.revision,
        idempotencyKey: keyed('social-review'),
      });
      if (!result.ok) {
        if (result.error.code === 'CONFIRMATION_REQUIRED') {
          setReviewOpen(false);
          setConfirmationNeeded(true);
          setError(failureText(result));
        } else {
          setReviewError(`${failureText(result)} The saved draft is unchanged; retry Review.`);
        }
        return;
      }
      pushDraft(result.data.draft);
      setReviewOpen(false);
      setReviewDraft(null);
      setNotice(`Post reviewed at revision ${result.data.draft.revision}. Simulate publish will use this exact saved snapshot.`);
      await onChanged();
    } catch (cause) {
      setReviewError(`STORAGE_UNAVAILABLE: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setReviewing(false);
    }
  };

  const confirmCreative = async () => {
    const presetPost = presetFor(activeLanguage);
    if (!presetPost || confirmingCreative) return;
    setConfirmingCreative(true);
    setError('');
    setNotice('');
    try {
      const begun = await api.beginCampaignEdit({
        campaignId: campaign.campaignId,
        versionId: presetPost.sourceScriptVersionId,
        sessionId: null,
        idempotencyKey: keyed('social-creative-edit'),
      });
      if (!begun.ok) {
        setError(`${failureText(begun)} The draft was kept. Retry Review creative.`);
        return;
      }
      const context: CommandContext = {
        sessionId: begun.data.session.id,
        expectedRevision: begun.data.session.revision,
        idempotencyKey: keyed('social-creative-confirm'),
      };
      const scriptVersionId = begun.data.session.activeScriptVersionId ?? presetPost.sourceScriptVersionId;
      const confirmed = await api.confirmScript(context, { scriptVersionId });
      if (!confirmed.ok) {
        setError(`${failureText(confirmed)} The draft was kept. Retry Review creative.`);
        return;
      }
      // The confirmation is an explicit user action; it is never inferred from
      // Review. The next Review click is what reuses it.
      setConfirmationNeeded(true);
      setNotice('Script confirmed in this browser for the local demo only. Click Review post again to review the saved content.');
      await onChanged();
    } catch (cause) {
      setError(`STORAGE_UNAVAILABLE: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setConfirmingCreative(false);
    }
  };

  const handlePublishClick = () => {
    const current = draftFor(activeLanguage);
    if (!current || publishing) return;
    if (anyDirty) {
      setError('Save or discard your changes before simulating a publish.');
      return;
    }
    if (current.status !== 'ready' || !current.reviewHash) {
      setError('Review the saved post before simulating a publish. The simulated post only records a reviewed snapshot.');
      return;
    }
    setError('');
    setPublishError('');
    publishCompletedRef.current = false;
    setPublishDraft(current);
    setPublishOpen(true);
  };

  const confirmPublish = async () => {
    if (publishingRef.current || publishCompletedRef.current) return;
    const current = publishDraft;
    if (!current || !current.reviewHash) return;
    if (anyDirty) {
      setPublishError('You have unsaved changes. Save or discard them before simulating a publish.');
      return;
    }
    publishingRef.current = true;
    setPublishing(true);
    setPublishError('');
    setError('');
    try {
      const result = await api.simulateSocialPublish({
        draftId: current.id,
        expectedRevision: current.revision,
        reviewHash: current.reviewHash,
        // A new key per attempt so an explicit Retry creates a new attempt.
        idempotencyKey: keyed('social-publish'),
      });
      if (!result.ok) {
        setPublishError(`${failureText(result)} The reviewed draft was kept. Retry records a new attempt.`);
        setError(`${failureText(result)} The reviewed draft was kept; retry from the confirmation dialog.`);
        await onChanged();
        return;
      }
      const attempt = result.data.attempt;
      pushDraft({ ...current, status: 'published_simulated', updatedAt: attempt.createdAt });
      publishCompletedRef.current = true;
      setPublishOpen(false);
      setPublishDraft(null);
      setPublishResult(attempt);
      setNotice('');
      await onChanged();
    } catch (cause) {
      setPublishError(`STORAGE_UNAVAILABLE: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      publishingRef.current = false;
      setPublishing(false);
    }
  };

  if (!presentation || !preset) {
    return (
      <section className={styles.stage} data-testid="social-stage" aria-labelledby="social-stage-title">
        <StateBlock
          kind="empty"
          title="Social post content is not available yet"
          body={journey.contentIssue ?? 'The campaign presentation for this version is still being prepared. No fallback caption is invented.'}
        />
      </section>
    );
  }

  const pendingLanguageDraft = (language: Language): SocialDraft | null => draftFor(language);
  const pendingPreset = (language: Language): PresentationSocialPost | null => presetFor(language);
  const pendingScript = (language: Language): ProductVersion | null => scriptFor(language);

  const latestHero = journey.providedAssets?.assets.find((asset) => asset.roles.includes('hero')) ?? null;
  const videoLabel = videoAsset?.label ?? 'Provided SERENITY preview video';
  const draftStatusLabel = (() => {
    if (!draft) return 'Preset preview · no draft created yet';
    if (draft.status === 'published_simulated') return `Simulated post created at revision ${draft.revision}`;
    if (draft.status === 'ready') return `Reviewed at revision ${draft.revision} · ready to simulate`;
    return `Draft revision ${draft.revision} · saved ${formatDate(draft.updatedAt)}`;
  })();
  const draftBadgeTone: 'neutral' | 'success' | 'mock' = draft
    ? draft.status === 'ready' || draft.status === 'published_simulated' ? 'success' : 'neutral'
    : 'mock';

  const attempts = sortAttempts(journey.socialAttempts);
  const latestPublished = publishResult ?? attempts.find((attempt) => attempt.status === 'published_simulated') ?? null;
  const postHref = latestPublished
    ? `/campaigns/${encodeURIComponent(campaign.campaignId)}/social/${encodeURIComponent(latestPublished.id)}`
    : null;
  const detailHref = (attempt: SocialAttempt) => `/campaigns/${encodeURIComponent(campaign.campaignId)}/social/${encodeURIComponent(attempt.id)}`;

  const reviewVideo = reviewDraft
    ? videoView(journey.providedAssets?.assets.find((asset) => asset.id === reviewDraft.video.assetId) ?? null)
    : null;
  const publishVideo = publishDraft
    ? videoView(journey.providedAssets?.assets.find((asset) => asset.id === publishDraft.video.assetId) ?? null)
    : null;

  const controlsDisabled = busy || !draft;
  const canReview = Boolean(draft) && !anyDirty && !busy && draft?.status !== 'published_simulated' && draft?.status !== 'ready';
  const canSimulate = Boolean(draft) && draft?.status === 'ready' && Boolean(draft?.reviewHash) && !anyDirty && !busy;
  const canSave = Boolean(draft) && anyDirty && !busy;
  const primaryAction: 'edit' | 'save' | 'simulate' = !draft ? 'edit' : anyDirty ? 'save' : 'simulate';

  return (
    <section className={styles.stage} data-testid="social-stage" data-control-id="FLOW-social-stage" aria-labelledby="social-stage-title">
      <header className={styles.stageHeader}>
        <div>
          <p className={workspace.eyebrow}>{workspaceSurface ? 'Deliverables · social post' : 'Stage 4 · Social post'}</p>
          <h2 className={styles.stageTitle} id="social-stage-title">The Instagram video post, ready for review</h2>
          <p className={styles.stageLede}>
            The same provided 3:4 video from the creative stage, combined with the EN or AR preset copy. Edit and save the
            copy, review the exact saved snapshot, then record a simulated publish. No content is sent to Instagram.
          </p>
        </div>
        <div className={workspace.badgeRow}>
          <Badge tone="mock">Demo · Mock data</Badge>
          <Badge tone="info">Instagram · internal preview</Badge>
        </div>
      </header>

      <div className={styles.languageRow}>
        <div className={styles.languageSwitch} role="group" aria-label="Post language">
          {LANGUAGES.map((language) => {
            const post = pendingPreset(language);
            if (!post) return null;
            const languageDraft = pendingLanguageDraft(language);
            return (
              <button
                key={language}
                type="button"
                className={`${styles.languageButton} ${activeLanguage === language ? styles.languageButtonActive : ''}`}
                onClick={() => { setActiveLanguage(language); setFieldErrors({}); setError(''); setNotice(''); }}
                aria-pressed={activeLanguage === language}
                data-testid={`SOC-language-${language}`}
                data-control-id={`FLOW-social-language-${language}`}
              >
                <span>{language === 'en' ? 'EN' : 'AR'}</span>
                <span className={styles.languageMeta}>
                  {languageDraft ? `Draft r${languageDraft.revision}` : 'Preset'}
                </span>
              </button>
            );
          })}
        </div>
        <p className={styles.languageNote}>
          Switching language only changes the preview and editor target. Each language keeps its own saved draft;
          one never overwrites the other.
        </p>
      </div>

      <div className={styles.layout}>
        <div className={styles.editorColumn}>
          <section className={styles.editorCard} aria-label={`${languageLabel(activeLanguage)} post copy`}>
            <div className={styles.editorHeader}>
              <div>
                <h3 className={styles.editorTitle}>{languageLabel(activeLanguage)} post copy</h3>
                <p className={styles.editorMeta} data-testid="SOC-account-line">
                  Instagram · video post · {preset.accountLabel}
                </p>
              </div>
              <Badge tone={draftBadgeTone}>{draft?.status === 'ready' ? 'Reviewed' : draft?.status === 'published_simulated' ? 'Simulated post' : draft ? 'Draft' : 'Preset'}</Badge>
            </div>

            <p className={styles.scriptLine} data-testid="SOC-script-state">
              <span className={styles.scriptLabel}>Source script</span>
              {' '}
              {pendingScript(activeLanguage)?.title ?? preset.sourceScriptVersionId}
              {' · '}
              <span className={scriptConfirmed ? styles.scriptConfirmed : styles.scriptUnconfirmed}>
                {scriptConfirmed ? 'Confirmed in this browser' : 'Not confirmed yet'}
              </span>
            </p>

            <p className={styles.draftState} data-testid="SOC-draft-state">{draftStatusLabel}</p>

            {!draft ? (
              <p className={styles.presetNote}>
                This is the read-only preset. Click <strong>Edit post</strong> to create a local working draft; nothing is
                written just by viewing this stage.
              </p>
            ) : null}

            <label className={workspace.field}>
              <span className={workspace.label}>Caption</span>
              <textarea
                className={workspace.textarea}
                value={currentFields?.caption ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setFields((previous) => ({ ...previous, [activeLanguage]: { ...(previous[activeLanguage] ?? baseline as SocialFields), caption: value } }));
                  setFieldErrors((previous) => ({ ...previous, caption: '' }));
                  setError('');
                }}
                disabled={controlsDisabled}
                rows={5}
                maxLength={2200}
                dir={activeLanguage === 'ar' ? 'rtl' : 'ltr'}
                lang={activeLanguage === 'ar' ? 'ar' : 'en'}
                data-testid="SOC-caption-input"
                data-control-id="FLOW-social-caption"
                aria-describedby={fieldErrors.caption ? 'social-caption-error' : undefined}
              />
              {fieldErrors.caption ? <span className={workspace.errorText} id="social-caption-error" role="alert">{fieldErrors.caption}</span> : null}
              <span className={styles.charCount}>{(currentFields?.caption ?? '').length} / 2200</span>
            </label>

            <label className={workspace.field}>
              <span className={workspace.label}>Call to action</span>
              <input
                className={workspace.input}
                value={currentFields?.cta ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setFields((previous) => ({ ...previous, [activeLanguage]: { ...(previous[activeLanguage] ?? baseline as SocialFields), cta: value } }));
                  setFieldErrors((previous) => ({ ...previous, cta: '' }));
                  setError('');
                }}
                disabled={controlsDisabled}
                maxLength={150}
                dir={activeLanguage === 'ar' ? 'rtl' : 'ltr'}
                lang={activeLanguage === 'ar' ? 'ar' : 'en'}
                data-testid="SOC-cta-input"
                data-control-id="FLOW-social-cta"
                aria-describedby={fieldErrors.cta ? 'social-cta-error' : undefined}
              />
              {fieldErrors.cta ? <span className={workspace.errorText} id="social-cta-error" role="alert">{fieldErrors.cta}</span> : null}
            </label>

            <label className={workspace.field}>
              <span className={workspace.label}>Hashtags</span>
              <input
                className={workspace.input}
                value={currentFields?.hashtags ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setFields((previous) => ({ ...previous, [activeLanguage]: { ...(previous[activeLanguage] ?? baseline as SocialFields), hashtags: value } }));
                  setFieldErrors((previous) => ({ ...previous, hashtags: '' }));
                  setError('');
                }}
                disabled={controlsDisabled}
                dir="ltr"
                data-testid="SOC-hashtags-input"
                data-control-id="FLOW-social-hashtags"
                aria-describedby={fieldErrors.hashtags ? 'social-hashtags-error' : undefined}
              />
              {fieldErrors.hashtags ? <span className={workspace.errorText} id="social-hashtags-error" role="alert">{fieldErrors.hashtags}</span> : null}
              <span className={styles.charCount}>Space or comma separated. A leading # is added automatically.</span>
            </label>

            <div className={styles.actionRow}>
              <Button
                variant={primaryAction === 'edit' ? 'primary' : 'secondary'}
                onClick={() => void handleEditPost()}
                pending={preparing}
                disabled={Boolean(draft) || busy}
                data-testid="SOC-edit-post"
                data-control-id="FLOW-social-edit"
              >
                Edit post
              </Button>
              <Button
                variant={primaryAction === 'save' ? 'primary' : 'secondary'}
                onClick={() => void saveLanguage(activeLanguage)}
                pending={saving}
                disabled={!canSave}
                data-testid="SOC-save"
                data-control-id="FLOW-social-save"
              >
                Save changes
              </Button>
              <Button
                variant="secondary"
                onClick={() => void handleReviewClick()}
                pending={reviewing}
                disabled={!canReview}
                data-testid="SOC-review"
                data-control-id="FLOW-social-review"
              >
                Review post
              </Button>
              <Button
                variant={primaryAction === 'simulate' ? 'primary' : 'secondary'}
                onClick={() => handlePublishClick()}
                disabled={!canSimulate}
                data-testid="SOC-simulate"
                data-control-id="FLOW-social-simulate"
              >
                Simulate publish
              </Button>
              {postHref ? (
                <Link href={postHref} className={styles.inlineLink} data-testid="SOC-view-post" data-control-id="FLOW-social-view-post">
                  View simulated post
                </Link>
              ) : null}
              <Button
                variant="ghost"
                size="small"
                onClick={() => discardLanguage(activeLanguage)}
                disabled={!anyDirty || busy}
                data-testid="SOC-discard"
                data-control-id="FLOW-social-discard"
              >
                Discard unsaved changes
              </Button>
            </div>

            {anyDirty ? (
              <p className={workspace.noticeWarn} data-testid="SOC-dirty-note">
                You have unsaved edits. Save or discard them before Review or Simulate publish — the preview shows your
                edits, but Review and Simulate always use the exact saved draft.
              </p>
            ) : null}
            {notice ? <p className={workspace.successText} role="status" data-testid="SOC-notice">{notice}</p> : null}
            {error ? <p className={workspace.errorText} role="alert" data-testid="SOC-error">{error}</p> : null}

            {confirmationNeeded ? (
              <div className={styles.confirmCreative} data-testid="SOC-confirm-creative-panel">
                {scriptConfirmed ? (
                  <p className={workspace.cardText}>
                    The {languageLabel(activeLanguage)} script is confirmed in this browser for the local demo only. Click
                    <strong> Review post</strong> again to review the exact saved content.
                  </p>
                ) : (
                  <>
                    <p className={workspace.cardText}>
                      The {languageLabel(activeLanguage)} source script is not confirmed. Review the creative and confirm the
                      script first — this is an explicit local demo confirmation, not a Lavish approval. The saved draft is kept.
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => void confirmCreative()}
                      pending={confirmingCreative}
                      data-testid="SOC-confirm-creative"
                      data-control-id="FLOW-social-confirm-creative"
                    >
                      Review creative
                    </Button>
                  </>
                )}
              </div>
            ) : null}
          </section>

          {publishResult ? (
            <section className={styles.publishResult} data-testid="SOC-publish-result" role="status" aria-live="polite">
              <p className={styles.publishResultTitle}>
                <strong>Simulated post created</strong>
              </p>
              <p className={styles.publishResultLine}>No content was sent to Instagram.</p>
              <p className={styles.publishResultMeta}>
                {publishResult.snapshot.language.toUpperCase()} · revision {publishResult.draftRevision} · {formatDate(publishResult.createdAt)}
              </p>
              <p className={styles.publishResultCaption} dir={publishResult.snapshot.language === 'ar' ? 'rtl' : 'ltr'}>
                {captionExcerpt(publishResult.snapshot.caption, 120)}
              </p>
              <Link href={detailHref(publishResult)} className={styles.inlineLink} data-testid="SOC-publish-result-view">
                View simulated post
              </Link>
            </section>
          ) : null}
        </div>

        <div className={styles.previewColumn}>
          <div className={styles.previewHeader}>
            <div>
              <h3 className={styles.previewTitle}>Instagram-style preview</h3>
              <p className={styles.previewMeta}>
                The real provided {videoAsset?.metadata?.durationMs ? `${(videoAsset.metadata.durationMs / 1000).toFixed(2)}s ` : ''}
                3:4 MP4 with native controls. Never cropped to 9:16 and never regenerated for social.
              </p>
            </div>
          </div>
          <SocialPostCard
            language={activeLanguage}
            caption={currentFields?.caption ?? ''}
            cta={currentFields?.cta ?? ''}
            hashtags={parseHashtags(currentFields?.hashtags ?? '')}
            accountLabel={preset.accountLabel}
            video={activeVideo}
            testId="social-post-preview"
            captionTestId="social-caption"
            videoTestId="social-video"
          />
          <p className={styles.previewNote}>
            Internal preview only. The account label is a demo label; no Instagram account, URL, metric or platform success
            is implied by this screen.
          </p>
          {latestHero ? (
            <p className={styles.previewNote}>
              Campaign visual from the creative stage: {latestHero.label}. Provided demo asset, not generated live in this POC.
            </p>
          ) : null}
          <p className={styles.videoSource} data-testid="SOC-video-source">
            {videoLabel}
            {videoAsset?.metadata?.width && videoAsset.metadata.height
              ? ` · ${videoAsset.metadata.width}×${videoAsset.metadata.height}`
              : ''}
            {videoAsset?.metadata?.durationMs ? ` · ${(videoAsset.metadata.durationMs / 1000).toFixed(2)}s` : ''}
            {videoAsset?.sha256 ? ` · SHA-256 ${videoAsset.sha256.slice(0, 12)}…` : ''}
          </p>
        </div>
      </div>

      <section className={styles.history} aria-labelledby="social-history-title">
        <div className={styles.historyHeader}>
          <div>
            <h3 className={styles.historyTitle} id="social-history-title">Simulated post history</h3>
            <p className={styles.historyNote}>
              Immutable local snapshots for this campaign version. Editing the draft later never changes an existing post,
              and nothing here was sent to Instagram.
            </p>
          </div>
        </div>
        {attempts.length === 0 ? (
          <div className={workspace.emptyState} data-testid="SOC-history-empty">
            <p className={workspace.cardText}>No simulated posts yet.</p>
            <p className={workspace.muted}>Review the saved post and simulate a publish to create the first internal record.</p>
          </div>
        ) : (
          <div className={styles.historyList} data-testid="SOC-history">
            {attempts.map((attempt) => (
              <article key={attempt.id} className={styles.historyItem} data-testid={`SOC-attempt-${attempt.id}`}>
                <div className={styles.historyItemHeader}>
                  <Badge tone={attempt.status === 'published_simulated' ? 'success' : 'error'}>
                    {attempt.status === 'published_simulated' ? 'Simulated post' : 'Failed simulated attempt'}
                  </Badge>
                  <span className={styles.historyMeta}>
                    {attempt.snapshot.language.toUpperCase()} · revision {attempt.draftRevision} · {formatDate(attempt.createdAt)}
                  </span>
                </div>
                <p
                  className={styles.historyCaption}
                  dir={attempt.snapshot.language === 'ar' ? 'rtl' : 'ltr'}
                  lang={attempt.snapshot.language === 'ar' ? 'ar' : 'en'}
                >
                  {captionExcerpt(attempt.snapshot.caption, 110)}
                </p>
                {attempt.error ? <p className={workspace.errorText}>{attempt.error.code}: {attempt.error.message}</p> : null}
                <Link href={detailHref(attempt)} className={styles.inlineLink} data-testid={`SOC-attempt-link-${attempt.id}`}>
                  View simulated post
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <Overlay
        open={reviewOpen}
        onClose={() => { if (!reviewing) { setReviewOpen(false); setReviewError(''); } }}
        variant="dialog"
        title="Review the saved post"
        description="This is the exact saved language, caption, CTA, hashtags and provided video that review will lock to a review hash."
        testId="SOC-review-dialog"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setReviewOpen(false); setReviewError(''); }} disabled={reviewing} data-testid="SOC-review-cancel" data-control-id="FLOW-social-review-cancel">
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void confirmReview()} pending={reviewing} data-testid="SOC-review-confirm" data-control-id="FLOW-social-review-confirm">
              Review this saved post
            </Button>
          </>
        }
      >
        {reviewDraft ? (
          <>
            <SocialSnapshotDetails
              snapshot={snapshotOf(reviewDraft)}
              video={reviewVideo}
              revision={reviewDraft.revision}
              note="Reviewing computes a hash over this exact snapshot. Editing and saving afterwards clears the review, so a simulated post can never publish stale copy."
            />
            {reviewError ? <p className={workspace.errorText} role="alert" data-testid="SOC-review-error">{reviewError}</p> : null}
          </>
        ) : null}
      </Overlay>

      <Overlay
        open={publishOpen}
        onClose={() => { if (!publishing) { setPublishOpen(false); setPublishError(''); } }}
        variant="dialog"
        title="Simulate publish"
        description="Records an internal simulated Instagram post from the reviewed snapshot. No content is sent to Instagram."
        testId="SOC-publish-dialog"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setPublishOpen(false); setPublishError(''); }} disabled={publishing} data-testid="SOC-publish-cancel" data-control-id="FLOW-social-publish-cancel">
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void confirmPublish()} pending={publishing} data-testid="SOC-publish-confirm" data-control-id="FLOW-social-publish-confirm">
              {publishError ? 'Retry simulated publish' : 'Simulate publish'}
            </Button>
          </>
        }
      >
        {publishDraft ? (
          <>
            <SocialSnapshotDetails
              snapshot={snapshotOf(publishDraft)}
              video={publishVideo}
              revision={publishDraft.revision}
              reviewHash={publishDraft.reviewHash}
              note="One local transaction stores this immutable attempt, the idempotency receipt and the draft status. Success appears only after that commit; no external service is called."
            />
            {publishError ? <p className={workspace.errorText} role="alert" data-testid="SOC-publish-error">{publishError}</p> : null}
          </>
        ) : null}
      </Overlay>
    </section>
  );
}
