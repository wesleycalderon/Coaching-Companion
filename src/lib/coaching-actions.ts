'use server';

// Server actions for coaching guidance: the coachee starts a conversation with a BiTSy AI coach,
// replies, ends it, shares it and proposes a new action; their human coach approves or declines it.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { audit } from './audit';
import { decideProposal, endCoaching, ownConversation, proposeAction, sendTurn, startCoaching } from './coaching/conversations';
import { COACHES } from './coaching/coaches';
import { db } from './db';
import { firstName } from './format';
import { currentPersona } from './persona';
import type { FormState } from './session-actions';

const text = (fd: FormData, name: string) => String(fd.get(name) ?? '').trim();

function coachee() {
  const p = currentPersona();
  return p.role === 'coachee' ? p : null;
}

export async function startCoachingAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const p = coachee();
  if (!p) return { error: 'Only coachees can start a coaching conversation.' };
  const agentName = text(fd, 'coach');
  if (!COACHES.some((c) => c.id === agentName)) return { error: 'Choose an AI coach.' };
  const opening = text(fd, 'opening');
  if (opening.length > 2000) return { error: 'Keep your first message under 2,000 characters.' };
  const actionId = text(fd, 'action');
  const r = await startCoaching({ coacheeId: p.userId, commitmentId: actionId || null, agentName, opening });
  if ('error' in r) return { error: r.error };
  revalidatePath('/me/coaching');
  redirect(`/me/coaching/${r.id}`);
}

export async function sendCoachingMessageAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const p = coachee();
  if (!p) return { error: 'Only coachees can reply.' };
  const message = text(fd, 'message');
  if (!message) return { error: 'Write a message first.' };
  if (message.length > 2000) return { error: 'Keep your message under 2,000 characters.' };
  const r = await sendTurn(id, p.userId, message);
  if ('error' in r) return { error: r.error };
  revalidatePath(`/me/coaching/${id}`);
  return { message: 'Sent.' };
}

export async function endCoachingAction(id: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  const p = coachee();
  if (!p) return { error: 'Only coachees can end their conversations.' };
  const r = await endCoaching(id, p.userId);
  if ('error' in r) return { error: r.error };
  revalidatePath(`/me/coaching/${id}`);
  revalidatePath('/me/coaching');
  redirect(`/me/coaching/${id}?done=ended`);
}

export async function proposeActionAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const p = coachee();
  if (!p) return { error: 'Only coachees can propose actions.' };
  const r = await proposeAction(id, p.userId, text(fd, 'proposal'));
  if ('error' in r) return { error: r.error };
  const engagement = await db.engagement.findFirst({ where: { coacheeId: p.userId }, include: { coach: true } });
  revalidatePath(`/me/coaching/${id}`);
  revalidatePath(`/coach/coachees/${p.userId}`);
  return { message: `Sent to ${engagement ? firstName(engagement.coach.name) : 'your coach'} to approve.` };
}

export async function shareCoachingAction(id: string, share: boolean, _prev: FormState, _fd: FormData): Promise<FormState> {
  const p = coachee();
  if (!p) return { error: 'Only coachees can share their conversations.' };
  const conv = await ownConversation(id, p.userId);
  if (!conv) return { error: "We couldn't find this conversation." };
  const user = await db.user.findUniqueOrThrow({ where: { id: p.userId }, include: { coacheeEngagements: { include: { coach: true } } } });
  await db.coachingConversation.update({ where: { id }, data: { sharedWithCoach: share } });
  await audit({
    actorId: p.userId, action: share ? 'assign' : 'unassign', category: 'access', label: share ? 'Coaching conversation shared' : 'Coaching conversation sharing stopped',
    object: `A coaching conversation ${share ? 'shared with' : 'no longer shared with'} the coach`, clientId: user.clientId,
  });
  revalidatePath(`/me/coaching/${id}`);
  revalidatePath(`/coach/coachees/${p.userId}`);
  const coach = user.coacheeEngagements[0] ? firstName(user.coacheeEngagements[0].coach.name) : 'Your coach';
  return { message: share ? `${coach} can now read this conversation.` : `${coach} can no longer read this conversation.` };
}

export async function decideProposalAction(id: string, approve: boolean, _prev: FormState, _fd: FormData): Promise<FormState> {
  const p = currentPersona();
  if (p.role !== 'coach') return { error: 'Only the coach can approve actions.' };
  const r = await decideProposal(id, p.userId, approve);
  if ('error' in r) return { error: r.error };
  revalidatePath(`/coach/coachees/${r.coacheeId}`);
  revalidatePath('/me/coaching');
  return { message: approve ? 'Approved. It’s now one of their actions, and check-ins start.' : 'Declined. The coachee sees that you’d rather discuss it in your next session.' };
}
