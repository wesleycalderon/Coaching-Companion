// Development only: a fake Google Calendar and a fake Zoom, so the live-test flow can be tested
// end to end without real accounts. On only when LIVE_FAKE=true outside production.

export const liveFakeOn = () => process.env.NODE_ENV !== 'production' && process.env.LIVE_FAKE === 'true';

export interface FakeMeeting { id: string; zoomId: string; title: string; start: Date; end: Date; attendees: Array<{ email: string; displayName: string }>; lines: Array<[string, string]>; transcriptReady: boolean; recorded: boolean; meetingTranscript: boolean }

const g = globalThis as unknown as { __liveFake?: { meetings: FakeMeeting[] } };
export const fakeStore = () => (g.__liveFake ??= { meetings: [] });

export const FAKE_ZOOM_NAME = 'Test Person (Zoom)';

export function fakeVtt(m: FakeMeeting) {
  const ts = (s: number) => `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.000`;
  return ['WEBVTT', '', ...m.lines.flatMap(([who, text], i) => [String(i + 1), `${ts(i * 20)} --> ${ts(i * 20 + 18)}`, `${who}: ${text}`, ''])].join('\n');
}

/** A past-meeting instance UUID with a slash, so the double-encoding path is exercised. */
export const fakeUuid = (m: FakeMeeting) => `/${m.id}+abc==`;
