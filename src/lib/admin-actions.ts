'use server';

// Server actions for the admin console (milestone 5): BTS admins manage clients, policies,
// people, coaching models and integrations; client admins tighten their own settings and
// invite their coachees. Every action re-checks who is acting and writes an audit event.
// STUB: BTS Studio engineering (production auth, invite emails, OAuth installs).

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { FEATURE_LABEL, nextVersion, USED_FOR, type RubricVersion } from './admin';
import { audit } from './audit';
import { stopLinksForClient } from './work-meetings';
import { db } from './db';
import { CHANNEL_LABEL, INTEGRATION_LABEL, MIN_MARKER_KAPPA, REGION_LABEL, ROLE_LABEL, type Channel, type FeatureFlags, type NudgeDefaults, type RubricMarker } from './domain';
import { andList, asJson, count, Count, eventTime, firstName } from './format';
import { currentPersona } from './persona';
import {
  btsPolicy, CAPTURE_RANK, clientRestrictions, combine, covers, formatQuietHours, isTime, MIN_GROUP_FLOOR, parseQuietHours,
  RETENTION_CHOICES, splitTerms, type BtsPolicy, type CapturePolicy, type ClientRestrictions,
} from './policy';
import { isUpcoming } from './queries';
import type { FormState } from './session-actions';

const text = (fd: FormData, name: string) => String(fd.get(name) ?? '').trim();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHANNELS: Channel[] = ['slack', 'teams', 'email'];
const CAPTURE_TEXT: Record<CapturePolicy, string> = {
  sessions: 'capture scheduled coaching sessions',
  allowlist: 'capture allowlisted sessions only',
  companion_mode: 'companion mode without transcripts',
};
const retentionText = (d: number) => (d === 0 ? 'delete right after analysis' : `${count(d)} ${d === 1 ? 'day' : 'days'}`);

function btsAdmin() {
  const p = currentPersona();
  return p.role === 'bts_admin' ? p : null;
}

function refreshAdmin(clientId?: string) {
  revalidatePath('/admin/clients');
  revalidatePath('/admin/people');
  revalidatePath('/admin/audit');
  revalidatePath('/admin/integrations');
  if (clientId) revalidatePath(`/admin/clients/${clientId}/policies`);
  revalidatePath('/client/settings');
  revalidatePath('/client/coachees');
  revalidatePath('/client/results');
}

const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';

async function uniqueId(base: string, exists: (id: string) => Promise<unknown>) {
  let id = base;
  for (let n = 2; await exists(id); n++) id = `${base}-${n}`;
  return id;
}

/** Back to the People page the admin was on, with a result notice (ids only in the URL). */
function backToPeople(returnTo: string, done: string, who: string): never {
  const url = new URL(returnTo.startsWith('/admin/people') ? returnTo : '/admin/people', 'http://x');
  ['change', 'done', 'who'].forEach((k) => url.searchParams.delete(k));
  if (done === 'restored' && url.searchParams.get('role') === 'removed') url.searchParams.set('role', 'all');
  url.searchParams.set('done', done);
  url.searchParams.set('who', who);
  redirect(`${url.pathname}${url.search}`);
}

const nameFromEmail = (email: string) =>
  email.split('@')[0].split(/[._-]+/).filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join(' ') || email;

// ── Clients ─────────────────────────────────────────────────────────────────────────

const TEMPLATES: Record<string, { label: string; capturePolicy: CapturePolicy; retentionDays: number }> = {
  standard: { label: 'Standard', capturePolicy: 'sessions', retentionDays: 7 },
  regulated: { label: 'Regulated industry', capturePolicy: 'allowlist', retentionDays: 0 },
  financial: { label: 'Financial services', capturePolicy: 'companion_mode', retentionDays: 0 },
};
const CHANNEL_CHOICES: Record<string, Channel[]> = { slack: ['slack', 'email'], teams: ['teams', 'email'], email: ['email'] };

function integrationsFor(clientId: string, name: string) {
  const short = name.split(' ')[0];
  return [
    { kind: 'zoom', status: 'connected', detail: 'BTS coaching account. Reads cloud transcripts of consented coaching sessions only.' },
    { kind: 'slack', status: 'not_connected', detail: `${short} workspace. Sends recaps and nudges by direct message. Reads only replies sent to the companion.` },
    { kind: 'teams', status: 'not_connected', detail: 'Installs the companion into scheduled coaching-session chats to read transcripts after the meeting.' },
    { kind: 'calendar', status: 'not_connected', detail: 'Reads meeting titles and times for coachees who allow it, to time check-ins.' },
    { kind: 'google_meet', status: 'planned', detail: 'Planned for a later release.' },
    { kind: 'sounding_board', status: 'not_connected', detail: "Saves approved insights and commitments to each coachee's Leadership Roadmap." },
  ].map((x, i) => ({ ...x, id: `${clientId}-${x.kind}`, clientId, sortOrder: i }));
}

