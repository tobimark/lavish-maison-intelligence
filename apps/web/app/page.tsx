import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AppShell } from '../components/shell/AppShell';
import { Overview } from '../components/product/Overview';
import { StateBlock } from '../components/poc';

export const metadata: Metadata = {
  title: 'Overview · MAISON INTELLIGENCE',
  description: 'Explore prepared Lavish marketing opportunities and campaign-ready content. Demo / mock data only.',
};

export default function HomePage() {
  return (
    <AppShell breadcrumb={[{ label: 'MAISON INTELLIGENCE' }, { label: 'Overview' }]}>
      <Suspense fallback={<StateBlock kind="loading" title="Loading Overview" body="Reading the current Lavish case." />}>
        <Overview />
      </Suspense>
    </AppShell>
  );
}
