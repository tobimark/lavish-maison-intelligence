import type { ReactNode } from 'react';
import styles from './poc.module.css';

export interface StateBlockProps {
  kind: 'empty' | 'error' | 'loading';
  title: string;
  body: string;
  action?: ReactNode;
}

export function StateBlock({ kind, title, body, action }: StateBlockProps) {
  if (kind === 'loading') {
    return (
      <div className={styles.stateBlock} data-tone="neutral" aria-busy="true" aria-live="polite">
        <div className={styles.skeletonStack} aria-hidden="true" style={{ width: '100%' }}>
          <div className={styles.skeleton} data-width="short" />
          <div className={styles.skeleton} data-width="medium" />
          <div className={styles.skeleton} />
        </div>
        <span className={styles.stateTitle}>{title}</span>
        <p className={styles.stateBody}>{body}</p>
      </div>
    );
  }
  return (
    <div className={styles.stateBlock} data-tone={kind === 'error' ? 'error' : 'neutral'}>
      <span className={styles.stateIcon} aria-hidden="true">
        {kind === 'error' ? '!' : '◇'}
      </span>
      <span className={styles.stateTitle}>{title}</span>
      <p className={styles.stateBody}>{body}</p>
      {action ? <div className={styles.stateActions}>{action}</div> : null}
    </div>
  );
}
