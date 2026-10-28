// Coaching guidance: conversations between a coachee and a BiTSy coach about one of their
// actions. BiTSy does the coaching (sample replies when it isn't configured); this app briefs
// the coach, keeps the turns, and routes any new action the coachee proposes to their coach.
//
// Rules carried over from the prototype: the coachee sees exactly what the coach is told before
// anything is sent; conversations are private unless the coachee shares them; the AI never adds
// actions (the coachee writes a proposal in their own words and the coach approves it).

import { randomUUID } from 'node:crypto';
import { audit } from '../audit';
import { db } from '../db';
import { asJson, day, eventTime, firstName } from '../format';
import { commitmentBadge } from '../queries';
import type { WorkMeetingCheck } from '../work-meetings';
import * as bitsy from './bitsy';
import { coachById } from './coaches';
import { sampleInsights, sampleReply } from './sample';

const newId = (p: string) => `${p}-${randomUUID().slice(0, 12)}`;

export const coachingProvider = () => (bitsy.bitsyConfigured() ? 'bitsy' : 'sample') as 'bitsy' | 'sample';

/** What the coach is told about the coachee and the action. Shown to the coachee before sending. */
export async function buildBrief(coacheeId: string, commitmentId: string | null) {
  const user = await db.user.findUniqueOrThrow({ where: { id: coacheeId }, include: { client: true } });
  const engagement = await db.engagement.findFirst({ where: { coacheeId }, include: { coach: true } });
  const lines: string[] = [];
  const who = [user.name, user.jobTitle ? `${user.jobTitle}${user.client ? ` at ${user.client.name}` : ''}` : user.client?.name].filter(Boolean).join(', ');
  // The BiTSy test account has its own name; this keeps the coach addressing the coachee.
  lines.push(`I'm ${who}. Please call me ${firstName(user.name)}.`);
  if (commitmentId) {
    const c = await db.commitment.findFirst({
      where: { id: commitmentId, session: { engagement: { coacheeId } } },
      include: { checkIns: { where: { respondedAt: { not: null } }, orderBy: { respondedAt: 'desc' }, take: 1 } },
    });
    if (c) {
      lines.push(`${engagement ? `My coach, ${firstName(engagement.coach.name)}, and I` : 'I'} agreed this action: "${c.ifThenText}"`);
      lines.push(`Where it stands: ${commitmentBadge(c).label.toLowerCase()}.`);
      const ci = c.checkIns[0];
      if (ci?.reflectionText) lines.push(`What I noticed last time I tried it: "${ci.reflectionText}"`);
      const occurrence = await db.meetingOccurrence.findFirst({
        where: { captureStatus: 'captured', link: { commitmentId: c.id, coacheeId } },
        orderBy: { scheduledAt: 'desc' }, include: { link: true },
      });
      if (occurrence?.check) {
        const check = asJson<WorkMeetingCheck>(occurrence.check);
        lines.push(`Feedback on my own words in ${occurrence.link.title} on ${day(occurrence.scheduledAt)}: ${check.summary}`);
      }
    }
  }
  return lines.join('\n');
}

const firstMessage = (brief: string, opening: string) =>
  `Some context first, from my coaching companion (a prototype that uses made-up example people):\n${brief}\n\n${opening}`;

async function coachReply(conversationId: string, provider: string, agentName: string, bitsyId: string | null, message: string) {
  if (provider === 'bitsy' && bitsyId) return bitsy.sendMessage(bitsyId, message);
  const coachTurns = await db.coachingTurn.count({ where: { conversationId, role: 'coach' } });
  return sampleReply(agentName, coachTurns);
}

export async function startCoaching(input: { coacheeId: string; commitmentId: string | null; agentName: string; opening: string }) {
  const user = await db.user.findUniqueOrThrow({ where: { id: input.coacheeId } });
  const coach = coachById(input.agentName);
  const provider = coachingProvider();
  const brief = await buildBrief(input.coacheeId, input.commitmentId);
  const opening = input.opening || "I'd like help with this action.";
  let bitsyId: string | null = null;
  let reply: string;
  try {
    if (provider === 'bitsy') {
      bitsyId = (await bitsy.startConversation(coach.id, { source: 'coaching-companion-prototype', commitment: input.commitmentId })).id;
      reply = await bitsy.sendMessage(bitsyId, firstMessage(brief, opening));
    } else {
      reply = sampleReply(coach.id, 0);
    }
  } catch (e) {
    return { error: e instanceof bitsy.BitsyError ? e.message : "We couldn't start the conversation. Try again in a moment." };
  }
  const now = eventTime();
  const id = newId('cc');
  await db.coachingConversation.create({
    data: {
      id, coacheeId: input.coacheeId, commitmentId: input.commitmentId, agentName: coach.id, provider, bitsyConversationId: bitsyId, status: 'active', startedAt: now,
      turns: {
        create: [
          { id: newId('ct'), role: 'brief', text: brief, createdAt: now },
          { id: newId('ct'), role: 'coachee', text: opening, createdAt: new Date(now.getTime() + 1) },
          { id: newId('ct'), role: 'coach', text: reply || 'The coach sent an empty reply.', createdAt: new Date(now.getTime() + 2) },
        ],
      },
    },
  });
  await audit({
    actorId: input.coacheeId, action: 'create', category: 'access', label: 'Coaching conversation started',
    object: `With the BiTSy ${coach.name.toLowerCase()} coach${provider === 'sample' ? ' (sample mode, nothing sent)' : ': the coachee\'s name, role, one action and its latest status and feedback sent to BiTSy'}`,
    clientId: user.clientId,
  });
  return { id };
}