export async function createClient(_prev: FormState, fd: FormData): Promise<FormState> {
  const persona = btsAdmin();
  if (!persona) return { error: 'Only BTS admins can create clients.' };
  const name = text(fd, 'name');
  const region = text(fd, 'region');
  const tpl = TEMPLATES[text(fd, 'template')];
  const offer = text(fd, 'offer');
  const channels = CHANNEL_CHOICES[text(fd, 'channel')];
  const adminEmail = text(fd, 'adminEmail').toLowerCase();
  const start = text(fd, 'start') ? new Date(`${text(fd, 'start')}T00:00:00Z`) : null;
  const end = text(fd, 'end') ? new Date(`${text(fd, 'end')}T00:00:00Z`) : null;

  if (name.length < 2) return { error: 'Enter the client name.' };
  if (name.length > 80) return { error: 'Keep the client name under 80 characters.' };
  if (await db.client.findFirst({ where: { name } })) return { error: `A client called ${name} already exists.` };
  if (!REGION_LABEL[region]) return { error: 'Choose a data region.' };
  if (!tpl) return { error: 'Choose a policy template.' };
  if (!['add_on', 'standalone', 'both'].includes(offer)) return { error: 'Choose a coaching offer.' };
  if (!channels) return { error: 'Choose a nudge channel.' };
  if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) return { error: 'Enter contract dates as full dates.' };
  if (start && end && end <= start) return { error: 'The contract has to end after it starts.' };
  if (adminEmail && !EMAIL.test(adminEmail)) return { error: 'Enter the client admin’s email address, like name@company.com.' };
  if (adminEmail && (await db.user.findUnique({ where: { email: adminEmail } }))) return { error: `${adminEmail} already has an account.` };

  const id = await uniqueId(slug(name), (x) => db.client.findUnique({ where: { id: x } }));
  const rubrics = await db.rubric.findMany({ where: { clientId: null, status: 'published' }, orderBy: { sortOrder: 'asc' } });
  const nudgeDefaults: NudgeDefaults = { channels, midday: '12:00', endOfDay: '17:00', maxPerDay: 2, quietHours: '19:00 to 08:00', pauseOnHolidays: true };
  const flags: FeatureFlags = { askAi: true, practiceFeedback: true, managerView: true, languageMetric: true, standalone: offer !== 'add_on' };
  const admin = adminEmail ? { id: `user-${randomUUID().slice(0, 8)}`, name: nameFromEmail(adminEmail) } : null;

  await db.$transaction(async (tx) => {
    await tx.client.create({
      data: {
        id, name, region, capturePolicy: tpl.capturePolicy, retentionDays: tpl.retentionDays, redactionOn: true, redactionTerms: [],
        nudgeDefaults: nudgeDefaults as object, featureFlags: flags as object, activeRubricIds: rubrics.map((r) => r.id), mcpScopes: [],
        coachingOffer: offer, contractStart: start, contractEnd: end, createdAt: eventTime(),
        // Off by default where transcripts are restricted (HANDOFF: companion mode, sensitive data).
        workMeetings: tpl.capturePolicy === 'sessions' ? 'coachee_picked' : 'off',
      },
    });
    await tx.integration.createMany({ data: integrationsFor(id, name) });
    await audit({ actorId: persona.userId, action: 'create', category: 'config', label: 'Client created', object: `${name}, ${tpl.label.toLowerCase()} template, ${REGION_LABEL[region]} data region`, clientId: id }, tx);
    if (admin) {
      // STUB: BTS Studio engineering (invite email). The person is created as invited.
      await tx.user.create({ data: { id: admin.id, role: 'client_admin', status: 'invited', clientId: id, name: admin.name, email: adminEmail, nudgeChannelOrder: ['email'], createdAt: eventTime() } });
      await audit({ actorId: persona.userId, action: 'create', category: 'config', label: 'Person invited', object: `${admin.name} invited as client admin`, clientId: id }, tx);
    }
  });
  refreshAdmin(id);
  redirect(`/admin/clients/${id}/policies?created=1`);
}

// ── Policies (BTS admin) ────────────────────────────────────────────────────────────

/** Writes the combined policy in force and applies its side effects. */
async function applyPolicy(clientId: string, before: CapturePolicy, b: BtsPolicy, r: ClientRestrictions, actorId: string, extra: object = {}) {
  const inForce = combine(b, r);
  const prior = await db.client.findUniqueOrThrow({ where: { id: clientId } });
  await db.client.update({
    where: { id: clientId },
    data: {
      ...extra,
      btsPolicy: b as object, clientRestrictions: r as object,
      capturePolicy: inForce.capturePolicy, retentionDays: inForce.retentionDays, redactionOn: inForce.redactionOn,
      redactionTerms: inForce.redactionTerms, nudgeDefaults: inForce.nudgeDefaults as object, workMeetings: inForce.workMeetings,
    },
  });
  // Turning work-meeting capture off stops every coachee's linked meetings.
  const stopped = prior.workMeetings === 'coachee_picked' && inForce.workMeetings === 'off' ? await stopLinksForClient(clientId, actorId) : 0;
  const meetingNote = stopped ? `${Count(stopped)} linked work ${stopped === 1 ? 'meeting was' : 'meetings were'} stopped.` : null;
  const capture = captureEffect(clientId, before, inForce.capturePolicy);
  const notes = [await capture, meetingNote].filter(Boolean);
  return notes.length ? notes.join(' ') : null;
}

async function captureEffect(clientId: string, before: CapturePolicy, after: CapturePolicy): Promise<string | null> {
  if (after === before) return null;
  // Companion mode stops capture of every upcoming session.
  if (after === 'companion_mode') {
    const upcoming = await db.session.findMany({ where: { engagement: { clientId }, captureStatus: { in: ['scheduled', 'consented'] } } });
    const ids = upcoming.filter(isUpcoming).map((s) => s.id);
    if (ids.length) await db.session.updateMany({ where: { id: { in: ids } }, data: { captureStatus: 'no_capture' } });
    return ids.length ? `${count(ids.length)} upcoming ${ids.length === 1 ? 'session' : 'sessions'} will run without capture.` : null;
  }
  // Moving to an allowlist starts with an empty list: capture stops until engagements are added.
  if (after === 'allowlist' && before === 'sessions') {
    await db.engagement.updateMany({ where: { clientId }, data: { captureAllowed: false } });
    return 'No engagements are on the allowlist yet. Add them on the People page.';
  }
  return null;
}

