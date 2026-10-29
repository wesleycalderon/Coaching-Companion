import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { currentPersona, LIVE_PREFIX } from '@/lib/persona';
import './app.css';

export const metadata: Metadata = {
  title: 'Coaching companion · bts Studio',
  description: 'Coaching Session Companion prototype. Synthetic data only.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const persona = currentPersona();
  // Live test: the signed-in person was removed (for example by resetting the demo data).
  if (persona.id.startsWith(LIVE_PREFIX) && !(await db.user.findUnique({ where: { id: persona.userId }, select: { id: true } }))) redirect('/api/auth/signed-out');
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
