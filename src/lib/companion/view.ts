// What a companion message looks like to the coachee, independent of channel. The web
// simulator (src/components/companion-chat.tsx) and Slack (./slack.ts) both render this.

import type { CompanionMessage } from '@prisma/client';
import { db } from '../db';
import { summaryItemLabel, type SummaryItem } from '../domain';
import { asJson, day, firstName, time, weekdayLong } from '../format';
import { commitmentBadge, type Badge } from '../queries';
import type { WorkMeetingCheck } from '../work-meetings';
import { retentionSentence } from './text';

export const ATTEMPT_BADGE: Record<WorkMeetingCheck['attempted'], Badge> = {
  yes: { label: 'You tried it', tone: 'success' },
  partly: { label: 'Partly tried', tone: 'info' },
  no: { label: 'Not this time', tone: 'neutral' },
  unclear: { label: 'Not clear', tone: 'neutral' },
};

export type MessageKind =
  | 'welcome' | 'consent_request' | 'pre_session_prompt' | 'recap' | 'nudge' | 'check_in'
  | 'set_aside_reason' | 'set_aside_plan' | 'reflection_prompt' | 'ack'
  | 'meeting_feedback' | 'meeting_review';

export interface Choice {
  value: string;
  label: string;
  primary?: boolean;
  chosen?: boolean;
}

/** The input a message asks for, if any. */
export type MessageForm =
  | { type: 'reflection'; label: string; value: string; submitLabel: string }
  | { type: 'reply'; label: string; value: string; submitLabel: string }
  | { type: 'reason'; reasons: Choice[]; noteLabel: string; note: string; submitLabel: string }
  | { type: 'plan'; options: Choice[]; swapLabel: string; swapText: string; note: string; submitLabel: string }
  | { type: 'welcome'; midday: string; endOfDay: string; useCalendar: boolean; submitLabel: string };

export interface MessageView {
  id: string;
  kind: MessageKind;
  sentAt: Date;
  meta: string;
  dayLabel?: string;
  title?: string;
  paragraphs: string[];
  facts: string[];
  items: Array<{ label: string; text: string }>;
  actions: Array<{ text: string; badge: Badge }>;
  actionsLabel?: string;
  link?: { label: string; href: string };
  choices: Choice[];
  choiceLayout: 'row' | 'stack';
  form?: MessageForm;
  badge?: Badge;
  answered: boolean;
  note?: string;
}

interface Response {
  choice?: string;
  text?: string;
  reason?: string;
  note?: string;
  swapText?: string;
}

export const SET_ASIDE_REASONS: Choice[] = [
  { value: 'time_pressure', label: 'A busy week or a deadline' },
  { value: 'less_relevant', label: "It's less relevant to my work than I thought" },
  { value: 'other', label: 'Something else' },
];

