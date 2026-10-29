// Work meetings (milestone 7, widened by companion setup). Which meetings are on comes from the
// owner's settings (src/lib/companion-setup.ts): after they agree, every meeting on their calendar
// is on unless they turn it off, or only the ones they pick. A coachee can also focus a meeting
// on one action. Coaches' own meetings work the same way, for practice feedback against their
// growth area. Rules enforced here, not only in prompts:
//  - capture only while the client allows it and the link is active (the coachee can stop it;
//    it also ends when the action reaches habit or is set aside, or the engagement ends)
//  - every occurrence shows a notice first; an external participant means no capture at all;
//    anyone who hasn't agreed (including someone who joins late) pauses capture
//  - only the coachee's own words are analyzed; everyone else's are dropped in memory and never
//    stored or sent to the AI. No transcript is kept: only the check, with the coachee's quotes
//  - feedback goes to the coachee; the coach sees a series only if the coachee shares it

import type { MeetingLink, MeetingOccurrence, Prisma } from '@prisma/client';
import { AiError, aiProvider, runTask } from './ai/client';
import { WorkMeetingCheckSchema } from './ai/schemas';
import { audit } from './audit';
import { eventsFor } from './calendar';
import { setRule, syncMeetings } from './companion-setup';
import { db } from './db';
import { asJson, day, eventTime, now, time } from './format';
import { countLanguage, type LanguageMarkerKind } from './language';
import { findQuote, parseTranscript, redact, transcriptHash, TranscriptFormatError, type RawSegment } from './transcript';

export interface Attendee { name: string; internal: boolean; agreedAt?: string | null; declinedAt?: string | null }

export interface WorkMeetingCheck {
  attempted: 'yes' | 'partly' | 'no' | 'unclear';
  summary: string;
  evidence: Array<{ quote: string; time: string }>;
  /** Coaching-language counts in the coachee's own words (code-counted, task 6). */
  counts: Record<LanguageMarkerKind, number>;
  words: number;
  /** Quotes the AI gave that weren't in the coachee's words, so were dropped. */
  dropped: number;
}

