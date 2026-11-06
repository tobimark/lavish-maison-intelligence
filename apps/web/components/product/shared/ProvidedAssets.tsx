'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { Badge, Button, Overlay } from '../../poc';
import { formatBytes, getBrowserApi, triggerDownload } from '../../poc/browser-api';
import type { ProvidedAsset, ProvidedAssetSet } from '../../../demo/poc/api/provided-asset-contract';
import styles from './provided.module.css';

export const SERENITY_PROVIDED_TARGET = {
  campaignId: 'scn-scent-layering.brief.main',
  scenarioVersion: '1.1.0',
} as const;

interface Props {
  surface: 'overview' | 'atelier' | 'deliverables';
  compact?: boolean;
}

function findAsset(set: ProvidedAssetSet, role: string): ProvidedAsset | null {
  return set.assets.find((asset) => asset.roles.includes(role as ProvidedAsset['roles'][number])) ?? null;
}

export function ProvidedAssetShowcase({ surface, compact = false }: Props) {
  const [set, setSet] = useState<ProvidedAssetSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getBrowserApi().getProvidedAssets(SERENITY_PROVIDED_TARGET).then((result) => {
      if (cancelled) return;
      if (!result.ok) setError(`${result.error.code}: ${result.error.message}`);
      else setSet(result.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      videoRef.current?.pause();
    };
  }, []);

  const download = async (asset: ProvidedAsset) => {
    setDownloading(asset.id);
    setDownloadError('');
    try {
      const result = await getBrowserApi().getProvidedAssetDownload({
        ...SERENITY_PROVIDED_TARGET,
        assetId: asset.id,
      });
      if (!result.ok) {
        setDownloadError(`${result.error.code}: ${result.error.message}`);
        return;
      }
      triggerDownload(result.data);
    } finally {
      setDownloading(null);
    }
  };

  if (loading || !set) {
    if (error) {
      return (
        <section className={styles.error} role="alert" data-testid="provided-assets-error">
          Provided SERENITY assets are unavailable: {error}
        </section>
      );
    }
    return null;
  }

  const hero = findAsset(set, 'hero');
  const identity = findAsset(set, 'product_identity');
  const video = findAsset(set, 'final_preview');
  const isAwaiting = set.contentStatus === 'awaiting_serenity_content';

  return (
    <section
      className={`${styles.showcase} ${compact ? styles.compact : ''}`}
      aria-labelledby={`provided-title-${surface}`}
      data-testid={`provided-showcase-${surface}`}
    >
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Featured product · {set.product.officialName}</p>
          <h2 className={styles.title} id={`provided-title-${surface}`}>
            A real product story, with supplied product assets
          </h2>
          <p className={styles.lede}>
            {isAwaiting
              ? 'The SERENITY campaign copy is still being prepared for the new 1.1.0 package. These supplied hero, identity and preview files are shown for product review only; they are not yet bound to a campaign script.'
              : 'SERENITY hero, product identity and the supplied final preview are bound to the 1.1.0 campaign.'}
          </p>
        </div>
        <div className={styles.badges}>
          <Badge tone="mock">Demo / Mock product</Badge>
          <Badge tone={isAwaiting ? 'info' : 'success'}>
            {isAwaiting ? 'Campaign content pending' : 'Content bound'}
          </Badge>
          <Link href="/opportunities/scn-scent-layering.analysis.main" className={styles.exploreLink} data-control-id="AS-HERO-EXPLORE" data-testid="AS-HERO-EXPLORE">
            Explore concept
          </Link>
        </div>
      </div>

      <div className={styles.mediaGrid}>
        {hero ? (
          <figure className={`${styles.figure} ${styles.heroFigure}`} data-control-id="AS-HERO-PREVIEW">
            {/* eslint-disable-next-line @next/next/no-img-element -- user-provided internal demo asset */}
            <img src={hero.uri} alt="SERENITY lifestyle hero supplied for the Lavish demo" data-testid="provided-hero" />
            <figcaption>
              <span>{hero.label}</span>
              <span>Provided demo asset · Not generated live in this POC</span>
            </figcaption>
            <Button size="small" variant="ghost" onClick={() => void download(hero)} pending={downloading === hero.id} data-control-id="AS-IMAGE-DOWNLOAD" data-testid="provided-hero-download">
              Download hero image
            </Button>
          </figure>
        ) : null}
        {identity ? (
          <figure className={`${styles.figure} ${styles.identityFigure}`} data-control-id="AS-IDENTITY-OPEN">
            {/* eslint-disable-next-line @next/next/no-img-element -- user-provided internal demo asset */}
            <img src={identity.uri} alt="SERENITY product original on white background" data-testid="provided-identity" />
            <figcaption>
              <span>{identity.label}</span>
              <span>Product identity image · Provided demo asset</span>
            </figcaption>
            <Button size="small" variant="ghost" onClick={() => void download(identity)} pending={downloading === identity.id} data-control-id="AS-IMAGE-DOWNLOAD" data-testid="provided-identity-download">
              Download identity image
            </Button>
          </figure>
        ) : null}
        {video ? (
          <figure className={`${styles.figure} ${styles.videoFigure}`} data-control-id="AS-VIDEO-TAB">
            <video
              ref={videoRef}
              className={styles.video}
              controls
              playsInline
              preload="metadata"
              poster={hero?.uri}
              data-testid="provided-video"
              onError={() => setError('The provided MP4 could not be played in this browser.')}
            >
              <source src={video.uri} type={video.mimeType} />
              Your browser cannot play the provided MP4.
            </video>
            <figcaption>
              <span>{video.label} · {formatBytes(video.bytes)} · {video.metadata.width}×{video.metadata.height} · {(video.metadata.durationMs ?? 0) / 1000}s</span>
              <span>Provided demo asset · Not generated live in this POC · silent preview controls</span>
            </figcaption>
            <Button
              size="small"
              variant="secondary"
              onClick={() => void download(video)}
              pending={downloading === video.id}
              data-testid="provided-video-download"
              data-control-id="AS-VIDEO-DOWNLOAD"
            >
              Download provided MP4
            </Button>
          </figure>
        ) : null}
    </div>

      {downloadError ? <p className={styles.error} role="alert">{downloadError}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <p className={styles.footnote}>
        Source: user-provided internal demo files. The 10.08s / 3:4 preview is independent of the 15-second campaign script; it is not rendered from the script and no generated-video claim is made.
      </p>
    </section>
  );
}

type HomeStage = 'identity' | 'hero' | 'video';

interface HomeStageDefinition {
  key: HomeStage;
  index: string;
  name: string;
  purpose: string;
  action: string;
  controlId: string;
  testId: string;
}

const HOME_STAGES: HomeStageDefinition[] = [
  {
    key: 'identity',
    index: '01',
    name: 'Product image',
    purpose: 'The supplied white-background SERENITY bottle, kept true to the original.',
    action: 'Preview product image',
    controlId: 'AS-IDENTITY-OPEN',
    testId: 'home-stage-identity',
  },
  {
    key: 'hero',
    index: '02',
    name: 'Campaign visual',
    purpose: 'The supplied campaign image that sets the atmosphere around the product.',
    action: 'Preview campaign visual',
    controlId: 'AS-HERO-PREVIEW',
    testId: 'home-stage-hero',
  },
  {
    key: 'video',
    index: '03',
    name: 'Video preview',
    purpose: 'The supplied 10-second preview, opened on demand.',
    action: 'Play video preview',
    controlId: 'AS-VIDEO-TAB',
    testId: 'home-stage-video',
  },
];

/**
 * AS-004-HOME-CORRECTION · Purpose-first homepage progression.
 *
 * Three equally framed stages (product image -> campaign visual -> video
 * preview). The full player only exists inside the preview dialog; the initial
 * cards are real buttons/links, never hover-only affordances. Data still comes
 * from the same MockApi/sidecar as the rest of the product.
 */
export function HomeCreativeProgression() {
  const [set, setSet] = useState<ProvidedAssetSet | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<HomeStage | null>(null);
  const [videoError, setVideoError] = useState('');
  const [videoAttempt, setVideoAttempt] = useState(0);
  const dialogVideoRef = useRef<HTMLVideoElement | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    setError('');
    const result = await getBrowserApi().getProvidedAssets(SERENITY_PROVIDED_TARGET);
    if (!result.ok) {
      setError(`${result.error.code}: ${result.error.message}`);
      setState('error');
      return;
    }
    setSet(result.data);
    setState('ready');
  }, []);

  useEffect(() => {
    void load();
    return () => {
      dialogVideoRef.current?.pause();
    };
  }, [load]);

  const closePreview = useCallback(() => {
    dialogVideoRef.current?.pause();
    setPreview(null);
  }, []);

  const hero = set ? findAsset(set, 'hero') : null;
  const identity = set ? findAsset(set, 'product_identity') : null;
  const video = set ? findAsset(set, 'final_preview') : null;
  const isAwaiting = set?.contentStatus === 'awaiting_serenity_content';
  const assetFor = (key: HomeStage): ProvidedAsset | null => (key === 'identity' ? identity : key === 'hero' ? hero : video);

  const previewTitle = preview === 'identity'
    ? 'SERENITY product image'
    : preview === 'hero'
      ? 'SERENITY campaign visual'
      : 'SERENITY video preview';
  const previewAsset = preview ? assetFor(preview) : null;

  return (
    <section className={styles.homeConcept} aria-labelledby="serenity-concept-title" data-testid="home-creative-progression">
      <header className={styles.homeConceptHeader}>
        <div>
          <h2 className={styles.homeConceptTitle} id="serenity-concept-title">SERENITY · Creative concept</h2>
          <p className={styles.homeConceptSubtitle}>Product image → Campaign visual → Video preview</p>
          <p className={styles.homeConceptNote}>Provided demo assets · Creative progression shown for illustration.</p>
          {isAwaiting ? <p className={styles.homeConceptPending}>Campaign copy is being prepared.</p> : null}
        </div>
        <Link
          href="/opportunities/scn-scent-layering.analysis.main"
          className={styles.homeConceptExplore}
          data-control-id="AS-HERO-EXPLORE"
          data-testid="home-explore-concept"
        >
          Explore this concept
        </Link>
      </header>

      {state === 'error' ? (
        <div className={styles.homeConceptError} role="alert">
          <span>Provided assets could not be loaded. {error}</span>
          <Button size="small" variant="secondary" onClick={() => void load()}>Retry</Button>
        </div>
      ) : null}

      <ol className={styles.conceptGrid} aria-busy={state === 'loading'}>
        {HOME_STAGES.map((stage) => {
          const asset = assetFor(stage.key);
          return (
            <li className={styles.conceptItem} key={stage.key}>
              <button
                type="button"
                className={styles.conceptCard}
                onClick={() => { if (asset) { setVideoError(''); setPreview(stage.key); } }}
                disabled={!asset}
                aria-label={`${stage.action}: ${stage.name}`}
                data-testid={stage.testId}
                data-control-id={stage.controlId}
                data-stage={stage.key}
              >
                <span className={styles.conceptCardHeader}>
                  <span className={styles.conceptIndex} aria-hidden="true">{stage.index}</span>
                  <span className={styles.conceptName}>{stage.name}</span>
                </span>
                <span className={`${styles.conceptMedia} ${styles[`conceptMedia${stage.key.charAt(0).toUpperCase()}${stage.key.slice(1)}`]}`} data-testid={`${stage.testId}-media`}>
                  {stage.key === 'video' ? (
                    video ? (
                      <>
                        <video
                          className={styles.conceptVideoThumb}
                          muted
                          playsInline
                          preload="metadata"
                          poster={hero?.uri}
                          data-testid="provided-video-thumb"
                        >
                          <source src={video.uri} type={video.mimeType} />
                        </video>
                        <span className={styles.conceptPlayBadge} aria-hidden="true">▶</span>
                      </>
                    ) : <span className={styles.conceptMediaPlaceholder} />
                  ) : asset ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- user-provided internal demo asset */
                    <img
                      src={asset.uri}
                      alt={stage.key === 'identity' ? 'SERENITY product original on white background' : 'SERENITY campaign visual supplied for the Lavish demo'}
                      data-testid={stage.key === 'identity' ? 'provided-identity' : 'provided-hero'}
                      loading={stage.key === 'hero' ? 'eager' : 'lazy'}
                    />
                  ) : <span className={styles.conceptMediaPlaceholder} />}
                </span>
                <span className={styles.conceptCaption}>{stage.purpose}</span>
                <span className={styles.conceptAction}>{asset ? stage.action : 'Loading provided asset'}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {preview ? (
        <Overlay
          open
          onClose={closePreview}
          variant="dialog"
          title={previewTitle}
          description="Provided demo asset · Not generated live in this POC"
          testId="home-preview-dialog"
          footer={<Button variant="secondary" onClick={closePreview}>Close preview</Button>}
        >
          {preview === 'video' && previewAsset ? (
            <div className={styles.homePreviewMedia}>
              <video
                key={videoAttempt}
                ref={dialogVideoRef}
                className={styles.homePreviewVideo}
                controls
                playsInline
                preload="metadata"
                poster={hero?.uri}
                data-testid="provided-video"
                onError={() => setVideoError('The provided MP4 could not be played in this browser.')}
              >
                <source src={previewAsset.uri} type={previewAsset.mimeType} />
                Your browser cannot play the provided MP4.
              </video>
              {videoError ? (
                <div className={styles.homePreviewError} role="alert">
                  <span>{videoError}</span>
                  <Button size="small" variant="secondary" onClick={() => { setVideoError(''); setVideoAttempt((value) => value + 1); }}>Retry</Button>
                </div>
              ) : null}
            </div>
          ) : previewAsset ? (
            <div className={styles.homePreviewMedia}>
              {/* eslint-disable-next-line @next/next/no-img-element -- user-provided internal demo asset */}
              <img
                className={styles.homePreviewImage}
                src={previewAsset.uri}
                alt={preview === 'identity' ? 'SERENITY product original on white background' : 'SERENITY campaign visual supplied for the Lavish demo'}
                data-testid="home-preview-image"
              />
              <p className={styles.homePreviewMeta}>{previewAsset.label} · Provided demo asset · Not generated live in this POC</p>
            </div>
          ) : null}
        </Overlay>
      ) : null}
    </section>
  );
}

interface CampaignAssetsProps {
  campaignId?: string;
  variant: 'brief' | 'atelier';
}

/**
 * AS-004 remaining · SERENITY identity/hero/video for Brief and Atelier.
 * Only renders for the campaign the sidecar is bound to; B/C therefore show no
 * fake video panel. The homepage keeps its own equal-frame progression.
 */
export function ProvidedCampaignAssets({ campaignId, variant }: CampaignAssetsProps) {
  const [set, setSet] = useState<ProvidedAssetSet | null>(null);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getBrowserApi().getProvidedAssets(SERENITY_PROVIDED_TARGET).then((result) => {
      if (cancelled) return;
      if (!result.ok) setError(`${result.error.code}: ${result.error.message}`);
      else setSet(result.data);
    });
    return () => {
      cancelled = true;
      videoRef.current?.pause();
    };
  }, []);

  if (error) {
    return <p className={styles.error} role="alert">{error}</p>;
  }
  if (!set) return null;
  if (campaignId && campaignId !== set.campaignId) return null;
  const identity = findAsset(set, 'product_identity');
  const hero = findAsset(set, 'hero');
  const video = findAsset(set, 'final_preview');
  const showVideo = variant === 'atelier' && Boolean(video);

  return (
    <section className={styles.campaignAssets} data-testid={`provided-campaign-assets-${variant}`} aria-label="SERENITY provided result assets">
      <div className={styles.campaignAssetsHeading}>
        <p className={styles.eyebrow}>SERENITY provided result assets</p>
        <p className={styles.homeConceptNote}>Provided demo assets · Not generated live in this POC.</p>
      </div>
      <div className={`${styles.campaignAssetGrid} ${showVideo ? styles.campaignAssetGridWithVideo : ''} ${variant === 'brief' ? styles.campaignAssetGridBrief : ''}`}>
        {identity ? (
          <figure className={styles.campaignAssetFigure}>
            {/* eslint-disable-next-line @next/next/no-img-element -- user-provided internal demo asset */}
            <img src={identity.uri} alt="SERENITY product original on white background" data-testid="provided-identity" className={styles.campaignIdentityImage} />
            <figcaption>
              <strong>Product identity</strong>
              <span>Supplied white-background SERENITY original.</span>
            </figcaption>
          </figure>
        ) : null}
        {variant === 'brief' && hero ? (
          <figure className={styles.campaignAssetFigure}>
            {/* eslint-disable-next-line @next/next/no-img-element -- user-provided internal demo asset */}
            <img src={hero.uri} alt="SERENITY campaign visual supplied for the Lavish demo" data-testid="provided-hero" className={styles.campaignHeroImage} />
            <figcaption>
              <strong>Campaign visual</strong>
              <span>Supplied atmosphere image, presented with the brief.</span>
            </figcaption>
          </figure>
        ) : null}
        {showVideo && video ? (
          <figure className={styles.campaignAssetFigure}>
            <video
              ref={videoRef}
              className={styles.campaignVideo}
              controls
              playsInline
              preload="metadata"
              poster={hero?.uri}
              data-testid="provided-video"
              data-control-id="AS-VIDEO-TAB"
              onError={() => setError('The provided MP4 could not be played in this browser.')}
            >
              <source src={video.uri} type={video.mimeType} />
              Your browser cannot play the provided MP4.
            </video>
            <figcaption>
              <strong>Provided video preview</strong>
              <span>Provided demo asset · Not generated live in this POC. Independent of the 15-second concept script; no VTT is attached.</span>
            </figcaption>
          </figure>
        ) : null}
      </div>
    </section>
  );
}
