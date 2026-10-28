import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { renderBlocks } from '@/lib/companion/slack';
import { buildView } from '@/lib/companion/view';

// Development only: the Slack Block Kit JSON for a coachee's messages, to check or paste into
// Slack's Block Kit Builder. /api/dev/slack-blocks?coachee=priya
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') return new Response('Not found', { status: 404 });
  const coachee = new URL(req.url).searchParams.get('coachee') ?? 'priya';
  const messages = await db.companionMessage.findMany({ where: { recipientId: coachee }, orderBy: { sentAt: 'asc' } });
  const out = await Promise.all(messages.map(async (m) => ({ id: m.id, kind: m.kind, text: m.text, blocks: renderBlocks(await buildView(m)) })));
  return NextResponse.json(out);
}