function policyChanges(prev: BtsPolicy, next: BtsPolicy): string[] {
  const out: string[] = [];
  if (prev.capturePolicy !== next.capturePolicy) out.push(`Capture set to ${CAPTURE_TEXT[next.capturePolicy]}`);
  if ((prev.workMeetings ?? 'off') !== (next.workMeetings ?? 'off')) out.push(`Work-meeting capture ${next.workMeetings === 'coachee_picked' ? 'on, for meetings coachees pick' : 'off'}`);
  if (prev.retentionDays !== next.retentionDays) out.push(`Transcript retention set to ${retentionText(next.retentionDays)}`);
  if (prev.redactionOn !== next.redactionOn) out.push(`Redaction turned ${next.redactionOn ? 'on' : 'off'}`);
  if (prev.redactionTerms.join('|') !== next.redactionTerms.join('|')) out.push(`Redaction terms changed (${count(next.redactionTerms.length)} ${next.redactionTerms.length === 1 ? 'term' : 'terms'})`);
  const a = prev.nudgeDefaults, b = next.nudgeDefaults;
  if (a.channels.join() !== b.channels.join()) out.push(`Nudge channels set to ${b.channels.map((c) => CHANNEL_LABEL[c]).join(', then ')}`);
  if (a.midday !== b.midday || a.endOfDay !== b.endOfDay) out.push(`Nudge times set to ${b.midday} and ${b.endOfDay}`);
  if (a.maxPerDay !== b.maxPerDay) out.push(`At most ${count(b.maxPerDay)} ${b.maxPerDay === 1 ? 'nudge' : 'nudges'} a day`);
  if (a.quietHours !== b.quietHours) out.push(`Quiet hours set to ${b.quietHours}`);
  return out;
}

export async function savePolicies(clientId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const persona = btsAdmin();
  if (!persona) return { error: 'Only BTS admins can change client policies.' };
  const c = await db.client.findUnique({ where: { id: clientId } });
  if (!c) return { error: "We couldn't find this client." };

  const capture = text(fd, 'capture') as CapturePolicy;
  const workMeetings = text(fd, 'workMeetings') === 'coachee_picked' ? 'coachee_picked' : 'off';
  const retention = Number(text(fd, 'retention'));
  const terms = splitTerms(text(fd, 'terms'));
  const ch1 = text(fd, 'ch1') as Channel;
  const ch2 = text(fd, 'ch2');
  const max = Number(text(fd, 'maxPerDay'));
  const midday = text(fd, 'midday');
  const endOfDay = text(fd, 'endOfDay');
  const quiet = parseQuietHours(text(fd, 'quietHours'));
  const rubricIds = fd.getAll('rubric').map(String);
  const minGroup = Number(text(fd, 'minGroup'));

  if (!(capture in CAPTURE_RANK)) return { error: 'Choose how sessions are captured.' };
  if (!RETENTION_CHOICES.includes(retention)) return { error: 'Choose how long raw transcripts are kept.' };
  if (terms.length > 30 || terms.some((t) => t.length > 60)) return { error: 'Keep to 30 redaction terms, each under 60 characters.' };
  if (!CHANNELS.includes(ch1)) return { error: 'Choose the first nudge channel.' };
  if (ch2 !== 'none' && (!CHANNELS.includes(ch2 as Channel) || ch2 === ch1)) return { error: 'Choose a fallback channel different from the first, or no fallback.' };
  if (max !== 1 && max !== 2) return { error: 'Coachees get one or two nudges a day at most.' };
  if (!isTime(midday) || !isTime(endOfDay)) return { error: 'Enter nudge times in 24-hour format, like 12:00.' };
  if (midday >= endOfDay) return { error: 'The midday nudge has to come before the end-of-day nudge.' };
  if (!quiet) return { error: 'Enter quiet hours like 19:00 to 08:00.' };
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  if ([midday, endOfDay].some((t) => covers(quiet, [toMin(t), (toMin(t) + 5) % 1440]))) return { error: 'Nudge times fall inside quiet hours. Move the nudges or shorten quiet hours.' };
  const published = await db.rubric.findMany({ where: { status: 'published', OR: [{ clientId: null }, { clientId }] } });
  if (rubricIds.some((id) => !published.some((r) => r.id === id))) return { error: 'Only published coaching models can be turned on.' };
  if (rubricIds.length === 0) return { error: 'Turn on at least one coaching model.' };
  if (!Number.isInteger(minGroup) || minGroup < MIN_GROUP_FLOOR || minGroup > 500) return { error: `The smallest report group has to be a whole number of at least ${MIN_GROUP_FLOOR}.` };

  const prev = btsPolicy(c);
  const next: BtsPolicy = {
    capturePolicy: capture,
    workMeetings,
    retentionDays: retention,
    redactionOn: fd.get('redact') === 'on',
    redactionTerms: terms,
    nudgeDefaults: { ...prev.nudgeDefaults, channels: ch2 === 'none' ? [ch1] : [ch1, ch2 as Channel], maxPerDay: max, midday, endOfDay, quietHours: formatQuietHours(text(fd, 'quietHours')) },
  };
  const flagsBefore = asJson<FeatureFlags>(c.featureFlags);
  const flags = Object.fromEntries((Object.keys(FEATURE_LABEL) as (keyof FeatureFlags)[]).map((k) => [k, fd.get(`flag-${k}`) === 'on'])) as unknown as FeatureFlags;
  const rubricsBefore = asJson<string[]>(c.activeRubricIds);

  const changes = policyChanges(prev, next);
  const flipped = (Object.keys(FEATURE_LABEL) as (keyof FeatureFlags)[]).filter((k) => flagsBefore[k] !== flags[k]);
  if (flipped.length) changes.push(`Features changed: ${andList(flipped.map((k) => `${FEATURE_LABEL[k]} ${flags[k] ? 'on' : 'off'}`))}`);
  if ([...rubricsBefore].sort().join() !== [...rubricIds].sort().join()) {
    const names = published.filter((r) => rubricIds.includes(r.id)).map((r) => r.name);
    changes.push(`Coaching models set to ${andList(names)}`);
  }
  if (c.minGroupSize !== minGroup) changes.push(`Smallest report group set to ${count(minGroup)} coachees`);
  if (changes.length === 0) return { message: 'Nothing changed.' };

  const effect = await applyPolicy(c.id, c.capturePolicy as CapturePolicy, next, clientRestrictions(c), persona.userId, { featureFlags: flags as object, activeRubricIds: rubricIds, minGroupSize: minGroup });
  for (const object of changes) await audit({ actorId: persona.userId, action: 'update', category: 'config', label: 'Policy changed', object, clientId: c.id });
  refreshAdmin(c.id);
  const inForce = await db.client.findUniqueOrThrow({ where: { id: c.id } });
  const tightened = inForce.capturePolicy !== next.capturePolicy || inForce.retentionDays !== next.retentionDays;
  return {
    message: [
      `Policies saved for ${c.name}.`,
      effect,
      tightened ? `${c.name.split(' ')[0]}'s own stricter settings still apply.` : null,
    ].filter(Boolean).join(' '),
  };
}