export const LINKABLE_STATUSES = ['not_started', 'tried', 'practiced'];
export const REVIEW_DAYS = 30;
const DAY = 86_400_000;
let seq = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(seq++).toString(36)}`;

export const isActive = (l: Pick<MeetingLink, 'stoppedAt' | 'expiresAt'>) => !l.stoppedAt && (!l.expiresAt || l.expiresAt > now());
export const reviewDue = (l: Pick<MeetingLink, 'scope' | 'lastConfirmedAt' | 'stoppedAt' | 'expiresAt'>) =>
  l.scope === 'series' && isActive(l) && now().getTime() - l.lastConfirmedAt.getTime() >= REVIEW_DAYS * DAY;

export const STOP_REASON: Record<string, string> = {
  coachee: 'You stopped it',
  habit: 'Stopped: the action is now a habit',
  set_aside: 'Stopped: the action was set aside',
  engagement_ended: 'Stopped: your coaching engagement ended',
  policy: 'Stopped: your organization turned off work-meeting capture',
  settings: 'Stopped: you turned it off in your companion settings',
};

const AUDIT_STOP: Record<string, string> = {
  coachee: 'stopped by the coachee',
  habit: 'the action is now a habit',
  set_aside: 'the action was set aside',
  engagement_ended: 'the coaching engagement ended',
  policy: 'the client turned off work-meeting capture',
  settings: 'turned off in the companion settings',
};

export const OCCURRENCE_STATUS: Record<string, { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'live' }> = {
  scheduled: { label: 'Coming up', tone: 'neutral' },
  notice_shown: { label: 'Notice shown', tone: 'info' },
  paused: { label: 'Paused, not everyone agreed', tone: 'warning' },
  skipped_external: { label: 'Not captured, external participant', tone: 'neutral' },
  captured: { label: 'Feedback ready', tone: 'success' },
  stopped: { label: 'Not captured, link stopped', tone: 'neutral' },
  off: { label: 'Off for this meeting', tone: 'neutral' },
};

// ── Linking ─────────────────────────────────────────────────────────────────────────

export async function linkMeeting(input: { coacheeId: string; commitmentId: string; eventId: string; scope: 'single' | 'series' }): Promise<{ link: MeetingLink } | { error: string }> {
  const coachee = await db.user.findUnique({ where: { id: input.coacheeId }, include: { client: true } });
  if (!coachee?.client) return { error: "We couldn't find your organization." };
  if (coachee.client.workMeetings !== 'coachee_picked') return { error: `${coachee.client.name.split(' ')[0]} has turned off work-meeting capture.` };
  const c = await db.commitment.findFirst({ where: { id: input.commitmentId, approved: true, session: { engagement: { coacheeId: coachee.id } } }, include: { session: { include: { engagement: true } } } });
  if (!c) return { error: 'Choose one of your actions.' };
  if (!LINKABLE_STATUSES.includes(c.status)) return { error: 'Choose an action you are still practicing. Habits and set-aside actions can’t be linked.' };
  const event = (await eventsFor(coachee)).find((e) => e.id === input.eventId);
  if (!event) return { error: 'Choose a meeting from your calendar.' };
  if (input.scope === 'series' && !event.recurring) return { error: `${event.title} doesn't repeat. Link this meeting only.` };
  const active = (await db.meetingLink.findMany({ where: { coacheeId: coachee.id, calendarEventId: event.id, stoppedAt: null } })).filter(isActive);
  if (active.some((l) => l.commitmentId)) return { error: `${event.title} is already focused on an action. Stop that first.` };

  const at = eventTime();
  // A meeting the companion already joins (from the coachee's settings) is focused on the action.
  const link = active[0]
    ? await db.meetingLink.update({ where: { id: active[0].id }, data: { commitmentId: c.id, origin: 'linked', scope: input.scope, lastConfirmedAt: at } })
    : await db.meetingLink.create({
        data: {
          id: newId('ml'), commitmentId: c.id, coacheeId: coachee.id, scope: input.scope, calendarEventId: event.id, title: event.title,
          cadence: input.scope === 'series' ? event.cadence ?? null : null, createdAt: at, expiresAt: c.session.engagement.end, lastConfirmedAt: at,
        },
      });
  // Focusing a meeting is an explicit choice to have the companion there.
  await setRule(coachee.id, input.scope === 'series' ? { seriesId: event.id } : { seriesId: event.id, at: event.nextAt }, 'on');
  await syncMeetings(coachee.id);
  await audit({
    actorId: coachee.id, action: 'create', category: 'consent', label: 'Work meeting linked',
    object: `${input.scope === 'series' ? `Series "${event.title}" (${event.cadence})` : `"${event.title}" on ${day(event.nextAt)}`} focused on an action; capture needs everyone's agreement each time`,
    clientId: coachee.clientId,
  });
  return { link };
}

/** Expires links whose engagement has ended, then brings meetings in step with the owner's settings. */
export async function refreshLinks(ownerId: string) {
  const links = await db.meetingLink.findMany({ where: { coacheeId: ownerId, stoppedAt: null } });
  for (const l of links) if (l.expiresAt && l.expiresAt <= now()) await stopLink(l.id, 'engagement_ended', null);
  await syncMeetings(ownerId);
}

export async function stopLink(linkId: string, reason: keyof typeof STOP_REASON, actorId: string | null) {
  const link = await db.meetingLink.findUnique({ where: { id: linkId }, include: { coachee: true } });
  if (!link || link.stoppedAt) return;
  await db.meetingLink.update({ where: { id: link.id }, data: { stoppedAt: eventTime(), stopReason: reason } });
  await db.meetingOccurrence.updateMany({ where: { linkId: link.id, captureStatus: { in: ['scheduled', 'notice_shown', 'paused', 'off'] }, scheduledAt: { gt: now() } }, data: { captureStatus: 'stopped' } });
  const system = await db.user.findFirst({ where: { role: 'system' } });
  await audit({
    actorId: actorId ?? system?.id ?? link.coacheeId, action: 'unassign', category: 'consent', label: 'Work-meeting capture stopped',
    object: `"${link.title}"${link.scope === 'series' ? ' series' : ''}: ${AUDIT_STOP[reason]}`,
    clientId: link.coachee.clientId,
  });
}

