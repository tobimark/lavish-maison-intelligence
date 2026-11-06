'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { Badge, Button, StateBlock } from '../poc';
import { formatDate, getBrowserApi } from '../poc/browser-api';
import { useCampaignWorkspace } from './shared/useCampaignWorkspace';
import type { OpportunityView, ProductExportRecord, CampaignCard } from '../../demo/poc/api/product-contract';
import styles from './workspace.module.css';

type LoadState = 'loading' | 'ready' | 'error';

interface OverviewData {
  opportunities: OpportunityView[];
  campaigns: CampaignCard[];
  recentExports: ProductExportRecord[];
}

const INDEX_LABELS = ['01', '02', '03'];

const WORKSPACES = [
  { id: 'overview', label: 'Overview', href: '/' },
  { id: 'radar', label: 'Intelligence Radar', href: '/radar' },
  { id: 'opportunities', label: 'Opportunities', href: '/opportunities' },
  { id: 'atelier', label: 'Creative Atelier', href: '/atelier' },
  { id: 'library', label: 'Creative Library', href: '/library' },
  { id: 'deliverables', label: 'Deliverables', href: '/deliverables' },
] as const;

const CASE_STAGES = [
  { id: 'insight', index: '01', label: 'Market insight', purpose: 'What the simulated signals suggest', path: '/radar' },
  { id: 'strategy', index: '02', label: 'Campaign idea', purpose: 'Why SERENITY, and the brief behind it', path: '/opportunities' },
  { id: 'creative', index: '03', label: 'Creative development', purpose: 'How the supplied assets become a story', path: '/atelier' },
  { id: 'social', index: '04', label: 'Social post', purpose: 'The Instagram video post, EN and AR', path: '/deliverables' },
] as const;

function firstSentence(value: string): string {
  const match = value.match(/^(.+?[.!?])(\s|$)/);
  return (match ? match[1] : value).trim();
}

function primaryProductImage(opportunity: OpportunityView): string | null {
  const product = opportunity.brief.productIds[0];
  const match = opportunity.images.find((image) => image.kind === 'product_image' && image.productIds.includes(product));
  return match?.uri ?? opportunity.images.find((image) => image.kind === 'product_image')?.uri ?? null;
}

function logoImage(opportunity: OpportunityView): string | null {
  return opportunity.images.find((image) => image.kind === 'logo')?.uri ?? null;
}

