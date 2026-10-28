'use server';

// Server actions for work meetings (milestone 7): the coachee links, keeps, stops and shares
// meetings; colleagues answer the notice; local development can simulate a meeting's transcript.
// STUB: BTS Studio engineering (auth, consent storage, calendar and meeting-app integration).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { audit } from './audit';
import { db } from './db';
import { day, firstName } from './format';
import { currentPersona } from './persona';
import type { FormState } from './session-actions';
import { answerNotice, confirmSeries, isActive, linkMeeting, processOccurrence, showNotice, stopLink, type Attendee } from './work-meetings';

const text = (fd: FormData, name: string) => String(fd.get(name) ?? '').trim();

function coachee() {
  const p = currentPersona();
  return p.role === 'coachee' ? p : null;
}

function refresh(linkId?: string) {
  revalidatePath('/me/meetings');
  if (linkId) revalidatePath(`/me/meetings/${linkId}`);
}

export async function linkMeetingAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const p = coachee();
  if (!p) return { error: 'Only coachees can link their meetings.' };
  const scope = text(fd, 'scope') === 'series' ? 'series' : 'single';
  const result = await linkMeeting({ coacheeId: p.userId, commitmentId: text(fd, 'action'), eventId: text(fd, 'meeting'), scope });
  if ('error' in result) return { error: result.error };
  refresh();
  redirect(`/me/meetings/${result.link.id}?done=linked`);
}

async function ownLink(linkId: string) {
  const p = coachee();
  if (!p) return null;
  return db.meetingLink.findFirst({ where: { id: linkId, coacheeId: p.userId }, include: { coachee: true } });
}

export async function stopLinkAction(linkId: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  const link = await ownLink(linkId);
  if (!link) return { error: "We couldn't find this link." };
  await stopLink(link.id, 'coachee', link.coacheeId);
  refresh(link.id);
  redirect(`/me/meetings/${link.id}?done=stopped`);
}

export async function keepSeriesAction(linkId: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  const p = coachee();
  if (!p) return { error: 'Only coachees can keep their meetings linked.' };
  const r = await confirmSeries(linkId, p.userId, true);
  if ('error' in r) return { error: r.error };
  refresh(linkId);
  return { message: `${r.link.title} stays linked. We'll ask again in a month.` };
}

export async function shareSeriesAction(linkId: string, share: boolean, _prev: FormState, _fd: FormData): Promise<FormState> {
  const link = await ownLink(linkId);
  if (!link) return { error: "We couldn't find this link." };
  const engagement = await db.engagement.findFirst({ where: { coacheeId: link.coacheeId }, include: { coach: true } });
  await db.meetingLink.update({ where: { id: link.id }, data: { sharedWithCoach: share } });
  await audit({
    actorId: link.coacheeId, action: share ? 'assign' : 'unassign', category: 'access', label: share ? 'Work-meeting feedback shared' : 'Work-meeting sharing stopped',
    object: `"${link.title}" feedback ${share ? 'shared with' : 'no longer shared with'} the coach`, clientId: link.coachee.clientId,
  });
  refresh(link.id);
  if (engagement) revalidatePath(`/coach/coachees/${link.coacheeId}`);
  const coach = engagement ? firstName(engagement.coach.name) : 'your coach';
  return { message: share ? `${coach} can now see the feedback from this series.` : `${coach} no longer sees the feedback from this series.` };
}

// ── The notice and the meeting (prototype controls) ─────────────────────────────────

async function ownOccurrence(occurrenceId: string) {
  const p = coachee();
  if (!p) return null;
  return db.meetingOccurrence.findFirst({ where: { id: occurrenceId, link: { coacheeId: p.userId } }, include: { link: true } });
}

/** The meeting starts and everyone sees the notice. */
export async function startMeetingAction(occurrenceId: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  const o = await ownOccurrence(occurrenceId);
  if (!o) return { error: "We couldn't find this meeting." };
  if (!isActive(o.link)) return { error: 'This link has stopped.' };
  await showNotice(o.id);
  refresh(o.linkId);
  redirect(`/meeting/${o.id}/notice`);
}

