import type { ReactNode } from 'react';
import styles from './poc.module.css';

export type BadgeTone = 'neutral' | 'mock' | 'success' | 'error' | 'info';

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span className={styles.badge} data-tone={tone}>
      <span className={styles.badgeDot} aria-hidden="true" />
      {children}
    </span>
  );
}
