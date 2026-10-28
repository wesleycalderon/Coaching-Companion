// Composing and delivering companion messages. Every message is stored first (the outbox), then
// delivered: to Slack when the Slack app is connected and Slack is the coachee's first channel,
// otherwise to the simulated chat in the web app. Teams and email delivery are later milestones.

import type { Prisma } from '@prisma/client';
import { db } from '../db';
import type { Badge } from '../queries';
import { asJson, eventTime, firstName } from '../format';
import type { MessageKind } from './view';

let counter = 0;
const newId = () => `cm-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export const slackEnabled = () => process.env.SLACK_ENABLED === 'true' && Boolean(process.env.SLACK_BOT_TOKEN && process.env.SLACK_APP_TOKEN);

export interface SendInput {
  recipientId: string;
  kind: MessageKind;
  text: string;
  sessionId?: string;
  commitmentId?: string;
  checkInId?: string;
  data?: { dayLabel?: string; badge?: Badge; mode?: 'swap'; dueBy?: string | null; linkId?: string; occurrenceId?: string };
  sentAt?: Date;
}

export async function send(input: SendInput) {
  const user = await db.user.findUniqueOrThrow({ where: { id: input.recipientId } });
  const channel = asJson<string[]>(user.nudgeChannelOrder)[0] ?? 'email';
  const viaSlack = channel === 'slack' && slackEnabled();
  const message = await db.companionMessage.create({
    data: {
      id: newId(), recipientId: input.recipientId, kind: input.kind, channel, deliveredVia: viaSlack ? 'slack' : 'simulated',
      sentAt: input.sentAt ?? eventTime(), sessionId: input.sessionId, commitmentId: input.commitmentId, checkInId: input.checkInId,
      text: input.text, data: (input.data ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
  if (viaSlack) {
    try {
      const { deliverToSlack } = await import('./slack');
      await deliverToSlack(message.id);
    } catch (e) {
      // Keep the message: the coachee still sees it in the web app.
      console.error('[slack] delivery failed, kept in the simulated chat', e);
      await db.companionMessage.update({ where: { id: message.id }, data: { deliveredVia: 'simulated' } });
    }
  }
  return message;
}

// ── Composers for each kind of message ──────────────────────────────────────────────

export async function sendWelcome(userId: string) {
  return send({ recipientId: userId, kind: 'welcome', text: "Hi, I'm your coaching companion" });
}

export async function sendConsentRequest(sessionId: string) {
  const s = await db.session.findUniqueOrThrow({ where: { id: sessionId }, include: { engagement: { include: { coach: true } } } });
  return send({
    recipientId: s.engagement.coacheeId, kind: 'consent_request', sessionId,
    text: `Your session with ${firstName(s.engagement.coach.name)} is tomorrow. Can we capture the transcript?`,
    data: { dayLabel: 'The day before your session' },
  });
}

export async function sendPreSessionPrompt(sessionId: string) {
  const s = await db.session.findUniqueOrThrow({ where: { id: sessionId }, include: { engagement: true } });
  return send({ recipientId: s.engagement.coacheeId, kind: 'pre_session_prompt', sessionId, text: "What do you want to bring to tomorrow's session?" });
}

/** Sent when the coach approves a recap. */
export async function sendRecap(sessionId: string) {
  const s = await db.session.findUniqueOrThrow({ where: { id: sessionId }, include: { engagement: true } });
  return send({ recipientId: s.engagement.coacheeId, kind: 'recap', sessionId, text: 'Your session recap is ready' });
}

/** Midday nudge or end-of-day check-in for one open action (AI task 5 writes the text). */
export async function sendNudge(commitmentId: string, slot: 'midday' | 'end_of_day') {
  const { nudgeText } = await import('./nudge');
  const c = await db.commitment.findUniqueOrThrow({ where: { id: commitmentId }, include: { session: { include: { engagement: true } } } });
  const prompt = await nudgeText(c, slot);
  const sentAt = eventTime();
  const checkIn = await db.checkIn.create({
    data: { id: `ci-${sentAt.getTime().toString(36)}-${commitmentId.slice(-6)}`, commitmentId, channel: 'slack', slot, prompt, sentAt },
  });
  return send({ recipientId: c.session.engagement.coacheeId, kind: slot === 'midday' ? 'nudge' : 'check_in', commitmentId, checkInId: checkIn.id, text: prompt, sentAt });
}
