import { NextResponse } from 'next/server';
import { appUrl } from '@/lib/integrations/google';
import { zoomAuthUrl, zoomOAuthConfigured } from '@/lib/integrations/zoom-user';
import { newOAuthState } from '@/lib/live-user';
import { currentPersona } from '@/lib/persona';

// Live test: sends the signed-in person to Zoom to link their own account.
export const dynamic = 'force-dynamic';

export async function GET() {
  const p = currentPersona();
  if (!p.userId.startsWith('live-')) return NextResponse.redirect(`${appUrl()}/live?error=sign_in_first`);
  if (!zoomOAuthConfigured()) return NextResponse.redirect(`${appUrl()}/me/start?error=zoom_not_configured`);
  return NextResponse.redirect(zoomAuthUrl(await newOAuthState('zoom', p.userId)));
}
