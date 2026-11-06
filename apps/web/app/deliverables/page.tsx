import { Suspense } from 'react';
import type { Metadata } from 'next';

import { AppShell } from '../../components/shell/AppShell';
import { DeliverablesPage } from '../../components/product/deliverables/DeliverablesPage';
import { NavigationGuard } from '../../components/product/NavigationGuard';
import { StateBlock } from '../../components/poc';

export const metadata: Metadata = {
  title: 'Deliverables · MAISON INTELLIGENCE',
  description: 'Download campaign briefs, scripts, subtitles and static storyboards as real content packs. Demo / mock data only.',
};

export default function DeliverablesRoute() {
  return (
    <AppShell breadcrumb={[{ label: 'MAISON INTELLIGENCE' }, { label: 'Deliverables' }]}>
      <Suspense fallback={<StateBlock kind="loading" title="Loading Deliverables" body="Reading the prepared content packages and local export history." />}>
        <NavigationGuard>
          <DeliverablesPage />
        </NavigationGuard>
      </Suspense>
    </AppShell>
  );
}
