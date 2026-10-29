import { agree } from '@/lib/companion-setup';
import { FAKE_ZOOM_NAME, fakeStore, liveFakeOn } from '@/lib/dev/live-fake';
import { linkLiveZoom, refreshLiveNow, runLiveMeetings } from '@/lib/live-meetings';
import { setLiveActions, upsertLiveUser } from '@/lib/live-user';

// Development only: drives the live-test flow against the fake Google and Zoom.
//  ?do=setup                       a signed-in test person with actions, agreement and Zoom
//  ?do=meeting&in=30&mins=1[&guest] a meeting starting in N seconds, with a meeting transcript
//                                  after it ends. &recorded adds a cloud recording; &recording_only
//                                  has only the recording; &nothing has neither
//  ?do=run                         run the live job now
export const dynamic = 'force-dynamic';

const USER = 'live-fake-tester';

export async function GET(req: Request) {
  if (!liveFakeOn()) return new Response('Not found', { status: 404 });
  const url = new URL(req.url);
  const action = url.searchParams.get('do');
  if (action === 'setup') {
    const id = await upsertLiveUser({ sub: 'fake-tester', email: 'tester@livetest.example', name: 'Test Person' }, { access_token: 'fake-google-token', refresh_token: 'fake', expires_in: 86_400 * 30 });
    await setLiveActions(id, ["When someone brings me a problem, I'll ask a question before suggesting a fix."]);
    await agree(id);
    await linkLiveZoom(id, { access_token: 'fake-zoom-token', refresh_token: 'fake', expires_in: 86_400 * 30 }, { id: 'zoom-fake-user', email: 'tester@livetest.example', displayName: FAKE_ZOOM_NAME });
    return Response.json({ ok: true, userId: id, cookie: `cc_persona=live:${id}` });
  }
  if (action === 'meeting') {
    const start = new Date(Date.now() + Number(url.searchParams.get('in') ?? 30) * 1000);
    const end = new Date(start.getTime() + Number(url.searchParams.get('mins') ?? 1) * 60_000);
    const guest = url.searchParams.has('guest');
    const n = fakeStore().meetings.length + 1;
    fakeStore().meetings.push({
      id: `fake-${n}`, zoomId: String(81234567800 + n), title: guest ? `Project sync ${n}` : `Solo practice ${n}`, start, end, transcriptReady: true, recorded: url.searchParams.has('recorded') || url.searchParams.has('recording_only'), meetingTranscript: !url.searchParams.has('recording_only') && !url.searchParams.has('nothing'),
      attendees: guest ? [{ email: 'sam@livetest.example', displayName: 'Sam Osei' }] : [],
      lines: [
        [FAKE_ZOOM_NAME, 'Thanks for joining. What would you like to get out of the next half hour?'],
        ...(guest ? [['Sam Osei', 'I want to sort out the release plan, it keeps slipping.'] as [string, string]] : []),
        [FAKE_ZOOM_NAME, 'Before I jump in with ideas, what have you already tried, and what got in the way?'],
        ...(guest ? [['Sam Osei', 'We tried cutting scope but nobody agreed on what to cut.'] as [string, string]] : []),
        [FAKE_ZOOM_NAME, 'Okay. I think we should just freeze the scope on Friday and move on.'],
      ],
    });
    await refreshLiveNow(USER);
    return Response.json({ ok: true, meetings: fakeStore().meetings.map((m) => ({ id: m.id, title: m.title, start: m.start, end: m.end })) });
  }
  if (action === 'coach') {
    // As if you pressed "Talk it through" on the latest feedback, then replied in the thread.
    const { db } = await import('@/lib/db');
    const { respond } = await import('@/lib/companion/respond');
    const slack = await import('@/lib/companion/slack');
    const m = await db.companionMessage.findFirst({ where: { recipientId: USER, kind: 'meeting_feedback' }, orderBy: { sentAt: 'desc' } });
    if (!m) return Response.json({ error: 'No feedback yet' });
    const r = await respond(m.id, { choice: 'coach' });
    if ('error' in r) return Response.json(r);
    await slack.openCoachingThread(m.id);
    const reply = url.searchParams.get('reply');
    const after = await db.companionMessage.findUniqueOrThrow({ where: { id: m.id } });
    if (reply && after.slackChannel && after.slackTs) {
      await slack.handleDirectMessage({ user: process.env.SLACK_TEST_USER_ID, text: reply, ts: `${Date.now() / 1000}`, thread_ts: after.slackTs, channel: after.slackChannel });
    }
    const conv = await db.coachingConversation.findFirst({ where: { coacheeId: USER }, orderBy: { startedAt: 'desc' }, include: { turns: { orderBy: { createdAt: 'asc' } } } });
    return Response.json({ conversation: conv?.id, thread: conv?.slackThreadTs, turns: conv?.turns.map((t) => `${t.role}: ${t.text.slice(0, 300)}`) });
  }
  if (action === 'answer') {
    // As if you pressed a button on the latest message of a kind (e.g. live_notice off).
    const { db } = await import('@/lib/db');
    const { respond } = await import('@/lib/companion/respond');
    const m = await db.companionMessage.findFirst({ where: { recipientId: USER, kind: url.searchParams.get('kind') ?? '' }, orderBy: { sentAt: 'desc' } });
    if (!m) return Response.json({ error: 'No such message' });
    return Response.json(await respond(m.id, { choice: url.searchParams.get('choice') ?? '' }));
  }
  if (action === 'run') return Response.json({ log: await runLiveMeetings(true) });
  return new Response('Use ?do=setup, ?do=meeting or ?do=run', { status: 400 });
}
