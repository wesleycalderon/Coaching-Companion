// Live test: runs the companion around the signed-in person's real meetings (see docs/live-test.md).
// Every minute while LIVE_TEST=true:
//  - re-reads their Google Calendar and applies their companion settings (syncMeetings)
//  - 10 minutes before a meeting that's on: shows the notice (external meetings are skipped)
//    and sends a Slack heads-up with a notice to paste into the Zoom chat
//  - from 2 minutes after it starts: checks Zoom every 2 minutes, for up to 3 hours, for the meeting transcript
//    (no recording needed), or failing that a cloud recording's transcript
//  - when the transcript is ready: runs the existing work-meeting check, which keeps only the
//    owner's own words and sends feedback to Slack
// Agreement from everyone else in the meeting is Zoom's own: Zoom tells every participant when the
// meeting is being transcribed or recorded, and asks for consent if the account requires it.
// STUB: BTS Studio engineering. Production uses Zoom's recording webhooks instead of polling.

import type { Prisma } from '@prisma/client';
import { audit } from './audit';
import { applySettings, chooseFor, syncMeetings } from './companion-setup';
import { db } from './db';
import { asJson, day, time, wall } from './format';
import { clearGoogleCache, liveTestOn } from './integrations/google';
import { findTranscript } from './integrations/zoom-user';
import { LIVE_CLIENT } from './live-user';
import { processOccurrence, showNotice } from './work-meetings';

const NOTICE_LEAD = 10 * 60_000;
const POLL_EVERY = 2 * 60_000;
const START_GRACE = 2 * 60_000;
const POLL_FOR = 3 * 3_600_000;
const SYNC_EVERY = 60_000;

interface Attendee { name: string; internal: boolean; agreedAt?: string | null; declinedAt?: string | null }

// ── Zoom account ────────────────────────────────────────────────────────────────────

export async function linkLiveZoom(userId: string, tokens: { access_token: string; refresh_token: string; expires_in: number }, me: { id: string; email: string; displayName: string }) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const data = {
    accessToken: tokens.access_token, refreshToken: tokens.refresh_token, tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    externalId: me.id, displayName: `${me.email || me.displayName} · Zoom`, meta: { zoomUserId: me.id, zoomDisplayName: me.displayName, email: me.email } as Prisma.InputJsonValue,
  };
  const existing = await db.accountLink.findFirst({ where: { userId, provider: 'zoom', status: 'linked' } });
  if (existing) await db.accountLink.update({ where: { id: existing.id }, data });
  else await db.accountLink.create({ data: { id: `acct-zoom-${userId}-${Date.now().toString(36)}`, userId, provider: 'zoom', workspace: 'own', status: 'linked', linkedAt: new Date(), ...data } });
  await audit({ actorId: userId, action: 'create', category: 'config', label: 'Account linked', object: `Own Zoom account linked (${me.displayName}); the companion reads meeting transcripts only for meetings that are on`, clientId: user.clientId });
  await applySettings(userId);
}

/** The names the person speaks under in a Zoom transcript. */
export async function speakerNamesFor(userId: string): Promise<string[]> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const zoom = await db.accountLink.findFirst({ where: { userId, provider: 'zoom', status: 'linked' } });
  const zoomName = asJson<{ zoomDisplayName?: string } | null>(zoom?.meta)?.zoomDisplayName;
  return [...new Set([user.name, zoomName].filter((n): n is string => Boolean(n)))];
}

// ── The job ─────────────────────────────────────────────────────────────────────────

const lastPoll = new Map<string, number>();
let lastSync = 0;
let running = false;

export async function runLiveMeetings(force = false): Promise<string[]> {
  if (!liveTestOn() || running) return [];
  running = true;
  const log: string[] = [];
  try {
    const users = await db.user.findMany({ where: { liveClock: true, status: 'active' } });
    if (force || Date.now() - lastSync >= SYNC_EVERY) {
      for (const u of users) await syncMeetings(u.id).catch((e) => log.push(`sync ${u.id} failed: ${e instanceof Error ? e.message : e}`));
      lastSync = Date.now();
    }
    const nowMs = Date.now();
    const occurrences = await db.meetingOccurrence.findMany({
      where: { link: { coacheeId: { in: users.map((u) => u.id) }, stoppedAt: null }, zoomMeetingId: { not: null }, captureStatus: { in: ['scheduled', 'notice_shown', 'paused'] }, scheduledAt: { lte: new Date(nowMs + NOTICE_LEAD) } },
      include: { link: { include: { coachee: true } } },
    });
    let polled = 0;
    for (const o of occurrences) {
      const owner = o.link.coachee;
      // Before it starts: the notice and the heads-up.
      if (o.captureStatus === 'scheduled' && !o.noticeSentAt) {
        await showNotice(o.id);
        const after = await db.meetingOccurrence.findUniqueOrThrow({ where: { id: o.id } });
        await db.meetingOccurrence.update({ where: { id: o.id }, data: { noticeSentAt: new Date(), pollUntil: new Date(o.endsAt.getTime() + POLL_FOR), liveStatus: after.captureStatus === 'skipped_external' ? null : 'waiting_recording' } });
        if (after.captureStatus !== 'skipped_external') await sendLive(owner.id, 'live_notice', `${o.link.title} starts at ${time(wall(o.scheduledAt, owner))}. The companion is on.`, o.id);
        log.push(`notice ${o.id}: ${after.captureStatus}`);
        continue;
      }
      // Once it has started, look for the transcript: meetings often end before their calendar
      // slot does, and Zoom only offers a transcript after the meeting has really ended.
      if (o.captureStatus !== 'notice_shown' || o.liveStatus !== 'waiting_recording' || nowMs < o.scheduledAt.getTime() + START_GRACE) continue;
      if (o.pollUntil && nowMs > o.pollUntil.getTime()) {
        await db.meetingOccurrence.update({ where: { id: o.id }, data: { liveStatus: 'no_transcript', liveNote: 'No transcript arrived within 3 hours. Was AI Companion or the meeting transcript on in Zoom (or the meeting recorded to the cloud)?' } });
        await sendLive(owner.id, 'live_status', `No transcript arrived for ${o.link.title} within 3 hours, so there's no feedback. Check that AI Companion or the meeting transcript was on during the meeting, and that your Zoom account keeps meeting transcripts.`, o.id);
        log.push(`gave up ${o.id}`);
        continue;
      }
      if (!force && nowMs - (lastPoll.get(o.id) ?? 0) < POLL_EVERY) continue;
      lastPoll.set(o.id, nowMs);
      if (polled++) await new Promise((r) => setTimeout(r, 1500)); // Zoom limits requests per second
      log.push(`poll ${o.id}: ${await fetchAndProcess(o.id)}`);
    }
  } finally {
    running = false;
  }
  return log;
}