export async function buildView(m: CompanionMessage): Promise<MessageView> {
  const r = (m.response ?? {}) as Response;
  const data = (m.data ?? {}) as { dayLabel?: string; badge?: Badge; mode?: 'swap'; dueBy?: string | null; linkId?: string; occurrenceId?: string };
  const base: MessageView = {
    id: m.id, kind: m.kind as MessageKind, sentAt: m.sentAt, meta: time(m.sentAt), dayLabel: data.dayLabel,
    paragraphs: [], facts: [], items: [], actions: [], choices: [], choiceLayout: 'row', answered: Boolean(m.respondedAt),
  };
  const recipient = await db.user.findUniqueOrThrow({ where: { id: m.recipientId }, include: { client: true } });
  const engagement = await db.engagement.findFirst({ where: { coacheeId: recipient.id }, include: { coach: true, goals: true } });
  const coachFirst = engagement ? firstName(engagement.coach.name) : 'your coach';
  const choose = (choices: Choice[]) => choices.map((c) => ({ ...c, chosen: r.choice === c.value }));

  switch (m.kind as MessageKind) {
    case 'welcome': {
      const prefs = (recipient.preferences ?? {}) as { midday?: string; endOfDay?: string; useCalendar?: boolean };
      return {
        ...base,
        meta: 'Welcome',
        title: `Hi ${firstName(recipient.name)}, I'm your coaching companion`,
        paragraphs: [
          `I'm an AI assistant working alongside your coach${engagement ? `, ${engagement.coach.name}` : ''}. Between sessions, I'll help you keep the actions you agree together.`,
          `${coachFirst} reviews every recap before you see it. ${recipient.client ? `${recipient.client.name.split(' ')[0]} sees only totals across ${recipient.client.minGroupSize} or more coachees, never your content.` : ''} ${recipient.client ? retentionSentence(recipient.client) : ''}`.trim(),
        ],
        form: { type: 'welcome', midday: prefs.midday ?? '12:00', endOfDay: prefs.endOfDay ?? '17:00', useCalendar: prefs.useCalendar ?? true, submitLabel: 'Start my companion' },
      };
    }
    case 'consent_request': {
      const s = await db.session.findUniqueOrThrow({ where: { id: m.sessionId! }, include: { engagement: { include: { coach: true, client: true } } } });
      const days = s.engagement.client.retentionDays;
      return {
        ...base,
        title: `Your session with ${firstName(s.engagement.coach.name)} is tomorrow at ${time(s.scheduledAt)}`,
        paragraphs: [`With your okay, we'll capture the transcript so ${firstName(s.engagement.coach.name)} can review a recap and your actions after the session.`],
        facts: [
          `In the session: you and ${s.engagement.coach.name}`,
          days === 0 ? 'Transcript deleted right after analysis. Only what you approve is kept.' : `Transcript deleted after ${days} days. Only what you approve is kept.`,
          `You or ${firstName(s.engagement.coach.name)} can remove the companion at any time.`,
        ],
        choices: choose([{ value: 'allow', label: 'Allow capture for this session', primary: true }, { value: 'decline', label: 'Run without capture' }]),
      };
    }
    case 'pre_session_prompt':
      return {
        ...base,
        paragraphs: [m.text],
        form: { type: 'reply', label: 'Your answer', value: r.text ?? '', submitLabel: 'Send to my coach' },
      };
    case 'recap': {
      const s = await db.session.findUniqueOrThrow({ where: { id: m.sessionId! }, include: { summary: true, commitments: { where: { approved: true }, orderBy: { id: 'asc' } }, engagement: { include: { coach: true } } } });
      const items = asJson<SummaryItem[]>(s.summary?.insights ?? []);
      const ordered = [...items.filter((i) => i.kind === 'insight'), ...items.filter((i) => i.kind !== 'insight')].slice(0, 3);
      const fromNotes = items.every((i) => i.source === 'coach_notes');
      return {
        ...base,
        meta: `${time(m.sentAt)} · Reviewed by ${firstName(s.engagement.coach.name)}`,
        title: 'Your session recap',
        badge: fromNotes ? { label: 'No transcript', tone: 'neutral' } : undefined,
        paragraphs: fromNotes ? [`This recap comes from your coach ${firstName(s.engagement.coach.name)}'s notes and your own check-ins.`] : [],
        items: ordered.map((i) => ({ label: summaryItemLabel(i, 'coachee', firstName(s.engagement.coach.name)), text: i.text })),
        actionsLabel: s.commitments.length === 1 ? 'Your action' : 'Your actions',
        actions: s.commitments.map((c) => ({ text: c.ifThenText, badge: commitmentBadge(c) })),
        link: { label: 'Open your full recap ↗', href: `/me/recap/${s.id}` },
        // Recaps from coach notes ask the coachee to confirm them (artboard 21).
        choices: fromNotes ? choose([{ value: 'confirm', label: "That's right" }, { value: 'suggest', label: `Suggest a change to ${firstName(s.engagement.coach.name)}` }]) : [],
      };
    }
    case 'nudge':
      return {
        ...base,
        paragraphs: [m.text],
        // Milestone 7: link a work meeting to this action, where the client allows it.
        link: recipient.client?.workMeetings === 'coachee_picked' && m.commitmentId ? { label: 'Link a meeting to this action ↗', href: `/me/meetings?action=${m.commitmentId}` } : undefined,
        choices: choose([{ value: 'will_try', label: "I'll try it" }, { value: 'later', label: 'Remind me later' }]),
      };
    case 'check_in': {
      const view: MessageView = {
        ...base,
        title: m.text,
        choices: choose([{ value: 'tried', label: 'Tried it' }, { value: 'not_yet', label: 'Not yet' }, { value: 'set_aside', label: 'Set aside for now' }, { value: 'swap', label: 'Swap for another' }]),
      };
      if (r.choice === 'tried') view.form = { type: 'reflection', label: 'What did you notice?', value: r.text ?? '', submitLabel: 'Save reflection' };
      return view;
    }
    case 'reflection_prompt':
      return { ...base, title: m.text, form: { type: 'reflection', label: 'Your reflection', value: r.text ?? '', submitLabel: 'Save reflection' }, note: recipient.client ? `Avoid client names, deal details or figures. Anything matching ${recipient.client.name.split(' ')[0]}'s redaction list is removed before it's saved.` : undefined };
    case 'set_aside_reason':
      return {
        ...base,
        title: m.text,
        form: { type: 'reason', reasons: SET_ASIDE_REASONS.map((c) => ({ ...c, chosen: (r.reason ?? 'time_pressure') === c.value })), noteLabel: `Anything to add for ${coachFirst}?`, note: r.note ?? '', submitLabel: 'Continue' },
      };
    case 'set_aside_plan': {
      const c = await db.commitment.findUniqueOrThrow({ where: { id: m.commitmentId! } });
      const offered = data.dueBy ? new Date(data.dueBy) : c.dueBy ?? m.sentAt;
      const nextDue = new Date(offered.getTime() + 7 * 86_400_000);
      const chosen = r.choice ?? (data.mode === 'swap' ? 'swap' : 'move');
      return {
        ...base,
        title: m.text,
        form: {
          type: 'plan',
          options: [
            { value: 'move', label: `Move it to next week: ${c.shortTitle.toLowerCase()} by ${day(nextDue)}` },
            { value: 'swap', label: 'Swap for a smaller step' },
            { value: 'keep', label: `Keep it set aside and talk to ${coachFirst}` },
          ].map((o) => ({ ...o, chosen: chosen === o.value })),
          swapLabel: 'Your smaller step',
          swapText: r.swapText ?? '',
          note: 'Nothing changes until you choose.',
          submitLabel: 'Update my action',
        },
      };
    }
    case 'ack':
      return { ...base, paragraphs: [m.text], badge: data.badge };
    case 'meeting_feedback': {
      // Milestone 7: the coachee's own feedback from a linked work meeting.
      const o = await db.meetingOccurrence.findUnique({ where: { id: data.occurrenceId ?? '' }, include: { link: { include: { commitment: true } } } });
      const check = o?.check as WorkMeetingCheck | null | undefined;
      if (!o || !check) return { ...base, paragraphs: [m.text] };
      const curious = check.counts.curiosity_question + check.counts.open_question;
      return {
        ...base,
        meta: `${time(m.sentAt)} · Only you see this`,
        title: `${o.link.title}, ${day(o.scheduledAt)}`,
        badge: ATTEMPT_BADGE[check.attempted],
        paragraphs: [check.summary],
        items: check.evidence.map((e) => ({ label: `You said, ${e.time}`, text: `"${e.quote}"` })),
        facts: [`Your action: ${o.link.commitment.ifThenText}`, `Open or curiosity questions you asked: ${curious}`],
        link: { label: 'See this series ↗', href: `/me/meetings/${o.linkId}` },
        note: `Only your own words were analyzed. Nothing anyone else said was kept. ${coachFirst} sees this only if you share the series.`,
      };
    }
    case 'meeting_review': {
      const l = await db.meetingLink.findUnique({ where: { id: data.linkId ?? '' }, include: { commitment: true } });
      if (!l) return { ...base, paragraphs: [m.text] };
      return {
        ...base,
        title: `Keep linking ${l.title}?`,
        paragraphs: [`It's been a month. ${l.title}${l.cadence ? ` (${l.cadence})` : ''} is linked to your action: ${l.commitment.ifThenText}`],
        facts: ['Everyone still sees a notice each time, and capture pauses for anyone who hasn’t agreed.', 'Only your own words are analyzed.'],
        choices: choose([{ value: 'keep', label: 'Keep it linked', primary: true }, { value: 'stop', label: 'Stop linking it' }]),
      };
    }
  }
}

/** Day divider labels for a list of views: "Monday, the day before your session", "Tuesday"… */
export function withDayLabels(views: MessageView[]): Array<MessageView & { divider?: string }> {
  let lastDay = '';
  return views.map((v) => {
    const key = v.sentAt.toISOString().slice(0, 10);
    const divider = key !== lastDay ? v.dayLabel ?? weekdayLong(v.sentAt) : undefined;
    lastDay = key;
    return { ...v, divider };
  });
}
