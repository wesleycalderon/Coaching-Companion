import { NextResponse } from 'next/server';
import { appUrl, googleAuthUrl, googleConfigured } from '@/lib/integrations/google';
import { newOAuthState } from '@/lib/live-user';

// Live test: sends the person to Google to sign in and allow read-only calendar access.
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!googleConfigured()) return NextResponse.redirect(`${appUrl()}/live?error=google_not_configured`);
  return NextResponse.redirect(googleAuthUrl(await newOAuthState('google')));
}
