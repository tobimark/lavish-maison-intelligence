import { Suspense } from 'react';
import type { Metadata } from 'next';

import { AppShell } from '../../components/shell/AppShell';
import { LibraryPage } from '../../components/product/library/LibraryPage';
import { StateBlock } from '../../components/poc';

export const metadata: Metadata = {
  title: 'Creative Library · MAISON INTELLIGENCE',
  description: 'Browse every prepared and saved Lavish script and storyboard in EN and AR, and export exact versions.',
};

export default function LibraryRoute() {
  return (
    <AppShell breadcrumb={[{ label: 'MAISON INTELLIGENCE' }, { label: 'Creative Library' }]}>
      <Suspense fallback={<StateBlock kind="loading" title="Loading Creative Library" body="Reading prepared and saved creative versions." />}>
        <LibraryPage />
      </Suspense>
    </AppShell>
  );
}