/** A colleague answers the notice (the prototype lets you act for each of them). */
export async function answerNoticeAction(occurrenceId: string, attendee: string, agree: boolean, _prev: FormState, _fd: FormData): Promise<FormState> {
  const o = await ownOccurrence(occurrenceId);
  if (!o) return { error: "We couldn't find this meeting." };
  const r = await answerNotice(o.id, attendee, agree);
  if ('error' in r) return { error: r.error };
  revalidatePath(`/meeting/${o.id}/notice`);
  refresh(o.linkId);
  return { message: agree ? `${firstName(attendee)} agreed.` : `${firstName(attendee)} declined. Capture is paused while they're in the meeting.` };
}

/** Local development: the meeting ends and its transcript arrives, as Zoom would send it. */
export async function simulateMeetingAction(occurrenceId: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  const o = await ownOccurrence(occurrenceId);
  if (!o) return { error: "We couldn't find this meeting." };
  const user = await db.user.findUniqueOrThrow({ where: { id: o.link.coacheeId } });
  const content = o.link.calendarEventId === 'cal-priya-team'
    ? readFileSync(join(process.cwd(), 'prisma/seed-data/transcripts/priya-team-meeting.txt'), 'utf8')
    : genericTranscript(user.name, (o.attendees as unknown as Attendee[]).map((a) => a.name));
  const r = await processOccurrence({ occurrenceId: o.id, content, fileName: 'meeting.txt', actorId: user.id });
  refresh(o.linkId);
  if ('error' in r) return { error: r.error };
  return { message: `Feedback is ready for ${o.link.title} on ${day(o.scheduledAt)}. Only your own words were analyzed.` };
}

/** Upload a work meeting's transcript yourself (the fallback, as for coaching sessions). */
export async function uploadMeetingAction(occurrenceId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const o = await ownOccurrence(occurrenceId);
  if (!o) return { error: "We couldn't find this meeting." };
  const file = fd.get('transcript');
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a transcript file.' };
  if (file.size > 2_000_000) return { error: 'The file is too large.' };
  if (file.name.toLowerCase().endsWith('.pdf')) return { error: 'Upload a .txt, .vtt or .json transcript for work meetings.' };
  const r = await processOccurrence({ occurrenceId: o.id, content: await file.text(), fileName: file.name, actorId: o.link.coacheeId });
  refresh(o.linkId);
  if ('error' in r) return { error: r.error };
  return { message: 'Feedback is ready. Only your own words were analyzed; the rest of the file was discarded.' };
}

/** A short synthetic meeting for coachees without a seeded transcript. */
function genericTranscript(coachee: string, others: string[]) {
  const other = others[0] ?? 'A colleague';
  return [
    `[00:00:05] ${coachee}: Thanks, everyone. Let's start with what's blocking the weekly plan.`,
    `[00:00:20] ${other}: The handover notes arrive late, so the plan starts a day behind.`,
    `[00:00:41] ${coachee}: What would help the notes arrive on time?`,
    `[00:00:55] ${other}: A fixed cut-off, maybe Tuesday at noon.`,
    `[00:01:10] ${coachee}: I'm curious how a Tuesday cut-off would land for the night team.`,
    `[00:01:25] ${other}: It works if someone reminds them on Monday.`,
    `[00:01:40] ${coachee}: Okay, let's try the Tuesday cut-off with a Monday reminder and review it next week.`,
  ].join('\n');
}

/** Local development: send the monthly keep-or-stop prompt now instead of after 30 days. */
export async function sendReviewNowAction(linkId: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  const link = await ownLink(linkId);
  if (!link || link.scope !== 'series' || !isActive(link)) return { error: 'Only an active series gets the monthly check.' };
  const { send } = await import('./companion/send');
  await send({ recipientId: link.coacheeId, kind: 'meeting_review', commitmentId: link.commitmentId, text: `Keep linking ${link.title}?`, data: { linkId: link.id } });
  return { message: 'Sent. It appears in your companion chat, and in Slack when it’s connected.' };
}
