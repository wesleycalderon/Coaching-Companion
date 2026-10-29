// Companion setup: who has agreed to use the companion, which accounts they linked, and which
// meetings it joins. Rules enforced here, not only in the screens:
//  - nothing is captured for someone who hasn't agreed (one exception: a coachee who allows a
//    single coaching session when asked, which counts as consent for that session only)
//  - after agreeing, every meeting is on ("automatic") unless the person switched to "manual";
//    a one-off choice beats a series choice, which beats the default
//  - a coaching session runs with the companion only when the client's policy allows it and
//    both the coach and the coachee have it on; a Zoom session also needs the coach's Zoom
//  - work meetings keep milestone 7's protections (notice, pause, external skip, own words only)
//    in src/lib/work-meetings.ts; this file only decides which ones are on
// STUB: BTS Studio engineering (consent storage, OAuth, calendar integration).

import { randomUUID } from 'node:crypto';
import type { AccountLink, CaptureRule, CompanionAgreement, Prisma, User } from '@prisma/client';
import { audit } from './audit';
import { calendarFor, seriesStarts, type CalendarEvent } from './calendar';
import { db } from './db';
import { day, dayTime, eventTime, firstName, now } from './format';

export const AGREEMENT_VERSION = '2025-10';
export const WINDOW_DAYS = 14;
const DAY = 86_400_000;
const newId = (p: string) => `${p}-${randomUUID().slice(0, 12)}`;

export type Mode = 'automatic' | 'manual';
export type Choice = 'on' | 'off' | 'default';
export type Provider = 'slack' | 'teams' | 'zoom' | 'calendar';

export interface PersonState {
  user: User & { client: { id: string; name: string; workMeetings: string } | null };
  agreement: CompanionAgreement | null;
  optedIn: boolean;
  mode: Mode;
  rules: CaptureRule[];
  links: AccountLink[];
  /** For coachees: the tools their company's admin installed. Coaches link BTS or their own. */
  installed: string[];
}

export async function personState(userId: string): Promise<PersonState> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { client: true } });
  const [agreement, rules, links, integrations] = await Promise.all([
    db.companionAgreement.findFirst({ where: { userId, revokedAt: null }, orderBy: { agreedAt: 'desc' } }),
    db.captureRule.findMany({ where: { userId } }),
    db.accountLink.findMany({ where: { userId, status: 'linked' } }),
    user.clientId ? db.integration.findMany({ where: { clientId: user.clientId, status: 'connected' } }) : Promise.resolve([]),
  ]);
  return { user, agreement, optedIn: Boolean(agreement), mode: user.captureMode === 'manual' ? 'manual' : 'automatic', rules, links, installed: integrations.map((i) => i.kind) };
}

/** A linked account that works: for coachees, only while their company has the tool installed. */
export const linked = (st: Pick<PersonState, 'links' | 'installed' | 'user'>, provider: Provider) => {
  if (st.user.role !== 'coach' && !st.installed.includes(provider)) return null;
  return st.links.find((l) => l.provider === provider) ?? null;
};
/** The link even if the company has since removed the tool, for the settings screen. */
export const linkRecord = (st: Pick<PersonState, 'links'>, provider: Provider) => st.links.find((l) => l.provider === provider) ?? null;

// ── Deciding one meeting ────────────────────────────────────────────────────────────

export interface Target { sessionId?: string; engagementId?: string; seriesId?: string; at?: Date }
export type Why = 'not_set_up' | 'one_off' | 'series' | 'default';

const sameTime = (a: Date | null, b?: Date) => Boolean(a && b && a.getTime() === b.getTime());
const isOneOff = (r: CaptureRule) => Boolean(r.sessionId || r.at);

function oneOffRule(rules: CaptureRule[], t: Target) {
  return rules.find((r) => (t.sessionId && r.sessionId === t.sessionId) || (t.seriesId && r.seriesId === t.seriesId && sameTime(r.at, t.at)));
}
function seriesRule(rules: CaptureRule[], t: Target) {
  return rules.find((r) => !isOneOff(r) && ((t.engagementId && r.engagementId === t.engagementId) || (t.seriesId && r.seriesId === t.seriesId)));
}

