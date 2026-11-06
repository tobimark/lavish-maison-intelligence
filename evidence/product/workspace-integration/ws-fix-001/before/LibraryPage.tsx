'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Badge, Button, Overlay, StateBlock, ToastRegion, type ToastMessage } from '../../poc';
import { getBrowserApi, triggerDownload } from '../../poc/browser-api';
import { ScriptPreview, StoryboardPreview, VersionBadges } from '../shared/PreviewBlocks';
import { SERENITY_PROVIDED_TARGET } from '../shared/ProvidedAssets';
import { useCampaignWorkspace } from '../shared/useCampaignWorkspace';
import type { CampaignCard, CreativeItem } from '../../../demo/poc/api/product-contract';
import type { ProvidedAsset, ProvidedAssetSet } from '../../../demo/poc/api/provided-asset-contract';
import styles from '../workspace.module.css';

type LoadState = 'loading' | 'ready' | 'error';

const KIND_LABELS = { script: 'Script', storyboard: 'Static storyboard' } as const;
const PROVIDED_KIND_LABELS = {
  hero_image: 'Hero image',
  product_original_image: 'Product original',
  final_preview_video: 'Provided video',
} as const;
type ProvidedKind = keyof typeof PROVIDED_KIND_LABELS;
const ORIGIN_LABELS = { preset: 'Preset', saved: 'Saved version' } as const;