// ── Settings (client admin) ─────────────────────────────────────────────────────────

export async function saveClientSettings(_prev: FormState, fd: FormData): Promise<FormState> {
  const persona = currentPersona();
  if (persona.role !== 'client_admin') return { error: 'Only client admins can change these settings.' };
  const me = await db.user.findUnique({ where: { id: persona.userId }, include: { client: true } });
  const c = me?.client;
  if (!c) return { error: "We couldn't find your organization." };
  const b = btsPolicy(c);
  const before = clientRestrictions(c);

  const companion = fd.get('companion') === 'on';
  const allowlist = fd.get('allowlist') === 'on';
  const retention = Number(text(fd, 'retention'));
  const extraTerms = splitTerms(text(fd, 'terms'));
  const max = Number(text(fd, 'maxPerDay'));
  const quietText = text(fd, 'quietHours');
  const quiet = quietText ? parseQuietHours(quietText) : null;
  const btsQuiet = parseQuietHours(b.nudgeDefaults.quietHours);

  if (!RETENTION_CHOICES.includes(retention) || retention > b.retentionDays) return { error: `Raw transcripts can be kept for ${retentionText(b.retentionDays)} at most.` };
  if (extraTerms.length > 30 || extraTerms.some((t) => t.length > 60)) return { error: 'Keep to 30 extra terms, each under 60 characters.' };
  if (max < 1 || max > b.nudgeDefaults.maxPerDay) return { error: `Coachees get ${count(b.nudgeDefaults.maxPerDay)} nudges a day at most.` };
  if (quietText && !quiet) return { error: 'Enter quiet hours like 19:00 to 08:00.' };
  if (quiet && btsQuiet && !covers(quiet, btsQuiet)) return { error: `Quiet hours can only be longer than BTS's, which are ${b.nudgeDefaults.quietHours}.` };
  if (quiet && [b.nudgeDefaults.midday, b.nudgeDefaults.endOfDay].some((t) => covers(quiet, [Number(t.slice(0, 2)) * 60 + Number(t.slice(3)), Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) + 5]))) {
    return { error: `Quiet hours would cover the ${b.nudgeDefaults.midday} or ${b.nudgeDefaults.endOfDay} nudge. Ask your BTS program lead to move the nudge times first.` };
  }

  const wanted: CapturePolicy = companion ? 'companion_mode' : allowlist ? 'allowlist' : 'sessions';
  const next: ClientRestrictions = {
    capture: CAPTURE_RANK[wanted] > CAPTURE_RANK[b.capturePolicy] ? (wanted as 'allowlist' | 'companion_mode') : undefined,
    retentionDays: retention < b.retentionDays ? retention : undefined,
    extraTerms: extraTerms.length ? extraTerms : undefined,
    maxPerDay: max < b.nudgeDefaults.maxPerDay ? max : undefined,
    quietHours: quiet && formatQuietHours(quietText) !== b.nudgeDefaults.quietHours ? formatQuietHours(quietText) : undefined,
    pauseOnHolidays: fd.get('pauseOnHolidays') === 'on' && !b.nudgeDefaults.pauseOnHolidays ? true : undefined,
    workMeetingsOff: b.workMeetings === 'coachee_picked' && fd.get('workMeetingsOff') === 'on' ? true : undefined,
  };

  const changes: string[] = [];
  if (before.capture !== next.capture) changes.push(`Capture set to ${CAPTURE_TEXT[next.capture ?? b.capturePolicy]}`);
  if (before.retentionDays !== next.retentionDays) changes.push(`Transcript retention set to ${retentionText(next.retentionDays ?? b.retentionDays)}`);
  if ((before.extraTerms ?? []).join('|') !== (next.extraTerms ?? []).join('|')) changes.push(`Extra redaction terms changed (${count(extraTerms.length)} ${extraTerms.length === 1 ? 'term' : 'terms'})`);
  if (before.maxPerDay !== next.maxPerDay) changes.push(`At most ${count(next.maxPerDay ?? b.nudgeDefaults.maxPerDay)} ${(next.maxPerDay ?? 2) === 1 ? 'nudge' : 'nudges'} a day`);
  if (before.quietHours !== next.quietHours) changes.push(`Quiet hours set to ${next.quietHours ?? b.nudgeDefaults.quietHours}`);
  if (Boolean(before.workMeetingsOff) !== Boolean(next.workMeetingsOff)) changes.push(`Work-meeting capture ${next.workMeetingsOff ? 'turned off' : 'back to the BTS setting'}`);
  if (Boolean(before.pauseOnHolidays) !== Boolean(next.pauseOnHolidays)) changes.push(`Nudges ${next.pauseOnHolidays ? 'paused' : 'not paused'} on public holidays`);
  if (changes.length === 0) return { message: 'Nothing changed.' };

  const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)) as ClientRestrictions;
  const effect = await applyPolicy(c.id, c.capturePolicy as CapturePolicy, b, clean, persona.userId);
  for (const object of changes) await audit({ actorId: persona.userId, action: 'update', category: 'config', label: 'Policy changed', object, clientId: c.id });
  refreshAdmin(c.id);
  const allowlistNote = effect?.startsWith('No engagements') ? 'No engagements are on the allowlist yet; your BTS program lead adds them.' : effect;
  return { message: ['Settings saved. They apply from now on.', allowlistNote].filter(Boolean).join(' ') };
}