/** One person's choice for one meeting: a one-off choice, then the series, then their default. */
export function decide(st: Pick<PersonState, 'optedIn' | 'mode' | 'rules'>, t: Target): { on: boolean; why: Why } {
  const one = oneOffRule(st.rules, t);
  if (!st.optedIn) return one?.choice === 'on' && t.sessionId ? { on: true, why: 'one_off' } : { on: false, why: 'not_set_up' };
  if (one) return { on: one.choice === 'on', why: 'one_off' };
  const series = seriesRule(st.rules, t);
  if (series) return { on: series.choice === 'on', why: 'series' };
  return { on: st.mode === 'automatic', why: 'default' };
}

/** The series choice as the settings screen shows it. */
export function seriesChoice(st: Pick<PersonState, 'rules'>, t: Target): Choice {
  const r = seriesRule(st.rules, t);
  return r ? (r.choice as Choice) : 'default';
}
export function oneOffChoice(st: Pick<PersonState, 'rules'>, t: Target): Choice {
  const r = oneOffRule(st.rules, t);
  return r ? (r.choice as Choice) : 'default';
}

/** Saves one choice. 'default' removes it, so the series or the person's default applies again. */
export async function setRule(userId: string, t: Target, choice: Choice) {
  const rules = await db.captureRule.findMany({ where: { userId } });
  const oneOff = Boolean(t.sessionId || t.at);
  const existing = oneOff ? oneOffRule(rules, t) : seriesRule(rules, t);
  if (choice === 'default') {
    if (existing) await db.captureRule.delete({ where: { id: existing.id } });
  } else if (existing) {
    await db.captureRule.update({ where: { id: existing.id }, data: { choice, createdAt: eventTime() } });
  } else {
    await db.captureRule.create({
      data: {
        id: newId('rule'), userId, choice, createdAt: eventTime(),
        sessionId: t.sessionId ?? null, engagementId: oneOff ? null : t.engagementId ?? null, seriesId: t.seriesId ?? null, at: t.at ?? null,
      },
    });
  }
}

// ── Coaching sessions ───────────────────────────────────────────────────────────────

export const SESSION_REASON: Record<string, (coach: string, coachee: string) => string> = {
  policy: () => "The client's policy doesn't allow capture",
  coach_off: (coach) => `${coach} turned it off`,
  coachee_off: (_, coachee) => `${coachee} turned it off`,
  coach_not_set_up: (coach) => `${coach} hasn't set up the companion`,
  coachee_not_set_up: (_, coachee) => `${coachee} hasn't set up the companion`,
  coach_no_zoom: (coach) => `${coach} hasn't linked Zoom`,
};

/** The same reasons, said to the person they're about. */
const MY_REASON: Record<string, string> = {
  'coach:coach_off': 'You turned it off', 'coach:coach_not_set_up': 'You haven’t set up the companion', 'coach:coach_no_zoom': 'Link your Zoom account to capture it',
  'coachee:coachee_off': 'You turned it off', 'coachee:coachee_not_set_up': 'You haven’t set up the companion',
};

