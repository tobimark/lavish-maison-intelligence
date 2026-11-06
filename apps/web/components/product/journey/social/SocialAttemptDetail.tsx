'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { Badge, Button, StateBlock } from '../../../poc';
import { formatDate, getBrowserApi } from '../../../poc/browser-api';
import type { SocialAttempt } from '../../../../demo/poc/api/flow-contract';
import type { ProvidedAsset } from '../../../../demo/poc/api/provided-asset-contract';
import { SocialPostCard } from './SocialPostCard';
import { SocialSnapshotDetails } from './SocialSnapshotDetails';
import workspace from '../../workspace.module.css';
import styles from './social.module.css';

interface SocialAttemptDetailProps {
  campaignId: string;
  attemptId: string;
}

type LoadState = 'loading' | 'ready' | 'notfound' | 'error';

function shortHash(value: string | null | undefined): string {
  if (!value) return '—';
  return `${value.slice(0, 12)}…`;
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

/**
 * Read-only immutable simulated post record. The exact attempt snapshot from
 * local storage is displayed; nothing is re-derived from the current draft or
 * the current presentation copy. Refresh-safe: the attempt id is the only input.
 */
export function SocialAttemptDetail({ campaignId, attemptId }: SocialAttemptDetailProps) {
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState<SocialAttempt | null>(null);
  const [videoAsset, setVideoAsset] = useState<ProvidedAsset | null>(null);
  const [videoIssue, setVideoIssue] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const api = getBrowserApi();
      const result = await api.getSocialPost({ attemptId });
      if (!result.ok) {
        setState('notfound');
        return;
      }
      const post = result.data;
      if (post.campaignId !== campaignId) {
        setState('notfound');
        return;
      }
      if (post.mode !== 'mock') {
        setState('error');
        setError('This record is not a local simulated post. Nothing was inferred.');
        return;
      }
      setAttempt(post);
      const provided = await api.getProvidedAssets({
        campaignId: post.campaignId,
        scenarioVersion: post.scenarioVersion,
      });
      if (provided.ok && provided.data) {
        const asset = provided.data.assets.find((candidate) => candidate.id === post.snapshot.video.assetId) ?? null;
        setVideoAsset(asset);
        if (!asset) {
          setVideoIssue('The recorded video is no longer present in the provided asset set; the snapshot text is still shown.');
        } else if (asset.sha256 !== post.snapshot.video.sha256) {
          setVideoIssue('The provided video bytes no longer match the recorded snapshot hash; the recorded hash is displayed instead.');
        }
      } else {
        setVideoIssue('The provided asset set could not be read; the recorded snapshot text is still shown without a player.');
      }
      setState('ready');
    } catch (cause) {
      setState('error');
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [attemptId, campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === 'loading') {
    return <StateBlock kind="loading" title="Loading simulated post" body="Reading the immutable local simulation record." />;
  }

  if (state === 'notfound') {
    return (
      <div data-testid="SOC-detail-not-found">
        <StateBlock
          kind="error"
          title="Simulated post not found"
          body="No immutable simulated post matches this internal route for this campaign. Nothing was switched automatically and no fallback content was invented."
          action={<Link href="/deliverables" className={styles.inlineLink}>Open Deliverables history</Link>}
        />
      </div>
    );
  }

  if (state === 'error' || !attempt) {
    return (
      <div data-testid="SOC-detail-error">
        <StateBlock
          kind="error"
          title="Simulated post unavailable"
          body={error || 'The local simulation record could not be read.'}
          action={<Button variant="secondary" onClick={() => void load()}>Try again</Button>}
        />
      </div>
    );
  }

  const snapshot = attempt.snapshot;
  const isArabic = snapshot.language === 'ar';
  const deliverablesHref = `/deliverables?campaignId=${encodeURIComponent(attempt.campaignId)}&scenarioVersion=${encodeURIComponent(attempt.scenarioVersion)}&language=${encodeURIComponent(snapshot.language)}`;
  const published = attempt.status === 'published_simulated';

  return (
    <div className={styles.detailPage} data-testid="SOC-attempt-detail">
      <header className={styles.detailHeader}>
        <div>
          <p className={workspace.eyebrow}>Simulated social post · Internal record</p>
          <h1 className={styles.detailTitle}>Simulated Instagram video post</h1>
          <p className={styles.stageLede}>
            An immutable snapshot of the reviewed draft at the moment the local simulation was recorded. Later edits to the
            draft do not change this page.
          </p>
        </div>
        <div className={workspace.badgeRow}>
          <Badge tone={published ? 'success' : 'error'}>{published ? 'Simulated post' : 'Failed simulated attempt'}</Badge>
          <Badge tone="mock">Demo · Mock data</Badge>
        </div>
      </header>

      <p className={styles.detailNotice} data-testid="SOC-detail-status">
        {published
          ? 'Simulated post · No content was sent to Instagram.'
          : `Failed simulated attempt · no content was sent to Instagram.${attempt.error ? ` ${attempt.error.code}: ${attempt.error.message}` : ''}`}
      </p>

      <div className={styles.detailGrid}>
        <div className={styles.detailPanel}>
          <SocialPostCard
            language={snapshot.language}
            caption={snapshot.caption}
            cta={snapshot.cta}
            hashtags={snapshot.hashtags}
            accountLabel={snapshot.accountLabel}
            video={videoView(videoAsset)}
            timestampLabel={formatDate(attempt.createdAt)}
            testId="social-detail-preview"
            captionTestId="SOC-detail-caption"
            videoTestId="SOC-detail-video"
          />
          {videoIssue ? <p className={workspace.noticeWarn} role="status" data-testid="SOC-detail-video-issue">{videoIssue}</p> : null}
        </div>

        <div className={styles.detailPanel}>
          <SocialSnapshotDetails
            snapshot={{
              language: snapshot.language,
              caption: snapshot.caption,
              cta: snapshot.cta,
              hashtags: snapshot.hashtags,
              accountLabel: snapshot.accountLabel,
              channel: snapshot.channel,
              placement: snapshot.placement,
            }}
            video={videoView(videoAsset)}
            revision={attempt.draftRevision}
            reviewHash={snapshot && attempt.reviewHash ? attempt.reviewHash : null}
            createdAt={attempt.createdAt}
            note="This record is read-only. The exact caption, CTA, hashtags, language and reviewed video hash are stored with the attempt; the page never re-composes current copy."
          />
          <dl className={workspace.kv}>
            <dt>Review hash (short)</dt>
            <dd className={workspace.mono} data-testid="SOC-detail-review-hash">{shortHash(attempt.reviewHash)}</dd>
            <dt>Recorded at</dt>
            <dd data-testid="SOC-detail-created">{formatDate(attempt.createdAt)}</dd>
            <dt>Status</dt>
            <dd data-testid="SOC-detail-record-status">{attempt.status}</dd>
            <dt>Campaign version</dt>
            <dd data-testid="SOC-detail-campaign">{attempt.campaignId} · {attempt.scenarioVersion}</dd>
          </dl>
          <p className={workspace.muted}>
            There is no public Instagram URL, post id, reach or engagement metric for this record — the local demo does not
            contact any external platform.
          </p>
          <div className={styles.detailActions}>
            <Link href={deliverablesHref} className={styles.inlineLink} data-testid="SOC-detail-back" data-control-id="FLOW-social-detail-back">
              Back to Deliverables
            </Link>
            <Link href="/deliverables" className={styles.inlineLink} data-testid="SOC-detail-deliverables">
              Simulated social posts in Deliverables
            </Link>
          </div>
          <p className={workspace.muted} dir={isArabic ? 'rtl' : 'ltr'} lang={isArabic ? 'ar' : 'en'}>
            {isArabic ? 'هذا السجل للعرض الداخلي فقط.' : 'Internal demo record only.'}
          </p>
        </div>
      </div>
    </div>
  );
}