// ── People ──────────────────────────────────────────────────────────────────────────

async function canManageClient(clientId: string): Promise<{ actorId: string; bts: boolean } | null> {
  const p = currentPersona();
  if (p.role === 'bts_admin') return { actorId: p.userId, bts: true };
  if (p.role === 'client_admin') {
    const me = await db.user.findUnique({ where: { id: p.userId } });
    if (me?.clientId === clientId) return { actorId: p.userId, bts: false };
  }
  return null;
}

async function createPerson(clientId: string, input: { name: string; email: string; role: 'coachee' | 'client_admin'; coachId?: string }) {
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } });
  const id = `user-${randomUUID().slice(0, 8)}`;
  const channels = asJson<NudgeDefaults>(client.nudgeDefaults).channels;
  // STUB: BTS Studio engineering (invite email). People are created as invited.
  await db.user.create({ data: { id, clientId, role: input.role, status: 'invited', name: input.name, email: input.email, nudgeChannelOrder: input.role === 'coachee' ? channels : ['email'], createdAt: eventTime() } });
  if (input.coachId) await createEngagement(client, id, input.coachId);
  return id;
}

async function createEngagement(client: { id: string; activeRubricIds: unknown; capturePolicy: string }, coacheeId: string, coachId: string) {
  const start = eventTime();
  const end = new Date(start.getTime() + 182 * 86_400_000);
  await db.engagement.create({
    data: { id: `eng-${randomUUID().slice(0, 8)}`, clientId: client.id, coacheeId, coachId, start, end, plannedSessions: 8, activeRubricIds: client.activeRubricIds as object, captureAllowed: client.capturePolicy !== 'allowlist' },
  });
}

function validPerson(name: string, email: string): string | null {
  if (name.length < 2) return 'Enter the person’s name.';
  if (name.length > 80) return 'Keep the name under 80 characters.';
  if (!EMAIL.test(email)) return 'Enter an email address, like name@company.com.';
  return null;
}

export async function invitePerson(clientId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const who = await canManageClient(clientId);
  if (!who) return { error: 'You can’t invite people to this client.' };
  const name = text(fd, 'name');
  const email = text(fd, 'email').toLowerCase();
  const role = (who.bts ? text(fd, 'role') : 'coachee') as 'coachee' | 'client_admin';
  const coachId = who.bts && role === 'coachee' ? text(fd, 'coach') : '';
  const invalid = validPerson(name, email);
  if (invalid) return { error: invalid };
  if (role !== 'coachee' && role !== 'client_admin') return { error: 'Choose a role.' };
  if (await db.user.findUnique({ where: { email } })) return { error: `${email} already has an account.` };
  const coach = coachId ? await db.user.findFirst({ where: { id: coachId, role: 'coach' } }) : null;
  if (coachId && !coach) return { error: 'Choose a coach from the list.' };

  await createPerson(clientId, { name, email, role, coachId: coach?.id });
  await audit({ actorId: who.actorId, action: 'create', category: 'config', label: 'Person invited', object: `${name} invited as ${ROLE_LABEL[role].toLowerCase()}${coach ? `, coached by ${coach.name}` : ''}`, clientId });
  if (coach) await audit({ actorId: who.actorId, action: 'assign', category: 'config', label: 'Coach assigned', object: `${coach.name} assigned to ${name}`, clientId });
  refreshAdmin(clientId);
  return { message: `${name} is invited. The prototype doesn't send the invite email.` };
}