/** Works out whether the companion joins an upcoming session, and keeps its consent rows in step. */
export async function refreshSession(sessionId: string) {
  const s = await db.session.findUnique({ where: { id: sessionId }, include: { engagement: { include: { client: true } }, consents: true } });
  if (!s || s.scheduledAt.getTime() <= now().getTime()) return;
  if (['captured', 'paused', 'removed'].includes(s.captureStatus)) return;
  const { engagement: e } = s;
  const [coach, coachee] = await Promise.all([personState(e.coachId), personState(e.coacheeId)]);
  const target = { sessionId: s.id, engagementId: e.id };
  const coachDecision = decide(coach, target);
  const coacheeDecision = decide(coachee, target);
  let reason: string | null = null;
  if (e.client.capturePolicy === 'companion_mode' || (e.client.capturePolicy === 'allowlist' && !e.captureAllowed)) reason = 'policy';
  else if (!coachDecision.on) reason = coachDecision.why === 'not_set_up' ? 'coach_not_set_up' : 'coach_off';
  else if (s.platform === 'zoom' && !linked(coach, 'zoom')) reason = 'coach_no_zoom';
  else if (!coacheeDecision.on) reason = coacheeDecision.why === 'not_set_up' ? 'coachee_not_set_up' : 'coachee_off';

  // Standing consent: the person's settings stand in for asking before each session.
  // STUB: BTS Studio engineering (legal review of standing consent).
  const at = eventTime();
  for (const [userId, on] of [[e.coachId, coachDecision.on], [e.coacheeId, coacheeDecision.on]] as const) {
    const current = s.consents.filter((c) => c.userId === userId && c.grantedAt && !c.revokedAt);
    if (on && !reason && current.length === 0) {
      await db.consent.upsert({
        where: { id: `standing-${s.id}-${userId}` },
        create: { id: `standing-${s.id}-${userId}`, sessionId: s.id, userId, channel: 'standing', grantedAt: at },
        update: { grantedAt: at, revokedAt: null },
      });
    } else if (!on && current.length) {
      await db.consent.updateMany({ where: { id: { in: current.map((c) => c.id) } }, data: { revokedAt: at } });
    }
  }
  await db.session.update({ where: { id: s.id }, data: { captureStatus: reason ? 'no_capture' : 'consented', captureReason: reason } });
}

/** Refreshes every upcoming session the person coaches or is coached in. */
export async function refreshUpcomingSessions(userId: string) {
  const sessions = await db.session.findMany({ where: { scheduledAt: { gt: now() }, engagement: { OR: [{ coachId: userId }, { coacheeId: userId }] } }, select: { id: true } });
  for (const s of sessions) await refreshSession(s.id);
}

// ── Calendar meetings ───────────────────────────────────────────────────────────────

/** Whether the person's work meetings can be captured at all: client policy and a linked calendar. */
export function meetingsAllowed(st: PersonState): { ok: boolean; why?: string } {
  if (st.user.role === 'coachee') {
    if (st.user.client?.workMeetings !== 'coachee_picked') return { ok: false, why: `${st.user.client?.name.split(' ')[0] ?? 'Your organization'} has turned off work-meeting capture.` };
  }
  if (!linked(st, 'calendar')) return { ok: false, why: 'Link your calendar so the companion can see your meetings.' };
  return { ok: true };
}

const window = () => ({ from: now(), until: new Date(now().getTime() + WINDOW_DAYS * DAY) });
export const startsInWindow = (ev: CalendarEvent) => { const w = window(); return seriesStarts(ev, w.from, w.until); };

/**
 * Brings the person's meeting links in step with their settings: a meeting that's on gets a
 * link (created on demand) and an occurrence; one that's turned off has its occurrence set "off".
 * Links focused on an action count as on for their series.
 */
export async function syncMeetings(userId: string) {
  const st = await personState(userId);
  if (st.user.role !== 'coachee' && st.user.role !== 'coach') return;
  const allowed = meetingsAllowed(st).ok;
  const ownerRole = st.user.role;
  const links = await db.meetingLink.findMany({ where: { coacheeId: userId, stoppedAt: null }, include: { occurrences: true } });
  const engagement = ownerRole === 'coachee' ? await db.engagement.findFirst({ where: { coacheeId: userId }, orderBy: { start: 'desc' } }) : null;
  for (const ev of calendarFor(st.user)) {
    // A meeting with someone from outside is never captured, so the companion doesn't add it.
    if (ev.attendees.some((a) => !a.internal)) continue;
    const starts = startsInWindow(ev);
    let link = links.find((l) => l.calendarEventId === ev.id && (!l.expiresAt || l.expiresAt > now()));
    const decisions = starts.map((at) => {
      const d = decide(st, { seriesId: ev.id, at });
      // A link focused on an action is an explicit choice for its series.
      const focused = link?.commitmentId && d.why === 'default';
      return { at, on: allowed && (d.on || Boolean(focused)) };
    });
    if (!link && decisions.some((d) => d.on)) {
      const created = await db.meetingLink.create({
        data: {
          id: newId('ml'), coacheeId: userId, ownerRole, origin: st.mode === 'automatic' ? 'automatic' : 'picked', commitmentId: null,
          scope: ev.recurring ? 'series' : 'single', calendarEventId: ev.id, title: ev.title, cadence: ev.recurring ? ev.cadence ?? null : null,
          createdAt: eventTime(), expiresAt: engagement?.end ?? null, lastConfirmedAt: eventTime(),
        },
      });
      link = { ...created, occurrences: [] };
    }
    if (!link) continue;
    for (const { at, on } of decisions) {
      const occ = link.occurrences.find((o) => o.scheduledAt.getTime() === at.getTime());
      if (on && !occ) {
        await db.meetingOccurrence.create({
          data: {
            id: newId('mo'), linkId: link.id, scheduledAt: at, endsAt: new Date(at.getTime() + ev.minutes * 60_000),
            attendees: ev.attendees.map((a) => ({ ...a, agreedAt: null, declinedAt: null })) as unknown as Prisma.InputJsonValue, captureStatus: 'scheduled',
          },
        });
      } else if (on && occ?.captureStatus === 'off') {
        await db.meetingOccurrence.update({ where: { id: occ.id }, data: { captureStatus: 'scheduled' } });
      } else if (!on && occ?.captureStatus === 'scheduled') {
        await db.meetingOccurrence.update({ where: { id: occ.id }, data: { captureStatus: 'off' } });
      }
    }
  }
}

