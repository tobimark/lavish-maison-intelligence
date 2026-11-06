'use client';

import { IsolatedText } from './socialText';
import workspace from '../../workspace.module.css';
import styles from './social.module.css';

export interface SocialSnapshotContent {
  language: 'en' | 'ar';
  caption: string;
  cta: string;
  hashtags: string[];
  accountLabel: string;
  channel: string;
  placement: string;
}

export interface SocialSnapshotVideoView {
  label?: string | null;
  uri: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  sha256?: string | null;
}

interface SocialSnapshotDetailsProps {
  snapshot: SocialSnapshotContent;
  video: SocialSnapshotVideoView | null;
  revision?: number | null;
  reviewHash?: string | null;
  createdAt?: string | null;
  /** Extra note rendered under the definition list. */
  note?: string;
}

function languageLabel(language: 'en' | 'ar'): string {
  return language === 'ar' ? 'Arabic (AR)' : 'English (EN)';
}

function durationLabel(durationMs: number | null | undefined): string {
  if (typeof durationMs !== 'number' || !(durationMs > 0)) return 'duration not declared';
  return `${(durationMs / 1000).toFixed(2)}s`;
}

/**
 * Exact saved content display used by the Review confirmation, the Simulate
 * publish confirmation and the immutable attempt detail page. It renders only
 * the values already persisted (or about to be committed) — never the live
 * unsaved editor fields.
 */
export function SocialSnapshotDetails({
  snapshot,
  video,
  revision = null,
  reviewHash = null,
  createdAt = null,
  note,
}: SocialSnapshotDetailsProps) {
  const isArabic = snapshot.language === 'ar';

  return (
    <div className={styles.snapshot} data-testid="social-snapshot">
      <dl className={workspace.kv}>
        <dt>Language</dt>
        <dd data-testid="social-snapshot-language">{languageLabel(snapshot.language)}</dd>
        <dt>Caption</dt>
        <dd className={styles.snapshotCaption} data-testid="social-snapshot-caption" dir={isArabic ? 'rtl' : 'ltr'} lang={isArabic ? 'ar' : 'en'}>
          <IsolatedText text={snapshot.caption} isolateLatin={isArabic} />
        </dd>
        <dt>CTA</dt>
        <dd data-testid="social-snapshot-cta" dir={isArabic ? 'rtl' : 'ltr'} lang={isArabic ? 'ar' : 'en'}>
          <IsolatedText text={snapshot.cta} isolateLatin={isArabic} />
        </dd>
        <dt>Hashtags</dt>
        <dd data-testid="social-snapshot-hashtags">
          {snapshot.hashtags.map((hashtag) => (
            <span className={styles.snapshotHashtag} key={hashtag}><bdi lang="en" dir="ltr">{hashtag}</bdi></span>
          ))}
        </dd>
        <dt>Account</dt>
        <dd data-testid="social-snapshot-account">{snapshot.accountLabel}</dd>
        <dt>Channel</dt>
        <dd data-testid="social-snapshot-channel">{snapshot.channel} · {snapshot.placement}</dd>
        <dt>Video</dt>
        <dd data-testid="social-snapshot-video">
          {video
            ? `${video.label ?? video.uri} · ${video.mimeType} · ${durationLabel(video.durationMs)}${video.width && video.height ? ` · ${video.width}×${video.height}` : ''} · 3:4 native, not regenerated`
            : 'Provided preview video is unavailable for this snapshot.'}
        </dd>
        {video?.sha256 ? (
          <>
            <dt>Video SHA-256</dt>
            <dd className={workspace.mono}>{video.sha256}</dd>
          </>
        ) : null}
        {revision !== null ? (
          <>
            <dt>Draft revision</dt>
            <dd data-testid="social-snapshot-revision">{revision}</dd>
          </>
        ) : null}
        {reviewHash ? (
          <>
            <dt>Review hash</dt>
            <dd className={workspace.mono} data-testid="social-snapshot-review-hash">{reviewHash}</dd>
          </>
        ) : null}
        {createdAt ? (
          <>
            <dt>Recorded</dt>
            <dd data-testid="social-snapshot-created">{createdAt}</dd>
          </>
        ) : null}
      </dl>
      {note ? <p className={workspace.muted}>{note}</p> : null}
    </div>
  );
}
