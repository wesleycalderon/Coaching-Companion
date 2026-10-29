import { NextResponse } from 'next/server';
import { appUrl } from '@/lib/integrations/google';
import { PERSONA_COOKIE } from '@/lib/persona';

// Live test: the signed-in person no longer exists (the demo data was reset). Forget them and
// send them to the live test page to sign in again.
export const dynamic = 'force-dynamic';

export async function GET() {
  const res = NextResponse.redirect(`${appUrl()}/live?error=signed_out`);
  res.cookies.set(PERSONA_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
