import type { Metadata } from 'next';

import { AppShell } from '../../../../components/shell/AppShell';
import { CampaignBriefPage } from '../../../../components/product/brief/CampaignBriefPage';

export const metadata: Metadata = {
  title: 'Campaign brief · MAISON INTELLIGENCE',
  description: 'Read a prepared Lavish campaign brief, product focus and creative direction. Demo / mock data only.',
};

export default function CampaignBriefRoute() {
  return (
    <AppShell breadcrumb={[{ label: 'MAISON INTELLIGENCE' }, { label: 'Campaign brief' }]}>
      <CampaignBriefPage />
    </AppShell>
  );
}
