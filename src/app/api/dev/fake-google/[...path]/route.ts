import { fakeStore, liveFakeOn } from '@/lib/dev/live-fake';

// Development only: stands in for Google Calendar's events.list (calendar/v3/calendars/primary/events).
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!liveFakeOn()) return new Response('Not found', { status: 404 });
  const items = fakeStore().meetings.map((m) => ({
    id: m.id, status: 'confirmed', summary: m.title, location: `https://us02web.zoom.us/j/${m.zoomId}?pwd=fake`,
    start: { dateTime: m.start.toISOString() }, end: { dateTime: m.end.toISOString() },
    attendees: [{ email: 'tester@livetest.example', self: true, responseStatus: 'accepted' }, ...m.attendees.map((a) => ({ ...a, responseStatus: 'accepted' }))],
  }));
  return Response.json({ timeZone: 'America/Chicago', items });
}
