'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { Badge, Button, StateBlock } from '../../poc';
import { getBrowserApi } from '../../poc/browser-api';
import type { OpportunityView } from '../../../demo/poc/api/product-contract';
import styles from '../workspace.module.css';

type LoadState = 'loading' | 'ready' | 'error' | 'notfound';

function productImage(opportunity: OpportunityView, productId: string): string | null {
  return opportunity.images.find((image) => image.kind === 'product_image' && image.productIds.includes(productId))?.uri ?? null;
}

export function OpportunityDetailPage({ opportunityId }: { opportunityId: string }) {
  const [state, setState] = useState<LoadState>('loading');
  const [opportunity, setOpportunity] = useState<OpportunityView | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const result = await getBrowserApi().getOpportunity({ opportunityId });
      if (!result.ok) {
        if (result.error.code === 'NOT_FOUND') {
          setState('notfound');
          return;
        }
        throw new Error(`${result.error.code}: ${result.error.message}`);
      }
      setOpportunity(result.data);
      setState('ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setState('error');
    }
  }, [opportunityId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === 'loading') {
    return <StateBlock kind="loading" title="Loading opportunity" body="Reading the prepared recommendation, evidence and campaign brief." />;
  }

  if (state === 'notfound') {
    return (
      <div className={styles.page} data-testid="opportunity-not-found">
        <StateBlock
          kind="error"
          title="Opportunity not found"
          body={`No prepared opportunity matches "${opportunityId}". It may have been removed or the link may belong to another workspace.`}
          action={
            <Link href="/opportunities" className={styles.link} data-control-id="OPP-back" data-testid="OPP-back">
              Back to all opportunities
            </Link>
          }
        />
      </div>
    );
  }

  if (state === 'error' || !opportunity) {
    return <StateBlock kind="error" title="Opportunity unavailable" body={error} action={<Button variant="secondary" onClick={() => void load()}>Try again</Button>} />;
  }

  const evidenceSignals = opportunity.signals;
  return (
    <div className={styles.page} data-testid="opportunity-detail-page">
      <header className={styles.pageHeader}>
        <Link href="/opportunities" className={styles.linkMuted} data-control-id="OPP-back" data-testid="OPP-back">
          ← All opportunities
        </Link>
        <p className={styles.eyebrow}>Opportunity strategy</p>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>{opportunity.title}</h1>
            <div className={styles.metaRow}>
              <span>{opportunity.brief.markets.join(' · ')}</span>
              <span>{opportunity.products.map((product) => product.officialName).join(' · ')}</span>
              <Badge tone="mock">Demo · Mock data</Badge>
            </div>
          </div>
          <Link
            href={`/atelier?campaignId=${encodeURIComponent(opportunity.campaignId)}`}
            className={styles.primaryActionInline}
            data-control-id="OPP-campaign"
            data-testid="OPP-campaign"
          >
            Open campaign
          </Link>
        </div>
      </header>

      <section className={styles.heroCard} aria-labelledby="why-title">
        <div className={styles.opportunityBody}>
          <h2 className={styles.sectionTitle} id="why-title">Why this fits Lavish</h2>
          <p className={styles.quote}>{opportunity.analysis.recommendation}</p>
          <p className={styles.cardText}>{opportunity.analysis.rationale}</p>
          <h3 className={styles.drawerTitle}>What the prepared analysis found</h3>
          <ul className={styles.bulletList}>
            {opportunity.analysis.insights.map((insight) => (
              <li key={insight}>{insight}</li>
            ))}
          </ul>
        </div>
        <div className={styles.heroMedia}>
          <div className={styles.heroImages}>
            {opportunity.brief.productIds.map((productId) => {
              const image = productImage(opportunity, productId);
              return image ? (
                /* eslint-disable-next-line @next/next/no-img-element -- approved product photograph from the content package */
                <img key={productId} src={image} alt="Approved Lavish product photograph" />
              ) : null;
            })}
          </div>
          <div className={styles.metaRow}>
            <span>{opportunity.evidence.length} evidence items</span>
            <span>{opportunity.trends.length} illustrative trends</span>
            <span>{opportunity.signals.length} simulated signals</span>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="evidence-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle} id="evidence-title">Supporting evidence</h2>
            <p className={styles.sectionNote}>Each item is a labelled mock signal with its own disclosure; none is a real post or metric.</p>
          </div>
          <Badge tone="mock">Simulated evidence</Badge>
        </div>
        <div className={styles.gridThree}>
          {opportunity.evidence.map((evidence) => {
            const signal = evidenceSignals.find((candidate) => candidate.evidenceIds.includes(evidence.id));
            return (
              <article className={styles.card} key={evidence.id} data-control-id={`OPP-evidence-${evidence.id}`} data-testid={`OPP-evidence-${evidence.id}`}>
                <div className={`${styles.cardBody}`}>
                  <div className={styles.badgeRow}>
                    <span className={styles.tag}>{evidence.platform}</span>
                    <span className={`${styles.tag} ${styles.tagGold}`}>{new Date(evidence.simulatedAt).toLocaleDateString('en-GB')}</span>
                  </div>
                  <h3 className={styles.cardTitle}>{evidence.title}</h3>
                  <p className={styles.cardText}>{evidence.summary}</p>
                  <p className={styles.muted}>{evidence.disclosure}</p>
                  {signal ? (
                    <Link
                      href={`/radar?signalId=${encodeURIComponent(signal.id)}`}
                      className={styles.link}
                      data-control-id={`OPP-signal-${signal.id}`}
                    >
                      Read the signal in Radar
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="brief-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle} id="brief-title">Campaign brief</h2>
            <p className={styles.sectionNote}>The prepared brief the campaign workspace and downloadable content pack use.</p>
          </div>
          <Link href={`/campaigns/${encodeURIComponent(opportunity.campaignId)}/brief`} className={styles.link} data-testid="OPP-brief-link" data-control-id="AS-BRIEF-OPEN">
            View campaign brief
          </Link>
          <Link href={`/atelier?campaignId=${encodeURIComponent(opportunity.campaignId)}`} className={styles.link}>
            Open in Creative Atelier
          </Link>
        </div>
        <div className={styles.cardPadded}>
          <div className={styles.briefGrid}>
            <div className={styles.briefField}>
              <span className={styles.briefLabel}>Objective</span>
              <p className={styles.briefValue}>{opportunity.brief.objective}</p>
            </div>
            <div className={styles.briefField}>
              <span className={styles.briefLabel}>Markets & audience</span>
              <p className={styles.briefValue}>{opportunity.brief.markets.join(' · ')}<br />{opportunity.brief.audience}</p>
            </div>
            <div className={styles.briefField}>
              <span className={styles.briefLabel}>Product</span>
              <p className={styles.briefValue}>
                {opportunity.products.map((product) => `${product.officialName} · ${product.sku}`).join(' · ')}
              </p>
            </div>
            <div className={styles.briefField}>
              <span className={styles.briefLabel}>Concept</span>
              <p className={styles.briefValue}>{opportunity.brief.concept}</p>
            </div>
            <div className={styles.briefField}>
              <span className={styles.briefLabel}>Tone</span>
              <p className={styles.briefValue}>{opportunity.brief.tone}</p>
            </div>
            <div className={styles.briefField}>
              <span className={styles.briefLabel}>Channels & languages</span>
              <p className={styles.briefValue}>
                {opportunity.brief.channels.join(' · ')}<br />
                {opportunity.brief.languages.map((language) => language.toUpperCase()).join(' / ')}
              </p>
            </div>
            <div className={styles.briefField}>
              <span className={styles.briefLabel}>Key message</span>
              <p className={styles.briefValue}>{opportunity.brief.keyMessage}</p>
            </div>
            <div className={styles.briefField}>
              <span className={styles.briefLabel}>Call to action</span>
              <p className={styles.briefValue}>{opportunity.brief.cta}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="facts-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle} id="facts-title">Product facts, assumptions & uncertainty</h2>
            <p className={styles.sectionNote}>Product facts are documented; campaign assumptions are marketing hypotheses, not observed results.</p>
          </div>
        </div>
        <div className={styles.gridTwoWide}>
          <div className={styles.cardPadded}>
            <h3 className={styles.drawerTitle}>Verified product facts</h3>
            <div className={styles.productStrip}>
              {opportunity.products.map((product) => (
                <div className={styles.productFact} key={product.id}>
                  <strong>{product.officialName}</strong>
                  <span className={styles.muted}>SKU {product.sku}</span>
                  <ul>
                    {product.verifiedFacts.map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <details className={styles.cardPadded} data-control-id="OPP-assumptions" data-testid="OPP-assumptions">
            <summary className={styles.assumptionsSummary}>
              <span className={styles.drawerTitle}>Assumptions & uncertainties</span>
            </summary>
            <h3 className={styles.drawerTitle}>Assumptions</h3>
            <ul className={styles.bulletList}>
              {opportunity.analysis.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h3 className={styles.drawerTitle}>Uncertainties</h3>
            <ul className={styles.bulletList}>
              {opportunity.analysis.uncertainties.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className={styles.disclosure}>
              <span aria-hidden="true">i</span>
              <span>{opportunity.trends[0]?.disclosure ?? 'All trend data in this demo is synthetic and illustrative.'}</span>
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}
