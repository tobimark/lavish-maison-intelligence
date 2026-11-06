'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { Button, Overlay, StateBlock } from '../poc';
import styles from './workspace.module.css';

export interface EditorGuard {
  /** True while the editor/drawer holds an unsaved change. */
  isDirty: () => boolean;
  /** Persist the change. Return true only when it is safe to leave. */
  save: () => Promise<boolean>;
  /** Throw away the unsaved change and restore the saved snapshot. */
  discard: () => void;
  /** Human-readable description of the pending change. */
  describe?: () => string;
}

interface PendingNavigation {
  label: string;
  action: () => void;
}

interface NavigationGuardContextValue {
  register: (guard: EditorGuard | null) => void;
  requestLeave: (action: () => void, label?: string) => boolean;
  isDirty: () => boolean;
}

const NavigationGuardContext = createContext<NavigationGuardContextValue | null>(null);

export function useNavigationGuard(): NavigationGuardContextValue {
  const context = useContext(NavigationGuardContext);
  if (!context) throw new Error('useNavigationGuard must be used inside <NavigationGuard>.');
  return context;
}

/**
 * Site-wide unsaved-change protection. Explicit Save/Discard/Cancel is offered
 * before internal links (sidebar/breadcrumb/cross-workspace links) navigate, and
 * before the browser unloads the page. Browsing itself is not affected.
 */
export function NavigationGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const guardRef = useRef<EditorGuard | null>(null);
  const [pending, setPending] = useState<PendingNavigation | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const register = useCallback((guard: EditorGuard | null) => {
    guardRef.current = guard;
  }, []);

  const isDirty = useCallback(() => Boolean(guardRef.current?.isDirty()), []);

  const requestLeave = useCallback((action: () => void, label = 'Leave this page') => {
    if (guardRef.current?.isDirty()) {
      setSaveError('');
      setPending({ label, action });
      return false;
    }
    action();
    return true;
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (!guardRef.current?.isDirty()) return;
      event.preventDefault();
      event.stopPropagation();
      setSaveError('');
      setPending({
        label: `Leave to ${url.pathname === '/' ? 'Overview' : url.pathname}`,
        action: () => router.push(`${url.pathname}${url.search}${url.hash}`),
      });
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [router]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!guardRef.current?.isDirty()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const value: NavigationGuardContextValue = { register, requestLeave, isDirty };

  const finish = () => {
    const action = pending?.action;
    setPending(null);
    setSaving(false);
    if (action) action();
  };

  const handleSave = async () => {
    const guard = guardRef.current;
    if (!guard) {
      finish();
      return;
    }
    setSaving(true);
    setSaveError('');
    const saved = await guard.save();
    if (!saved) {
      setSaving(false);
      setSaveError('The change could not be saved. Your edit is still open; retry Save or keep editing.');
      return;
    }
    finish();
  };

  const handleDiscard = () => {
    guardRef.current?.discard();
    finish();
  };

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}
      <Overlay
        open={Boolean(pending)}
        onClose={() => {
          if (saving) return;
          setPending(null);
          setSaveError('');
        }}
        variant="dialog"
        title="Save changes before leaving?"
        description={pending?.label ?? 'You have unsaved changes in this workspace.'}
        testId="guard-dialog"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setPending(null); setSaveError(''); }} data-testid="guard-cancel" data-control-id="GUARD-cancel">
              Keep editing
            </Button>
            <Button variant="ghost" onClick={handleDiscard} data-testid="guard-discard" data-control-id="GUARD-discard">
              Discard changes
            </Button>
            <Button variant="primary" pending={saving} onClick={() => void handleSave()} data-testid="guard-save" data-control-id="GUARD-save">
              Save and leave
            </Button>
          </>
        }
      >
        <div className={styles.guardBody}>
          <p className={styles.muted}>
            Save creates a new immutable version in this browser. Discard restores the last saved version and cannot be undone.
          </p>
          {saveError ? (
            <div className={styles.guardError} role="alert">
              <StateBlock kind="error" title="Save failed" body={saveError} />
            </div>
          ) : null}
        </div>
      </Overlay>
    </NavigationGuardContext.Provider>
  );
}