export async function importPeople(clientId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const who = await canManageClient(clientId);
  if (!who?.bts) return { error: 'Only BTS admins can import people.' };
  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a CSV file to import.' };
  if (file.size > 200_000) return { error: 'The file is too large. Import up to 500 people at a time.' };
  const lines = (await file.text()).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const header = lines.shift()?.toLowerCase().split(',').map((h) => h.trim().replace(/^"|"$/g, '')) ?? [];
  const col = (h: string) => header.indexOf(h);
  if (col('name') < 0 || col('email') < 0) return { error: 'The first row needs the column names name and email, and optionally role.' };
  if (lines.length > 500) return { error: 'Import up to 500 people at a time.' };

  const problems: string[] = [];
  const seen = new Set<string>();
  const rows: Array<{ name: string; email: string; role: 'coachee' | 'client_admin' }> = [];
  for (const [i, line] of lines.entries()) {
    const cells = line.split(',').map((x) => x.trim().replace(/^"|"$/g, ''));
    const name = cells[col('name')] ?? '';
    const email = (cells[col('email')] ?? '').toLowerCase();
    const roleText = (col('role') >= 0 ? cells[col('role')] : '').toLowerCase().replace(/\s+/g, '_') || 'coachee';
    const role = roleText === 'client_admin' ? 'client_admin' : roleText === 'coachee' ? 'coachee' : null;
    const issue = validPerson(name, email) ?? (role ? null : 'role must be coachee or client admin') ?? (seen.has(email) || (await db.user.findUnique({ where: { email } })) ? 'already has an account' : null);
    if (issue) { problems.push(`row ${i + 2}: ${issue.replace(/\.$/, '').replace(/^Enter/, 'enter')}`); continue; }
    seen.add(email);
    rows.push({ name, email, role: role! });
  }
  for (const r of rows) await createPerson(clientId, r);
  if (rows.length) await audit({ actorId: who.actorId, action: 'create', category: 'config', label: 'People imported', object: `${Count(rows.length)} ${rows.length === 1 ? 'person' : 'people'} invited from a CSV file`, clientId });
  refreshAdmin(clientId);
  const skipped = problems.length ? ` Skipped ${count(problems.length)}: ${problems.slice(0, 3).join('; ')}${problems.length > 3 ? '; and more' : ''}.` : '';
  if (!rows.length) return { error: `No one was imported.${skipped}` };
  return { message: `Invited ${count(rows.length)} ${rows.length === 1 ? 'person' : 'people'}. Coachees without a coach show "Needs a coach".${skipped}` };
}

export async function assignCoach(coacheeId: string, returnTo: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const persona = btsAdmin();
  if (!persona) return { error: 'Only BTS admins can assign coaches.' };
  const coachee = await db.user.findFirst({ where: { id: coacheeId, role: 'coachee' }, include: { client: true, coacheeEngagements: { include: { coach: true } } } });
  if (!coachee?.client) return { error: "We couldn't find this coachee." };
  const coach = await db.user.findFirst({ where: { id: text(fd, 'coach'), role: 'coach' } });
  if (!coach) return { error: `Choose a coach for ${firstName(coachee.name)}.` };
  const current = coachee.coacheeEngagements.find((e) => e.clientId === coachee.clientId);
  if (current?.coachId === coach.id) return { message: `${coach.name} already coaches ${firstName(coachee.name)}.` };

  if (current) await db.engagement.update({ where: { id: current.id }, data: { coachId: coach.id } });
  else await createEngagement(coachee.client, coachee.id, coach.id);
  await audit({
    actorId: persona.userId, action: 'assign', category: 'config', label: current ? 'Coach changed' : 'Coach assigned',
    object: current ? `${coachee.name} moved from ${current.coach.name} to ${coach.name}` : `${coach.name} assigned to ${coachee.name}`, clientId: coachee.clientId,
  });
  refreshAdmin(coachee.clientId!);
  revalidatePath('/coach/coachees');
  revalidatePath('/coach/sessions');
  backToPeople(returnTo, current ? 'changed' : 'assigned', coachee.id);
}

export async function removePerson(userId: string, returnTo: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  const person = await db.user.findUnique({ where: { id: userId }, include: { client: true, coacheeEngagements: { include: { sessions: { include: { transcript: true, summary: true } } } } } });
  if (!person?.clientId || !['coachee', 'client_admin'].includes(person.role)) return { error: "We couldn't find this person." };
  const who = await canManageClient(person.clientId);
  if (!who?.bts) return { error: 'Only BTS admins can remove people.' };
  if (person.status === 'removed') return { message: `${person.name} was already removed.` };
  if (person.role === 'client_admin') {
    const others = await db.user.count({ where: { clientId: person.clientId, role: 'client_admin', status: { not: 'removed' }, id: { not: person.id } } });
    if (others === 0) return { error: `${person.client!.name} needs at least one client admin. Invite another before removing ${firstName(person.name)}.` };
  }

  // Cancel upcoming sessions that hold no session data. STUB: BTS Studio engineering (calendar cancellation).
  const cancel = person.coacheeEngagements.flatMap((e) => e.sessions).filter((s) => isUpcoming(s) && !s.transcript && !s.summary).map((s) => s.id);
  await db.$transaction(async (tx) => {
    if (cancel.length) {
      await tx.nextSessionPlan.deleteMany({ where: { forSessionId: { in: cancel } } });
      await tx.consent.deleteMany({ where: { sessionId: { in: cancel } } });
      await tx.sessionEvent.deleteMany({ where: { sessionId: { in: cancel } } });
      await tx.companionMessage.updateMany({ where: { sessionId: { in: cancel } }, data: { sessionId: null } });
      await tx.aiAnswer.updateMany({ where: { sessionId: { in: cancel } }, data: { sessionId: null } });
      await tx.session.deleteMany({ where: { id: { in: cancel } } });
    }
    await tx.user.update({ where: { id: person.id }, data: { status: 'removed', removedAt: eventTime() } });
    // STUB: BTS Studio engineering (retention job deletes removed people's data after 30 days).
    await audit({ actorId: who.actorId, action: 'unassign', category: 'config', label: 'Person removed', object: `${person.name} removed${cancel.length ? `, ${count(cancel.length)} upcoming ${cancel.length === 1 ? 'session' : 'sessions'} cancelled` : ''}; data deleted after 30 days`, clientId: person.clientId }, tx);
  });
  refreshAdmin(person.clientId);
  revalidatePath('/coach/coachees');
  revalidatePath('/coach/sessions');
  revalidatePath('/coach/plans');
  backToPeople(returnTo, 'removed', person.id);
}