/** Called wherever an action's status changes. Habit or set aside ends its links. */
export async function stopLinksForCommitment(commitmentId: string, status: string) {
  if (status !== 'habit' && status !== 'set_aside') return;
  const links = await db.meetingLink.findMany({ where: { commitmentId, stoppedAt: null } });
  for (const l of links) await stopLink(l.id, status, null);
}

/** Called when a client's work-meeting capture goes off. */
export async function stopLinksForClient(clientId: string, actorId: string) {
  const links = await db.meetingLink.findMany({ where: { stoppedAt: null, coachee: { clientId } } });
  for (const l of links) await stopLink(l.id, 'policy', actorId);
  return links.length;
}

export async function confirmSeries(linkId: string, coacheeId: string, keep: boolean) {
  const link = await db.meetingLink.findFirst({ where: { id: linkId, coacheeId } });
  if (!link || !isActive(link)) return { error: 'This link has already stopped.' } as const;
  if (keep) await db.meetingLink.update({ where: { id: link.id }, data: { lastConfirmedAt: eventTime() } });
  else await stopLink(link.id, 'coachee', coacheeId);
  return { ok: true, link } as const;
}

// ── The notice, per occurrence ──────────────────────────────────────────────────────

export async function showNotice(occurrenceId: string) {
  const o = await db.meetingOccurrence.findUnique({ where: { id: occurrenceId }, include: { link: { include: { coachee: true } } } });
  if (!o) return { error: "We couldn't find this meeting." } as const;
  if (o.captureStatus !== 'scheduled') return { ok: true } as const;
  const attendees = asJson<Attendee[]>(o.attendees);
  const external = attendees.some((a) => !a.internal);
  await db.meetingOccurrence.update({ where: { id: o.id }, data: { captureStatus: external ? 'skipped_external' : 'notice_shown', noticeShownAt: eventTime() } });
  await audit({
    actorId: o.link.coacheeId, action: external ? 'unassign' : 'create', category: 'consent',
    label: external ? 'Work meeting not captured' : 'Work-meeting notice shown',
    object: external ? `"${o.link.title}" on ${day(o.scheduledAt)}: an external participant was invited` : `"${o.link.title}" on ${day(o.scheduledAt)}, to ${attendees.length} ${attendees.length === 1 ? 'colleague' : 'colleagues'}`,
    clientId: o.link.coachee.clientId,
  });
  return { ok: true } as const;
}

/** A colleague answers the notice. STUB: BTS Studio engineering (consent storage, identity). */
export async function answerNotice(occurrenceId: string, attendeeName: string, agree: boolean) {
  const o = await db.meetingOccurrence.findUnique({ where: { id: occurrenceId }, include: { link: { include: { coachee: true } } } });
  if (!o || !['notice_shown', 'paused'].includes(o.captureStatus)) return { error: 'The notice for this meeting is closed.' } as const;
  const attendees = asJson<Attendee[]>(o.attendees);
  const a = attendees.find((x) => x.name === attendeeName);
  if (!a) return { error: "We couldn't find that attendee." } as const;
  const at = eventTime().toISOString();
  if (agree) { a.agreedAt = at; a.declinedAt = null; } else { a.declinedAt = at; a.agreedAt = null; }
  const everyone = attendees.every((x) => x.agreedAt);
  await db.meetingOccurrence.update({ where: { id: o.id }, data: { attendees: attendees as unknown as Prisma.InputJsonValue, captureStatus: everyone ? 'notice_shown' : attendees.some((x) => x.declinedAt) ? 'paused' : o.captureStatus } });
  await audit({
    actorId: o.link.coacheeId, action: agree ? 'create' : 'unassign', category: 'consent', label: agree ? 'Capture agreed' : 'Capture declined',
    object: `A colleague ${agree ? 'agreed to' : 'declined'} capture in "${o.link.title}" on ${day(o.scheduledAt)}`, clientId: o.link.coachee.clientId,
  });
  return { ok: true } as const;
}

