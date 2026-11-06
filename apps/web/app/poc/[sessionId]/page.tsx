import type { Metadata } from 'next';

import { AppShell } from '../../../components/shell/AppShell';
import { SessionFrameRouter } from '../../../components/poc/SessionFrameRouter';
import type { WorkflowStep, WorkflowView } from '../../../components/poc/WorkflowFrame';

export const metadata: Metadata = {
  title: 'Demo workflow · MAISON INTELLIGENCE',
  description: 'Mock four-step Lavish AI Marketing workflow. Demo only; no live platform is connected.',
};

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PocSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { sessionId } = await params;
  const query = await searchParams;
  const step = single(query.step);
  const view = single(query.view);

  return (
    <AppShell
      breadcrumb={[
        { label: 'MAISON INTELLIGENCE' },
        { label: 'Lavish AI', href: '/' },
        { label: 'Demo session' },
      ]}
    >
      <SessionFrameRouter sessionId={decodeURIComponent(sessionId)} initialStep={step as WorkflowStep} initialView={view as WorkflowView} />
    </AppShell>
  );
}
