'use server';

// Server actions for the coach tools (milestone 4) and the coach manager view. Every action
// re-checks who is acting. STUB: BTS Studio engineering (production auth).

import { revalidatePath } from 'next/cache';
import { askAi, draftPlan } from './ai/coach-tools';
import { db } from './db';
import type { FeatureFlags } from './domain';
import { asJson, day, eventTime, firstName, time } from './format';
import { currentPersona } from './persona';
import { isUpcoming } from './queries';
import type { FormState } from './session-actions';

const text = (formData: FormData, name: string) => String(formData.get(name) ?? '').trim();

// ── Ask the AI ──────────────────────────────────────────────────────────────────────

export async function askAboutSession(sessionId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const persona = currentPersona();
  if (persona.role !== 'coach') return { error: 'Only the coach can ask about a session.' };
  const s = await db.session.findUnique({ where: { id: sessionId }, include: { engagement: { include: { client: true } } } });
  if (!s || s.engagement.coachId !== persona.userId) return { error: "We couldn't find this session." };
  if (!asJson<FeatureFlags>(s.engagement.client.featureFlags).askAi) return { error: `${s.engagement.client.name} has turned off Ask the AI.` };
  const scope = text(formData, 'scope') === 'engagement' ? 'engagement' : 'session';
  const result = await askAi({ askerId: persona.userId, scope, question: text(formData, 'question'), engagementId: s.engagementId, sessionId });
  if ('error' in result) return { error: result.error };
  revalidatePath(`/coach/sessions/${sessionId}/review`);
  return { message: 'Answer added below.' };
}

export async function askAboutPractice(_prev: FormState, formData: FormData): Promise<FormState> {
  const persona = currentPersona();
  if (persona.role !== 'coach') return { error: 'Only coaches can ask about their practice.' };
  const result = await askAi({ askerId: persona.userId, scope: 'practice', question: text(formData, 'question') });
  if ('error' in result) return { error: result.error };
  revalidatePath('/coach/practice');
  return { message: 'Answer added below.' };
}

// ── Next-session plan ───────────────────────────────────────────────────────────────

async function ownUpcomingSession(sessionId: string) {
  const persona = currentPersona();
  if (persona.role !== 'coach') return null;
  const s = await db.session.findUnique({ where: { id: sessionId }, include: { engagement: { include: { coachee: true } } } });
  return s && s.engagement.coachId === persona.userId ? s : null;
}

export async function draftPlanFor(sessionId: string, _prev: FormState, _formData: FormData): Promise<FormState> {
  const s = await ownUpcomingSession(sessionId);
  if (!s) return { error: "We couldn't find this session." };
  if (!isUpcoming(s)) return { error: 'This session has already happened.' };
  const result = await draftPlan(sessionId);
  if ('error' in result) return { error: result.error };
  revalidatePath('/coach/plans');
  revalidatePath(`/coach/coachees/${s.engagement.coacheeId}/plan`);
  return { message: `Plan drafted for session ${s.number}. Edit anything before the session.` };
}

export async function savePlan(sessionId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const s = await ownUpcomingSession(sessionId);
  if (!s) return { error: "We couldn't find this session." };
  const focus = text(formData, 'focus');
  const questions = formData.getAll('question').map((q) => String(q).trim()).filter(Boolean);
  if (!focus) return { error: 'Write a focus for the session, or redraft the plan.' };
  if (questions.length === 0) return { error: 'Keep at least one question.' };
  if (questions.length > 7) return { error: 'Keep the plan to seven questions or fewer.' };
  if (questions.some((q) => q.length > 240) || focus.length > 600) return { error: 'Shorten the focus or a question. Keep each under a few sentences.' };
  await db.nextSessionPlan.update({ where: { forSessionId: sessionId }, data: { suggestedFocus: focus, questions, editedAt: eventTime() } });
  revalidatePath(`/coach/coachees/${s.engagement.coacheeId}/plan`);
  return { message: 'Plan saved. Only you can see it.' };
}

/**
 * Book or move the next session. STUB: calendar integration. The prototype offers three
 * fixed times and sends no calendar invite.
 */
