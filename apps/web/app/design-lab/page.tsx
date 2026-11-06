import type { Metadata } from 'next';

import { DesignLabPage } from './design-lab-page';

export const metadata: Metadata = {
  title: 'Design lab · MAISON INTELLIGENCE',
  description:
    'Internal visual baseline: type scale, colour tokens, spacing, bilingual typography and interaction states. Demo only.',
};

export default function Page() {
  return <DesignLabPage />;
}
