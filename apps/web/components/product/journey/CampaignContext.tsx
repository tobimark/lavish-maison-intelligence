'use client';

import { Badge } from '../../poc';
import type { CampaignJourney } from '../../../demo/poc/api/flow-contract';
import { campaignProductImage, firstSentence, productNames } from './journey-utils';
import styles from './journey.module.css';

/**
 * Persistent campaign context: the campaign name, a small SERENITY photograph,
 * one line of core idea and the Demo · Mock badge stay visible across all four
 * stages so switching reading positions never loses the case.
 *
 * No technical ids, hashes or versions are shown in the primary reading area.
 */
export function CampaignContext({ journey }: { journey: CampaignJourney }) {
  const image = campaignProductImage(journey);
  const coreIdea = firstSentence(journey.opportunity.brief.concept);
  return (
    <header className={styles.context} data-testid="journey-context">
      <div className={styles.contextIdentity}>
        {image ? (
          /* eslint-disable-next-line @next/next/no-img-element -- provided, user-supplied internal demo asset */
          <img
            className={styles.contextImage}
            src={image}
            alt="SERENITY product photograph"
            data-testid="journey-product-image"
          />
        ) : null}
        <div className={styles.contextBody}>
          <p className={styles.eyebrow}>Campaign journey · {productNames(journey)}</p>
          <h1 className={styles.contextTitle} data-testid="journey-campaign-name">{journey.campaign.name}</h1>
          <p className={styles.contextIdea}>{coreIdea}</p>
        </div>
      </div>
      <div className={styles.contextMeta}>
        <Badge tone="mock">Demo · Mock</Badge>
        <span className={styles.contextProduct}>{journey.campaign.products.map((product) => product.officialName).join(' · ')}</span>
      </div>
    </header>
  );
}
