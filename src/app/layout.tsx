import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { currentPersona } from '@/lib/persona';
import './app.css';

export const metadata: Metadata = {
  title: 'Coaching companion · bts Studio',
  description: 'Coaching Session Companion prototype. Synthetic data only.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const persona = currentPersona();
  return (
    <html lang="en">
      <head>
        {/* BTS Studio: tokens first, then the component stylesheet (copied by scripts/sync-ds.mjs). */}
        <link rel="stylesheet" href="/ds/tokens.css" />
        <link rel="stylesheet" href="/ds/components/bundle.css" />
      </head>
      <body>
        <AppHeader persona={persona} />
        {children}
      </body>
    </html>
  );
}
