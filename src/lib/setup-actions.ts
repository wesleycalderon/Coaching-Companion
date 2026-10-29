'use server';

// Server actions for companion setup: agreeing, linking accounts, choosing which meetings the
// companion joins (coaches and coachees), and installing tools for a company (client admins).
// STUB: BTS Studio engineering (auth, OAuth, consent storage).

import type { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { audit } from './audit';
import {
  agree, chooseFor, linkAccount, personState, PROVIDER_LABEL, seriesChoice, seriesFor, setMode, stopUsing, unlinkAccount,
  type Choice, type Provider, type Target,
} from './companion-setup';
import { db } from './db';
import type { CoachPreferences } from './domain';
import { INTEGRATION_LABEL } from './domain';
import { eventTime } from './format';
import { currentPersona } from './persona';
import type { FormState } from './session-actions';

function person() {
  const p = currentPersona();
  return p.role === 'coach' || p.role === 'coachee' ? p : null;
}

function refreshAll() {
  for (const path of ['/coach/settings', '/coach/welcome', '/coach/sessions', '/coach/practice', '/me/settings', '/me/meetings', '/me', '/client/integrations', '/admin/integrations', '/admin/audit']) revalidatePath(path);
}

export async function agreeAction(_prev: FormState, _fd: FormData): Promise<FormState> {
  const p = person();
  if (!p) return { error: 'Only coaches and coachees use the companion.' };
  await agree(p.userId);
  refreshAll();
  const st = await personState(p.userId);
  return { message: st.mode === 'automatic' ? 'Thanks. The companion now joins your meetings unless you turn them off below.' : 'Thanks. The companion joins only the meetings you pick below.' };
}

export async function stopUsingAction(_prev: FormState, _fd: FormData): Promise<FormState> {
  const p = person();
  if (!p) return { error: 'Only coaches and coachees use the companion.' };
  await stopUsing(p.userId);
  refreshAll();
  return { message: 'Done. The companion won’t join any of your sessions or meetings. What it already saved stays until you delete it.' };
}

export async function linkAccountAction(provider: Provider, _prev: FormState, _fd: FormData): Promise<FormState> {
  const p = person();
  if (!p) return { error: 'Only coaches and coachees link accounts.' };
  const r = await linkAccount(p.userId, provider);
  if ('error' in r) return { error: r.error };
  refreshAll();
  return { message: `${PROVIDER_LABEL[provider]} is linked (simulated: no account was contacted).` };
}

export async function unlinkAccountAction(provider: Provider, _prev: FormState, _fd: FormData): Promise<FormState> {
  const p = person();
  if (!p) return { error: 'Only coaches and coachees link accounts.' };
  await unlinkAccount(p.userId, provider);
  refreshAll();
  return { message: `${PROVIDER_LABEL[provider]} is unlinked.` };
}

export async function saveModeAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const p = person();
  if (!p) return { error: 'Only coaches and coachees choose meetings.' };
  const mode = fd.get('mode') === 'manual' ? 'manual' : 'automatic';
  const changed = await setMode(p.userId, mode);
  refreshAll();
  if (!changed) return { message: 'Nothing changed.' };
  return { message: mode === 'automatic' ? 'Automatic: the companion joins every meeting unless you turn it off.' : 'Manual: the companion joins only meetings you pick.' };
}

const CHOICES: Choice[] = ['default', 'on', 'off'];

export async function saveSeriesAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const p = person();
  if (!p) return { error: 'Only coaches and coachees choose meetings.' };
  const st = await personState(p.userId);
  const rows = await seriesFor(st);
  let changed = 0;
  for (const row of rows) {
    const value = String(fd.get(`series:${row.key}`) ?? '');
    if (!CHOICES.includes(value as Choice)) continue;
    if (value === seriesChoice(st, row.target)) continue;
    await chooseFor(p.userId, row.target, value as Choice, row.title);
    changed++;
  }
  refreshAll();
  return { message: changed ? `Saved ${changed === 1 ? 'one change' : `${changed} changes`}.` : 'Nothing changed.' };
}