export async function restorePerson(userId: string, returnTo: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  const persona = btsAdmin();
  if (!persona) return { error: 'Only BTS admins can restore people.' };
  const person = await db.user.findUnique({ where: { id: userId } });
  if (!person?.clientId || person.status !== 'removed') return { error: "We couldn't find this person." };
  await db.user.update({ where: { id: person.id }, data: { status: 'active', removedAt: null } });
  await audit({ actorId: persona.userId, action: 'assign', category: 'config', label: 'Person restored', object: `${person.name} restored`, clientId: person.clientId });
  refreshAdmin(person.clientId);
  revalidatePath('/coach/coachees');
  backToPeople(returnTo, 'restored', person.id);
}

export async function resendInvite(userId: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  const person = await db.user.findUnique({ where: { id: userId } });
  if (!person?.clientId || person.status !== 'invited') return { error: "We couldn't find this invite." };
  if (!(await canManageClient(person.clientId))) return { error: 'You can’t manage this invite.' };
  // STUB: BTS Studio engineering (invite email).
  return { message: `Invite ready to resend to ${person.email}. The prototype doesn't send email.` };
}

export async function setCaptureAllowed(engagementId: string, allowed: boolean, _prev: FormState, _fd: FormData): Promise<FormState> {
  const persona = btsAdmin();
  if (!persona) return { error: 'Only BTS admins can change the allowlist.' };
  const e = await db.engagement.findUnique({ where: { id: engagementId }, include: { coachee: true, client: true } });
  if (!e) return { error: "We couldn't find this engagement." };
  await db.engagement.update({ where: { id: e.id }, data: { captureAllowed: allowed } });
  await audit({ actorId: persona.userId, action: allowed ? 'assign' : 'unassign', category: 'consent', label: allowed ? 'Added to allowlist' : 'Removed from allowlist', object: `Sessions with ${e.coachee.name} ${allowed ? 'can be captured with consent' : 'run without capture'}`, clientId: e.clientId });
  refreshAdmin(e.clientId);
  return { message: allowed ? `Sessions with ${firstName(e.coachee.name)} can be captured, with consent each time.` : `Sessions with ${firstName(e.coachee.name)} won't be captured.` };
}

// ── Coaching models ─────────────────────────────────────────────────────────────────


export async function addModel(_prev: FormState, fd: FormData): Promise<FormState> {
  const persona = btsAdmin();
  if (!persona) return { error: 'Only BTS admins can add coaching models.' };
  const name = text(fd, 'name');
  const usedFor = text(fd, 'usedFor');
  const clientId = text(fd, 'client');
  if (name.length < 2 || name.length > 60) return { error: 'Enter a model name under 60 characters.' };
  if (!USED_FOR.includes(usedFor)) return { error: 'Choose what the model is used for.' };
  const client = clientId === 'all' ? null : await db.client.findUnique({ where: { id: clientId } });
  if (clientId !== 'all' && !client) return { error: 'Choose a client, or all clients.' };
  const id = await uniqueId(slug(name), (x) => db.rubric.findUnique({ where: { id: x } }));
  const last = await db.rubric.findFirst({ orderBy: { sortOrder: 'desc' } });
  await db.rubric.create({ data: { id, name, usedFor, version: '0.1', status: 'draft', clientId: client?.id ?? null, markers: [], draftMarkers: [], sortOrder: (last?.sortOrder ?? 0) + 1 } });
  await audit({ actorId: persona.userId, action: 'create', category: 'config', label: 'Model added', object: `${name} draft, for ${client?.name ?? 'all clients'}`, clientId: client?.id });
  revalidatePath('/admin/models');
  redirect(`/admin/models?model=${id}`);
}

async function draftOf(rubricId: string) {
  const r = await db.rubric.findUnique({ where: { id: rubricId } });
  if (!r) return null;
  return { r, markers: asJson<RubricMarker[] | null>(r.draftMarkers) ?? asJson<RubricMarker[]>(r.markers) };
}

export async function addMarker(rubricId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  if (!btsAdmin()) return { error: 'Only BTS admins can change coaching models.' };
  const d = await draftOf(rubricId);
  if (!d) return { error: "We couldn't find this model." };
  const name = text(fd, 'name');
  const check = text(fd, 'check');
  const kappaText = text(fd, 'kappa');
  const kappa = Number(kappaText);
  if (name.length < 2 || name.length > 80) return { error: 'Enter a marker name under 80 characters.' };
  if (check.length < 5 || check.length > 160) return { error: 'Write the yes or no check in one sentence.' };
  if (!kappaText || Number.isNaN(kappa) || kappa < 0 || kappa > 1) return { error: 'Enter the measured agreement as a kappa between 0 and 1, like 0.72.' };
  if (d.markers.some((m) => m.name.toLowerCase() === name.toLowerCase())) return { error: `${d.r.name} already has a marker called ${name}.` };
  const id = await uniqueId(slug(name).replace(/-/g, '_'), async (x) => d.markers.some((m) => m.id === x));
  const markers = [...d.markers, { id, name, shortName: name, check, kappa: Math.round(kappa * 100) / 100 }];
  await db.rubric.update({ where: { id: rubricId }, data: { draftMarkers: markers as object[] } });
  revalidatePath('/admin/models');
  return { message: `${name} added to the draft.${kappa < MIN_MARKER_KAPPA ? ` It stays hidden until agreement reaches ${MIN_MARKER_KAPPA}.` : ''} Publish to use it.` };
}

