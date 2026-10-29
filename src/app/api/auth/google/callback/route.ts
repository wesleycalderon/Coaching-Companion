import { NextResponse } from 'next/server';
import { appUrl, exchangeGoogleCode, googleConfigured } from '@/lib/integrations/google';
import { takeOAuthState, upsertLiveUser } from '@/lib/live-user';
import { LIVE_PREFIX, PERSONA_COOKIE } from '@/lib/persona';

// Live test: Google returns here after sign-in. Creates or updates the person, links their
// calendar, and signs them in to the prototype as themselves.
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fail = (error: string) => NextResponse.redirect(`${appUrl()}/live?error=${error}`);
  if (!googleConfigured()) return fail('google_not_configured');
  if (url.searchParams.get('error')) return fail('google_cancelled');
  if (!(await takeOAuthState(url.searchParams.get('state'), 'google'))) return fail('state');
  const code = url.searchParams.get('code');
  if (!code) return fail('google_failed');
  try {
    const { tokens, profile, calendarGranted } = await exchangeGoogleCode(code);
    if (!calendarGranted) return fail('calendar_not_granted');
    const userId = await upsertLiveUser(profile, tokens);
    const res = NextResponse.redirect(`${appUrl()}/me/start`);
    res.cookies.set(PERSONA_COOKIE, `${LIVE_PREFIX}${userId}`, { path: '/', sameSite: 'lax', httpOnly: true });
    return res;
  } catch (e) {
    console.error('[google] sign-in failed:', e instanceof Error ? e.message : e);
    return fail('google_failed');
  }
}
