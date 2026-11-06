import { Suspense } from 'react';
import type { Metadata } from 'next';

import { AppShell } from '../../components/shell/AppShell';
import { OpportunitiesPage } from '../../components/product/opportunities/OpportunitiesPage';
import { StateBlock } from '../../components/poc';

export const metadata: Metadata = {
  title: 'Opportunities · MAISON INTELLIGENCE',
  description: 'Three prepared Lavish marketing opportunities with recommendation, evidence and campaign briefs.',
};

export default function OpportunitiesRoute() {
  return (
    <AppShell breadcrumb={[{ label: 'MAISON INTELLIGENCE' }, { label: 'Opportunities' }]}>
      <Suspense fallback={<StateBlock kind="loading" title="Loading opportunities" body="Reading the prepared opportunity analyses and briefs." />}>
        <OpportunitiesPage />
      </Suspense>
    </AppShell>
  );
}
