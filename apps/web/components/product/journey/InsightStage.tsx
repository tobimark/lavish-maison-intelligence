'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Badge, Button, Overlay } from '../../poc';
import type { CampaignJourney } from '../../../demo/poc/api/flow-contract';
import { journeyHref } from './journey-utils';
import styles from './journey.module.css';

/**
 * Stage 1 · Market insight. Leads with the authored takeaway, then 2–3 key
 * observations read from the real signals referenced by presentation.insight.
 * signalIds. Evidence is only expanded on request ("View evidence") and every
 * item is explicitly MOCK/simulated.
 */
export function InsightStage({
  journey,
  mode = 'journey',
  nextHref,
}: {
  journey: CampaignJourney;
  mode?: 'journey' | 'workspace';
  nextHref?: string;
}) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const workspaceMode = mode === 'workspace';
  const presentation = journey.presentation;
  const ready = journey.contentStatus === 'ready' && presentation !== null;

  const signalIds = ready ? presentation.insight.signalIds : journey.opportunity.signals.map((signal) => signal.id);
  const signalIdSet = new Set(signalIds);
  const signals = (ready ? journey.opportunity.signals.filter((signal) => signalIdSet.has(signal.id)) : journey.opportunity.signals)
    .slice(0, 3);

  const trendIds = ready ? presentation.insight.trendIds : journey.opportunity.trends.map((trend) => trend.id);
  const trendIdSet = new Set(trendIds);
  const trends = journey.opportunity.trends.filter((trend) => trendIdSet.has(trend.id));

  const evidenceIds = ready ? presentation.insight.evidenceIds : journey.opportunity.evidence.map((item) => item.id);
  const evidenceIdSet = new Set(evidenceIds);
  const evidence = journey.opportunity.evidence.filter((item) => evidenceIdSet.has(item.id));

  const platformFor = (signalId: string): string => {
    const signal = journey.opportunity.signals.find((candidate) => candidate.id === signalId);
    const evidenceId = signal?.evidenceIds[0];
    if (!evidenceId) return 'Simulated source';
    const item = journey.opportunity.evidence.find((candidate) => candidate.id === evidenceId);
    return item?.platform ?? 'Simulated source';
  };

  return (
    <section className={styles.stage} data-testid="journey-stage-insight" data-workspace-mode={workspaceMode || undefined} aria-labelledby="journey-insight-title">
      <div className={styles.stageHeader}>
        <p className={styles.stageEyebrow}>{workspaceMode ? 'Intelligence Radar · current case' : 'Stage 1 of 4 · Market insight'}</p>
        <h2 className={styles.stageTitle} id="journey-insight-title">
          {ready ? presentation.insight.title : 'What the simulated signals point to'}
        </h2>
        {ready ? <p className={styles.stageLede}>{presentation.insight.takeaway}</p> : null}
      </div>

      {!ready ? (
        <div className={styles.noticeWarn} data-testid="journey-pending">
          <strong>Campaign content is still being prepared for this version.</strong>
          <p>{journey.contentIssue ?? 'The authored campaign presentation is not available yet.'}</p>
          <p>The simulated source signals below are real prepared content; no marketing summary has been invented in their place.</p>
        </div>
      ) : null}

      <div className={styles.insightGrid}>
        <div className={styles.insightMain}>
          <h3 className={styles.sectionTitle}>Key observations</h3>
          {signals.length === 0 ? (
            <p className={styles.notice}>No signals are available for this campaign version.</p>
          ) : (
            <ol className={styles.observationList} data-testid="journey-observations">
              {signals.map((signal) => (
                <li className={styles.observationItem} key={signal.id} data-testid={`journey-observation-${signal.id}`}>
                  <div className={styles.observationTop}>
                    <h4 className={styles.observationTitle}>{signal.title}</h4>
                    <Badge tone="mock">Simulated signal</Badge>
                  </div>
                  <p className={styles.observationMeta}>{platformFor(signal.id)} · {signal.topic}</p>
                  <p className={styles.observationSummary}>{signal.summary}</p>
                </li>
              ))}
            </ol>
          )}
          {ready && evidence.length > 0 ? (
            <Button variant="secondary" onClick={() => setEvidenceOpen(true)} data-testid="journey-view-evidence" data-control-id="FLOW-view-evidence">
              View evidence
            </Button>
          ) : null}
        </div>

        <aside className={styles.insightAside} aria-label="Synthetic trend context">
          <h3 className={styles.sectionTitle}>Trend context</h3>
          {trends.length === 0 ? (
            <p className={styles.muted}>No trend series are available for this campaign version.</p>
          ) : (
            <div className={styles.trendList}>
              {trends.map((trend) => (
                <article className={styles.trendItem} key={trend.id} data-testid={`journey-trend-${trend.id}`}>
                  <div className={styles.observationTop}>
                    <h4 className={styles.trendTitle}>{trend.title}</h4>
                    <Badge tone="mock">Synthetic index</Badge>
                  </div>
                  <p className={styles.trendMeta}>
                    {trend.unit} · {trend.direction === 'rising' ? 'designed as rising' : trend.direction === 'stable' ? 'designed as a stable comparator' : trend.direction}
                  </p>
                  <p className={styles.observationSummary}>{trend.interpretation}</p>
                </article>
              ))}
            </div>
          )}
          <p className={styles.disclosure}>
            All signal, evidence and index values are fictional demo content authored for this workflow. No social platform was queried and no reach, growth or demand is implied.
          </p>
        </aside>
      </div>

      <div className={styles.stageActions}>
        <Link
          href={nextHref ?? journeyHref(journey.campaign.campaignId, journey.campaign.scenarioVersion, 'strategy')}
          className={styles.primaryLink}
          data-testid="journey-next-insight"
          data-control-id="FLOW-next-strategy"
        >
          {workspaceMode ? 'Review campaign idea' : 'Review the campaign idea'}
        </Link>
        <span className={styles.muted}>Reading only — opening the next stage creates nothing.</span>
      </div>

      <Overlay
        open={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
        variant="dialog"
        title="Signal evidence"
        description="Simulated MOCK sources authored for this demo. No platform API was queried."
        testId="journey-evidence-dialog"
        footer={<Button variant="secondary" onClick={() => setEvidenceOpen(false)} data-testid="journey-evidence-close">Close evidence</Button>}
      >
        <div className={styles.evidenceList}>
          {evidence.map((item) => (
            <article className={styles.evidenceItem} key={item.id} data-testid={`journey-evidence-${item.id}`}>
              <div className={styles.badgeRow}>
                <Badge tone="mock">Source type · {item.sourceType}</Badge>
                <span className={styles.tag}>{item.platform}</span>
              </div>
              <h3 className={styles.evidenceTitle}>{item.title}</h3>
              <p className={styles.observationSummary}>{item.summary}</p>
              <p className={styles.evidenceDisclosure}>{item.disclosure}</p>
            </article>
          ))}
        </div>
      </Overlay>
    </section>
  );
}