/** Fetches the transcript and runs the check. */
async function fetchAndProcess(occurrenceId: string): Promise<string> {
  const o = await db.meetingOccurrence.findUniqueOrThrow({ where: { id: occurrenceId }, include: { link: true } });
  const owner = o.link.coacheeId;
  const found = await findTranscript(owner, o.zoomMeetingId!, o.scheduledAt);
  if (found.status !== 'ready') {
    await db.meetingOccurrence.update({ where: { id: o.id }, data: { liveNote: found.note, ...(found.status === 'error' ? { liveStatus: 'failed' } : {}) } });
    if (found.status === 'error') await sendLive(owner, 'live_status', `Couldn't fetch the transcript for ${o.link.title}: ${found.note}`, o.id);
    return `${found.status}: ${found.note}`;
  }
  // Zoom told everyone in the meeting it was being transcribed (or recorded), so that notice is
  // everyone's agreement.
  const attendees = asJson<Attendee[]>(o.attendees);
  if (attendees.some((a) => !a.agreedAt)) {
    const at = new Date().toISOString();
    await db.meetingOccurrence.update({ where: { id: o.id }, data: { attendees: attendees.map((a) => ({ ...a, agreedAt: a.agreedAt ?? at, declinedAt: null })) as unknown as Prisma.InputJsonValue } });
    await audit({ actorId: owner, action: 'create', category: 'consent', label: 'Capture agreed', object: `"${o.link.title}" on ${day(o.scheduledAt)}: ${found.source === 'meeting_transcript' ? 'Zoom told everyone in the meeting it was being transcribed' : "everyone in the meeting consented to Zoom's cloud recording"}`, clientId: LIVE_CLIENT });
  }
  await audit({ actorId: owner, action: 'create', category: 'access', label: 'Zoom transcript fetched', object: `"${o.link.title}" on ${day(o.scheduledAt)}, from the person's own Zoom ${found.source === 'meeting_transcript' ? 'meeting transcript (no recording)' : 'cloud recording'}; only their own words are kept`, clientId: LIVE_CLIENT });
  const result = await processOccurrence({ occurrenceId: o.id, content: found.content, fileName: found.fileName, actorId: owner });
  if ('error' in result) {
    await db.meetingOccurrence.update({ where: { id: o.id }, data: { liveStatus: 'failed', liveNote: result.error } });
    await sendLive(owner, 'live_status', `No feedback for ${o.link.title}: ${result.error}`, o.id);
    return `not analyzed: ${result.error}`;
  }
  await db.meetingOccurrence.update({ where: { id: o.id }, data: { liveStatus: null, liveNote: null } });
  return 'analyzed';
}

/** "Turn off for this one" from the Slack heads-up. */
export async function turnOffLive(occurrenceId: string, ownerId: string) {
  const o = await db.meetingOccurrence.findUnique({ where: { id: occurrenceId }, include: { link: true } });
  if (!o || o.link.coacheeId !== ownerId) return { error: "We couldn't find this meeting." } as const;
  if (!['scheduled', 'notice_shown', 'paused'].includes(o.captureStatus)) return { error: 'This meeting has already been handled.' } as const;
  await chooseFor(ownerId, { seriesId: o.link.calendarEventId, at: o.scheduledAt }, 'off', o.link.title);
  await db.meetingOccurrence.update({ where: { id: o.id }, data: { captureStatus: 'off', liveStatus: null, liveNote: null } });
  return { ok: true } as const;
}

async function sendLive(recipientId: string, kind: 'live_notice' | 'live_status', text: string, occurrenceId: string) {
  const { send } = await import('./companion/send');
  await send({ recipientId, kind, text, data: { occurrenceId } });
}

/** Settings changed or the person asked for a refresh: read the calendar again now. */
export async function refreshLiveNow(userId: string) {
  clearGoogleCache(userId);
  await syncMeetings(userId);
}
