'use client';

import { Badge } from '../../poc';
import type { CampaignCard, ProductVersion } from '../../../demo/poc/api/product-contract';
import styles from '../workspace.module.css';

export function versionOriginLabel(version: ProductVersion): string {
  return version.origin === 'preset' ? 'Preset' : 'Saved version';
}

export function confirmationLabel(version: ProductVersion): string {
  return version.confirmation === 'confirmed_current' ? 'Confirmed' : 'Unconfirmed';
}

export function VersionBadges({ version }: { version: ProductVersion }) {
  return (
    <div className={styles.badgeRow}>
      <Badge tone={version.origin === 'preset' ? 'neutral' : 'info'}>{versionOriginLabel(version)}</Badge>
      <Badge tone={version.confirmation === 'confirmed_current' ? 'success' : 'mock'}>{confirmationLabel(version)}</Badge>
      <span className={styles.tag}>{version.language.toUpperCase()}</span>
    </div>
  );
}

export function ScriptPreview({ version, campaign }: { version: ProductVersion; campaign?: CampaignCard }) {
  const rtl = version.language === 'ar';
  return (
    <div className={styles.copyBlock} data-testid="script-preview">
      <div className={styles.copyRow}>
        <span className={styles.copyLabel}>Title</span>
        <p className={`${styles.copyValue} ${rtl ? styles.rtl : ''}`} lang={version.language} dir={rtl ? 'rtl' : 'ltr'}>
          {version.content.title}
        </p>
      </div>
      <div className={styles.copyRow}>
        <span className={styles.copyLabel}>Hook</span>
        <p className={`${styles.copyValue} ${rtl ? styles.rtl : ''}`} lang={version.language} dir={rtl ? 'rtl' : 'ltr'}>
          {version.content.hook}
        </p>
      </div>
      <div className={styles.copyRow}>
        <span className={styles.copyLabel}>Message</span>
        <p className={`${styles.copyValue} ${rtl ? styles.rtl : ''}`} lang={version.language} dir={rtl ? 'rtl' : 'ltr'}>
          {version.content.message}
        </p>
      </div>
      <div className={styles.copyRow}>
        <span className={styles.copyLabel}>Call to action</span>
        <p className={`${styles.copyValue} ${rtl ? styles.rtl : ''}`} lang={version.language} dir={rtl ? 'rtl' : 'ltr'}>
          {version.content.cta}
        </p>
      </div>
      <div className={styles.copyRow}>
        <span className={styles.copyLabel}>Caption</span>
        <p className={`${styles.copyValue} ${rtl ? styles.rtl : ''}`} lang={version.language} dir={rtl ? 'rtl' : 'ltr'}>
          {version.content.caption}
        </p>
      </div>
      <div className={styles.copyRow}>
        <span className={styles.copyLabel}>Hashtags</span>
        <p className={styles.copyValue}>
          {version.content.hashtags.map((tag) => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </p>
      </div>
      {campaign ? (
        <p className={styles.muted}>
          Four-shot static storyboard · {campaign.products.map((product) => product.officialName).join(' · ')} · {version.content.shots.length} shots
        </p>
      ) : null}
    </div>
  );
}

function shotImages(campaign: CampaignCard | undefined, assetIds: readonly string[]): Array<{ id: string; uri: string; kind: string }> {
  if (!campaign) return [];
  return assetIds
    .map((assetId) => campaign.images.find((image) => image.id === assetId))
    .filter((image): image is NonNullable<typeof image> => Boolean(image))
    .map((image) => ({ id: image.id, uri: image.uri, kind: image.kind }));
}

export function StoryboardPreview({ version, campaign }: { version: ProductVersion; campaign?: CampaignCard }) {
  const rtl = version.language === 'ar';
  return (
    <div className={styles.shotGrid} data-testid="storyboard-preview">
      {version.content.shots.map((shot, index) => {
        const images = shotImages(campaign, shot.assetIds);
        return (
          <article className={styles.shotCard} key={shot.id}>
            <div className={styles.shotMedia}>
              {images.length === 0 ? (
                <p className={styles.muted}>Referenced image unavailable</p>
              ) : (
                images.map((image) => (
                  /* eslint-disable-next-line @next/next/no-img-element -- real approved image from the content package */
                  <img
                    key={image.id}
                    src={image.uri}
                    alt={image.kind === 'logo' ? 'Lavish Perfumes logo' : `Referenced product image for shot ${index + 1}`}
                    className={image.kind === 'logo' ? styles.shotLogo : undefined}
                  />
                ))
              )}
            </div>
            <div className={styles.shotBody}>
              <p className={styles.shotTiming}>
                Shot {index + 1} · {(shot.startMs / 1000).toFixed(2)}s – {((shot.startMs + shot.durationMs) / 1000).toFixed(2)}s
              </p>
              <p className={`${styles.shotText} ${rtl ? styles.rtl : ''}`} lang={version.language} dir={rtl ? 'rtl' : 'ltr'}>
                {shot.onScreenText}
              </p>
              <p className={styles.shotVisual}>{shot.visual}</p>
              <p className={styles.muted}>{shot.transition}</p>
            </div>
          </article>
        );
      })}
      <p className={styles.muted}>
        Static storyboard · Video deferred. These are reference frames and shot notes, not a produced advertisement.
      </p>
    </div>
  );
}
