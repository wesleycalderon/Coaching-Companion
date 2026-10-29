// What happens when a coachee answers a companion message, in Slack or in the web simulator.
// Every change lands in the same records the coach sees (check-ins, actions, consent), and
// consent decisions are written to the audit log.

import type { Prisma } from '@prisma/client';
import { db } from '../db';
import { COMMITMENT_STATUS, SET_ASIDE_REASON_LABEL, type CommitmentStatus, type SetAsideReason } from '../domain';
import { day, eventTime, firstName } from '../format';
import { stopLinksForCommitment } from '../work-meetings';
import { send } from './send';

export interface CompanionInput {
  choice?: string;
  text?: string;
  reason?: string;
  note?: string;
  swapText?: string;
  midday?: string;
  endOfDay?: string;
  useCalendar?: boolean;
}

export type RespondResult = { ok: true } | { error: string };

const badgeFor = (status: string) => COMMITMENT_STATUS[status as CommitmentStatus];

export async function respond(messageId: string, input: CompanionInput, actorUserId?: string): Promise<RespondResult> {
  const m = await db.companionMessage.findUnique({ where: { id: messageId } });
  if (!m) return { error: "We couldn't find that message." };
  if (actorUserId && actorUserId !== m.recipientId) return { error: 'Only the coachee can answer this message.' };
  const now = eventTime();
  const prior = (m.response ?? {}) as CompanionInput;
  const save = (response: CompanionInput) =>
    db.companionMessage.update({ where: { id: m.id }, data: { response: { ...prior, ...response } as Prisma.InputJsonValue, respondedAt: now } });
  const engagement = await db.engagement.findFirst({ where: { coacheeId: m.recipientId }, include: { coach: true } });
  const coach = engagement ? firstName(engagement.coach.name) : 'your coach';

  switch (m.kind) {
    case 'welcome': {
      const user = await db.user.findUniqueOrThrow({ where: { id: m.recipientId } });
      const prefs = { ...((user.preferences ?? {}) as object), midday: input.midday ?? '12:00', endOfDay: input.endOfDay ?? '17:00', useCalendar: input.useCalendar ?? false };
      await db.user.update({ where: { id: user.id }, data: { preferences: prefs as Prisma.InputJsonValue } });
      await save({ midday: prefs.midday, endOfDay: prefs.endOfDay, useCalendar: prefs.useCalendar });
      // Accepting the welcome is the coachee's agreement to use the companion.
      const { agree } = await import('../companion-setup');
      await agree(m.recipientId, m.deliveredVia === 'slack' || m.deliveredVia === 'teams' ? m.deliveredVia : 'web');
      await send({ recipientId: m.recipientId, kind: 'ack', text: `You're set. I'll check in around ${prefs.midday} and ${prefs.endOfDay}. I'll join your coaching sessions and meetings as your companion settings say; change them any time in the app.` });
      return { ok: true };
    }

    case 'consent_request': {
      if (input.choice !== 'allow' && input.choice !== 'decline') return { error: 'Choose whether to allow capture.' };
      const s = await db.session.findUniqueOrThrow({ where: { id: m.sessionId! }, include: { engagement: true, consents: true } });
      // Answering for one session is a one-off choice in the coachee's companion settings; the
      // session then follows both people's settings. STUB: BTS Studio engineering (consent storage).
      const { refreshSession, setRule } = await import('../companion-setup');
      await setRule(m.recipientId, { sessionId: s.id, engagementId: s.engagementId }, input.choice === 'allow' ? 'on' : 'off');
      await refreshSession(s.id);
      const channel = m.deliveredVia === 'slack' || m.deliveredVia === 'teams' ? m.deliveredVia : 'web';
      await db.consent.updateMany({ where: { sessionId: s.id, userId: m.recipientId, channel: 'standing' }, data: { channel } });
      await db.auditEvent.create({
        data: input.choice === 'allow'
          ? { id: `audit-${m.id}-consent`, actorId: m.recipientId, action: 'create', category: 'consent', label: 'Consent given', object: `Capture of session ${s.number}`, clientId: s.engagement.clientId, at: now }
          : { id: `audit-${m.id}-consent`, actorId: m.recipientId, action: 'unassign', category: 'consent', label: 'Capture declined', object: `Session ${s.number} runs without capture`, clientId: s.engagement.clientId, at: now },
      });
      await save({ choice: input.choice });
      await send({
        recipientId: m.recipientId, kind: 'ack',
        text: input.choice === 'allow'
          ? `Thanks. Capture is on for this session. You or ${coach} can pause or remove the companion at any time.`
          : `Okay, this session runs without capture. ${coach} will take notes instead.`,
      });
      return { ok: true };
    }

    case 'pre_session_prompt': {
      const text = (input.text ?? '').trim();
      if (!text) return { error: 'Write what you want to bring, or leave it for now.' };
      await save({ text });
      const plan = m.sessionId ? await db.nextSessionPlan.findUnique({ where: { forSessionId: m.sessionId } }) : null;
      if (plan) await db.nextSessionPlan.update({ where: { id: plan.id }, data: { coacheeTopic: text } });
      await send({ recipientId: m.recipientId, kind: 'ack', text: `Thanks. ${coach} will see this before your session.` });
      return { ok: true };
    }

    case 'recap': {
      if (input.choice !== 'confirm' && input.choice !== 'suggest') return { error: 'Choose an answer.' };
      await save({ choice: input.choice });
      await send({ recipientId: m.recipientId, kind: 'ack', text: input.choice === 'confirm' ? `Thanks. ${coach} will see that the recap matches your view.` : `Okay. ${coach} will see that you'd like a change, and can talk it through with you.` });
      return { ok: true };
    }

    case 'nudge': {
      if (input.choice !== 'will_try' && input.choice !== 'later') return { error: 'Choose an answer.' };
      if (m.checkInId) await db.checkIn.update({ where: { id: m.checkInId }, data: { respondedAt: now, response: input.choice === 'will_try' ? 'will_try' : null } });
      await save({ choice: input.choice });
      return { ok: true };
    }

    case 'check_in': {
      const c = await db.commitment.findUniqueOrThrow({ where: { id: m.commitmentId! }, include: { checkIns: true } });
      if (input.text !== undefined && prior.choice === 'tried') {
        // The reflection after "Tried it": a Roadmap result.
        const text = input.text.trim();
        if (!text) return { error: 'Write a few words about what you noticed.' };
        if (m.checkInId) await db.checkIn.update({ where: { id: m.checkInId }, data: { reflectionText: text } });
        await save({ text });
        await send({ recipientId: m.recipientId, kind: 'ack', text: `Nice work. We'll share this with ${coach} before your next session.`, data: { badge: badgeFor(c.status) } });
        return { ok: true };
      }
      const choice = input.choice;
      if (!choice || !['tried', 'not_yet', 'set_aside', 'swap'].includes(choice)) return { error: 'Choose an answer.' };
      if (m.checkInId) {
        await db.checkIn.update({ where: { id: m.checkInId }, data: { respondedAt: now, response: choice === 'swap' ? 'swapped' : choice } });
      }
      await save({ choice });
      if (choice === 'tried') {
        // First try moves to tried; three or more tries count as practiced.
        const tries = c.checkIns.filter((x) => x.response === 'tried').length + (c.checkIns.some((x) => x.id === m.checkInId && x.response === 'tried') ? 0 : 1);
        const status = c.status === 'not_started' || c.status === 'set_aside' ? 'tried' : c.status === 'tried' && tries >= 3 ? 'practiced' : c.status;
        if (status !== c.status) await db.commitment.update({ where: { id: c.id }, data: { status } });
        return { ok: true }; // the reflection form follows in the same message
      }
      if (choice === 'not_yet') {
        await send({ recipientId: m.recipientId, kind: 'ack', text: "Okay. I'll check in again tomorrow.", data: { badge: badgeFor(c.status) } });
        return { ok: true };
      }
      if (choice === 'set_aside') {
        await send({ recipientId: m.recipientId, kind: 'set_aside_reason', commitmentId: c.id, checkInId: m.checkInId ?? undefined, text: "That's okay. What's getting in the way?" });
        return { ok: true };
      }
      await send({ recipientId: m.recipientId, kind: 'set_aside_plan', commitmentId: c.id, checkInId: m.checkInId ?? undefined, text: 'What would you like to swap it for?', data: { mode: 'swap', dueBy: c.dueBy?.toISOString() ?? null } });
      return { ok: true };
    }

    case 'reflection_prompt': {
      const text = (input.text ?? '').trim();
      if (!text) return { error: 'Write a few words, or leave it for now.' };
      const client = (await db.user.findUniqueOrThrow({ where: { id: m.recipientId }, include: { client: true } })).client;
      const { redact } = await import('../transcript');
      const terms = client?.redactionOn ? (client.redactionTerms as string[]) : [];
      const clean = redact([{ speakerName: '', start: '00:00', end: '00:00', text }], terms).segments[0].text;
      if (m.checkInId) await db.checkIn.update({ where: { id: m.checkInId }, data: { reflectionText: clean, respondedAt: now } });
      await save({ text: clean });
      await send({ recipientId: m.recipientId, kind: 'ack', text: `Saved. ${coach} will see your reflection.` });
      return { ok: true };
    }

    case 'set_aside_reason': {
      const reason = (input.reason ?? 'time_pressure') as SetAsideReason;
      if (!(reason in SET_ASIDE_REASON_LABEL)) return { error: 'Choose a reason.' };
      const note = (input.note ?? '').trim();
      if (m.checkInId) await db.checkIn.update({ where: { id: m.checkInId }, data: { setAsideReason: reason, reflectionText: note || null } });
      await save({ reason, note });
      const action = await db.commitment.findUnique({ where: { id: m.commitmentId! } });
      await send({ recipientId: m.recipientId, kind: 'set_aside_plan', commitmentId: m.commitmentId!, checkInId: m.checkInId ?? undefined, text: 'What would you like to do with it?', data: { dueBy: action?.dueBy?.toISOString() ?? null } });
      return { ok: true };
    }

    case 'set_aside_plan': {
      const c = await db.commitment.findUniqueOrThrow({ where: { id: m.commitmentId! } });
      const reasonMsg = await db.companionMessage.findFirst({ where: { kind: 'set_aside_reason', commitmentId: c.id, recipientId: m.recipientId }, orderBy: { sentAt: 'desc' } });
      const reason = ((reasonMsg?.response ?? {}) as CompanionInput).reason as SetAsideReason | undefined;
      const hasNote = Boolean(((reasonMsg?.response ?? {}) as CompanionInput).note);
      if (input.choice === 'move') {
        const offered = ((m.data ?? {}) as { dueBy?: string | null }).dueBy;
        const due = new Date((offered ? new Date(offered) : c.dueBy ?? now).getTime() + 7 * 86_400_000);
        await db.commitment.update({ where: { id: c.id }, data: { dueBy: due, status: c.status === 'set_aside' ? 'not_started' : c.status } });
        await save({ choice: 'move' });
        await send({ recipientId: m.recipientId, kind: 'ack', text: `Updated. New due date ${day(due)}.${hasNote ? ` ${coach} will see your note.` : ''}`, data: { badge: badgeFor(c.status === 'set_aside' ? 'not_started' : c.status) } });
        return { ok: true };
      }
      if (input.choice === 'swap') {
        const text = (input.swapText ?? '').trim();
        if (!text) return { error: 'Write the smaller step you want to try instead.' };
        const id = `${c.id}-swap-${now.getTime().toString(36)}`;
        const title = text.length > 60 ? `${text.slice(0, 57)}…` : text;
        await db.$transaction([
          db.commitment.update({ where: { id: c.id }, data: { status: 'set_aside', setAsideReason: 'swapped for a smaller step' } }),
          // The coachee's own words, so no coach confirmation is needed; the coach sees it in the profile.
          db.commitment.create({ data: { id, sessionId: c.sessionId, goalId: c.goalId, ifThenText: text, title, shortTitle: title, createdAt: now, status: 'not_started', approved: true } }),
        ]);
        await stopLinksForCommitment(c.id, 'set_aside');
        await save({ choice: 'swap', swapText: text });
        await send({ recipientId: m.recipientId, kind: 'ack', text: `Swapped. Your new action: ${text}`, data: { badge: badgeFor('not_started') } });
        return { ok: true };
      }
      if (input.choice === 'keep') {
        await db.commitment.update({ where: { id: c.id }, data: { status: 'set_aside', setAsideReason: reason ? SET_ASIDE_REASON_LABEL[reason].toLowerCase() : 'set aside by the coachee' } });
        await stopLinksForCommitment(c.id, 'set_aside');
        await save({ choice: 'keep' });
        await send({ recipientId: m.recipientId, kind: 'ack', text: `Set aside. ${coach} will see this and can talk it through with you.`, data: { badge: badgeFor('set_aside') } });
        return { ok: true };
      }
      return { error: 'Choose what to do with this action.' };
    }

    case 'meeting_review': {
      if (input.choice !== 'keep' && input.choice !== 'stop') return { error: 'Choose whether to keep the series linked.' };
      const linkId = (m.data as { linkId?: string } | null)?.linkId ?? '';
      const { confirmSeries } = await import('../work-meetings');
      const result = await confirmSeries(linkId, m.recipientId, input.choice === 'keep');
      await save({ choice: input.choice });
      if ('error' in result) {
        await send({ recipientId: m.recipientId, kind: 'ack', text: 'That series had already stopped, so nothing changed.' });
        return { ok: true };
      }
      await send({ recipientId: m.recipientId, kind: 'ack', text: input.choice === 'keep' ? `Okay, ${result.link.title} stays linked. I'll ask again in a month.` : `Stopped. ${result.link.title} won't be captured from now on.` });
      return { ok: true };
    }
  }
  return { error: "This message doesn't take an answer." };
}
