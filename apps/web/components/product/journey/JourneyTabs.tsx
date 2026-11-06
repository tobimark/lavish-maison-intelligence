'use client';

import Link from 'next/link';

import { JOURNEY_STAGES, journeyHref, type JourneyStage } from './journey-utils';
import styles from './journey.module.css';

interface Props {
  campaignId: string;
  scenarioVersion: string;
  /** null when the URL carries an unknown stage (no tab is marked active). */
  activeStage: JourneyStage | null;
}

/**
 * Four real links, not a locking wizard. Any stage can be opened directly,
 * refreshed or reached from another stage; aria-current marks the reading
 * position only (never a completion state).
 */
export function JourneyTabs({ campaignId, scenarioVersion, activeStage }: Props) {
  return (
    <nav className={styles.tabs} aria-label="Campaign journey stages" data-testid="journey-tabs">
      <ol className={styles.tabList}>
        {JOURNEY_STAGES.map((stage) => {
          const active = stage.id === activeStage;
          return (
            <li key={stage.id} className={styles.tabItem}>
              <Link
                href={journeyHref(campaignId, scenarioVersion, stage.id)}
                className={`${styles.tab} ${active ? styles.tabActive : ''}`}
                aria-current={active ? 'page' : undefined}
                data-testid={`journey-tab-${stage.id}`}
                data-control-id={`FLOW-stage-${stage.id}`}
              >
                <span className={styles.tabIndex} aria-hidden="true">{stage.index}</span>
                <span className={styles.tabLabel}>{stage.label}</span>
                <span className={styles.tabPurpose}>{stage.purpose}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
