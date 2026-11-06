import { Suspense } from 'react';
import type { Metadata } from 'next';

import { AppShell } from '../../../components/shell/AppShell';
import { OpportunityDetailPage } from '../../../components/product/opportunities/OpportunityDetailPage';
import { StateBlock } from '../../../components/poc';

export const metadata: Metadata = {
  title: 'Opportunity · MAISON INTELLIGENCE',
  description: 'Read the prepared recommendation, rationale, evidence and campaign brief for a Lavish marketing opportunity.',
};

export default async function OpportunityDetailRoute({ params }: { params: Promise<{ opportunityId: string }> }) {
  const { opportunityId } = await params;
  return (
    <AppShell breadcrumb={[{ label: 'MAISON INTELLIGENCE' }, { label: 'Opportunities', href: '/opportunities' }, { label: 'Strategy detail' }]}>
      <Suspense fallback={<StateBlock kind="loading" title="Loading opportunity" body="Reading the prepared recommendation and evidence." />}>
        <OpportunityDetailPage opportunityId={decodeURIComponent(opportunityId)} />
      </Suspense>
    </AppShell>
  );
}
