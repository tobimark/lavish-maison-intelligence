import { Suspense } from 'react';
import type { Metadata } from 'next';

import { AppShell } from '../../components/shell/AppShell';
import { RadarPage } from '../../components/product/radar/RadarPage';
import { StateBlock } from '../../components/poc';

export const metadata: Metadata = {
  title: 'Intelligence Radar · MAISON INTELLIGENCE',
  description: 'Explore the prepared fragrance signals, evidence, trends and the opportunities they inspire. Demo / mock data only.',
};

export default function RadarRoute() {
  return (
    <AppShell breadcrumb={[{ label: 'MAISON INTELLIGENCE' }, { label: 'Intelligence Radar' }]}>
      <Suspense fallback={<StateBlock kind="loading" title="Loading Intelligence Radar" body="Reading the prepared fragrance signals and trends." />}>
        <RadarPage />
      </Suspense>
    </AppShell>
  );
}
