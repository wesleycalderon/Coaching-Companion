// Data access and derived values shared across screens. Pages call these from the server.

import type { AiAnswer, CheckIn, Commitment, Session, Summary } from '@prisma/client';
import type { StatusBadgeTone } from '@/ds/types';
import { db } from './db';
import {
  CHECK_IN_RESPONSE_LABEL, COMMITMENT_STATUS, ROLE_LABEL,
  type CheckInResponse, type CommitmentStatus, type Role, type SummaryItem,
} from './domain';
import { andList, asJson, count, Count, day, dayTime, firstName, now, sessionList } from './format';

export interface Badge {
  label: string;
  tone: StatusBadgeTone;
  title?: string;
}

export const commitmentBadge = (c: Pick<Commitment, 'status' | 'setAsideReason'>): Badge => {
  const s = COMMITMENT_STATUS[c.status as CommitmentStatus];
  return { ...s, title: c.status === 'set_aside' && c.setAsideReason ? `Reason: ${c.setAsideReason}` : undefined };
};

export const isUpcoming = (s: Pick<Session, 'scheduledAt'>) => s.scheduledAt.getTime() > now().getTime();

/** Capture column on the coach's session list. */
export async function captureBadge(s: Session): Promise<Badge> {
  switch (s.captureStatus) {
    case 'captured': return { label: 'Captured', tone: 'success' };
    case 'consented': return { label: 'Consented', tone: 'info' };
    case 'paused': return { label: 'Paused', tone: 'info' };
    case 'no_capture': return { label: 'Companion mode, no capture', tone: 'neutral' };
    case 'removed': {
      const by = s.removedById ? await db.user.findUnique({ where: { id: s.removedById } }) : null;
      return { label: 'Companion removed', tone: 'neutral', title: by ? `Removed by the ${ROLE_LABEL[by.role as Role].toLowerCase()} before the session` : undefined };
    }
    default: return { label: 'Scheduled', tone: 'neutral' };
  }
}

export const fromNotes = (summary: Pick<Summary, 'insights'>) =>
  asJson<SummaryItem[]>(summary.insights).every((i) => i.source === 'coach_notes');

/** Summary column, plus the row action, on the coach's session list. */
export function summaryState(s: Session, summary: Summary | null): { badge: Badge; action: { label: string; href: string; primary: boolean } } {
  const review = `/coach/sessions/${s.id}/review`;
  if (isUpcoming(s)) return { badge: { label: 'Not yet', tone: 'neutral' }, action: { label: 'Session controls', href: `/coach/sessions/${s.id}/live`, primary: false } };
  if (!summary && s.captureStatus === 'consented') return { badge: { label: 'Waiting for transcript', tone: 'info' }, action: { label: 'Get transcript', href: `/coach/sessions/${s.id}/upload`, primary: true } };
  if (!summary) return { badge: { label: 'No summary', tone: 'neutral' }, action: { label: 'Add notes', href: review, primary: false } };
  if (summary.status === 'draft') return { badge: { label: 'Needs your review', tone: 'warning' }, action: { label: 'Review session', href: review, primary: true } };
  if (summary.status === 'suppressed') return { badge: { label: 'Kept private', tone: 'neutral' }, action: { label: 'View summary', href: review, primary: false } };
  if (fromNotes(summary)) return { badge: { label: 'From your notes', tone: 'info' }, action: { label: 'Add notes', href: review, primary: false } };
  return { badge: { label: 'Approved', tone: 'success' }, action: { label: 'View summary', href: review, primary: false } };
}

/** "Thu 23 Oct, "I asked two…"" · "Fri 17 Oct, tried three times" · "Wed 22 Oct, "Not yet"" */
export function lastCheckInText(c: Commitment & { checkIns: CheckIn[] }): string {
  const answered = c.checkIns.filter((x) => x.response).sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  const last = answered[0];
  if (!last) return 'No check-in yet';
  if (last.reflectionText) return `${day(last.sentAt)}, "${last.reflectionText}"`;
  const tries = answered.filter((x) => x.response === 'tried').length;
  if (tries > 1) return `${day(last.sentAt)}, tried ${count(tries)} times`;
  return `${day(last.sentAt)}, "${CHECK_IN_RESPONSE_LABEL[last.response as CheckInResponse]}"`;
}

