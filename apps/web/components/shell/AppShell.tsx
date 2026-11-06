'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { Header } from './Header';
import { Sidebar, type ShellNavItem } from './Sidebar';
import type { ShellBreadcrumb } from './Breadcrumbs';
import styles from './shell.module.css';

const SIDEBAR_STORAGE_KEY = 'maison-intelligence:shell:sidebar-collapsed';
const MOBILE_QUERY = '(max-width: 880px)';
const COMPACT_QUERY = '(max-width: 1170px)';

const NAV_ITEMS: readonly ShellNavItem[] = [
  { id: 'overview', label: 'Overview', href: '/', icon: 'home' },
  { id: 'radar', label: 'Intelligence Radar', href: '/radar', icon: 'radar' },
  { id: 'opportunities', label: 'Opportunities', href: '/opportunities', icon: 'opportunities' },
  { id: 'atelier', label: 'Creative Atelier', href: '/atelier', icon: 'atelier' },
  { id: 'library', label: 'Creative Library', href: '/library', icon: 'library' },
  { id: 'deliverables', label: 'Deliverables', href: '/deliverables', icon: 'deliverables' },
];

type AppShellProps = {
  children: ReactNode;
  breadcrumb: ShellBreadcrumb[];
};

type SidebarQuery = { get(name: string): string | null };

function navItemsForContext(searchParams: SidebarQuery): readonly ShellNavItem[] {
  const campaignId = searchParams.get('campaignId');
  const scenarioVersion = searchParams.get('scenarioVersion');
  const language = searchParams.get('language');
  if (!campaignId && !scenarioVersion && !language) return NAV_ITEMS;

  return NAV_ITEMS.map((item) => {
    const next = new URLSearchParams();
    if (campaignId) next.set('campaignId', campaignId);
    if (scenarioVersion) next.set('scenarioVersion', scenarioVersion);
    if (language && (item.id === 'atelier' || item.id === 'library' || item.id === 'deliverables')) {
      next.set('language', language);
    }
    const suffix = next.toString();
    return { ...item, href: suffix ? `${item.href}?${suffix}` : item.href };
  });
}

type ReactiveSidebarProps = {
  pathname: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
  sidebarRef: RefObject<HTMLElement | null>;
  inert: boolean;
};

/**
 * The sidebar links must follow any query change, including a router.replace()
 * on the same pathname (Library Campaign select). useSearchParams is the
 * reactive source; keeping it in this small child confines the required
 * Suspense boundary to the sidebar instead of the whole application shell.
 */
function ReactiveSidebar({ pathname, ...props }: ReactiveSidebarProps) {
  const searchParams = useSearchParams();
  const navItems = useMemo(() => navItemsForContext(searchParams), [searchParams]);
  return <Sidebar navItems={navItems} currentPath={pathname} {...props} />;
}

export function AppShell({ children, breadcrumb }: AppShellProps) {
  const pathname = usePathname() ?? '/';
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // WS-001/WS-FIX-001: the sidebar context is derived from Next's reactive
  // search params in ReactiveSidebar below; no polling, storage or history
  // monkey-patching is used.

  const sidebarRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const storedPreference = useRef<boolean | null>(null);

  // Restore the stored sidebar preference (or the responsive default) after
  // hydration. Rendering the same expanded shell on the server and the first
  // client pass keeps the layout stable and hydration-safe.
  useEffect(() => {
    const mobileQuery = window.matchMedia(MOBILE_QUERY);
    const compactQuery = window.matchMedia(COMPACT_QUERY);

    try {
      const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (stored === 'true' || stored === 'false') {
        storedPreference.current = stored === 'true';
        setCollapsed(storedPreference.current);
      } else if (compactQuery.matches) {
        setCollapsed(true);
      }
    } catch {
      // localStorage unavailable: keep the stable expanded default below 1170px.
      if (compactQuery.matches) setCollapsed(true);
    }

    const syncMobile = () => setIsMobile(mobileQuery.matches);
    syncMobile();

    const handleMobileChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
      if (!event.matches) setMenuOpen(false);
    };
    const handleCompactChange = (event: MediaQueryListEvent) => {
      if (storedPreference.current === null && !mobileQuery.matches) {
        setCollapsed(event.matches);
      }
    };

    mobileQuery.addEventListener('change', handleMobileChange);
    compactQuery.addEventListener('change', handleCompactChange);
    return () => {
      mobileQuery.removeEventListener('change', handleMobileChange);
      compactQuery.removeEventListener('change', handleCompactChange);
    };
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      storedPreference.current = next;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // Storage unavailable: the in-memory preference still works for this view.
      }
      return next;
    });
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  const openMenu = useCallback(() => setMenuOpen(true), []);

  // Mobile menu: lock background scroll, move focus into the drawer, trap Tab,
  // close on Escape and return focus to the trigger.
  useEffect(() => {
    if (!menuOpen) return;

    const sidebar = sidebarRef.current;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.offsetParent !== null && !element.hasAttribute('disabled'));

    const frame = window.requestAnimationFrame(() => {
      focusables()[0]?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
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
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [menuOpen, closeMenu]);

  return (
    <div className={styles.app}>
      <a className={styles.skipLink} href="#shell-main">
        Skip to content
      </a>

      <Suspense
        fallback={(
          <Sidebar
            navItems={NAV_ITEMS}
            currentPath={pathname}
            collapsed={collapsed}
            mobileOpen={menuOpen}
            onToggleCollapsed={toggleCollapsed}
            onCloseMobile={closeMenu}
            sidebarRef={sidebarRef}
            inert={isMobile && !menuOpen}
          />
        )}
      >
        <ReactiveSidebar
          pathname={pathname}
          collapsed={collapsed}
          mobileOpen={menuOpen}
          onToggleCollapsed={toggleCollapsed}
          onCloseMobile={closeMenu}
          sidebarRef={sidebarRef}
          inert={isMobile && !menuOpen}
        />
      </Suspense>

      {menuOpen ? (
        <div className={styles.backdrop} onClick={closeMenu} aria-hidden="true" data-testid="shell-backdrop" />
      ) : null}

      <div className={styles.workspace} inert={isMobile && menuOpen ? true : undefined}>
        <Header
          breadcrumb={breadcrumb}
          menuOpen={menuOpen}
          onOpenMenu={openMenu}
          menuButtonRef={menuButtonRef}
        />
        <main id="shell-main" className={styles.main} tabIndex={-1}>
          <div className={styles.content}>{children}</div>
        </main>
      </div>
    </div>
  );
}
