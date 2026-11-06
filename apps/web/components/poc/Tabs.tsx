'use client';

import { useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import styles from './poc.module.css';

export interface TabItem {
  id: string;
  label: string;
  panel: ReactNode;
}

export function Tabs({ items, initialId, label = 'Sections' }: { items: TabItem[]; initialId?: string; label?: string }) {
  const [activeId, setActiveId] = useState(initialId ?? items[0]?.id ?? '');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = Math.max(0, items.findIndex((item) => item.id === activeId));
  const active = items[activeIndex];

  const focusIndex = (index: number) => {
    const bounded = (index + items.length) % items.length;
    setActiveId(items[bounded].id);
    tabRefs.current[bounded]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusIndex(activeIndex + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusIndex(activeIndex - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusIndex(items.length - 1);
    }
  };

  return (
    <div className={styles.tabs}>
      <div className={styles.tabList} role="tablist" aria-label={label}>
        {items.map((item, index) => (
          <button
            key={item.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`poc-tab-${item.id}`}
            aria-controls={`poc-tabpanel-${item.id}`}
            aria-selected={item.id === activeId}
            tabIndex={item.id === activeId ? 0 : -1}
            className={styles.tab}
            onClick={() => setActiveId(item.id)}
            onKeyDown={onKeyDown}
          >
            {item.label}
          </button>
        ))}
      </div>
      {active ? (
        <div
          className={styles.tabPanel}
          role="tabpanel"
          id={`poc-tabpanel-${active.id}`}
          aria-labelledby={`poc-tab-${active.id}`}
          tabIndex={0}
        >
          {active.panel}
        </div>
      ) : null}
    </div>
  );
}
