'use client';

import { Badge } from '../../../poc';
import { IsolatedText } from './socialText';
import styles from './social.module.css';

export interface SocialVideoView {
  uri: string;
  mimeType: string;
  label?: string;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  sha256?: string;
}

interface SocialPostCardProps {
  language: 'en' | 'ar';
  caption: string;
  cta: string;
  hashtags: string[];
  accountLabel: string;
  video: SocialVideoView | null;
  /** Set when the immutable attempt snapshot is rendered instead of the editor preview. */
  timestampLabel?: string;
  testId?: string;
  captionTestId?: string;
  videoTestId?: string;
}

function durationLabel(durationMs: number | null | undefined): string | null {
  if (typeof durationMs !== 'number' || !(durationMs > 0)) return null;
  return `${(durationMs / 1000).toFixed(2)}s`;
}

/**
 * Instagram-style internal post preview. This is deliberately presentation only:
 * no like counts, no platform URL, no live account data — the badge and copy say
 * "Simulated · Demo account" and the media is the real provided MP4 at its native
 * 3:4 ratio (never cropped to 9:16 and never re-generated).
 */
export function SocialPostCard({
  language,
  caption,
  cta,
  hashtags,
  accountLabel,
  video,
  timestampLabel,
  testId = 'social-post-preview',
  captionTestId = 'social-caption',
  videoTestId = 'social-video',
}: SocialPostCardProps) {
  const isArabic = language === 'ar';
  const duration = durationLabel(video?.durationMs);

  return (
    <article className={styles.postCard} aria-label="Simulated Instagram video post preview" data-testid={testId}>
      <header className={styles.postHeader}>
        <span className={styles.postAvatar} aria-hidden="true">L</span>
        <span className={styles.postIdentity}>
          <strong className={styles.postAccount}>{accountLabel}</strong>
          <span className={styles.postMeta}>Instagram · video post · internal preview</span>
        </span>
        <Badge tone="mock">Simulated · Demo account</Badge>
      </header>

      <div className={styles.postMedia} data-testid={`${testId}-media`}>
        {video ? (
          <video
            className={styles.postVideo}
            controls
            playsInline
            preload="metadata"
            data-testid={videoTestId}
            data-video-ratio="3:4"
            aria-label="Provided SERENITY preview video, not regenerated for social"
          >
            <source src={video.uri} type={video.mimeType} />
            Your browser cannot play the provided MP4.
          </video>
        ) : (
          <p className={styles.postMediaMissing} data-testid={`${testId}-video-missing`}>
            The provided preview video is not available for this post.
          </p>
        )}
      </div>

      <div className={styles.postBody}>
        <p
          className={styles.postCaption}
          data-testid={captionTestId}
          dir={isArabic ? 'rtl' : 'ltr'}
          lang={isArabic ? 'ar' : 'en'}
        >
          <IsolatedText text={caption} isolateLatin={isArabic} />
        </p>
        <p className={styles.postCta} dir={isArabic ? 'rtl' : 'ltr'} lang={isArabic ? 'ar' : 'en'}>
          <span className={styles.postFieldLabel}>CTA</span>{' '}
          <span className={styles.postCtaText} data-testid={`${testId}-cta`}>
            <IsolatedText text={cta} isolateLatin={isArabic} />
          </span>
        </p>
        <p className={styles.postHashtags} data-testid={`${testId}-hashtags`}>
          {hashtags.length > 0
            ? hashtags.map((hashtag) => (
              <span className={styles.postHashtag} key={hashtag}>
                <bdi lang="en" dir="ltr">{hashtag}</bdi>
              </span>
            ))
            : <span className={styles.postMeta}>No hashtags</span>}
        </p>
        <p className={styles.postFootNote}>
          {timestampLabel ? `${timestampLabel} · ` : ''}
          {duration ? `Provided video · ${duration} · 3:4` : 'Provided video · 3:4'} · No content sent to Instagram
        </p>
      </div>
    </article>
  );
}
