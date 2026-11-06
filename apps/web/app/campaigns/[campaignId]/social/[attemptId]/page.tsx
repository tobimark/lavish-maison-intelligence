import { Suspense } from 'react';
import type { Metadata } from 'next';

import { AppShell } from '../../../../../components/shell/AppShell';
import { SocialAttemptDetail } from '../../../../../components/product/journey/social/SocialAttemptDetail';
import { StateBlock } from '../../../../../components/poc';

export const metadata: Metadata = {
  title: 'Simulated social post · MAISON INTELLIGENCE',
  description: 'Read the immutable internal snapshot of a simulated Instagram video post. No content was sent to Instagram.',
};

export default async function SocialAttemptRoute({
  params,
}: {
  params: Promise<{ campaignId: string; attemptId: string }>;
}) {
  const { campaignId, attemptId } = await params;
  return (
    <AppShell
      breadcrumb={[
        { label: 'MAISON INTELLIGENCE' },
        { label: 'Simulated social post' },
      ]}
    >
      <Suspense
        fallback={<StateBlock kind="loading" title="Loading simulated post" body="Reading the immutable local simulation record." />}
      >
        <SocialAttemptDetail
          campaignId={decodeURIComponent(campaignId)}
          attemptId={decodeURIComponent(attemptId)}
        />
      </Suspense>
    </AppShell>
  );
}