// ── What the settings screens list ──────────────────────────────────────────────────

export interface SeriesRow { key: string; title: string; detail: string; target: Target; choice: Choice; on: boolean; note?: string }
export interface UpcomingRow { key: string; title: string; at: Date; kind: 'session' | 'meeting'; target: Target; on: boolean; reason: string; oneOff: Choice; href?: string; myOn: boolean; canToggle: boolean }

/** Recurring things the person can set: coaching series (per engagement) and calendar meetings. */
export async function seriesFor(st: PersonState): Promise<SeriesRow[]> {
  const rows: SeriesRow[] = [];
  const engagements = await db.engagement.findMany({
    where: { OR: [{ coachId: st.user.id }, { coacheeId: st.user.id }], sessions: { some: { scheduledAt: { gt: now() } } } },
    include: { coach: true, coachee: true, client: true }, orderBy: { start: 'asc' },
  });
  for (const e of engagements) {
    const other = st.user.id === e.coachId ? e.coachee : e.coach;
    const t = { engagementId: e.id };
    const choice = seriesChoice(st, t);
    rows.push({
      key: `eng:${e.id}`, title: `Coaching sessions with ${other.name}`, detail: st.user.id === e.coachId ? e.client.name : 'Your coach',
      target: t, choice, on: decide(st, t).on,
      note: e.client.capturePolicy === 'companion_mode' ? `${e.client.name.split(' ')[0]} uses companion mode: no transcripts, whatever you choose.` : undefined,
    });
  }
  const external = (ev: CalendarEvent) => ev.attendees.some((a) => !a.internal);
  for (const ev of calendarFor(st.user)) {
    const t = { seriesId: ev.id };
    rows.push({
      key: `cal:${ev.id}`, title: ev.title, detail: ev.recurring ? ev.cadence ?? 'Repeats' : `One meeting, ${dayTime(ev.nextAt)}`,
      target: t, choice: seriesChoice(st, t), on: decide(st, t).on,
      note: external(ev) ? 'Someone from outside is invited, so it’s never captured.' : undefined,
    });
  }
  return rows;
}

const OFF_WHY: Record<Why, string> = { not_set_up: 'You haven’t set up the companion', one_off: 'You turned it off for this one', series: 'You turned off this series', default: 'Manual: you haven’t picked it' };

