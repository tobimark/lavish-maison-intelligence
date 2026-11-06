'use client';

import Link from 'next/link';

import type { CampaignJourney } from '../../../demo/poc/api/flow-contract';
import { journeyHref, productIdentityAsset } from './journey-utils';
import styles from './journey.module.css';

/**
 * Stage 2 · Campaign idea. The authored `whyThisProduct` answer leads, then
 * the real brief fields (audience, objective, concept, key message, CTA) and
 * the product identity image. "Open full brief" uses the existing brief route
 * for the same campaign; the next CTA only moves the reading position.
 */
export function StrategyStage({
  journey,
  mode = 'journey',
  nextHref,
}: {
  journey: CampaignJourney;
  mode?: 'journey' | 'workspace';
  nextHref?: string;
}) {
  const workspaceMode = mode === 'workspace';
  const presentation = journey.presentation;
  const ready = journey.contentStatus === 'ready' && presentation !== null;
  const identity = productIdentityAsset(journey);
  const brief = journey.opportunity.brief;

  return (
    <section className={styles.stage} data-testid="journey-stage-strategy" data-workspace-mode={workspaceMode || undefined} aria-labelledby="journey-strategy-title">
      <div className={styles.stageHeader}>
        <p className={styles.stageEyebrow}>{workspaceMode ? 'Opportunities · current case strategy' : 'Stage 2 of 4 · Campaign idea'}</p>
        <h2 className={styles.stageTitle} id="journey-strategy-title">Why this product, and how this campaign works</h2>
        <p className={styles.stageLede}>{journey.campaign.objective}</p>
      </div>

      {!ready ? (
        <div className={styles.noticeWarn} data-testid="journey-pending">
          <strong>The authored campaign idea is still being prepared for this version.</strong>
          <p>{journey.contentIssue ?? 'The campaign presentation sidecar is not available yet.'}</p>
          <p>The brief fields and supplied product image below are real prepared content; no recommendation copy has been invented.</p>
        </div>
      ) : null}

      <div className={styles.strategyGrid}>
        <div className={styles.strategyMain}>
          {ready ? (
            <blockquote className={styles.whyText} data-testid="journey-why-product">
              {presentation.strategy.whyThisProduct}
            </blockquote>
          ) : null}
          <dl className={styles.factsGrid}>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Audience</dt>
              <dd className={styles.factValue}>{brief.audience}</dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Objective</dt>
              <dd className={styles.factValue}>{brief.objective}</dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Creative concept</dt>
              <dd className={styles.factValue}>{brief.concept}</dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Key message</dt>
              <dd className={styles.factValue}>{brief.keyMessage}</dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Call to action</dt>
              <dd className={styles.factValue}>{brief.cta}</dd>
            </div>
          </dl>
        </div>

        <figure className={styles.productFigure}>
          {identity ? (
            /* eslint-disable-next-line @next/next/no-img-element -- provided, user-supplied internal demo asset */
            <img
              className={styles.productImage}
              src={identity.uri}
              alt="SERENITY product original on a white background"
              data-testid="journey-strategy-product-image"
            />
          ) : null}
          <figcaption className={styles.productCaption}>
            <strong>{journey.campaign.products[0]?.officialName ?? 'Product'} · product identity</strong>
            <span>{identity?.label ?? 'Provided product photograph'} · Provided demo asset · Not generated live in this POC</span>
          </figcaption>
        </figure>
      </div>

      <div className={styles.stageActions}>
        <Link
          href={`/campaigns/${encodeURIComponent(journey.campaign.campaignId)}/brief`}
          className={styles.secondaryLink}
          data-testid="journey-open-brief"
          data-control-id="FLOW-open-brief"
        >
          Open full brief
        </Link>
        <Link
          href={nextHref ?? journeyHref(journey.campaign.campaignId, journey.campaign.scenarioVersion, 'creative')}
          className={styles.primaryLink}
          data-testid="journey-next-strategy"
          data-control-id="FLOW-next-creative"
        >
          {workspaceMode ? 'Open in Creative Atelier' : 'Explore the creative'}
        </Link>
        <span className={styles.muted}>Reading only — the effect of the choice is explained in the provided creative explanations.</span>
      </div>
    </section>
  );
}
