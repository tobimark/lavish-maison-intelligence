'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Badge, Button, StateBlock } from '../../poc';
import { getBrowserApi } from '../../poc/browser-api';
import { ProvidedCampaignAssets } from '../shared/ProvidedAssets';
import type { CampaignView } from '../../../demo/poc/api/product-contract';
import styles from '../workspace.module.css';

export function CampaignBriefPage() {
  const params = useParams<{ campaignId: string }>();
  const campaignId = decodeURIComponent(params?.campaignId ?? '');
  const [view, setView] = useState<CampaignView | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await getBrowserApi().getCampaign({ campaignId });
    if (!result.ok) {
      setError(`${result.error.code}: ${result.error.message}`);
      setView(null);
    } else {
      setView(result.data);
    }
    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <StateBlock kind="loading" title="Loading campaign brief" body="Reading the prepared brief, product facts and creative direction." />;
  if (error || !view) {
    return (
      <StateBlock
        kind="error"
        title="Campaign brief unavailable"
        body={error || 'The requested campaign brief does not exist.'}
        action={<Button variant="secondary" onClick={() => void load()}>Try again</Button>}
      />
    );
  }

  const { brief, campaign, analysis } = view;
  return (
    <div className={styles.page} data-testid="campaign-brief-page">
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Campaign brief</p>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>{brief.name}</h1>
            <p className={styles.lede}>{brief.objective}</p>
          </div>
          <Badge tone="mock">Demo / Mock data</Badge>
        </div>
      </header>

      <ProvidedCampaignAssets campaignId={campaignId} variant="brief" />

      <section className={styles.card} aria-label="Campaign brief details">
        <div className={styles.cardBody}>
          <div className={styles.briefGrid}>
            <div className={styles.briefField}>
              <span className={styles.briefLabel}>Product focus</span>
              <p className={styles.briefValue}>{campaign.products.map((product) => product.officialName).join(' · ')}</p>
              <p className={styles.muted}>SKU {campaign.products.map((product) => product.sku).join(' · ')}</p>
            </div>
            <div className={styles.briefField}>
              <span className={styles.briefLabel}>Audience & markets</span>
              <p className={styles.briefValue}>{brief.markets.join(' · ')}</p>
              <p className={styles.muted}>{brief.audience}</p>
            </div>
            <div className={styles.briefField}>
              <span className={styles.briefLabel}>Creative angle</span>
              <p className={styles.briefValue}>{brief.concept}</p>
              <p className={styles.muted}>{brief.tone}</p>
            </div>
            <div className={styles.briefField}>
              <span className={styles.briefLabel}>Channels & languages</span>
              <p className={styles.briefValue}>{brief.channels.join(' · ')}</p>
              <p className={styles.muted}>{brief.languages.map((language) => language.toUpperCase()).join(' / ')}</p>
            </div>
            <div className={styles.briefField}>
              <span className={styles.briefLabel}>Key message</span>
              <p className={styles.briefValue}>{brief.keyMessage}</p>
            </div>
            <div className={styles.briefField}>
              <span className={styles.briefLabel}>Call to action</span>
              <p className={styles.briefValue}>{brief.cta}</p>
            </div>
          </div>
          <div className={styles.disclosure}>
            <span aria-hidden="true">i</span>
            <span>Why this opportunity: {analysis.recommendation}</span>
          </div>
          <div className={styles.cardActions}>
            <Link className={styles.link} href={`/atelier?campaignId=${encodeURIComponent(campaignId)}&tab=copy`} data-testid="brief-open-atelier" data-control-id="AS-BRIEF-ATELIER">
              Open in Creative Atelier
            </Link>
            <Link className={styles.link} href={`/opportunities/${encodeURIComponent(view.campaign.opportunityId)}`} data-testid="brief-open-opportunity">
              View opportunity rationale
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
