import type { Metadata } from 'next';

import { AppShell } from '../../components/shell/AppShell';
import styles from './shell-preview.module.css';

export const metadata: Metadata = {
  title: 'Shell preview · MAISON INTELLIGENCE',
  description:
    'Internal QA preview of the shared workspace shell: sidebar, header, breadcrumbs and content container. Demo only.',
};

export default function ShellPreviewPage() {
  return (
    <AppShell
      breadcrumb={[
        { label: 'MAISON INTELLIGENCE' },
        { label: 'Internal shell preview' },
      ]}
    >
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>INTERNAL SHELL PREVIEW · DEMO</p>
          <h1 className={styles.title}>Unified workspace shell</h1>
          <p className={styles.lede}>
            Shared sidebar, header, breadcrumbs and content container for the Lavish Perfumes
            intelligence workspace. This internal QA page validates the shell only; Home,
            Intelligence Radar and Creative Atelier business screens are not part of TASK-007.
          </p>
        </header>

        <section className={styles.section} aria-labelledby="content-sample-title">
          <h2 className={styles.sectionTitle} id="content-sample-title">
            Content container sample
          </h2>
          <p className={styles.body}>
            Future pages mount their content inside this container. The sample paragraphs check
            body 16/1.6, auxiliary text 14, card radius 12, hairline borders and the 38/27/16
            content insets across breakpoints.
          </p>
          <p className={styles.body}>
            The shell keeps the warm-white canvas and charcoal sidebar from the approved
            reference. Gold is reserved for the active marker and the DEMO source label; no
            business metric, product image or fabricated KPI is shown here.
          </p>
          <p className={styles.metaRow}>
            <span>Surface via --surface</span>
            <span>Content max 1700</span>
            <span>Demo data only</span>
          </p>
        </section>

        <section className={styles.section} aria-labelledby="shell-check-title">
          <h2 className={styles.sectionTitle} id="shell-check-title">
            What this preview verifies
          </h2>
          <ul className={styles.checkList}>
            <li>
              Desktop: collapse the sidebar (persisted in a dedicated localStorage key) and reload
              to confirm the preference is restored.
            </li>
            <li>
              ≤1170 px: the sidebar starts collapsed. ≤880 px: navigation becomes an overlay menu
              with Escape, close button and focus return.
            </li>
            <li>
              Only Home has a real target; Intelligence Radar and Creative Atelier stay visibly
              disabled until their tasks are implemented.
            </li>
            <li>
              DEMO stays visible in the header and the breadcrumb reflects the actual
              /shell-preview position.
            </li>
          </ul>
          <p className={styles.note}>
            Internal shell preview — not a business page. No API calls, no account controls, no
            notifications or search placeholders.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
