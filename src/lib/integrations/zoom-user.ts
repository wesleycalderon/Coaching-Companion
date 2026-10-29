// Live test: each person links their own Zoom account (a General, user-managed OAuth app), and
// the companion fetches the transcript of their cloud recording after a meeting ends.
// Endpoints used (Zoom OAuth and REST API v2):
//  - GET  https://zoom.us/oauth/authorize?response_type=code&client_id&redirect_uri&state
//  - POST https://zoom.us/oauth/token (Basic client_id:client_secret), authorization_code or
//    refresh_token; Zoom issues a new refresh token every time, so each one is saved
//  - GET  /v2/users/me
//  - Transcript without recording (preferred): GET /v2/past_meetings/{id}/instances (recurring) or
//    /v2/past_meetings/{id} (one-off) to find the instance UUID, then GET /v2/meetings/{uuid}/transcript, whose download_url is fetched with the
//    user's token. Needs the account setting "Allow meeting hosts to retain and access meeting
//    transcripts" and a meeting transcript (AI Companion) turned on in the meeting.
//  - Fallback: GET /v2/users/me/recordings?from&to and the cloud recording's TRANSCRIPT file
// STUB: BTS Studio engineering. Production needs Zoom Marketplace review, encrypted tokens and
// Zoom's recording webhooks instead of polling.

import { db } from '../db';
import { appUrl, liveTestOn } from './google';

const OAUTH = 'https://zoom.us/oauth';
// Points at the local fake Zoom in development tests (src/app/api/dev/fake-zoom).
const apiBase = () => (process.env.NODE_ENV !== 'production' && process.env.ZOOM_API_BASE) || 'https://api.zoom.us/v2';

export const zoomOAuthConfigured = () => liveTestOn() && Boolean(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET && process.env.ZOOM_REDIRECT_URL);

export function zoomAuthUrl(state: string) {
  const q = new URLSearchParams({ response_type: 'code', client_id: process.env.ZOOM_CLIENT_ID!, redirect_uri: process.env.ZOOM_REDIRECT_URL!, state });
  return `${OAUTH}/authorize?${q}`;
}