/** Everything in the next two weeks, with whether the companion joins and why not. */
export async function upcomingFor(st: PersonState): Promise<UpcomingRow[]> {
  const rows: UpcomingRow[] = [];
  const w = window();
  const sessions = await db.session.findMany({
    where: { scheduledAt: { gt: w.from, lte: w.until }, engagement: { OR: [{ coachId: st.user.id }, { coacheeId: st.user.id }] } },
    include: { engagement: { include: { coach: true, coachee: true } } }, orderBy: { scheduledAt: 'asc' },
  });
  const isCoach = st.user.role === 'coach';
  for (const s of sessions) {
    const e = s.engagement;
    const other = isCoach ? e.coachee : e.coach;
    const t = { sessionId: s.id, engagementId: e.id };
    const mine = MY_REASON[`${isCoach ? 'coach' : 'coachee'}:${s.captureReason}`];
    const reason = s.captureStatus === 'removed' ? 'The companion was removed from this session'
      : !s.captureReason ? '' : mine ?? SESSION_REASON[s.captureReason]?.(firstName(e.coach.name), firstName(e.coachee.name)) ?? '';
    rows.push({
      key: `s:${s.id}`, title: `Session ${s.number} with ${other.name}`, at: s.scheduledAt, kind: 'session', target: t,
      on: s.captureStatus === 'consented',
      reason, oneOff: oneOffChoice(st, t), href: isCoach ? `/coach/sessions/${s.id}/live` : undefined,
      myOn: decide(st, t).on, canToggle: st.optedIn && s.captureReason !== 'policy' && s.captureStatus !== 'removed',
    });
  }
  const allowed = meetingsAllowed(st);
  const links = await db.meetingLink.findMany({ where: { coacheeId: st.user.id }, include: { occurrences: true } });
  for (const ev of calendarFor(st.user)) {
    for (const at of startsInWindow(ev)) {
      const t = { seriesId: ev.id, at };
      const d = decide(st, t);
      const link = links.find((l) => l.calendarEventId === ev.id && !l.stoppedAt);
      const occ = link?.occurrences.find((o) => o.scheduledAt.getTime() === at.getTime());
      const focused = Boolean(link?.commitmentId) && d.why === 'default';
      const external = ev.attendees.some((a) => !a.internal);
      const on = allowed.ok && (d.on || focused) && !external;
      const reason = !allowed.ok ? allowed.why! : external ? 'Someone from outside is invited, so it isn’t captured' : on ? '' : OFF_WHY[d.why];
      rows.push({
        key: `m:${ev.id}:${at.toISOString()}`, title: ev.title, at, kind: 'meeting', target: t, on, reason, oneOff: oneOffChoice(st, t),
        myOn: d.on || focused, canToggle: st.optedIn && allowed.ok && !external,
        href: occ && link ? (isCoach ? `/coach/meetings/${link.id}` : `/me/meetings/${link.id}`) : undefined,
      });
    }
  }
  return rows.sort((a, b) => a.at.getTime() - b.at.getTime());
}

// ── Agreement and accounts ──────────────────────────────────────────────────────────

/** Re-applies a person's settings to their sessions and meetings after any change. */
export async function applySettings(userId: string) {
  await refreshUpcomingSessions(userId);
  await syncMeetings(userId);
}

export async function agree(userId: string, channel: 'web' | 'slack' | 'teams' = 'web') {
  const st = await personState(userId);
  if (st.optedIn) return;
  await db.companionAgreement.create({ data: { id: newId('agree'), userId, version: AGREEMENT_VERSION, channel, agreedAt: eventTime() } });
  await audit({ actorId: userId, action: 'create', category: 'consent', label: 'Companion agreement given', object: `Agreed to the companion (version ${AGREEMENT_VERSION}); ${st.mode} meeting choice`, clientId: st.user.clientId });
  await applySettings(userId);
}

export async function stopUsing(userId: string) {
  const st = await personState(userId);
  if (!st.agreement) return;
  await db.companionAgreement.update({ where: { id: st.agreement.id }, data: { revokedAt: eventTime() } });
  await audit({ actorId: userId, action: 'unassign', category: 'consent', label: 'Companion agreement withdrawn', object: 'The companion stops joining every upcoming session and meeting', clientId: st.user.clientId });
  await applySettings(userId);
}

/** Which accounts each role links, and where they come from. */
export function providersFor(role: string): Provider[] {
  return role === 'coach' ? ['slack', 'zoom', 'calendar'] : ['slack', 'teams', 'calendar'];
}

export const PROVIDER_LABEL: Record<Provider, string> = { slack: 'Slack', teams: 'Microsoft Teams', zoom: 'Zoom', calendar: 'Calendar' };

