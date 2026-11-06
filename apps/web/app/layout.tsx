import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Global theme entry. The repo-root `design/tokens.css` stays the single token
// source; it is imported once here (standard CSS import, no copy, no inline
// workaround). Loading it via the root layout means every route shares the same
// token and base styles.
import '../../../design/tokens.css';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'MAISON INTELLIGENCE',
  description: 'MAISON INTELLIGENCE — Lavish Perfumes marketing intelligence workspace.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