export async function scheduleNextSession(coacheeId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const persona = currentPersona();
  if (persona.role !== 'coach') return { error: 'Only the coach can schedule a session.' };
  const e = await db.engagement.findFirst({ where: { coacheeId, coachId: persona.userId }, include: { coachee: true, client: true, sessions: { orderBy: { number: 'asc' } } } });
  if (!e) return { error: "We couldn't find this coachee." };
  const start = new Date(text(formData, 'slot'));
  if (Number.isNaN(start.getTime()) || isUpcoming({ scheduledAt: start }) === false) return { error: 'Choose one of the proposed times.' };
  const withoutCapture = text(formData, 'capture') === 'none' || e.client.capturePolicy === 'companion_mode' || (e.client.capturePolicy === 'allowlist' && !e.captureAllowed);
  const end = new Date(start.getTime() + 3_600_000);
  const next = e.sessions.find(isUpcoming);
  const last = e.sessions[e.sessions.length - 1];
  const now = eventTime();
  const who = firstName(e.coachee.name);

  let number: number;
  if (next) {
    number = next.number;
    const captureStatus = withoutCapture ? 'no_capture' : next.captureStatus === 'no_capture' ? 'scheduled' : next.captureStatus;
    await db.session.update({ where: { id: next.id }, data: { scheduledAt: start, endsAt: end, captureStatus } });
  } else {
    number = (last?.number ?? 0) + 1;
    await db.session.create({
      data: {
        id: `${e.id}-s${number}`, engagementId: e.id, number, scheduledAt: start, endsAt: end, platform: last?.platform ?? 'zoom',
        meetingId: (last?.platform ?? 'zoom') === 'zoom' ? String(85_000_000_000 + now.getTime() % 1_000_000_000) : null,
        captureStatus: withoutCapture ? 'no_capture' : 'scheduled',
      },
    });
  }
  // The coach's choice for this session goes into their companion settings; the session then
  // follows both people's settings (src/lib/companion-setup.ts).
  const { refreshSession, setRule } = await import('./companion-setup');
  const sessionId = next?.id ?? `${e.id}-s${number}`;
  if (text(formData, 'capture') === 'none') await setRule(persona.userId, { sessionId, engagementId: e.id }, 'off');
  await refreshSession(sessionId);
  if (withoutCapture) {
    await db.auditEvent.create({ data: { id: `audit-${e.id}-s${number}-nocapture-${now.getTime()}`, actorId: persona.userId, action: 'update', category: 'consent', label: 'Capture turned off', object: `Session ${number} with ${e.coachee.name} runs without capture`, clientId: e.clientId, at: now } });
  }
  revalidatePath(`/coach/coachees/${coacheeId}/plan`);
  revalidatePath(`/coach/coachees/${coacheeId}`);
  revalidatePath('/coach/plans');
  revalidatePath('/coach/sessions');
  return {
    message: `Session ${number} ${next ? 'moved to' : 'booked for'} ${day(start)} at ${time(start)}. ${withoutCapture ? `It runs without capture.` : `The companion joins if ${who}'s settings have it on too.`} Calendar invites aren't sent from the prototype.`,
  };
}

// ── Practice: growth area and manager notes ─────────────────────────────────────────

export async function saveGrowthArea(_prev: FormState, formData: FormData): Promise<FormState> {
  const persona = currentPersona();
  if (persona.role !== 'coach') return { error: 'Only coaches choose a growth area.' };
  const area = text(formData, 'growthArea');
  if (area.length > 80) return { error: 'Keep the growth area under 80 characters.' };
  await db.user.update({ where: { id: persona.userId }, data: { growthArea: area || null } });
  revalidatePath('/coach/practice');
  revalidatePath('/manager/coaches');
  return { message: area ? 'Growth area saved. Your coach manager can see it.' : 'Growth area cleared.' };
}

export async function shareManagerNote(coachId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const persona = currentPersona();
  if (persona.role !== 'coach_manager') return { error: 'Only coach managers can share notes.' };
  const coach = await db.user.findFirst({ where: { id: coachId, managerId: persona.userId, role: 'coach' } });
  if (!coach) return { error: "You don't support this coach." };
  const note = text(formData, 'note');
  if (note.length < 3) return { error: `Write a note for ${firstName(coach.name)} first.` };
  if (note.length > 600) return { error: 'Keep the note under 600 characters.' };
  const now = eventTime();
  await db.managerNote.create({ data: { id: `mnote-${coachId}-${now.getTime()}`, managerId: persona.userId, coachId, text: note, createdAt: now } });
  revalidatePath('/manager/coaches');
  revalidatePath('/coach/practice');
  return { message: `Shared with ${firstName(coach.name)}. It appears on their My practice page.` };
}
