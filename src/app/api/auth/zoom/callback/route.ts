import { NextResponse } from 'next/server';
import { linkLiveZoom } from '@/lib/live-meetings';
import { exchangeZoomCode, zoomCallbackHome, zoomOAuthConfigured } from '@/lib/integrations/zoom-user';
import { takeOAuthState } from '@/lib/live-user';

// Live test: Zoom returns here through the tunnel, without this app's cookies, so the person is
// found by the one-time state saved when they pressed "Link Zoom".
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const home = zoomCallbackHome();
  const fail = (error: string) => NextResponse.redirect(`${home}?error=${error}`);
  if (!zoomOAuthConfigured()) return fail('zoom_not_configured');
  const row = await takeOAuthState(url.searchParams.get('state'), 'zoom');
  if (!row?.userId) return fail('state');
  const code = url.searchParams.get('code');
  if (!code) return fail('zoom_cancelled');
  try {
    const { tokens, me } = await exchangeZoomCode(code);
    await linkLiveZoom(row.userId, tokens, me);
    return NextResponse.redirect(`${home}?done=zoom`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[zoom] link failed:', message);
    const scope = /missing the scope (.+?)\. Add it/.exec(message)?.[1];
    return scope ? NextResponse.redirect(`${home}?error=zoom_scope&scope=${encodeURIComponent(scope)}`) : fail('zoom_failed');
  }
}