export function Overview() {
  const workspace = useCampaignWorkspace();
  const campaignHref = workspace.hrefFor('/radar');
  const [state, setState] = useState<LoadState>('loading');
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const result = await getBrowserApi().getOverview();
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
      setData(result.data);
      setState('ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === 'loading') {
    return (
      <div className={styles.page} aria-busy="true">
        <StateBlock kind="loading" title="Loading your workspace" body="Reading the prepared Lavish opportunities, campaign content and local downloads." />
      </div>
    );
  }

  if (state === 'error' || !data) {
    return (
      <div className={styles.page}>
        <StateBlock
          kind="error"
          title="Workspace unavailable"
          body={error || 'The prepared content could not be read.'}
          action={<Button variant="secondary" onClick={() => void load()}>Try again</Button>}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${styles.overviewPage}`} data-testid="overview-page">
      <section className={styles.overviewIntro} aria-labelledby="overview-title">
        <div className={styles.introCard}>
          <div>
            <p className={styles.eyebrow}>Lavish Perfumes · Interactive mock product</p>
            <h1 id="overview-title">From social trends to your next Lavish campaign.</h1>
            <p>Explore a market insight, review the creative, and preview a simulated social post.</p>
          </div>
          <div className={styles.introActions}>
            <Link
              href={campaignHref}
              className={styles.primaryAction}
              data-testid="ov-explore-journey"
              data-control-id="OV-explore-journey"
            >
              Explore the campaign
            </Link>
          </div>
        </div>
        <aside className={styles.introAside} aria-label="Workspace summary">
          <div>
            <p className={styles.eyebrow}>Six workspaces</p>
            <p className={styles.cardText}>
              The prepared SERENITY case is the guided path. Every workspace stays reachable in the sidebar; nothing is locked.
            </p>
          </div>
          <nav className={styles.workspaceLinks} aria-label="Six workspaces">
            {WORKSPACES.map((item) => (
              <Link
                key={item.id}
                href={workspace.navHref(item.id)}
                className={styles.workspaceLink}
                data-workspace={item.id}
                data-testid={item.id === 'opportunities'
                  ? 'ov-explore'
                  : item.id === 'atelier'
                    ? 'ov-creative'
                    : `ov-workspace-${item.id}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={styles.metaRow}>
            <Badge tone="mock">Demo · Mock data</Badge>
          </div>
        </aside>
      </section>

      <section className={styles.caseSummary} aria-labelledby="case-summary-title" data-testid="home-journey-summary">
        <div className={styles.caseSummaryHeader}>
          <div>
            <p className={styles.eyebrow}>The prepared case</p>
            <h2 className={styles.sectionTitle} id="case-summary-title">One SERENITY campaign, from signal to social post</h2>
            <p className={styles.sectionNote}>
              Each stage now lives in its own workspace: evidence in Radar, the case for SERENITY in Opportunities, the provided creative in Atelier and the social post in Deliverables.
            </p>
          </div>
          <Link href={campaignHref} className={styles.link} data-control-id="OV-journey-open">Open the campaign</Link>
        </div>
        <ol className={styles.caseSteps}>
          {CASE_STAGES.map((stage) => (
            <li className={styles.caseStepItem} key={stage.id}>
              <Link
                href={workspace.hrefFor(stage.path)}
                className={styles.caseStep}
                data-testid={`home-journey-step-${stage.id}`}
                data-control-id={`OV-journey-${stage.id}`}
              >
                <span className={styles.caseStepIndex} aria-hidden="true">{stage.index}</span>
                <strong className={styles.caseStepTitle}>{stage.label}</strong>
                <span className={styles.caseStepPurpose}>{stage.purpose}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="opportunities-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle} id="opportunities-title">Opportunities to explore</h2>
            <p className={styles.sectionNote}>Read the recommendation and rationale for each opportunity before opening its campaign.</p>
          </div>
          <Link href="/opportunities" className={styles.link} data-testid="ov-all-opportunities">View all opportunities</Link>
        </div>
        <div className={styles.gridThree}>
          {data.opportunities.map((opportunity, index) => {
            const productImage = primaryProductImage(opportunity);
            const logo = logoImage(opportunity);
            return (
              <article className={`${styles.card} ${styles.opportunityCard}`} key={opportunity.opportunityId} data-testid={`ov-opportunity-card-${opportunity.opportunityId}`}>
                <div className={styles.opportunityMedia}>
                  <span className={styles.opportunityIndex} aria-hidden="true">{INDEX_LABELS[index] ?? '·'}</span>
                  {productImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- approved product photograph from the content package */
                    <img src={productImage} alt={`${opportunity.products[0]?.officialName ?? 'Lavish'} product photograph`} />
                  ) : null}
                  {logo ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- approved Lavish logo from the content package */
                    <img src={logo} alt="Lavish Perfumes logo" />
                  ) : null}
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{opportunity.title}</h3>
                  <div className={styles.metaRow}>
                    <span>{opportunity.brief.markets.join(' · ')}</span>
                    <span>{opportunity.products.map((product) => product.officialName).join(' · ')}</span>
                  </div>
                  <p className={styles.cardText}>{firstSentence(opportunity.analysis.recommendation)}</p>
                  <div className={styles.cardActions}>
                    <Link
                      href={`/opportunities/${encodeURIComponent(opportunity.opportunityId)}`}
                      className={styles.link}
                      data-testid={`ov-view-opportunity-${opportunity.opportunityId}`}
                      data-control-id={`OV-opportunity-card-${opportunity.opportunityId}`}
                    >
                      View opportunity
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="creative-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle} id="creative-title">Prepared creative work</h2>
            <p className={styles.sectionNote}>English and Arabic scripts with static storyboards are ready to read and export.</p>
          </div>
        </div>
        <div className={styles.workGrid}>
          {data.campaigns.map((campaign) => (
            <article className={styles.workCard} key={campaign.campaignId} data-testid={`ov-campaign-card-${campaign.campaignId}`}>
              <div className={styles.badgeRow}>
                <Badge tone="mock">Campaign</Badge>
                <span className={styles.tag}>{campaign.products.map((product) => product.officialName).join(' · ')}</span>
              </div>
              <h3 className={styles.cardTitle}>{campaign.name}</h3>
              <p className={styles.cardText}>{firstSentence(campaign.objective)}</p>
              <div className={styles.workLinks}>
                <Link
                  href={`/campaigns/${encodeURIComponent(campaign.campaignId)}/brief`}
                  className={styles.link}
                  data-testid={`ov-campaign-brief-${campaign.campaignId}`}
                >
                  View campaign brief
                </Link>
                <Link
                  href={`/atelier?campaignId=${encodeURIComponent(campaign.campaignId)}&language=en`}
                  className={styles.link}
                  data-testid={`ov-open-campaign-en-${campaign.campaignId}`}
                  data-control-id={`OV-campaign-card-${campaign.campaignId}`}
                >
                  Open EN result
                </Link>
                <Link
                  href={`/atelier?campaignId=${encodeURIComponent(campaign.campaignId)}&language=ar`}
                  className={styles.link}
                  data-testid={`ov-open-campaign-ar-${campaign.campaignId}`}
                >
                  Open AR result
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="downloads-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle} id="downloads-title">Recent downloads</h2>
            <p className={styles.sectionNote}>Content packs prepared in this browser. Download history is stored locally.</p>
          </div>
          <Link href="/deliverables" className={styles.link}>All deliverables</Link>
        </div>
        {data.recentExports.length === 0 ? (
          <div className={styles.emptyState} data-testid="ov-downloads-empty">
            <p className={styles.cardText}>Your downloads will appear here.</p>
            <p className={styles.muted}>Open Deliverables to prepare a real content pack from any prepared or saved script.</p>
          </div>
        ) : (
          <div className={styles.downloadList}>
            {data.recentExports.map((record) => (
              <div className={styles.downloadRow} key={record.id} data-testid={`ov-recent-export-${record.id}`}>
                <div className={styles.downloadMain}>
                  <strong>{record.title}</strong>
                  <span className={styles.muted}>
                    {record.language.toUpperCase()} · {record.origin === 'preset' ? 'Preset' : 'Saved version'} · {record.status === 'download_triggered' ? 'Download started' : 'Prepared'} · {formatDate(record.createdAt)}
                  </span>
                </div>
                <Link
                  href={`/deliverables?exportId=${encodeURIComponent(record.id)}`}
                  className={styles.link}
                  data-testid={`ov-view-download-${record.id}`}
                  data-control-id={`OV-recent-export-${record.id}`}
                >
                  View download
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
