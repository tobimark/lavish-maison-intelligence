import type { Metadata } from 'next';

import { AppShell } from '../../components/shell/AppShell';
import { ComponentsDemo } from './components-demo';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Shared components · MAISON INTELLIGENCE',
  description:
    'Internal POC-007 preview of shared interaction components: controls, fields, tabs, stepper, overlays, toasts and empty/error states. TEST_ONLY technical page.',
};

export default function PocComponentsPage() {
  return (
    <AppShell
      breadcrumb={[
        { label: 'MAISON INTELLIGENCE' },
        { label: 'Internal component preview' },
      ]}
    >
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>POC-007 · INTERNAL COMPONENT PREVIEW · DEMO / TEST_ONLY</p>
          <h1 className={styles.title}>Shared interaction components</h1>
          <p className={styles.lede}>
            One neutral technical surface for the controls that the four-step workflow will reuse. The page
            exercises states and keyboard behaviour only; it does not call the Mock API or represent customer
            content.
          </p>
          <p className={styles.metaRow}>
            <span>Mock / Demo only</span>
            <span>No customer data</span>
            <span>Tokens: design/tokens.css</span>
            <span>Shell: TASK-007</span>
          </p>
        </header>
        <ComponentsDemo />
      </div>
    </AppShell>
  );
}
