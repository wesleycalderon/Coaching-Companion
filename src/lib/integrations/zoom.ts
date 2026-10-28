// Automatic transcript capture from the BTS Zoom account (HANDOFF: v1 capture is post-session
// transcripts from a BTS-controlled Zoom account). Zoom calls our webhook when a cloud
// recording's transcript is ready; we download the VTT and run the same pipeline as an upload.
//
// Zoom webhook contract used here (verify against Zoom's docs before go-live):
//  - every request carries x-zm-request-timestamp and x-zm-signature = "v0=" + HMAC-SHA256
//    (secret token, "v0:{timestamp}:{raw body}") in hex
//  - endpoint.url_validation: reply { plainToken, encryptedToken: HMAC-SHA256(secret, plainToken) }
//  - recording.transcript_completed: payload.object.id is the meeting ID; recording_files[]
//    has file_type "TRANSCRIPT" with a download_url, fetched with the event's download_token
//
// STUB: BTS Studio engineering. Production needs a queue (Zoom wants a reply within three
// seconds), retries, Zoom OAuth for the BTS account, and storage of the event IDs to drop replays.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { analyzeTranscript } from '../ai/pipeline';
import { db } from '../db';

export const SYSTEM_ACTOR = 'companion';
const MAX_SKEW_SECONDS = 300;

export const zoomSecret = () => process.env.ZOOM_WEBHOOK_SECRET_TOKEN || null;
export const zoomSimulatorOn = () => process.env.NODE_ENV !== 'production' && process.env.ZOOM_SIMULATOR === 'true' && Boolean(zoomSecret());

const hmac = (secret: string, message: string) => createHmac('sha256', secret).update(message).digest('hex');

export function signZoomRequest(secret: string, timestamp: string, rawBody: string) {
  return `v0=${hmac(secret, `v0:${timestamp}:${rawBody}`)}`;
}

export function verifyZoomRequest(secret: string, timestamp: string | null, signature: string | null, rawBody: string, nowSeconds = Date.now() / 1000): boolean {
  if (!timestamp || !signature) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > MAX_SKEW_SECONDS) return false;
  const expected = Buffer.from(signZoomRequest(secret, timestamp, rawBody));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function urlValidationResponse(secret: string, plainToken: string) {
  return { plainToken, encryptedToken: hmac(secret, plainToken) };
}

interface RecordingFile { file_type?: string; status?: string; download_url?: string }
export interface ZoomEvent {
  event: string;
  event_ts?: number;
  download_token?: string;
  payload?: { plainToken?: string; object?: { id?: number | string; uuid?: string; recording_files?: RecordingFile[] } };
}

/** Only Zoom's own hosts, or this app's simulator route in local development. */
function allowedDownload(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol === 'https:' && (u.hostname === 'zoom.us' || u.hostname.endsWith('.zoom.us'))) return true;
    return zoomSimulatorOn() && (u.hostname === 'localhost' || u.hostname === '127.0.0.1') && u.pathname.startsWith('/api/dev/zoom-recording/');
  } catch {
    return false;
  }
}

/** Handle recording.transcript_completed. Returns a short status for the log. */
export async function handleTranscriptCompleted(evt: ZoomEvent): Promise<string> {
  const meetingId = evt.payload?.object?.id;
  if (meetingId === undefined) return 'ignored: no meeting id';
  const session = await db.session.findUnique({ where: { meetingId: String(meetingId) } });
  if (!session) return `ignored: meeting ${meetingId} isn't a coaching session`;
  const file = evt.payload?.object?.recording_files?.find((f) => f.file_type === 'TRANSCRIPT' && f.download_url);
  if (!file?.download_url) return 'ignored: no transcript file';
  if (!allowedDownload(file.download_url)) return 'rejected: download URL is not a Zoom host';

  const res = await fetch(file.download_url, { headers: evt.download_token ? { Authorization: `Bearer ${evt.download_token}` } : {} });
  if (!res.ok) return `failed: download returned ${res.status}`;
  const content = await res.text();
  const result = await analyzeTranscript({ sessionId: session.id, actorId: SYSTEM_ACTOR, source: 'zoom', fileName: 'zoom-transcript.vtt', content });
  return 'error' in result ? `not analyzed: ${result.error}` : `analyzed session ${session.id}`;
}

/** Turn parsed segments back into a Zoom-style VTT file (used by the local simulator). */
export function toVtt(segs: Array<{ start: string; end: string; speakerName: string; text: string }>): string {
  const ts = (t: string) => {
    const parts = t.split(':').map(Number);
    const secs = parts.reduce((acc, n) => acc * 60 + n, 0);
    const pad = (n: number, w = 2) => String(n).padStart(w, '0');
    return `${pad(Math.floor(secs / 3600))}:${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}.000`;
  };
  return ['WEBVTT', '', ...segs.flatMap((s, i) => [String(i + 1), `${ts(s.start)} --> ${ts(s.end)}`, `${s.speakerName}: ${s.text}`, ''])].join('\n');
}