interface TokenResponse { access_token: string; refresh_token: string; expires_in: number; error?: string; reason?: string }

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const basic = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${OAUTH}/token`, { cache: 'no-store', method: 'POST', headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) });
  const json = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || json.error) throw new Error(`Zoom token request failed: ${json.reason ?? json.error ?? res.status}`);
  return json;
}

/** Zoom answers a missing scope with 400 or 401 and code 4711 ("does not contain scopes: [...]"). */
async function zoomError(res: Response): Promise<{ missingScope: string | null; detail: string }> {
  const body = (await res.json().catch(() => ({}))) as { code?: number; message?: string };
  const scopes = /scopes?:?\s*\[([^\]]+)\]/i.exec(body.message ?? '')?.[1] ?? null;
  return { missingScope: body.code === 4711 || scopes ? (scopes ?? 'unknown') : null, detail: `${res.status}${body.code ? ` (code ${body.code})` : ''}${body.message ? `: ${body.message}` : ''}` };
}

export async function exchangeZoomCode(code: string) {
  const tokens = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: process.env.ZOOM_REDIRECT_URL! });
  const res = await fetch(`${apiBase()}/users/me`, { cache: 'no-store', headers: { Authorization: `Bearer ${tokens.access_token}` } });
  if (!res.ok) {
    const e = await zoomError(res);
    throw new Error(e.missingScope ? `The Zoom app is missing the scope ${e.missingScope.split(/,\s*/).pop()}. Add it in the Zoom App Marketplace, then link Zoom again.` : `Zoom profile request failed: ${e.detail}`);
  }
  const me = (await res.json()) as { id: string; email?: string; first_name?: string; last_name?: string; display_name?: string };
  const displayName = me.display_name || [me.first_name, me.last_name].filter(Boolean).join(' ') || me.email || 'Zoom user';
  return { tokens, me: { id: me.id, email: me.email ?? '', displayName } };
}

/** A working access token for the person's linked Zoom, refreshed when it's about to expire. */
export async function zoomToken(userId: string): Promise<string | null> {
  const link = await db.accountLink.findFirst({ where: { userId, provider: 'zoom', status: 'linked', accessToken: { not: null } } });
  if (!link?.accessToken) return null;
  if (link.tokenExpiresAt && link.tokenExpiresAt.getTime() > Date.now() + 60_000) return link.accessToken;
  if (!link.refreshToken) return null;
  const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: link.refreshToken });
  await db.accountLink.update({ where: { id: link.id }, data: { accessToken: t.access_token, refreshToken: t.refresh_token, tokenExpiresAt: new Date(Date.now() + t.expires_in * 1000) } });
  return t.access_token;
}

interface RecordingFile { file_type?: string; status?: string; download_url?: string }
interface RecordingMeeting { id?: number | string; uuid?: string; start_time?: string; topic?: string; recording_files?: RecordingFile[] }

/** Only Zoom's own hosts, or the local fake Zoom in development. */
function allowedDownload(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol === 'https:' && (u.hostname === 'zoom.us' || u.hostname.endsWith('.zoom.us'))) return true;
    return process.env.NODE_ENV !== 'production' && Boolean(process.env.ZOOM_API_BASE) && (u.hostname === 'localhost' || u.hostname === '127.0.0.1') && u.pathname.startsWith('/api/dev/fake-zoom/');
  } catch {
    return false;
  }
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export type TranscriptSource = 'meeting_transcript' | 'cloud_recording';
export type TranscriptLookup =
  | { status: 'ready'; content: string; fileName: string; source: TranscriptSource }
  | { status: 'waiting'; note: string }
  | { status: 'error'; note: string };

const SIX_HOURS = 6 * 3_600_000;
const near = (iso: string | undefined, at: Date) => Math.abs(Date.parse(iso ?? '') - at.getTime());
/** Zoom wants a UUID that starts with "/" or contains "//" encoded twice. */
const encodeUuid = (uuid: string) => (uuid.startsWith('/') || uuid.includes('//') ? encodeURIComponent(encodeURIComponent(uuid)) : encodeURIComponent(uuid));

async function download(url: string, token: string, source: TranscriptSource): Promise<TranscriptLookup> {
  if (!allowedDownload(url)) return { status: 'error', note: 'The transcript link isn’t a Zoom address, so it wasn’t downloaded.' };
  const dl = await fetch(url, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
  if (!dl.ok) return { status: 'waiting', note: `Downloading the transcript returned ${dl.status}; trying again.` };
  const content = await dl.text();
  return { status: 'ready', content, fileName: content.trimStart().startsWith('WEBVTT') ? 'zoom-transcript.vtt' : 'zoom-transcript.txt', source };
}

/**
 * The meeting transcript Zoom keeps without a recording. Returns null when there's none (yet), or
 * when the app lacks the scopes, so the caller can try the cloud recording instead.
 */
async function meetingTranscript(token: string, zoomMeetingId: string, at: Date): Promise<{ found: TranscriptLookup | null; note: string }> {
  const inst = await fetch(`${apiBase()}/past_meetings/${encodeURIComponent(zoomMeetingId)}/instances`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
  if (!inst.ok) {
    const e = await zoomError(inst);
    if (e.missingScope || inst.status === 401 || inst.status === 403) return { found: null, note: `The Zoom app can’t read past meetings (missing scope ${e.missingScope ?? e.detail}). Add it, then link Zoom again.` };
    return { found: null, note: 'Zoom hasn’t listed the meeting as ended yet.' };
  }
  const { meetings = [] } = (await inst.json()) as { meetings?: Array<{ uuid?: string; start_time?: string }> };
  // Zoom lists instances only for recurring meetings; a one-off meeting's past details carry its UUID.
  if (!meetings.length) {
    const one = await fetch(`${apiBase()}/past_meetings/${encodeURIComponent(zoomMeetingId)}`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
    if (one.ok) meetings.push((await one.json()) as { uuid?: string; start_time?: string });
  }
  const instance = meetings.filter((m) => m.uuid && near(m.start_time, at) <= SIX_HOURS).sort((a, b) => near(a.start_time, at) - near(b.start_time, at))[0];
  if (!instance?.uuid) return { found: null, note: 'Zoom hasn’t listed the meeting as ended yet.' };
  const res = await fetch(`${apiBase()}/meetings/${encodeUuid(instance.uuid)}/transcript`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const e = await zoomError(res);
    if (e.missingScope || res.status === 401 || res.status === 403) return { found: null, note: `The Zoom app can’t read meeting transcripts (missing scope ${e.missingScope ?? e.detail}). Add it, then link Zoom again.` };
    return { found: null, note: 'No meeting transcript yet. Zoom makes one when AI Companion or the meeting transcript is on during the meeting.' };
  }
  const json = (await res.json()) as { download_url?: string; can_download?: boolean };
  if (!json.download_url || json.can_download === false) return { found: null, note: 'Zoom has the transcript but isn’t offering it for download yet.' };
  return { found: await download(json.download_url, token, 'meeting_transcript'), note: '' };
}

/** The transcript file of a cloud recording, if the meeting was recorded to the cloud. */
async function recordingTranscript(token: string, zoomMeetingId: string, at: Date): Promise<TranscriptLookup> {
  const q = new URLSearchParams({ from: ymd(new Date(at.getTime() - 86_400_000)), to: ymd(new Date(at.getTime() + 86_400_000)), page_size: '100' });
  const res = await fetch(`${apiBase()}/users/me/recordings?${q}`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const e = await zoomError(res);
    if (e.missingScope || res.status === 401 || res.status === 403) return { status: 'waiting', note: 'No cloud recording to check (the Zoom app has no recording scope).' };
    return { status: 'waiting', note: `Zoom returned ${e.detail}; trying again.` };
  }
  const json = (await res.json()) as { meetings?: RecordingMeeting[] };
  // A recurring meeting has one id and an instance per start; take the instance closest to `at`.
  const meeting = (json.meetings ?? []).filter((m) => String(m.id) === zoomMeetingId).sort((a, b) => near(a.start_time, at) - near(b.start_time, at))[0];
  if (!meeting || near(meeting.start_time, at) > SIX_HOURS) return { status: 'waiting', note: 'No cloud recording either.' };
  const file = meeting.recording_files?.find((f) => f.file_type === 'TRANSCRIPT');
  if (!file) return { status: 'waiting', note: 'The cloud recording is there; Zoom is still making its transcript.' };
  if (file.status && file.status !== 'completed') return { status: 'waiting', note: 'Zoom is still finishing the recording’s transcript.' };
  if (!file.download_url) return { status: 'waiting', note: 'Zoom hasn’t given a link to the transcript yet.' };
  return download(file.download_url, token, 'cloud_recording');
}

/**
 * Looks for the transcript of the given Zoom meeting, held around `at`: first the meeting
 * transcript Zoom keeps without a recording, then a cloud recording's transcript.
 */
export async function findTranscript(userId: string, zoomMeetingId: string, at: Date): Promise<TranscriptLookup> {
  const token = await zoomToken(userId).catch(() => null);
  if (!token) return { status: 'error', note: 'Zoom isn’t linked, or Zoom signed you out. Link Zoom again.' };
  const first = await meetingTranscript(token, zoomMeetingId, at);
  if (first.found && first.found.status !== 'waiting') return first.found;
  await new Promise((r) => setTimeout(r, 1200)); // Zoom limits requests per second
  const second = await recordingTranscript(token, zoomMeetingId, at);
  if (second.status !== 'waiting') return second;
  return { status: 'waiting', note: [first.found?.note ?? first.note, second.note].filter(Boolean).join(' ') };
}

export const zoomCallbackHome = () => `${appUrl()}/me/start`;