/** The engagement, coachee and coach behind a session, with the session's number. */
export async function sessionWithPeople(id: string) {
  return db.session.findUnique({
    where: { id },
    include: {
      engagement: { include: { coachee: true, coach: true, client: true, goals: true } },
      summary: true,
      transcript: true,
      commitments: { include: { checkIns: true }, orderBy: { id: 'asc' } },
      coachNotes: true,
      consents: { include: { user: true }, orderBy: { grantedAt: 'asc' } },
      events: { orderBy: { at: 'desc' } },
      practice: true,
      aiAnswers: { orderBy: { createdAt: 'desc' }, take: 3 },
    },
  });
}

/** Patterns for the coachee profile: computed from coach notes, check-ins and language markers. */
export async function coacheePatterns(engagementId: string, coacheeName: string) {
  const sessions = await db.session.findMany({
    where: { engagementId },
    include: { coachNotes: true, commitments: { where: { approved: true } }, languageMarker: true },
    orderBy: { number: 'asc' },
  });
  const name = firstName(coacheeName);

  // How they show up: group sessions by the words in the coach's own notes.
  const groups = new Map<string, number[]>();
  for (const s of sessions) {
    const tags = s.coachNotes.flatMap((n) => asJson<string[]>(n.showUpTags));
    if (tags.length === 0) continue;
    const key = andList([...new Set(tags)]);
    groups.set(key, [...(groups.get(key) ?? []), s.number]);
  }
  const showUp = groups.size === 0
    ? 'No observations in your notes yet.'
    : `Your notes describe ${name} as ${andList(
        [...groups.entries()].sort((a, b) => Math.max(...b[1]) - Math.max(...a[1])).map(([tags, nums]) => `${tags} in ${sessionList(nums)}`),
      )}.`;

  // Homework follow-through.
  const all = sessions.flatMap((s) => s.commitments);
  const moved = all.filter((c) => c.status !== 'not_started');
  const setAside = all.filter((c) => c.status === 'set_aside');
  let followThrough = all.length === 0
    ? 'No actions yet.'
    : `${Count(moved.length)} of ${count(all.length)} actions tried or further.`;
  if (setAside.length === 1 && setAside[0].setAsideReason) followThrough += ` The one set aside was during a ${setAside[0].setAsideReason}.`;

  // Coaching language, from the coachee's own speech.
  const open = sessions.flatMap((s) => s.languageMarker.filter((m) => m.marker === 'open_question'));
  const language = open.length >= 2
    ? `Open questions in ${name}'s own words ${open[open.length - 1].per1kWords >= open[0].per1kWords ? 'rose' : 'fell'} from ${open[0].per1kWords} to ${open[open.length - 1].per1kWords} per 1,000 words since session ${sessions[0].number}.`
    : 'Not enough captured sessions yet.';

  return { showUp, followThrough, language };
}

/** The latest approved recap the coachee can see. */
export async function latestRecapSessionId(coacheeId: string) {
  const s = await db.session.findFirst({
    where: { engagement: { coacheeId }, summary: { status: 'approved' } },
    orderBy: { scheduledAt: 'desc' },
  });
  return s?.id ?? null;
}

/** An Ask the AI answer as the coach sees it (src/components/coach-tools.tsx AnswerList). */
export function answerView(a: AiAnswer) {
  const nums = asJson<number[]>(a.citedSessionNumbers);
  return {
    id: a.id,
    question: a.question,
    answer: a.answer,
    from: nums.length && a.scope !== 'practice' ? `from ${sessionList(nums)}` : '',
    when: dayTime(a.createdAt),
    sample: a.aiProvider === 'sample',
    citations: asJson<Array<{ label: string; quote: string }> | null>(a.citations) ?? [],
  };
}
