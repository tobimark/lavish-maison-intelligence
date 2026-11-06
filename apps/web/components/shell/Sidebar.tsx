import type { RefObject } from 'react';

import { navActiveForPath } from '../product/shared/workspace-routes';
import {
  AtelierIcon,
  CloseIcon,
  DeliverablesIcon,
  HomeIcon,
  LibraryIcon,
  OpportunitiesIcon,
  PanelLeftIcon,
  RadarIcon,
} from './icons';
import styles from './shell.module.css';

export type ShellNavIcon = 'home' | 'radar' | 'opportunities' | 'atelier' | 'library' | 'deliverables';

export type ShellNavItem = {
  id: 'overview' | 'radar' | 'opportunities' | 'atelier' | 'library' | 'deliverables';
  label: string;
  href: string;
  icon: ShellNavIcon;
};

type SidebarProps = {
  navItems: readonly ShellNavItem[];
  currentPath: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
  sidebarRef: RefObject<HTMLElement | null>;
  inert: boolean;
};

function NavIcon({ icon }: { icon: ShellNavItem['icon'] }) {
  if (icon === 'radar') return <RadarIcon size={18} />;
  if (icon === 'opportunities') return <OpportunitiesIcon size={18} />;
  if (icon === 'atelier') return <AtelierIcon size={18} />;
  if (icon === 'library') return <LibraryIcon size={18} />;
  if (icon === 'deliverables') return <DeliverablesIcon size={18} />;
  return <HomeIcon size={18} />;
}

export function Sidebar({
  navItems,
  currentPath,
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
  sidebarRef,
  inert,
}: SidebarProps) {
  const collapseLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar';

  return (
    <aside
      id="shell-sidebar"
      ref={sidebarRef}
      className={styles.sidebar}
      aria-label="Workspace navigation"
      data-collapsed={collapsed}
      data-mobile-open={mobileOpen}
      inert={inert || undefined}
      aria-hidden={inert || undefined}
    >
      <div className={styles.brand}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, no optimisation needed */}
        <img
          className={styles.logo}
          src="/brand/lavish-logo-primary-294x294-rgb.png"
          alt="Lavish Perfumes official logo"
          width={44}
          height={44}
        />
        <div className={styles.brandText}>
          <strong>MAISON INTELLIGENCE</strong>
          <span>by Lavish Perfumes</span>
        </div>
        <button
          type="button"
          className={styles.mobileClose}
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          data-testid="shell-menu-close"
          data-control-id="SHELL-mobile-close"
        >
          <CloseIcon size={18} />
        </button>
      </div>

      <nav className={styles.nav} aria-label="Primary">
        <p className={styles.navGroupLabel}>Workspace</p>
        <ul className={styles.navList}>
          {navItems.map((item) => {
            const isCurrent = navActiveForPath(item.id, currentPath);

            return (
              <li key={item.id}>
                <a
                  href={item.href}
                  className={`${styles.navItem} ${isCurrent ? styles.navItemActive : ''}`}
                  aria-current={isCurrent ? 'page' : undefined}
                  data-testid={`shell-nav-${item.id}`}
                  data-control-id={`NAV-${item.id}`}
                >
                  <NavIcon icon={item.icon} />
                  <span className={styles.navText}>
                    <span className={styles.navLabel}>{item.label}</span>
                  </span>
                  <span className={styles.tooltip} aria-hidden="true">
                    {item.label}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.sidebarFooter}>
        <button
          type="button"
          className={styles.collapseButton}
          onClick={onToggleCollapsed}
          aria-label={collapseLabel}
          aria-expanded={!collapsed}
          aria-controls="shell-sidebar"
          title={collapseLabel}
          data-testid="shell-collapse"
          data-control-id="SHELL-collapse"
        >
          <PanelLeftIcon size={18} />
          <span className={styles.collapseLabel}>{collapseLabel}</span>
          <span className={styles.tooltip} aria-hidden="true">
            {collapseLabel}
          </span>
        </button>
        <p className={styles.footerNote}>Interactive mock product · Demo data</p>
      </div>
    </aside>
  );
}
