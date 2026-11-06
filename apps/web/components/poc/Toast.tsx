'use client';

import styles from './poc.module.css';

export interface ToastMessage {
  id: string;
  message: string;
  tone?: 'neutral' | 'success' | 'error';
}

export function ToastRegion({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  return (
    <div className={styles.toastRegion} aria-live="polite" aria-atomic="false" data-testid="toast-region">
      {toasts.slice(0, 3).map((toast) => (
        <div key={toast.id} className={styles.toast} data-tone={toast.tone ?? 'neutral'} role="status" data-testid={`toast-${toast.id}`}>
          <span className={styles.toastText}>{toast.message}</span>
          <button type="button" className={styles.toastClose} aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