export function LibraryPage() {
  const workspace = useCampaignWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignParam = searchParams.get('campaignId') ?? '';
  const languageParam = searchParams.get('language') === 'ar' ? 'ar' : searchParams.get('language') === 'en' ? 'en' : '';
  const rawKind = searchParams.get('kind') ?? '';
  const kindParam = rawKind === 'storyboard' || rawKind === 'script' || rawKind in PROVIDED_KIND_LABELS ? rawKind : '';
  const providedKind = kindParam in PROVIDED_KIND_LABELS ? (kindParam as ProvidedKind) : '';
  const originParam = searchParams.get('origin') === 'saved' ? 'saved' : searchParams.get('origin') === 'preset' ? 'preset' : '';
  const versionParam = searchParams.get('versionId') ?? '';
  const sessionParam = searchParams.get('sessionId') ?? '';

  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState('');
  const [items, setItems] = useState<CreativeItem[]>([]);
  const [providedAssets, setProvidedAssets] = useState<ProvidedAssetSet | null>(null);
  const [providedPreview, setProvidedPreview] = useState<ProvidedAsset | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignCard[]>([]);
  const [preview, setPreview] = useState<CreativeItem | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = (message: string, tone: ToastMessage['tone'] = 'neutral') => {
    setToasts((current) => [...current, { id: `library-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, message, tone }].slice(-3));
  };

  const updateQuery = useCallback((next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    router.replace(query ? `/library?${query}` : '/library', { scroll: false });
  }, [router, searchParams]);

  const load = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const api = getBrowserApi();
      const [assets, campaignsResult, providedResult] = await Promise.all([
        providedKind
          ? Promise.resolve({ ok: true as const, data: { items: [] as CreativeItem[] } })
          : api.listCreativeAssets({
            campaignId: campaignParam || undefined,
            language: languageParam || undefined,
            kind: kindParam === 'script' || kindParam === 'storyboard' ? kindParam : undefined,
            origin: originParam || undefined,
          }),
        api.listCampaigns(),
        api.getProvidedAssets(SERENITY_PROVIDED_TARGET),
      ]);
      if (!assets.ok) throw new Error(`${assets.error.code}: ${assets.error.message}`);
      if (!campaignsResult.ok) throw new Error(`${campaignsResult.error.code}: ${campaignsResult.error.message}`);
      setItems(assets.data.items);
      setCampaigns(campaignsResult.data.items);
      setProvidedAssets(providedResult.ok ? providedResult.data : null);
      setState('ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setState('error');
    }
  }, [campaignParam, kindParam, languageParam, originParam, providedKind]);

  useEffect(() => {
    void load();
  }, [load]);

  // A shared deep link can open an exact creative asset.
  useEffect(() => {
    if (!versionParam || state !== 'ready' || preview) return;
    const match = items.find(
      (item) => item.version.versionId === versionParam
        && (item.version.sessionId ?? null) === (sessionParam || null)
        && (!kindParam || item.kind === kindParam),
    );
    if (match) setPreview(match);
  }, [items, kindParam, preview, sessionParam, state, versionParam]);

  const activeFilters = Boolean(campaignParam || languageParam || kindParam || originParam);
  const visibleProvided = (providedAssets?.assets ?? []).filter((asset) => {
    if (campaignParam && providedAssets?.campaignId !== campaignParam) return false;
    if (providedKind && asset.type !== providedKind) return false;
    if (!providedKind && (kindParam === 'script' || kindParam === 'storyboard')) return false;
    return asset.visibility.includes('library');
  });

  const exportItem = async (item: CreativeItem) => {
    const key = `${item.version.versionId}-${item.kind}`;
    setExportingId(key);
    try {
      const prepared = await getBrowserApi().exportScriptPack({
        campaignId: item.version.campaignId,
        versionId: item.version.versionId,
        sessionId: item.version.sessionId,
        idempotencyKey: `library-export-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      });
      if (!prepared.ok) {
        pushToast(`Export failed: ${prepared.error.message}`, 'error');
        return;
      }
      triggerDownload(prepared.data.download);
      const marked = await getBrowserApi().markProductExportTriggered({ exportId: prepared.data.record.id });
      if (!marked.ok) {
        pushToast('The download started, but its local record could not be marked as triggered.', 'error');
      } else {
        pushToast(`Download started · ${prepared.data.record.archiveFilename}`, 'success');
      }
      await load();
    } finally {
      setExportingId(null);
    }
  };

  const previewTitle = preview ? `${preview.campaign.name} · ${preview.version.language.toUpperCase()} ${KIND_LABELS[preview.kind]}` : 'Preview';
  const providedPreviewTitle = providedPreview ? `${PROVIDED_KIND_LABELS[providedPreview.type]} · SERENITY` : 'Provided asset preview';

  return (
    <div className={styles.page} data-testid="library-page">
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Creative Library</p>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Creative Library</h1>
            <p className={styles.lede}>Every prepared and saved EN/AR script and static storyboard, with exact versions ready to preview or export.</p>
          </div>
          <Badge tone="mock">Demo · Mock data</Badge>
        </div>
      </header>

      <section className={styles.toolbar} aria-label="Library filters">
        <label className={styles.field}>
          <span className={styles.label}>Campaign</span>
          <select className={styles.select} value={campaignParam} onChange={(event) => updateQuery({ campaignId: event.target.value })} data-control-id="LIB-campaign" data-testid="LIB-campaign">
            <option value="">All campaigns</option>
            {campaigns.map((campaign) => (
              <option key={campaign.campaignId} value={campaign.campaignId}>{campaign.name}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Language</span>
          <select className={styles.select} value={languageParam} onChange={(event) => updateQuery({ language: event.target.value })} data-control-id="LIB-language" data-testid="LIB-language">
            <option value="">All languages</option>
            <option value="en">English</option>
            <option value="ar">Arabic</option>
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Type</span>
          <select className={styles.select} value={kindParam} onChange={(event) => updateQuery({ kind: event.target.value })} data-control-id="LIB-kind" data-testid="LIB-kind">
            <option value="">Scripts & storyboards</option>
            <option value="script">Scripts</option>
            <option value="storyboard">Static storyboards</option>
            <option value="hero_image">Hero images</option>
            <option value="product_original_image">Product originals</option>
            <option value="final_preview_video">Provided videos</option>
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Origin</span>
          <select className={styles.select} value={originParam} onChange={(event) => updateQuery({ origin: event.target.value })} data-control-id="LIB-origin" data-testid="LIB-origin">
            <option value="">Preset & saved</option>
            <option value="preset">Preset only</option>
            <option value="saved">Saved versions</option>
          </select>
        </label>
        <Button variant="ghost" onClick={() => updateQuery({ campaignId: '', language: '', kind: '', origin: '', versionId: '', sessionId: '' })} data-control-id="LIB-clear" data-testid="LIB-clear">
          Clear filters
        </Button>
      </section>

      {state === 'ready' && visibleProvided.length > 0 ? (
        <section className={styles.section} data-testid="LIB-provided-section" aria-labelledby="lib-provided-title">
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle} id="lib-provided-title">Provided SERENITY assets</h2>
              <p className={styles.sectionNote}>Real supplied product image, campaign visual and 10-second video preview. Provided demo assets · Not generated live in this POC.</p>
            </div>
          </div>
          <div className={styles.gridThree}>
            {visibleProvided.map((asset) => {
              const controlId = asset.type === 'hero_image' ? 'AS-HERO-PREVIEW' : asset.type === 'product_original_image' ? 'AS-IDENTITY-OPEN' : 'AS-VIDEO-TAB';
              return (
                <article className={`${styles.card} ${styles.workCard}`} key={asset.id} data-testid={`LIB-provided-${asset.type}`} data-control-id={controlId}>
                  <div className={styles.libraryProvidedMedia}>
                    {asset.type === 'final_preview_video' ? (
                      <video muted playsInline preload="metadata" poster={asset.metadata.posterAssetId ? (providedAssets?.assets.find((candidate) => candidate.id === asset.metadata.posterAssetId)?.uri ?? undefined) : undefined} data-testid="LIB-provided-video-thumb">
                        <source src={asset.uri} type={asset.mimeType} />
                      </video>
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element -- user-provided internal demo asset */
                      <img src={asset.uri} alt={asset.label} data-testid={asset.type === 'product_original_image' ? 'LIB-provided-identity' : 'LIB-provided-hero'} />
                    )}
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.badgeRow}>
                      <Badge tone="mock">Provided</Badge>
                      <span className={styles.tag}>{PROVIDED_KIND_LABELS[asset.type]}</span>
                    </div>
                    <h3 className={styles.cardTitle}>{asset.label}</h3>
                    <p className={styles.cardText}>{asset.type === 'final_preview_video' ? 'Supplied 10.08s / 720×960 / 3:4 preview; independent of the 15-second concept script.' : 'Supplied original bytes, shown exactly as provided.'}</p>
                    <div className={styles.cardActions}>
                      <Button variant="secondary" size="small" onClick={() => setProvidedPreview(asset)} data-testid={`LIB-provided-preview-${asset.type}`}>Preview</Button>
                      <Link className={styles.link} href={`/atelier?campaignId=${encodeURIComponent(providedAssets?.campaignId ?? '')}&language=en`} data-testid={`LIB-provided-atelier-${asset.type}`}>Open in Atelier</Link>
                      {asset.type === 'final_preview_video' ? (
                        <Link className={styles.link} href={workspace.hrefFor('/deliverables', { includeLanguage: true })} data-testid="LIB-provided-deliverables">Open in Deliverables</Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {state === 'loading' ? (
        <StateBlock kind="loading" title="Loading creative work" body="Reading prepared and saved scripts and static storyboards." />
      ) : state === 'error' ? (
        <StateBlock kind="error" title="Library unavailable" body={error} action={<Button variant="secondary" onClick={() => void load()}>Try again</Button>} />
      ) : items.length === 0 && visibleProvided.length === 0 ? (
        <div className={styles.emptyState} data-testid="LIB-empty">
          <p className={styles.cardText}>No creative work matches these filters.</p>
          <p className={styles.muted}>
            {activeFilters ? 'Clear the filters to see every prepared and saved version.' : 'No prepared or saved versions are available in this browser.'}
          </p>
          <Button variant="secondary" onClick={() => updateQuery({ campaignId: '', language: '', kind: '', origin: '', versionId: '', sessionId: '' })} data-control-id="LIB-clear-empty" data-testid="LIB-clear-empty">
            Clear filters
          </Button>
        </div>
      ) : (
        <div className={styles.libraryList} data-testid="library-list">
          {items.map((item) => {
            const key = `${item.kind}-${item.version.versionId}-${item.version.sessionId ?? 'preset'}`;
            const excerpt = item.kind === 'script'
              ? item.version.content.hook
              : `${item.version.content.shots.length} static shots · ${item.version.content.shots[0]?.onScreenText ?? ''}`;
            const showCampaign = item.version.title.trim() !== item.campaign.name.trim();
            return (
              <article className={styles.libraryRow} key={key} data-testid={`LIB-row-${key}`}>
                <div className={styles.libraryMain}>
                  <h2 className={styles.libraryTitle}>{item.version.title}</h2>
                  <p className={styles.libraryExcerpt}>{excerpt}</p>
                  <span className={styles.muted}>
                    {showCampaign ? `${item.campaign.name} · ` : ''}
                    {item.campaign.products.map((product) => product.officialName).join(' · ')}
                  </span>
                </div>
                <div className={styles.badgeRow} data-testid={`LIB-meta-${key}`}>
                  <span className={styles.tag}>{KIND_LABELS[item.kind]}</span>
                  <span className={styles.tag}>{item.version.language.toUpperCase()}</span>
                  <span className={styles.tag}>{ORIGIN_LABELS[item.version.origin]}</span>
                  <span className={`${styles.tag} ${item.version.confirmation === 'confirmed_current' ? styles.tagGood : styles.tagGold}`}>
                    {item.version.confirmation === 'confirmed_current' ? 'Confirmed' : 'Unconfirmed'}
                  </span>
                  {item.exportIds.length > 0 ? <span className={styles.tag}>{item.exportIds.length} export{item.exportIds.length > 1 ? 's' : ''}</span> : null}
                </div>
                <div className={styles.libraryActions}>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => setPreview(item)}
                    data-control-id={`LIB-preview-${item.version.versionId}-${item.kind}`}
                    data-testid={`LIB-preview-${item.version.versionId}-${item.kind}`}
                  >
                    Preview
                  </Button>
                  <Link
                    href={`/atelier?campaignId=${encodeURIComponent(item.version.campaignId)}&language=${item.version.language}&versionId=${encodeURIComponent(item.version.versionId)}${item.version.sessionId ? `&sessionId=${encodeURIComponent(item.version.sessionId)}` : ''}&tab=${item.kind === 'storyboard' ? 'storyboard' : 'copy'}`}
                    className={styles.link}
                    data-control-id="LIB-atelier"
                    data-testid={`LIB-atelier-${item.version.versionId}-${item.kind}`}
                  >
                    Open in Atelier
                  </Link>
                  <Button
                    variant="primary"
                    size="small"
                    pending={exportingId === `${item.version.versionId}-${item.kind}`}
                    onClick={() => void exportItem(item)}
                    data-control-id="LIB-export"
                    data-testid={`LIB-export-${item.version.versionId}-${item.kind}`}
                  >
                    Export content pack
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Overlay
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        variant="drawer"
        title={previewTitle}
        description={preview ? `${ORIGIN_LABELS[preview.version.origin]} · ${preview.version.confirmation === 'confirmed_current' ? 'Confirmed current' : 'Unconfirmed'} · ${preview.version.language.toUpperCase()}` : undefined}
        testId="library-preview"
        footer={
          <div className={styles.cardActions}>
            <Button variant="secondary" onClick={() => setPreview(null)} data-control-id="LIB-close" data-testid="LIB-close">Close</Button>
            {preview ? (
              <>
                <Link
                  href={`/atelier?campaignId=${encodeURIComponent(preview.version.campaignId)}&language=${preview.version.language}&versionId=${encodeURIComponent(preview.version.versionId)}${preview.version.sessionId ? `&sessionId=${encodeURIComponent(preview.version.sessionId)}` : ''}&tab=${preview.kind === 'storyboard' ? 'storyboard' : 'copy'}`}
                  className={styles.link}
                  data-control-id="LIB-atelier-drawer"
                >
                  Open in Atelier
                </Link>
                <Button
                  variant="primary"
                  pending={exportingId === `${preview.version.versionId}-${preview.kind}`}
                  onClick={() => void exportItem(preview)}
                  data-control-id="LIB-export-drawer"
                >
                  Export content pack
                </Button>
              </>
            ) : null}
          </div>
        }
      >
        {preview ? (
          <div className={styles.previewBody}>
            <div className={styles.badgeRow}>
              <VersionBadges version={preview.version} />
              <span className={styles.tag}>{KIND_LABELS[preview.kind]}</span>
            </div>
            {preview.kind === 'script' ? (
              <ScriptPreview version={preview.version} campaign={preview.campaign} />
            ) : (
              <StoryboardPreview version={preview.version} campaign={preview.campaign} />
            )}
          </div>
        ) : null}
      </Overlay>

      <Overlay
        open={Boolean(providedPreview)}
        onClose={() => setProvidedPreview(null)}
        variant="drawer"
        title={providedPreviewTitle}
        description="Provided demo asset · Not generated live in this POC"
        testId="LIB-provided-preview"
        footer={<Button variant="secondary" onClick={() => setProvidedPreview(null)} data-testid="LIB-provided-close">Close</Button>}
      >
        {providedPreview ? (
          <div className={styles.previewBody}>
            {providedPreview.type === 'final_preview_video' ? (
              <video className={styles.libraryProvidedVideo} controls playsInline preload="metadata" poster={providedAssets?.assets.find((candidate) => candidate.id === providedPreview.metadata.posterAssetId)?.uri} data-testid="LIB-provided-video">
                <source src={providedPreview.uri} type={providedPreview.mimeType} />
              </video>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element -- user-provided internal demo asset */
              <img className={styles.libraryProvidedImage} src={providedPreview.uri} alt={providedPreview.label} data-testid="LIB-provided-image" />
            )}
            <p className={styles.muted}>{providedPreview.label} · {PROVIDED_KIND_LABELS[providedPreview.type]} · Provided demo asset, not generated live in this POC.</p>
          </div>
        ) : null}
      </Overlay>

      <ToastRegion toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </div>
  );
}