export async function ownConversation(id: string, coacheeId: string) {
  return db.coachingConversation.findFirst({ where: { id, coacheeId } });
}

export async function sendTurn(id: string, coacheeId: string, text: string) {
  const conv = await ownConversation(id, coacheeId);
  if (!conv) return { error: "We couldn't find this conversation." };
  if (conv.status !== 'active') return { error: 'This conversation has ended. Start a new one to keep going.' };
  let reply: string;
  try {
    reply = await coachReply(conv.id, conv.provider, conv.agentName, conv.bitsyConversationId, text);
  } catch (e) {
    return { error: e instanceof bitsy.BitsyError ? e.message : "The coach couldn't reply. Try sending your message again." };
  }
  const now = eventTime();
  await db.coachingTurn.createMany({
    data: [
      { id: newId('ct'), conversationId: conv.id, role: 'coachee', text, createdAt: now },
      { id: newId('ct'), conversationId: conv.id, role: 'coach', text: reply || 'The coach sent an empty reply.', createdAt: new Date(now.getTime() + 1) },
    ],
  });
  return { ok: true as const };
}

export async function endCoaching(id: string, coacheeId: string) {
  const conv = await ownConversation(id, coacheeId);
  if (!conv) return { error: "We couldn't find this conversation." };
  if (conv.status === 'ended') return { ok: true as const };
  let insights = sampleInsights(conv.agentName);
  if (conv.provider === 'bitsy' && conv.bitsyConversationId) {
    // The summary is a nice-to-have; ending must still work if it fails.
    try { insights = await bitsy.wrapUpSummary(conv.bitsyConversationId); } catch { insights = { keyTopics: [], insights: [] }; }
    try { await bitsy.endConversation(conv.bitsyConversationId); } catch (e) { console.error('[bitsy] could not end the conversation', e); }
  }
  await db.coachingConversation.update({ where: { id: conv.id }, data: { status: 'ended', endedAt: eventTime(), insights } });
  return { ok: true as const };
}

export async function proposeAction(id: string, coacheeId: string, text: string) {
  const conv = await ownConversation(id, coacheeId);
  if (!conv) return { error: "We couldn't find this conversation." };
  if (text.length < 10) return { error: 'Write the action in a sentence, for example "In Monday\'s one-to-one, I\'ll ask Ana what she\'d try first."' };
  if (text.length > 300) return { error: 'Keep the action to one or two sentences (under 300 characters).' };
  if (conv.proposalStatus === 'approved') return { error: 'Your coach already approved an action from this conversation.' };
  const user = await db.user.findUniqueOrThrow({ where: { id: coacheeId } });
  await db.coachingConversation.update({ where: { id: conv.id }, data: { proposedAction: text, proposalStatus: 'proposed', proposalDecidedAt: null } });
  await audit({ actorId: coacheeId, action: 'create', category: 'access', label: 'Action proposed to the coach', object: 'A new action from a coaching conversation, sent to the coach for approval', clientId: user.clientId });
  return { ok: true as const };
}

/** The coach approves a proposed action: it becomes one of the coachee's actions. */
export async function decideProposal(id: string, coachId: string, approve: boolean) {
  const conv = await db.coachingConversation.findUnique({ where: { id }, include: { coachee: true } });
  if (!conv || conv.proposalStatus !== 'proposed' || !conv.proposedAction) return { error: 'There is no action waiting for approval.' };
  const now = eventTime();
  // The action joins the latest session that has taken place, not an upcoming one.
  const engagement = await db.engagement.findFirst({ where: { coacheeId: conv.coacheeId, coachId }, include: { sessions: { where: { scheduledAt: { lte: now } }, orderBy: { number: 'desc' }, take: 1 } } });
  if (!engagement) return { error: 'Only the coachee\'s coach can approve their actions.' };
  let commitmentId: string | null = null;
  if (approve) {
    const session = engagement.sessions[0];
    if (!session) return { error: 'The coachee has no sessions yet to add the action to.' };
    const text = conv.proposedAction;
    const short = text.length > 60 ? `${text.slice(0, 57).trimEnd()}…` : text;
    commitmentId = newId('c');
    await db.commitment.create({ data: { id: commitmentId, sessionId: session.id, ifThenText: text, title: short, shortTitle: short, createdAt: now, status: 'not_started', approved: true } });
  }
  await db.coachingConversation.update({ where: { id: conv.id }, data: { proposalStatus: approve ? 'approved' : 'declined', proposalDecidedAt: now, createdCommitmentId: commitmentId } });
  await audit({
    actorId: coachId, action: approve ? 'publish' : 'update', category: 'access', label: approve ? 'Proposed action approved' : 'Proposed action declined',
    object: approve ? 'An action the coachee proposed after a coaching conversation, now one of their actions' : 'An action the coachee proposed after a coaching conversation', clientId: conv.coachee.clientId,
  });
  return { ok: true as const, coacheeId: conv.coacheeId };
}
