'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Badge } from '../../poc';
import type { ProductLocale } from '../../../demo/poc/api/product-contract';
import type { CampaignJourney } from '../../../demo/poc/api/flow-contract';
import {
  STEP_ROLE_ORDER,
  assetForStep,
  heroAsset,
  journeyHref,
  scriptVersionFor,
  stepRoleLabel,
  videoAsset,
} from './journey-utils';
import styles from './journey.module.css';

/**
 * Stage 3 · Creative development.
 *
 * Explains the causal transformation with three equal-height steps: product
 * original -> campaign hero -> final video. Step explanations are the authored
 * presentation text shown VERBATIM; the real 10.08s provided MP4 plays with
 * native controls in 3:4 contain and has no subtitle track attached. The
 * 15-second four-shot EN/AR concept script is presented as authored concept,
 * explicitly not a render of the provided clip.
 */
export function CreativeStage({
  journey,
  mode = 'journey',
  nextHref,
}: {
  journey: CampaignJourney;
  mode?: 'journey' | 'workspace';
  nextHref?: string;
}) {
  const [language, setLanguage] = useState<ProductLocale>('en');
  const workspaceMode = mode === 'workspace';
  const presentation = journey.presentation;
  const ready = journey.contentStatus === 'ready' && presentation !== null;
  const hero = heroAsset(journey);
  const video = videoAsset(journey);

  const orderedSteps = presentation
    ? [...presentation.creative.steps].sort(
        (left, right) => STEP_ROLE_ORDER.indexOf(left.role) - STEP_ROLE_ORDER.indexOf(right.role),
      )
    : [];

  const preferred = scriptVersionFor(journey, language) ?? scriptVersionFor(journey, 'en');
  const rtl = language === 'ar';
  const videoMeta = video?.metadata ?? null;

  return (
    <section className={styles.stage} data-testid="journey-stage-creative" data-workspace-mode={workspaceMode || undefined} aria-labelledby="journey-creative-title">
      <div className={styles.stageHeader}>
        <p className={styles.stageEyebrow}>{workspaceMode ? 'Creative Atelier · current creative' : 'Stage 3 of 4 · Creative development'}</p>
        <h2 className={styles.stageTitle} id="journey-creative-title">
          {workspaceMode ? 'How the supplied assets become the campaign creative' : ready ? presentation.creative.title : 'How the supplied assets become a campaign creative'}
        </h2>
        <p className={styles.stageLede}>
          A demo creative workflow: the supplied product original sets the identity, the campaign hero sets the
          atmosphere, and the supplied video preview is the moving result. No image or video is generated live in this POC.
        </p>
        <div className={styles.badgeRow}>
          <Badge tone="mock">Demo creative workflow</Badge>
          <Badge tone="info">Provided demo assets</Badge>
        </div>
      </div>

      {!ready ? (
        <div className={styles.noticeWarn} data-testid="journey-pending">
          <strong>The authored creative explanations are still being prepared for this version.</strong>
          <p>{journey.contentIssue ?? 'The campaign presentation sidecar is not available yet.'}</p>
          <p>The supplied assets below are real demo files; no step explanation has been invented.</p>
        </div>
      ) : null}

      {ready ? (
        <ol className={styles.creativeSteps} data-testid="journey-creative-steps">
          {orderedSteps.map((step, index) => {
            const asset = assetForStep(journey, step);
            const labels = stepRoleLabel(step.role);
            return (
              <li
                className={styles.creativeStep}
                key={step.role}
                data-testid={`journey-step-${step.role}`}
                data-role={step.role}
              >
                <div className={styles.creativeStepHeader}>
                  <span className={styles.creativeIndex} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <h3 className={styles.creativeStepName}>{labels.name}</h3>
                </div>
                <div
                  className={`${styles.creativeMedia} ${step.role === 'product_identity' ? styles.creativeMediaIdentity : styles.creativeMediaDark}`}
                  data-testid={`journey-step-media-${step.role}`}
                >
                  {step.role === 'final_preview' && video ? (
                    <video
                      className={styles.creativeVideo}
                      src={video.uri}
                      poster={hero?.uri}
                      controls
                      playsInline
                      preload="metadata"
                      aria-label="Provided SERENITY 10.08-second video preview"
                      data-testid="journey-video"
                      data-control-id="FLOW-video"
                    >
                      Your browser cannot play the provided MP4.
                    </video>
                  ) : asset ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- provided, user-supplied internal demo asset */
                    <img
                      className={styles.creativeImage}
                      src={asset.uri}
                      alt={step.role === 'product_identity'
                        ? 'SERENITY product original on a white background'
                        : 'SERENITY campaign hero supplied for the Lavish demo'}
                      data-testid={step.role === 'product_identity' ? 'journey-creative-identity' : 'journey-creative-hero'}
                    />
                  ) : (
                    <span className={styles.creativePlaceholder}>Provided asset unavailable</span>
                  )}
                </div>
                <p className={styles.creativeExplanation}>{step.explanation}</p>
                <p className={styles.creativeAssetNote}>
                  {labels.note} · Provided demo asset · Not generated live in this POC
                </p>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className={styles.creativeFallback} data-testid="journey-creative-fallback-assets">
          {[hero ? { key: 'hero', uri: hero.uri, alt: 'SERENITY campaign hero supplied for the Lavish demo' } : null,
            video ? { key: 'video', uri: video.uri, alt: 'Provided SERENITY video preview' } : null]
            .filter((item): item is { key: string; uri: string; alt: string } => item !== null)
            .map((item) => (
              <figure className={styles.creativeFallbackFigure} key={item.key}>
                {item.key === 'video' ? (
                  <video className={styles.creativeVideo} src={item.uri} poster={hero?.uri} controls playsInline preload="metadata" data-testid="journey-video" />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element -- provided, user-supplied internal demo asset */
                  <img className={styles.creativeImage} src={item.uri} alt={item.alt} />
                )}
              </figure>
            ))}
        </div>
      )}

      <div className={styles.videoNotes} data-testid="journey-video-disclosure">
        <p>
          <strong>Provided 10.08-second independent preview.</strong>{' '}
          {videoMeta
            ? `The MP4 above is the supplied ${(videoMeta.durationMs ?? 0) / 1000}s, ${videoMeta.width}×${videoMeta.height} file, played with native controls at 3:4 contain. It has no subtitle track attached.`
            : 'The MP4 above is the supplied independent file, played with native controls at 3:4 contain. It has no subtitle track attached.'}
        </p>
        <p>
          <strong>15-second four-shot concept script (not produced).</strong>{' '}
          The four shots below are an authored 15-second concept for review. They were not rendered into an MP4, and the
          video above is not a per-shot render of this script.
        </p>
      </div>

      <section className={styles.scriptSection} aria-labelledby="journey-script-title" data-testid="journey-script">
        <div className={styles.scriptHeader}>
          <div>
            <h3 className={styles.sectionTitle} id="journey-script-title">15-second four-shot concept script (not produced)</h3>
            <p className={styles.muted}>
              Real authored EN / AR script versions for this campaign. Switching language changes the reading object only.
            </p>
          </div>
          <div className={styles.scriptSwitch} role="group" aria-label="Concept script language">
            <button
              type="button"
              className={`${styles.scriptSwitchButton} ${language === 'en' ? styles.scriptSwitchActive : ''}`}
              aria-pressed={language === 'en'}
              onClick={() => setLanguage('en')}
              data-testid="journey-script-en"
              data-control-id="FLOW-script-en"
            >
              EN
            </button>
            <button
              type="button"
              className={`${styles.scriptSwitchButton} ${language === 'ar' ? styles.scriptSwitchActive : ''}`}
              aria-pressed={language === 'ar'}
              onClick={() => setLanguage('ar')}
              data-testid="journey-script-ar"
              data-control-id="FLOW-script-ar"
            >
              AR
            </button>
          </div>
        </div>

        {preferred ? (
          <div
            className={styles.scriptContent}
            lang={language}
            dir={rtl ? 'rtl' : 'ltr'}
            data-testid="journey-script-content"
            data-language={language}
          >
            <div className={styles.scriptMeta}>
              <strong>{preferred.content.title}</strong>
              <span className={styles.muted}>{preferred.content.hook}</span>
            </div>
            <div className={styles.shotGrid} data-testid="journey-script-shots">
              {preferred.content.shots.map((shot, index) => (
                <article className={styles.shotCard} key={shot.id} data-testid={`journey-script-shot-${index + 1}`}>
                  <p className={styles.shotTime}>
                    Shot {index + 1} · {(shot.startMs / 1000).toFixed(2)}s – {((shot.startMs + shot.durationMs) / 1000).toFixed(2)}s
                  </p>
                  <p className={`${styles.shotText} ${rtl ? styles.rtl : ''}`} lang={language}>{shot.onScreenText}</p>
                  <p className={styles.shotVisual}>{shot.visual}</p>
                </article>
              ))}
            </div>
            <div className={styles.subtitleList} data-testid="journey-script-subtitles">
              <h4 className={styles.subtitleTitle}>Subtitle text</h4>
              {preferred.content.subtitles.map((subtitle) => (
                <p className={styles.subtitleRow} key={subtitle.id}>
                  <span className={styles.subtitleTime}>
                    {(subtitle.startMs / 1000).toFixed(2)}s–{(subtitle.endMs / 1000).toFixed(2)}s
                  </span>
                  <span className={rtl ? styles.rtl : ''} lang={language}>{subtitle.text}</span>
                </p>
              ))}
            </div>
          </div>
        ) : (
          <p className={styles.notice}>No authored EN / AR script version is available for this campaign version.</p>
        )}
      </section>

      <div className={styles.stageActions}>
        <Link
          href={nextHref ?? journeyHref(journey.campaign.campaignId, journey.campaign.scenarioVersion, 'social')}
          className={styles.primaryLink}
          data-testid="journey-next-creative"
          data-control-id="FLOW-next-social"
        >
          {workspaceMode ? 'Prepare social post' : 'Review social post'}
        </Link>
        <span className={styles.muted}>The social stage composes this same provided video with the selected preset copy.</span>
      </div>
    </section>
  );
}
