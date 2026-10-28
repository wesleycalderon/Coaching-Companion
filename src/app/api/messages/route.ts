import { NextResponse } from 'next/server';

// Microsoft Teams (or Agents Playground) posts every activity here. The Teams SDK checks the
// sign-in token and routes it to the handlers in src/lib/companion/teams.ts.
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (process.env.TEAMS_ENABLED !== 'true') return new Response('Not found', { status: 404 });
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => { headers[key] = value; });
  // Without app credentials nothing checks who is calling, so only accept calls made on this
  // computer (Agents Playground), never through a tunnel. Next.js fills x-forwarded-* from the
  // caller's address; tunnels pass on the outside caller's address and host.
  const loopback = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
  const local = ['::1', '127.0.0.1', '::ffff:127.0.0.1'].includes(headers['x-forwarded-for'] ?? '::1')
    && loopback.test(headers['x-forwarded-host'] ?? headers.host ?? '') && loopback.test(headers.host ?? '');
  const { teamsCredentials } = await import('@/lib/companion/send');
  if (!teamsCredentials().clientId && !local) return NextResponse.json({ error: 'Teams credentials are not set up' }, { status: 401 });
  const { handleTeamsRequest } = await import('@/lib/companion/teams');
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Expected a JSON activity' }, { status: 400 });
  const res = await handleTeamsRequest(body, headers);
  return res.body === undefined ? new Response(null, { status: res.status }) : NextResponse.json(res.body, { status: res.status });
}
