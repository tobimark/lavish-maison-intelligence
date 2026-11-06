import { Suspense } from 'react';
import type { Metadata } from 'next';

import { AppShell } from '../../components/shell/AppShell';
import { AtelierPage } from '../../components/product/atelier/AtelierPage';
import { NavigationGuard } from '../../components/product/NavigationGuard';
import { StateBlock } from '../../components/poc';

export const metadata: Metadata = {
  title: 'Creative Atelier · MAISON INTELLIGENCE',
  description: 'Read the prepared English and Arabic campaign results, storyboards and saved versions, then edit on request.',
};

export default function AtelierRoute() {
  return (
    <AppShell breadcrumb={[{ label: 'MAISON INTELLIGENCE' }, { label: 'Creative Atelier' }]}>
      <Suspense fallback={<StateBlock kind="loading" title="Loading Creative Atelier" body="Reading campaign briefs, scripts and static storyboards." />}>
        <NavigationGuard>
          <AtelierPage />
        </NavigationGuard>
      </Suspense>
    </AppShell>
  );
}
