'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { Badge, Button, StateBlock } from '../../poc';
import { getBrowserApi } from '../../poc/browser-api';
import type { OpportunityView } from '../../../demo/poc/api/product-contract';
import type { CampaignJourney } from '../../../demo/poc/api/flow-contract';
import { StrategyStage } from '../journey/StrategyStage';
import { useCampaignWorkspace } from '../shared/useCampaignWorkspace';
import styles from '../workspace.module.css';

type LoadState = 'loading' | 'ready' | 'error';

function firstSentence(value: string): string {
  const match = value.match(/^(.+?[.!?])(\s|$)/);
  return (match ? match[1] : value).trim();
}

function opportunityImage(opportunity: OpportunityView): string | null {
  const productId = opportunity.brief.productIds[0];
  return opportunity.images.find((image) => image.kind === 'product_image' && image.productIds.includes(productId))?.uri
    ?? opportunity.images.find((image) => image.kind === 'product_image')?.uri
    ?? null;
}

export function OpportunitiesPage() {
  const workspace = useCampaignWorkspace();
  const [strategyJourney, setStrategyJourney] = useState<CampaignJourney | null>(null);
  const [strategyError, setStrategyError] = useState('');
  const [state, setState] = useState<LoadState>('loading');
  const [items, setItems] = useState<OpportunityView[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const result = await getBrowserApi().listOpportunities();
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
      setItems(result.data.items);
      setState('ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setState('error');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getBrowserApi().getCampaignJourney({ campaignId: workspace.campaignId, scenarioVersion: workspace.scenarioVersion });
        if (cancelled) return;
        if (result.ok) setStrategyJourney(result.data);
        else { setStrategyJourney(null); setStrategyError(`${result.error.code}: ${result.error.message}`); }
      } catch (cause) {
        if (!cancelled) { setStrategyJourney(null); setStrategyError(cause instanceof Error ? cause.message : String(cause)); }
      }
    })();
    return () => { cancelled = true; };
  }, [workspace.campaignId, workspace.scenarioVersion]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === 'loading') {
    return <StateBlock kind="loading" title="Loading opportunities" body="Reading the prepared opportunity analyses and campaign briefs." />;
  }

  if (state === 'error') {
    return <StateBlock kind="error" title="Opportunities unavailable" body={error} action={<Button variant="secondary" onClick={() => void load()}>Try again</Button>} />;
  }

  return (
    <div className={styles.page} data-testid="opportunities-page">
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Opportunities</p>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Three opportunities for Lavish</h1>
            <p className={styles.lede}>
              Each opportunity links a prepared signal theme to a product-grounded campaign brief. Read the
              recommendation and evidence before opening the campaign.
            </p>
          </div>
          <Badge tone="mock">Demo · Mock data</Badge>
        </div>
      </header>

      <section className={styles.caseSection} aria-label="Current case strategy" data-testid="opportunities-current-strategy">
        {strategyJourney ? (
          <StrategyStage journey={strategyJourney} mode="workspace" nextHref={workspace.hrefFor('/atelier')} />
        ) : strategyError ? (
          <div className={styles.notice} data-testid="opportunities-strategy-unavailable">
            <strong>No authored strategy is available for this campaign version.</strong>
            <p>{strategyError}</p>
            <p>Nothing was borrowed from the SERENITY case; the prepared opportunity list remains readable below.</p>
          </div>
        ) : null}
      </section>

      <div className={styles.opportunityList}>
        {items.map((opportunity) => {
          const image = opportunityImage(opportunity);
          return (
            <article className={styles.opportunityRow} key={opportunity.opportunityId} data-testid={`opp-row-${opportunity.opportunityId}`}>
              <div className={styles.opportunityRowMedia}>
                {image ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- approved product photograph from the content package */
                  <img src={image} alt={`${opportunity.products[0]?.officialName ?? 'Lavish'} product`} />
                ) : null}
              </div>
              <div className={styles.opportunityBody}>
                <div className={styles.badgeRow}>
                  <span className={styles.tag}>{opportunity.brief.markets.join(' · ')}</span>
                  <span className={styles.tag}>{opportunity.products.map((product) => product.officialName).join(' · ')}</span>
                </div>
                <h2 className={styles.cardTitle}>{opportunity.title}</h2>
                <p className={styles.cardText}>
                  <strong>Recommended action: </strong>
                  {firstSentence(opportunity.analysis.recommendation)}
                </p>
                <p className={styles.muted}>Audience: {opportunity.brief.audience}</p>
              </div>
              <Link
                href={workspace.hrefFor(`/opportunities/${encodeURIComponent(opportunity.opportunityId)}`)}
                className={styles.link}
                data-control-id={`OPP-card-${opportunity.opportunityId}`}
                data-testid={`OPP-card-${opportunity.opportunityId}`}
              >
                View strategy
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
