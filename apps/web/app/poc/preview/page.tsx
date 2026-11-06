import type { Metadata } from 'next';

import { AppShell } from '../../../components/shell/AppShell';
import { WorkflowFrame, type WorkflowStep, type WorkflowView } from '../../../components/poc/WorkflowFrame';

export const metadata: Metadata = {
  title: 'Four-step layout preview · MAISON INTELLIGENCE',
  description: 'Composition-only preview of the four-step workflow. Not a started scenario; no content is present.',
};

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PocPreviewPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await searchParams;
  return (
    <AppShell
      breadcrumb={[
        { label: 'MAISON INTELLIGENCE' },
        { label: 'Lavish AI', href: '/' },
        { label: 'Preview' },
      ]}
    >
      <WorkflowFrame
        sessionId="preview"
        preview
        scenarioId={single(query.scenarioId)}
        initialStep={single(query.step) as WorkflowStep}
        initialView={single(query.view) as WorkflowView}
      />
    </AppShell>
  );
}
