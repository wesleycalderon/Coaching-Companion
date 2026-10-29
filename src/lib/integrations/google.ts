// Live test: Google sign-in and Google Calendar for one real person (see docs/live-test.md).
// Plain fetch against Google's documented OAuth 2.0 and Calendar v3 endpoints, no SDK.
// STUB: BTS Studio engineering. Production uses the client's own calendar (Microsoft or Google)
// through an admin-installed integration, with tokens encrypted at rest.

import { db } from '../db';
import type { CalendarAttendee, CalendarEvent } from '../calendar';
import { asJson, wall } from '../format';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
// Points at the local fake Google Calendar in development tests (src/app/api/dev/fake-google).
const eventsUrl = () => `${(process.env.NODE_ENV !== 'production' && process.env.GOOGLE_CALENDAR_BASE) || 'https://www.googleapis.com/calendar/v3'}/calendars/primary/events`;
const SCOPES = 'openid email profile https://www.googleapis.com/auth/calendar.readonly';
const WINDOW_DAYS = 14;

export const appUrl = () => process.env.APP_URL || 'http://localhost:3000';
export const liveTestOn = () => process.env.LIVE_TEST === 'true';
export const googleConfigured = () => liveTestOn() && Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const redirectUri = () => `${appUrl()}/api/auth/google/callback`;

export function googleAuthUrl(state: string) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: redirectUri(), response_type: 'code', scope: SCOPES,
    state, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true',
  });
  return `${AUTH_URL}?${q}`;
}

interface TokenResponse { access_token: string; expires_in: number; refresh_token?: string; scope?: string; error?: string; error_description?: string }

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...body }),
  });
  const json = (await res.json()) as TokenResponse;
  if (!res.ok || json.error) throw new Error(`Google token request failed: ${json.error_description ?? json.error ?? res.status}`);
  return json;
}

export async function exchangeGoogleCode(code: string) {
  const tokens = await tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: redirectUri() });
  const res = await fetch(USERINFO_URL, { cache: 'no-store', headers: { Authorization: `Bearer ${tokens.access_token}` } });
  if (!res.ok) throw new Error(`Google profile request failed: ${res.status}`);
  const profile = (await res.json()) as { sub: string; email: string; name?: string; given_name?: string };
  return { tokens, profile, calendarGranted: (tokens.scope ?? '').includes('calendar.readonly') };
}

/** A working access token for the person's linked calendar, refreshed when it's about to expire. */
async function calendarToken(userId: string): Promise<string | null> {
  const link = await db.accountLink.findFirst({ where: { userId, provider: 'calendar', status: 'linked', accessToken: { not: null } } });
  if (!link?.accessToken) return null;
  if (link.tokenExpiresAt && link.tokenExpiresAt.getTime() > Date.now() + 60_000) return link.accessToken;
  if (!link.refreshToken) return null;
  const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: link.refreshToken });
  await db.accountLink.update({ where: { id: link.id }, data: { accessToken: t.access_token, tokenExpiresAt: new Date(Date.now() + t.expires_in * 1000), ...(t.refresh_token ? { refreshToken: t.refresh_token } : {}) } });
  return t.access_token;
}

interface GEvent {
  id: string;
  recurringEventId?: string;
  status?: string;
  summary?: string;
  location?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: Array<{ email?: string; displayName?: string; self?: boolean; resource?: boolean; responseStatus?: string }>;
  conferenceData?: { entryPoints?: Array<{ uri?: string }> };
}

/** The Zoom meeting id in a calendar event's link (zoom.us/j/<id>), if there is one. */
export function zoomIdFrom(ev: Pick<GEvent, 'location' | 'description' | 'conferenceData'>): string | null {
  const texts = [...(ev.conferenceData?.entryPoints ?? []).map((e) => e.uri ?? ''), ev.location ?? '', ev.description ?? ''];
  for (const t of texts) {
    const m = /zoom\.us\/(?:j|w|s)\/(\d{9,12})/i.exec(t);
    if (m) return m[1];
  }
  return null;
}

const WEEKDAY = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
const pad = (n: number) => String(n).padStart(2, '0');

/** Groups Google's expanded instances into the companion's meetings and series. Exported for tests. */
export function toCalendarEvents(items: GEvent[], user: { liveClock: true; timeZone: string }, internalDomains: string[]): CalendarEvent[] {
  const groups = new Map<string, GEvent[]>();
  for (const ev of items) {
    if (ev.status === 'cancelled' || !ev.start?.dateTime || !ev.end?.dateTime) continue; // all-day events aren't meetings
    if (ev.attendees?.some((a) => a.self && a.responseStatus === 'declined')) continue;
    const key = ev.recurringEventId ?? ev.id;
    groups.set(key, [...(groups.get(key) ?? []), ev]);
  }
  const domainOf = (email?: string) => (email ?? '').split('@')[1]?.toLowerCase() ?? '';
  const out: CalendarEvent[] = [];
  for (const [key, list] of groups) {
    list.sort((a, b) => Date.parse(a.start!.dateTime!) - Date.parse(b.start!.dateTime!));
    const first = list[0];
    const starts = list.map((e) => new Date(e.start!.dateTime!));
    const minutes = Math.round((Date.parse(first.end!.dateTime!) - Date.parse(first.start!.dateTime!)) / 60_000);
    const attendees: CalendarAttendee[] = (first.attendees ?? [])
      .filter((a) => !a.self && !a.resource && a.responseStatus !== 'declined')
      .map((a) => ({ name: a.displayName || a.email || 'Guest', internal: internalDomains.includes(domainOf(a.email)) }));
    const local = wall(starts[0], user);
    const zoomMeetingId = zoomIdFrom(first);
    out.push({
      id: `g-${key}`, title: first.summary || '(No title)', recurring: Boolean(first.recurringEventId),
      cadence: first.recurringEventId ? `${WEEKDAY[local.getUTCDay()]} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}` : undefined,
      nextAt: starts[0], minutes, attendees, starts, zoomMeetingId, noZoom: !zoomMeetingId,
    });
  }
  return out.sort((a, b) => a.nextAt.getTime() - b.nextAt.getTime());
}

// Settings pages call this several times per render; Google is asked at most every 30 seconds.
const cache = new Map<string, { at: number; events: CalendarEvent[] }>();
export const clearGoogleCache = (userId: string) => cache.delete(userId);

export async function googleEvents(userId: string): Promise<{ events: CalendarEvent[] } | { error: string }> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < 30_000) return { events: hit.events };
  const token = await calendarToken(userId).catch(() => null);
  if (!token) return { error: 'Your Google Calendar isn’t linked, or Google signed you out. Sign in with Google again.' };
  const from = new Date(Date.now() - 3 * 3_600_000); // a little behind, so a meeting that just ended can still be fetched
  const q = new URLSearchParams({ singleEvents: 'true', orderBy: 'startTime', timeMin: from.toISOString(), timeMax: new Date(Date.now() + WINDOW_DAYS * 86_400_000).toISOString(), maxResults: '250' });
  const res = await fetch(`${eventsUrl()}?${q}`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return { error: `Google Calendar returned ${res.status}.` };
  const json = (await res.json()) as { items?: GEvent[]; timeZone?: string };
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { client: true } });
  if (json.timeZone && json.timeZone !== user.timeZone) await db.user.update({ where: { id: userId }, data: { timeZone: json.timeZone } });
  const domains = asJson<string[] | null>(user.client?.internalDomains) ?? [];
  const events = toCalendarEvents(json.items ?? [], { liveClock: true, timeZone: json.timeZone ?? user.timeZone }, domains);
  cache.set(userId, { at: Date.now(), events });
  return { events };
}
