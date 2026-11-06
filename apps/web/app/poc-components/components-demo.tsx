'use client';

import { useEffect, useRef, useState } from 'react';

import {
  Badge,
  Button,
  Input,
  Overlay,
  ReplayControls,
  Select,
  StateBlock,
  Stepper,
  Tabs,
  Textarea,
  ToastRegion,
  type StepperStep,
  type ToastMessage,
} from '../../components/poc';
import styles from './page.module.css';

const steps: StepperStep[] = [
  { id: 'discovery', label: 'Discovery', meta: 'Signals and trends', state: 'completed' },
  { id: 'analysis', label: 'Analysis & script', meta: 'Brief and script', state: 'current' },
  { id: 'video', label: 'Script to video', meta: 'Preview and asset check', state: 'future' },
  { id: 'delivery', label: 'Automated delivery', meta: 'Simulated delivery record', state: 'future' },
];

const fieldOptions = [
  { value: 'en', label: 'English (EN)' },
  { value: 'ar', label: 'Arabic (AR)' },
];

export function ComponentsDemo() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [fieldValue, setFieldValue] = useState('Sample value');
  const [selectValue, setSelectValue] = useState('en');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState<1 | 2 | 4>(1);
  const [cursor, setCursor] = useState(4);
  const toastTimer = useRef<number | null>(null);
  const toastSequence = useRef(0);
  const dialogTrigger = useRef<HTMLButtonElement | null>(null);
  const drawerTrigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!replayPlaying) return;
    const timer = window.setInterval(() => {
      setCursor((current) => {
        if (current >= 21) {
          setReplayPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 500);
    return () => window.clearInterval(timer);
  }, [replayPlaying]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const pushToast = (message: string, tone: ToastMessage['tone'] = 'neutral') => {
    toastSequence.current += 1;
    const id = `toast-${toastSequence.current}`;
    setToasts((current) => [...current, { id, message, tone }].slice(-3));
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    if (tone !== 'error') {
      toastTimer.current = window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 3200);
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    window.requestAnimationFrame(() => dialogTrigger.current?.focus());
  };
  const closeDrawer = () => {
    setDrawerOpen(false);
    window.requestAnimationFrame(() => drawerTrigger.current?.focus());
  };

  return (
    <>
      <section className={styles.section} aria-labelledby="controls-title">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} id="controls-title">Controls</h2>
          <p className={styles.sectionNote}>Button, field, select and tab states. Focus rings use the shared focus token.</p>
        </div>
        <div className={styles.demoGrid}>
          <div className={styles.demoColumn}>
            <p className={styles.demoLabel}>Button</p>
            <div className={styles.actions}>
              <Button variant="primary" size="primary" data-testid="button-primary">Primary action</Button>
              <Button variant="secondary" data-testid="button-secondary">Secondary</Button>
              <Button variant="ghost" data-testid="button-ghost">Text action</Button>
            </div>
            <div className={styles.actions}>
              <Button
                variant="primary"
                pending={pending}
                data-testid="button-pending"
                onClick={() => {
                  setPending(true);
                  window.setTimeout(() => setPending(false), 1400);
                }}
              >
                Save sample
              </Button>
              <Button disabled data-testid="button-disabled">Disabled</Button>
              <Button size="small" variant="secondary" data-testid="button-small">Small</Button>
            </div>
            <p className={styles.sectionNote}>Pending keeps width, sets <span className={styles.code}>aria-busy</span> and blocks a second click.</p>
          </div>
          <div className={styles.demoColumn}>
            <p className={styles.demoLabel}>Fields</p>
            <Input
              label="Field label"
              hint="Supporting help text stays visible."
              value={fieldValue}
              onChange={(event) => setFieldValue(event.target.value)}
              data-testid="input-default"
            />
            <Input
              label="Required field"
              required
              error="Enter a value to continue."
              defaultValue=""
              data-testid="input-error"
            />
            <div className={styles.demoGrid}>
              <Select
                label="Language"
                options={fieldOptions}
                value={selectValue}
                onChange={(event) => setSelectValue(event.target.value)}
                data-testid="select-language"
              />
              <Input label="Disabled field" disabled defaultValue="Read only sample" data-testid="input-disabled" />
            </div>
          </div>
        </div>
        <hr className={styles.divider} />
        <div className={styles.demoGrid}>
          <div className={styles.demoColumn}>
            <p className={styles.demoLabel}>Tabs · keyboard: arrows, Home, End</p>
            <Tabs
              items={[
                { id: 'brief', label: 'Brief', panel: 'Brief panel content. Switching tabs must not discard a draft.' },
                { id: 'script', label: 'Script', panel: 'Script panel content. Technical placeholder only.' },
                { id: 'versions', label: 'Versions', panel: 'Version list panel. Technical placeholder only.' },
              ]}
              label="Sample sections"
            />
          </div>
          <div className={styles.demoColumn}>
            <p className={styles.demoLabel}>Textarea and Arabic sample</p>
            <Textarea label="Draft note" defaultValue="Neutral technical sample text." rows={3} data-testid="textarea-sample" />
            <div className={styles.arabicSample} lang="ar" dir="rtl">
              <p>نموذج نص عربي للتحقق من اتجاه الكتابة وارتفاع السطر.</p>
              <p className={styles.arabicMeta} dir="ltr" lang="en">Arabic sample · 16/1.8 · zero tracking · <bdi>LV-001</bdi> stays LTR.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="status-title">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} id="status-title">Status, stepper and replay</h2>
          <p className={styles.sectionNote}>Status never relies on colour alone; stepper exposes aria-current; replay uses sequence, not wall time.</p>
        </div>
        <div className={styles.actions} data-testid="badge-row">
          <Badge tone="mock">Mock / Demo</Badge>
          <Badge tone="neutral">Preset source</Badge>
          <Badge tone="success">Ready</Badge>
          <Badge tone="error">Needs attention</Badge>
          <Badge tone="info">Simulated render</Badge>
        </div>
        <div style={{ marginTop: 16 }}>
          <Stepper steps={steps} />
        </div>
        <div style={{ marginTop: 16 }}>
          <ReplayControls
            playing={replayPlaying}
            speed={replaySpeed}
            cursorSequence={cursor}
            totalSequences={21}
            onPlay={() => {
              if (cursor >= 21) setCursor(0);
              setReplayPlaying(true);
            }}
            onPause={() => setReplayPlaying(false)}
            onStep={() => setCursor((current) => Math.min(21, current + 1))}
            onRestart={() => {
              setReplayPlaying(false);
              setCursor(0);
            }}
            onSeek={(sequence) => {
              setReplayPlaying(false);
              setCursor(sequence);
            }}
            onSpeed={(speed) => setReplaySpeed(speed)}
          />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="overlay-title">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} id="overlay-title">Overlays and feedback</h2>
          <p className={styles.sectionNote}>Dialog and Drawer share one portal, focus trap, Escape, scroll lock and return-focus primitive.</p>
        </div>
        <div className={styles.demoGrid}>
          <div className={styles.demoColumn}>
            <p className={styles.demoLabel}>Dialog · light form surface</p>
            <Button
              ref={dialogTrigger}
              variant="primary"
              className={styles.startButton}
              onClick={() => setDialogOpen(true)}
              data-testid="dialog-open"
            >
              Open dialog
            </Button>
            <p className={styles.sectionNote}>Opening moves focus into the dialog; Escape closes and returns focus to this button.</p>
          </div>
          <div className={styles.demoColumn}>
            <p className={styles.demoLabel}>Drawer · right side</p>
            <Button
              ref={drawerTrigger}
              variant="secondary"
              className={styles.startButton}
              onClick={() => setDrawerOpen(true)}
              data-testid="drawer-open"
            >
              Open drawer
            </Button>
            <p className={styles.sectionNote}>Dirty data confirmation is a page-level concern; this preview verifies the overlay primitive.</p>
          </div>
          <div className={styles.demoColumn}>
            <p className={styles.demoLabel}>Toast</p>
            <div className={styles.actions}>
              <Button size="small" onClick={() => pushToast('Sample saved locally.', 'success')} data-testid="toast-add">Show toast</Button>
              <Button size="small" variant="secondary" onClick={() => pushToast('Sample failure retained for review.', 'error')} data-testid="toast-add-error">Show error</Button>
            </div>
            <p className={styles.sectionNote}>At most three visible; status text is announced and can be dismissed.</p>
          </div>
          <div className={styles.demoColumn}>
            <p className={styles.demoLabel}>Empty / Error</p>
            <StateBlock
              kind="empty"
              title="No records yet"
              body="A short reason and one action, without invented sample rows."
              action={<Button size="small" variant="secondary">Sample action</Button>}
            />
            <StateBlock
              kind="error"
              title="Preview unavailable"
              body="The context remains visible; retry or return without losing the draft."
              action={<Button size="small" variant="secondary">Try again</Button>}
            />
          </div>
        </div>
      </section>

      <Overlay
        open={dialogOpen}
        onClose={closeDialog}
        variant="dialog"
        title="Sample dialog"
        description="A neutral form surface for a future confirmation. No customer data is entered here."
        testId="poc-dialog"
        footer={
          <>
            <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
            <Button variant="primary" onClick={closeDialog}>Confirm sample</Button>
          </>
        }
      >
        <div className={styles.demoColumn}>
          <Input label="Sample field" defaultValue="Technical sample" />
          <Select label="Sample select" options={fieldOptions} defaultValue="en" />
          <Textarea label="Sample note" defaultValue="This dialog traps Tab/Shift+Tab and closes on Escape." rows={3} />
        </div>
      </Overlay>

      <Overlay
        open={drawerOpen}
        onClose={closeDrawer}
        variant="drawer"
        title="Sample drawer"
        description="Detail surface up to 480px on desktop and full width on mobile."
        testId="poc-drawer"
        footer={
          <>
            <Button variant="secondary" onClick={closeDrawer}>Close</Button>
            <Button variant="primary" onClick={closeDrawer}>Save sample</Button>
          </>
        }
      >
        <div className={styles.demoColumn}>
          <Badge tone="mock">Mock / Demo</Badge>
          <p className={styles.sectionNote}>
            The drawer shares the same overlay primitive as the dialog: background is inert, body scroll is
            locked, Escape closes it and focus returns to the trigger.
          </p>
          <Input label="Sample detail" defaultValue="Read-only sample value" readOnly />
          <StateBlock kind="loading" title="Loading sample" body="Skeleton keeps the panel layout stable." />
        </div>
      </Overlay>

      <ToastRegion toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </>
  );
}