/** What linking does, per role and provider. */
export function providerPurpose(role: string, p: Provider, clientShort: string) {
  if (role === 'coach') {
    return {
      slack: 'BTS Slack. The companion messages you here: session heads-ups and review reminders.',
      zoom: 'Your own Zoom account. Transcripts arrive automatically, only for sessions and meetings that are on.',
      calendar: 'Your calendar. Lists your meetings so you can choose which the companion joins. Titles, times and who’s invited only.',
      teams: '',
    }[p];
  }
  return {
    slack: `${clientShort}'s Slack. The companion sends recaps, check-ins and questions here.`,
    teams: `${clientShort}'s Microsoft Teams. The companion sends recaps, check-ins and questions here.`,
    calendar: 'Your work calendar. Lists your meetings so you can choose which the companion joins, and times check-ins. Titles, times and who’s invited only.',
    zoom: '',
  }[p];
}

/** For a coachee, a provider is available only when their company's admin installed it. */
export async function providerAvailable(st: PersonState, p: Provider): Promise<boolean> {
  return st.user.role === 'coach' || st.installed.includes(p);
}

export async function linkAccount(userId: string, p: Provider) {
  const st = await personState(userId);
  if (!providersFor(st.user.role).includes(p)) return { error: `${PROVIDER_LABEL[p]} isn't used for your role.` } as const;
  if (!(await providerAvailable(st, p))) return { error: `${st.user.client?.name.split(' ')[0] ?? 'Your organization'} hasn't installed ${PROVIDER_LABEL[p]} yet. Ask your admin.` } as const;
  if (linkRecord(st, p)) return { ok: true } as const;
  const workspace = st.user.role === 'coach' && p === 'slack' ? 'bts' : st.user.role === 'coach' ? 'own' : st.user.clientId!;
  const where = workspace === 'bts' ? 'BTS' : workspace === 'own' ? 'your own' : st.user.client!.name.split(' ')[0];
  await db.accountLink.create({
    data: {
      id: newId('acct'), userId, provider: p, workspace, externalId: `${p}-${userId}-${Date.now().toString(36)}`,
      displayName: `${st.user.email} · ${where} ${PROVIDER_LABEL[p]}`, status: 'linked', linkedAt: eventTime(),
    },
  });
  await audit({ actorId: userId, action: 'create', category: 'config', label: 'Account linked', object: `${PROVIDER_LABEL[p]} (${workspace === 'bts' ? 'BTS workspace' : workspace === 'own' ? 'own account' : `${where} workspace`}) linked for the companion`, clientId: st.user.clientId });
  await applySettings(userId);
  return { ok: true } as const;
}

export async function unlinkAccount(userId: string, p: Provider) {
  const st = await personState(userId);
  const l = linkRecord(st, p);
  if (!l) return;
  await db.accountLink.update({ where: { id: l.id }, data: { status: 'revoked', revokedAt: eventTime() } });
  await audit({ actorId: userId, action: 'delete', category: 'config', label: 'Account unlinked', object: `${PROVIDER_LABEL[p]} unlinked from the companion`, clientId: st.user.clientId });
  await applySettings(userId);
}

export async function setMode(userId: string, mode: Mode) {
  const st = await personState(userId);
  if (st.mode === mode) return false;
  await db.user.update({ where: { id: userId }, data: { captureMode: mode } });
  await audit({ actorId: userId, action: 'update', category: 'consent', label: 'Meeting choice changed', object: mode === 'automatic' ? 'Automatic: every meeting is on unless turned off' : 'Manual: only meetings the person picks are on', clientId: st.user.clientId });
  await applySettings(userId);
  return true;
}

/** Saves a series or one-off choice, audits it and re-applies the settings. */
export async function chooseFor(userId: string, t: Target, choice: Choice, label: string) {
  const st = await personState(userId);
  await setRule(userId, t, choice);
  const what = t.sessionId || t.at ? `${label}${t.at ? ` on ${day(t.at)}` : ''}` : `${label} (series)`;
  await audit({ actorId: userId, action: choice === 'off' ? 'unassign' : 'update', category: 'consent', label: choice === 'on' ? 'Companion turned on' : choice === 'off' ? 'Companion turned off' : 'Back to the default', object: what, clientId: st.user.clientId });
  await applySettings(userId);
}
