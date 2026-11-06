import { Suspense } from 'react';
import type { Metadata } from 'next';

import { AppShell } from '../../../../components/shell/AppShell';
import { JourneyPage } from '../../../../components/product/journey/JourneyPage';
import { NavigationGuard } from '../../../../components/product/NavigationGuard';
import { StateBlock } from '../../../../components/poc';

export const metadata: Metadata = {
  title: 'Campaign journey · MAISON INTELLIGENCE',
  description: 'Follow one prepared Lavish campaign from market insight to campaign idea, creative development and a simulated social post. Demo / mock data only.',
};

export default function CampaignJourneyRoute() {
  return (
    <AppShell
      breadcrumb={[
        { label: 'MAISON INTELLIGENCE' },
        { label: 'Overview', href: '/' },
        { label: 'Campaign journey' },
      ]}
    >
      <Suspense
        fallback={
          <StateBlock
            kind="loading"
            title="Loading the campaign journey"
            body="Reading the prepared insight, campaign idea, creative assets and social presets for this exact campaign version."
          />
        }
      >
        <NavigationGuard>
          <JourneyPage />
        </NavigationGuard>
      </Suspense>
    </AppShell>
  );
}