/** One session or one calendar meeting. `target` is JSON from the screen. */
export async function toggleOneAction(target: string, label: string, choice: Choice, _prev: FormState, _fd: FormData): Promise<FormState> {
  const p = person();
  if (!p) return { error: 'Only coaches and coachees choose meetings.' };
  const raw = JSON.parse(target) as { sessionId?: string; engagementId?: string; seriesId?: string; at?: string };
  const t: Target = { ...raw, at: raw.at ? new Date(raw.at) : undefined };
  if (t.sessionId) {
    const s = await db.session.findFirst({ where: { id: t.sessionId, engagement: { OR: [{ coachId: p.userId }, { coacheeId: p.userId }] } } });
    if (!s) return { error: "We couldn't find this session." };
  }
  await chooseFor(p.userId, t, choice, label);
  refreshAll();
  if (t.sessionId) revalidatePath(`/coach/sessions/${t.sessionId}/live`);
  return { message: choice === 'off' ? `Off for ${label}.` : choice === 'on' ? `On for ${label}.` : `${label} follows your settings again.` };
}

/** Coach welcome: save the meeting choice and preferences, and finish setup. */
export async function finishWelcomeAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const p = currentPersona();
  if (p.role !== 'coach') return { error: 'Only coaches use this setup.' };
  const st = await personState(p.userId);
  if (!st.optedIn) return { error: 'Agree to use the companion first (step 1).' };
  await setMode(p.userId, fd.get('mode') === 'manual' ? 'manual' : 'automatic');
  await savePrefs(p.userId, fd, true);
  refreshAll();
  redirect('/coach/settings?done=setup');
}

export async function saveCoachPrefsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const p = currentPersona();
  if (p.role !== 'coach') return { error: 'Only coaches have these preferences.' };
  await savePrefs(p.userId, fd, false);
  refreshAll();
  return { message: 'Preferences saved.' };
}

async function savePrefs(userId: string, fd: FormData, finish: boolean) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const prefs = (user.preferences ?? {}) as Partial<CoachPreferences>;
  const next: Partial<CoachPreferences> = {
    ...prefs,
    reviewReminder: fd.get('reviewReminder') === '48h' ? '48h' : '24h',
    reminderChannel: fd.get('reminderChannel') === 'slack' ? 'slack' : 'email',
    showPracticeFeedback: fd.get('showPracticeFeedback') === 'on',
    draftPlans: fd.get('draftPlans') === 'on',
    introRead: true,
    ...(finish ? { onboardingComplete: true } : {}),
  };
  await db.user.update({ where: { id: userId }, data: { preferences: next as Prisma.InputJsonValue, nudgeChannelOrder: next.reminderChannel === 'slack' ? ['slack', 'email'] : ['email'] } });
}

// ── Client admins: install tools for their company ──────────────────────────────────

const ADMIN_INSTALLABLE = ['slack', 'teams', 'zoom', 'calendar'];

export async function clientIntegrationAction(integrationId: string, op: 'install' | 'remove', _prev: FormState, _fd: FormData): Promise<FormState> {
  const p = currentPersona();
  if (p.role !== 'client_admin') return { error: 'Only client admins install tools for their company.' };
  const admin = await db.user.findUniqueOrThrow({ where: { id: p.userId } });
  const i = await db.integration.findFirst({ where: { id: integrationId, clientId: admin.clientId ?? '' }, include: { client: true } });
  if (!i || !ADMIN_INSTALLABLE.includes(i.kind)) return { error: "This tool can't be installed here." };
  const label = INTEGRATION_LABEL[i.kind];
  if (op === 'install') {
    await db.integration.update({ where: { id: i.id }, data: { status: 'connected', installedById: admin.id, installedAt: eventTime() } });
    await audit({ actorId: admin.id, action: 'create', category: 'config', label: 'Integration installed', object: `${label} installed for ${i.client.name} by its client admin`, clientId: i.clientId });
  } else {
    await db.integration.update({ where: { id: i.id }, data: { status: 'not_connected', installedById: null, installedAt: null } });
    await audit({ actorId: admin.id, action: 'delete', category: 'config', label: 'Integration removed', object: `${label} removed for ${i.client.name} by its client admin; people's links to it stop working`, clientId: i.clientId });
  }
  refreshAll();
  redirect(`/client/integrations?done=${op === 'install' ? 'installed' : 'removed'}&which=${i.kind}`);
}