export async function removeMarker(rubricId: string, markerId: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  if (!btsAdmin()) return { error: 'Only BTS admins can change coaching models.' };
  const d = await draftOf(rubricId);
  if (!d) return { error: "We couldn't find this model." };
  const marker = d.markers.find((m) => m.id === markerId);
  if (!marker) return { error: "We couldn't find this marker." };
  await db.rubric.update({ where: { id: rubricId }, data: { draftMarkers: d.markers.filter((m) => m.id !== markerId) as object[] } });
  revalidatePath('/admin/models');
  redirect(`/admin/models?model=${rubricId}&done=marker-removed`);
}

export async function discardDraft(rubricId: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  if (!btsAdmin()) return { error: 'Only BTS admins can change coaching models.' };
  await db.rubric.update({ where: { id: rubricId }, data: { draftMarkers: null as never } });
  revalidatePath('/admin/models');
  redirect(`/admin/models?model=${rubricId}&done=discarded`);
}

export async function publishModel(rubricId: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  const persona = btsAdmin();
  if (!persona) return { error: 'Only BTS admins can publish coaching models.' };
  const d = await draftOf(rubricId);
  if (!d) return { error: "We couldn't find this model." };
  const { r, markers } = d;
  if (r.status === 'published' && !r.draftMarkers) return { error: 'There are no changes to publish.' };
  if (!markers.some((m) => m.kappa >= MIN_MARKER_KAPPA)) return { error: `Add at least one marker with agreement of ${MIN_MARKER_KAPPA} or more before publishing.` };
  const version = nextVersion(r.version, r.status);
  const history = asJson<RubricVersion[] | null>(r.history) ?? [];
  if (r.status === 'published') history.unshift({ version: r.version, publishedAt: r.publishedAt?.toISOString() ?? null, markers: asJson<RubricMarker[]>(r.markers) });
  await db.rubric.update({ where: { id: r.id }, data: { version, status: 'published', markers: markers as object[], draftMarkers: null as never, history: history as object[], publishedAt: eventTime() } });
  await audit({ actorId: persona.userId, action: 'publish', category: 'config', label: 'Model published', object: `${r.name} version ${version}, ${count(markers.length)} markers`, clientId: r.clientId });
  revalidatePath('/admin/models');
  revalidatePath('/admin/clients', 'layout');
  redirect(`/admin/models?model=${r.id}&done=published`);
}

// ── Integrations (STUB: BTS Studio engineering, OAuth and app installs) ──────────────

export async function changeIntegration(integrationId: string, op: 'connect' | 'disconnect' | 'request', _prev: FormState, _fd: FormData): Promise<FormState> {
  const persona = btsAdmin();
  if (!persona) return { error: 'Only BTS admins can manage integrations.' };
  const i = await db.integration.findUnique({ where: { id: integrationId }, include: { client: true } });
  if (!i || i.status === 'planned') return { error: "This integration isn't available yet." };
  const label = INTEGRATION_LABEL[i.kind];
  if (op === 'request') {
    await audit({ actorId: persona.userId, action: 'update', category: 'config', label: 'Approval requested', object: `${label} install sent to ${i.client.name.split(' ')[0]}'s tenant admin`, clientId: i.clientId });
    revalidatePath('/admin/audit');
    return { message: `Approval request recorded for ${label}. The prototype doesn't contact the tenant admin.` };
  }
  const status = op === 'connect' ? 'connected' : 'not_connected';
  await db.integration.update({ where: { id: i.id }, data: { status } });
  await audit({ actorId: persona.userId, action: op === 'connect' ? 'create' : 'delete', category: 'config', label: op === 'connect' ? 'Integration connected' : 'Integration disconnected', object: `${label} for ${i.client.name}`, clientId: i.clientId });
  refreshAdmin(i.clientId);
  redirect(`/admin/integrations?client=${i.clientId}&done=${op === 'connect' ? 'connected' : 'disconnected'}&which=${i.kind}`);
}

const SCOPE_LABEL: Record<string, string> = { goals: 'goals', commitments: 'actions and their status', summaries: 'approved summaries' };

export async function saveMcpScopes(clientId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const persona = btsAdmin();
  if (!persona) return { error: 'Only BTS admins can change agent access.' };
  const c = await db.client.findUnique({ where: { id: clientId } });
  if (!c) return { error: "We couldn't find this client." };
  const scopes = Object.keys(SCOPE_LABEL).filter((k) => fd.get(`scope-${k}`) === 'on');
  if (scopes.join() === asJson<string[]>(c.mcpScopes).join()) return { message: 'Nothing changed.' };
  await db.client.update({ where: { id: c.id }, data: { mcpScopes: scopes } });
  await audit({ actorId: persona.userId, action: 'update', category: 'access', label: 'Agent access changed', object: scopes.length ? `Agents can read ${andList(scopes.map((s) => SCOPE_LABEL[s]))}` : 'Agents can read nothing', clientId: c.id });
  refreshAdmin(c.id);
  return { message: 'Agent access saved.' };
}