// ── Processing one occurrence (AI task 10) ──────────────────────────────────────────

export async function processOccurrence(input: { occurrenceId: string; content: string; fileName: string; actorId: string }): Promise<{ ok: true; occurrence: MeetingOccurrence } | { error: string }> {
  const o = await db.meetingOccurrence.findUnique({
    where: { id: input.occurrenceId },
    include: { link: { include: { coachee: { include: { client: true } }, commitment: true } } },
  });
  if (!o || o.link.coacheeId !== input.actorId) return { error: "We couldn't find this meeting." };
  const { link } = o;
  // The meeting's owner: a coachee, or a coach for their own practice.
  const owner = link.coachee;
  const isCoach = link.ownerRole === 'coach';
  const client = owner.client;
  if (!isCoach && client?.workMeetings !== 'coachee_picked') return { error: `${client?.name.split(' ')[0] ?? 'Your organization'} has turned off work-meeting capture.` };
  if (!isActive(link) && o.captureStatus === 'stopped') return { error: 'This meeting was stopped, so it isn’t captured.' };
  if (o.captureStatus === 'off') return { error: 'The companion is off for this meeting, so it isn’t captured.' };
  if (o.captureStatus === 'skipped_external') return { error: 'An external participant was in this meeting, so it isn’t captured.' };
  if (o.captureStatus === 'captured') return { error: 'This meeting already has feedback.' };
  if (o.captureStatus === 'scheduled') return { error: 'Show the notice to everyone in the meeting first.' };
  const attendees = asJson<Attendee[]>(o.attendees);
  const notAgreed = attendees.filter((a) => !a.agreedAt);
  if (notAgreed.length) {
    await db.meetingOccurrence.update({ where: { id: o.id }, data: { captureStatus: 'paused' } });
    return { error: `Capture stayed paused: ${notAgreed.length === 1 ? 'one colleague hasn’t' : `${notAgreed.length} colleagues haven’t`} agreed. Nothing was kept.` };
  }

  let segs: RawSegment[];
  try {
    segs = parseTranscript(input.content, input.fileName);
  } catch (e) {
    if (e instanceof TranscriptFormatError) return { error: e.message };
    throw e;
  }
  // Someone who joined without seeing the notice pauses capture for the whole meeting.
  // Live test: Zoom tells everyone in the meeting it's being transcribed, including anyone who
  // joined uninvited, so there's no one to pause for.
  const ownerNames = owner.liveClock ? await (await import('./live-meetings')).speakerNamesFor(owner.id) : [owner.name];
  const known = new Set([...ownerNames, ...attendees.map((a) => a.name)]);
  const unknownSpeakers = owner.liveClock ? [] : [...new Set(segs.map((s) => s.speakerName))].filter((n) => !known.has(n));
  if (unknownSpeakers.length) {
    await db.meetingOccurrence.update({ where: { id: o.id }, data: { captureStatus: 'paused' } });
    return { error: 'Capture stayed paused: someone joined who hadn’t seen the notice. Nothing was kept.' };
  }
  // Keep only the owner's own words. Everyone else's are dropped here, in memory.
  const own = segs.filter((s) => ownerNames.includes(s.speakerName));
  segs = [];
  if (own.length === 0) return { error: `We didn't find ${ownerNames.join(' or ')} speaking in this meeting, so there's nothing to analyze. Nothing was kept.` };
  const { segments: ownRedacted } = client?.redactionOn ? redact(own, asJson<string[]>(client.redactionTerms)) : { segments: own };
  const language = countLanguage(ownRedacted.map((s) => ({ ...s, speakerRole: isCoach ? 'coach' : 'coachee' })));
  const meeting = `${link.title}, ${day(o.scheduledAt)} ${time(o.scheduledAt)}`;
  const ownWords = ownRedacted.map((s) => `[${s.start}] ${s.text}`).join('\n');

  // What the words are checked against: the focused action, all active actions, or the coach's growth area.
  let against: string;
  if (isCoach) {
    if (!owner.growthArea) return { error: 'Choose a growth area on My practice first, so there is something to check your words against.' };
    against = owner.growthArea;
  } else if (link.commitment) {
    against = link.commitment.ifThenText;
  } else {
    const actions = await db.commitment.findMany({ where: { approved: true, status: { in: LINKABLE_STATUSES }, session: { engagement: { coacheeId: owner.id } } }, orderBy: { createdAt: 'desc' }, take: 5 });
    if (!actions.length) return { error: 'You have no actions you’re still practicing, so there is nothing to check this meeting against.' };
    against = actions.map((a) => `- ${a.ifThenText}`).join('\n');
  }

  let output: { attempted: WorkMeetingCheck['attempted']; summary: string; evidence: WorkMeetingCheck['evidence'] };
  let provider = aiProvider();
  try {
    const result = isCoach
      ? await runTask('coach-meeting-practice', { coachName: owner.name, growthArea: against, meeting, ownWords }, WorkMeetingCheckSchema, { effort: 'low', transcriptHash: transcriptHash(ownRedacted) })
      : await runTask('work-meeting-check', { coacheeName: owner.name, action: against, meeting, ownWords }, WorkMeetingCheckSchema, { effort: 'low', transcriptHash: transcriptHash(ownRedacted) });
    output = result.output;
    provider = result.provider;
  } catch (e) {
    if (e instanceof AiError) return { error: e.message };
    throw e;
  }
  const evidence = output.evidence.flatMap((ev) => {
    const at = findQuote(ownRedacted, ev.quote);
    return at ? [{ quote: ev.quote, time: at.start }] : [];
  }).slice(0, 3);
  const dropped = output.evidence.length - evidence.length;
  // A claimed attempt with no quote that's really in their words doesn't stand.
  const attempted = (output.attempted === 'yes' || output.attempted === 'partly') && evidence.length === 0 ? 'unclear' : output.attempted;
  const check: WorkMeetingCheck = {
    attempted,
    summary: attempted !== output.attempted ? 'Your words in this meeting don’t clearly show it either way.' : output.summary,
    evidence,
    counts: Object.fromEntries(language.markers.map((m) => [m.marker, m.count])) as WorkMeetingCheck['counts'],
    words: language.words,
    dropped,
  };
  const updated = await db.meetingOccurrence.update({ where: { id: o.id }, data: { captureStatus: 'captured', check: check as unknown as Prisma.InputJsonValue, checkedAt: eventTime(), aiProvider: provider } });
  await audit({ actorId: owner.id, action: 'create', category: 'access', label: isCoach ? 'Coach meeting analyzed' : 'Work meeting analyzed', object: `"${link.title}" on ${day(o.scheduledAt)}: the ${isCoach ? 'coach' : 'coachee'}'s own words only; others' words discarded, nothing stored but the feedback`, clientId: owner.clientId });
  if (!isCoach) {
    const { send } = await import('./companion/send');
    await send({ recipientId: owner.id, kind: 'meeting_feedback', commitmentId: link.commitmentId ?? undefined, text: `Feedback from ${link.title}`, data: { linkId: link.id, occurrenceId: o.id } });
  }
  await refreshLinks(owner.id);
  return { ok: true, occurrence: updated };
}

/** Monthly keep-or-stop prompt for each active series that hasn't been confirmed in 30 days. */
export async function promptSeriesReviews(): Promise<string[]> {
  const links = await db.meetingLink.findMany({ where: { scope: 'series', stoppedAt: null, ownerRole: 'coachee', commitmentId: { not: null } } });
  const log: string[] = [];
  const { send } = await import('./companion/send');
  for (const l of links.filter(reviewDue)) {
    const open = await db.companionMessage.findMany({ where: { recipientId: l.coacheeId, kind: 'meeting_review', respondedAt: null } });
    if (open.some((m) => (m.data as { linkId?: string } | null)?.linkId === l.id)) continue;
    await send({ recipientId: l.coacheeId, kind: 'meeting_review', commitmentId: l.commitmentId ?? undefined, text: `Keep linking ${l.title}?`, data: { linkId: l.id } });
    log.push(`review → ${l.coacheeId}: ${l.title}`);
  }
  return log;
}
