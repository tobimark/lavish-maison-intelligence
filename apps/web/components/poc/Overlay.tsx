'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import styles from './poc.module.css';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  variant: 'dialog' | 'drawer';
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  testId: string;
}

export function Overlay({ open, onClose, variant, title, description, children, footer, testId }: OverlayProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const closeHandler = useRef(onClose);
  closeHandler.current = onClose;
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const inertTargets = [
      ...['shell-sidebar', 'shell-main'].map((id) => document.getElementById(id)),
      document.querySelector('header'),
    ].filter((element): element is HTMLElement => element instanceof HTMLElement);
    inertTargets.forEach((element) => element.setAttribute('inert', ''));

    const focusables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (element) => element.offsetParent !== null && !element.hasAttribute('disabled'),
      );

    const frame = window.requestAnimationFrame(() => {
      closeRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeHandler.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        panel?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      inertTargets.forEach((element) => element.removeAttribute('inert'));
      const trigger = triggerRef.current;
      if (trigger && document.contains(trigger)) trigger.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={[styles.backdrop, variant === 'drawer' ? styles.drawerBackdrop : ''].filter(Boolean).join(' ')}
      data-drawer={variant === 'drawer' ? 'true' : 'false'}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      data-testid={`${testId}-backdrop`}
    >
      <div
        ref={panelRef}
        className={variant === 'drawer' ? styles.drawer : styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        data-testid={testId}
        tabIndex={-1}
      >
        <header className={styles.overlayHeader}>
          <div>
            <h2 className={styles.overlayTitle} id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className={styles.overlayDescription} id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.overlayClose}
            aria-label="Close"
            onClick={onClose}
            data-testid={`${testId}-close`}
          >
            ×
          </button>
        </header>
        <div className={styles.overlayBody}>{children}</div>
        {footer ? <footer className={styles.overlayFooter}>{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
