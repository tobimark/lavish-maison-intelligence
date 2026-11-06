import type { RefObject } from 'react';

import { MenuIcon } from './icons';
import { Breadcrumbs, type ShellBreadcrumb } from './Breadcrumbs';
import styles from './shell.module.css';

type HeaderProps = {
  breadcrumb: ShellBreadcrumb[];
  menuOpen: boolean;
  onOpenMenu: () => void;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
};

export function Header({ breadcrumb, menuOpen, onOpenMenu, menuButtonRef }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button
          ref={menuButtonRef}
          type="button"
          className={styles.menuButton}
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          aria-controls="shell-sidebar"
          data-testid="shell-menu-button"
          data-control-id="SHELL-mobile-open"
        >
          <MenuIcon size={20} />
        </button>
        <Breadcrumbs items={breadcrumb} />
      </div>
      <div className={styles.headerRight}>
        <span className={styles.demoBadge} data-testid="shell-demo-badge">
          <span className={styles.demoDot} aria-hidden="true" />
          Demo · Mock data
        </span>
      </div>
    </header>
  );
}
