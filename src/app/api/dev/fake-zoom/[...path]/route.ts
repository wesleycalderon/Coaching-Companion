import { FAKE_ZOOM_NAME, fakeStore, fakeUuid, fakeVtt, liveFakeOn } from '@/lib/dev/live-fake';

// Development only: stands in for Zoom's API (users/me, past meeting instances, meeting transcripts,
// users/me/recordings) and transcript downloads.
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  if (!liveFakeOn()) return new Response('Not found', { status: 404 });
  if (req.headers.get('authorization') !== 'Bearer fake-zoom-token') return new Response('Unauthorized', { status: 401 });
  const path = params.path.join('/');
  const origin = new URL(req.url).origin;
  if (path === 'users/me') return Response.json({ id: 'zoom-fake-user', email: 'tester@livetest.example', display_name: FAKE_ZOOM_NAME });
  if (path === 'users/me/recordings') {
    const meetings = fakeStore().meetings.filter((m) => m.recorded && m.end.getTime() <= Date.now()).map((m) => ({
      id: Number(m.zoomId), uuid: `uuid-${m.id}`, topic: m.title, start_time: m.start.toISOString(),
      recording_files: m.transcriptReady ? [{ file_type: 'MP4', status: 'completed' }, { file_type: 'TRANSCRIPT', status: 'completed', download_url: `${origin}/api/dev/fake-zoom/transcript/${m.id}` }] : [{ file_type: 'MP4', status: 'completed' }],
    }));
    return Response.json({ meetings });
  }
  // Like Zoom: instances are listed only for recurring meetings (none here), and a one-off
  // meeting's past details carry its UUID.
  if (/^past_meetings\/\d+\/instances$/.test(path)) return Response.json({ meetings: [] });
  const past = /^past_meetings\/(\d+)$/.exec(path);
  if (past) {
    const m = fakeStore().meetings.find((x) => x.zoomId === past[1] && x.end.getTime() <= Date.now());
    if (!m) return Response.json({ code: 3001, message: 'Meeting does not exist.' }, { status: 404 });
    return Response.json({ uuid: fakeUuid(m), id: Number(m.zoomId), topic: m.title, start_time: m.start.toISOString(), end_time: m.end.toISOString() });
  }
  // Zoom expects a UUID with a slash encoded twice; the router decodes once.
  const mt = /^meetings\/([^/]+)\/transcript$/.exec(path);
  if (mt) {
    const m = fakeStore().meetings.find((x) => encodeURIComponent(fakeUuid(x)) === mt[1]);
    if (!m || !m.transcriptReady || !m.meetingTranscript) return Response.json({ code: 3322, message: 'This meeting transcript does not exist.' }, { status: 404 });
    return Response.json({ meeting_id: m.zoomId, meeting_topic: m.title, can_download: true, download_url: `${origin}/api/dev/fake-zoom/transcript/${m.id}` });
  }
  const t = /^transcript\/(.+)$/.exec(path);
  const m = t && fakeStore().meetings.find((x) => x.id === t[1]);
  if (m) return new Response(fakeVtt(m), { headers: { 'content-type': 'text/vtt' } });
  return new Response('Not found', { status: 404 });
}
