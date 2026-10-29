// Live test: the real person who signs in with Google becomes a coachee in a test client, coached
// by Daniel, with their real calendar linked. See docs/live-test.md.
// STUB: BTS Studio engineering. Production sign-in is SSO; tokens are encrypted at rest.

import { randomBytes, randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { audit } from './audit';
import { applySettings } from './companion-setup';
import { db } from './db';
import { eventTime, now } from './format';

export const LIVE_CLIENT = 'client-live';
const COACH = 'daniel';
const newId = (p: string) => `${p}-${randomUUID().slice(0, 12)}`;

// ── One-time OAuth state ────────────────────────────────────────────────────────────

export async function newOAuthState(provider: 'google' | 'zoom', userId?: string) {
  const state = randomBytes(24).toString('base64url');
  await db.oAuthState.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.oAuthState.create({ data: { state, provider, userId: userId ?? null, expiresAt: new Date(Date.now() + 10 * 60_000) } });
  return state;
}

/** Uses up a state. Null when it's unknown, expired or for another provider. */
export async function takeOAuthState(state: string | null, provider: 'google' | 'zoom') {
  if (!state) return null;
  const row = await db.oAuthState.findUnique({ where: { state } });
  if (!row) return null;
  await db.oAuthState.delete({ where: { state } });
  return row.provider === provider && row.expiresAt > new Date() ? row : null;
}

// ── The test client and the person ──────────────────────────────────────────────────

/** A copy of Northwind's policy, named for the test, with capture and work meetings on. */
async function ensureLiveClient(domain: string) {
  const existing = await db.client.findUnique({ where: { id: LIVE_CLIENT } });
  if (existing) {
    const domains = (existing.internalDomains as string[] | null) ?? [];
    if (!domains.includes(domain)) await db.client.update({ where: { id: LIVE_CLIENT }, data: { internalDomains: [...domains, domain] } });
    return;
  }
  const template = await db.client.findUniqueOrThrow({ where: { id: 'northwind' } });
  const { id: _id, createdAt: _c, users: _u, ...rest } = template as typeof template & { users?: unknown };
  const json = (v: unknown) => (v === null ? undefined : (v as Prisma.InputJsonValue));
  await db.client.create({
    data: {
      ...rest, id: LIVE_CLIENT, name: 'Your company (test)', capturePolicy: 'sessions', workMeetings: 'coachee_picked',
      redactionTerms: json(rest.redactionTerms)!, nudgeDefaults: json(rest.nudgeDefaults)!, featureFlags: json(rest.featureFlags)!,
      activeRubricIds: json(rest.activeRubricIds)!, mcpScopes: json(rest.mcpScopes)!, btsPolicy: json(rest.btsPolicy), clientRestrictions: json(rest.clientRestrictions),
      internalDomains: [domain],
    },
  });
  // The test company "installed" Slack and Google Calendar; Zoom is each person's own account.
  for (const [kind, detail] of [['slack', 'Your Slack test workspace (from SLACK_BOT_TOKEN)'], ['calendar', 'Google Calendar, read-only, for the person who signed in'], ['zoom', 'Each person links their own Zoom account']] as const) {
    await db.integration.create({ data: { id: `int-live-${kind}`, clientId: LIVE_CLIENT, kind, status: 'connected', detail, installedById: 'noor', installedAt: eventTime() } });
  }
}

interface Profile { sub: string; email: string; name?: string }
interface Tokens { access_token: string; refresh_token?: string; expires_in: number }

/** Creates or updates the signed-in person and links their Google Calendar. Returns their user id. */
export async function upsertLiveUser(profile: Profile, tokens: Tokens): Promise<string> {
  const id = `live-${profile.sub.replace(/[^\w-]/g, '').slice(0, 40)}`;
  const domain = profile.email.split('@')[1]?.toLowerCase() ?? '';
  await ensureLiveClient(domain);
  const name = profile.name?.trim() || profile.email.split('@')[0];
  const template = await db.user.findUniqueOrThrow({ where: { id: 'priya' } });
  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    // Emails are unique. If a demo account already uses this one (say, an invite sent to yourself),
    // keep that account and plus-address this one: name+live@domain reaches the same inbox.
    const taken = await db.user.findUnique({ where: { email: profile.email } });
    const [local, at] = profile.email.split('@');
    const email = taken ? `${local}+live@${at}` : profile.email;
    await db.user.create({
      data: {
        id, role: 'coachee', clientId: LIVE_CLIENT, name, email, jobTitle: 'Test coachee', timeZone: 'UTC',
        nudgeChannelOrder: ['slack', 'email'], preferences: (template.preferences ?? undefined) as Prisma.InputJsonValue | undefined,
        liveClock: true, captureMode: 'automatic',
      },
    });
    // Coached by Daniel. The engagement and its first session sit on the prototype's dates, like
    // everyone else's coaching; only meetings run on real time.
    const start = new Date(now().getTime() - 14 * 86_400_000);
    await db.engagement.create({ data: { id: `eng-${id}`, clientId: LIVE_CLIENT, coacheeId: id, coachId: COACH, start, end: null, plannedSessions: 8, activeRubricIds: ['roadmap'] } });
    await db.session.create({ data: { id: `s-${id}-1`, engagementId: `eng-${id}`, number: 1, scheduledAt: start, endsAt: new Date(start.getTime() + 3_600_000), platform: 'zoom', captureStatus: 'no_capture' } });
    await audit({ actorId: id, action: 'create', category: 'access', label: 'Signed in with Google (live test)', object: `${profile.email} joined the test client, coached by Daniel Okafor`, clientId: LIVE_CLIENT });
  }
  const expires = new Date(Date.now() + tokens.expires_in * 1000);
  const cal = await db.accountLink.findFirst({ where: { userId: id, provider: 'calendar', status: 'linked' } });
  if (cal) {
    await db.accountLink.update({ where: { id: cal.id }, data: { accessToken: tokens.access_token, tokenExpiresAt: expires, ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}) } });
  } else {
    await db.accountLink.create({
      data: {
        id: newId('acct'), userId: id, provider: 'calendar', workspace: LIVE_CLIENT, externalId: profile.email, displayName: `${profile.email} · Google Calendar`,
        status: 'linked', linkedAt: eventTime(), accessToken: tokens.access_token, refreshToken: tokens.refresh_token ?? null, tokenExpiresAt: expires, meta: { email: profile.email },
      },
    });
    await audit({ actorId: id, action: 'create', category: 'config', label: 'Account linked', object: 'Google Calendar (read-only) linked for the companion', clientId: LIVE_CLIENT });
  }
  // Slack: messages go to SLACK_TEST_USER_ID, which is you.
  if (!(await db.accountLink.findFirst({ where: { userId: id, provider: 'slack', status: 'linked' } }))) {
    await db.accountLink.create({ data: { id: newId('acct'), userId: id, provider: 'slack', workspace: LIVE_CLIENT, externalId: process.env.SLACK_TEST_USER_ID || 'slack-test-user', displayName: 'Your Slack test workspace', status: 'linked', linkedAt: eventTime() } });
  }
  return id;
}

/** Test shortcut: the actions the person wants to practice, recorded as approved by Daniel. */
export async function setLiveActions(userId: string, texts: string[]) {
  const sessionId = `s-${userId}-1`;
  const session = await db.session.findUnique({ where: { id: sessionId } });
  if (!session) return { error: 'Sign in with Google again to set up your test account.' } as const;
  const clean = texts.map((t) => t.trim()).filter(Boolean).slice(0, 3);
  if (!clean.length) return { error: 'Write at least one action you want to practice.' } as const;
  if (clean.some((t) => t.length > 240)) return { error: 'Keep each action under 240 characters.' } as const;
  const existing = await db.commitment.findMany({ where: { sessionId } });
  // Keep actions already used by meetings or conversations; replace the rest.
  for (const c of existing) {
    const used = await db.meetingLink.count({ where: { commitmentId: c.id } }) + await db.coachingConversation.count({ where: { commitmentId: c.id } });
    if (used) await db.commitment.update({ where: { id: c.id }, data: { status: 'set_aside', setAsideReason: 'replaced in the live test' } });
    else await db.commitment.delete({ where: { id: c.id } });
  }
  for (const [i, text] of clean.entries()) {
    const short = text.length > 60 ? `${text.slice(0, 57)}…` : text;
    await db.commitment.create({
      data: { id: newId('c'), sessionId, ifThenText: text, title: short, shortTitle: short.slice(0, 40), createdAt: new Date(session.endsAt.getTime() + i), status: 'not_started', approved: true },
    });
  }
  await audit({ actorId: userId, action: 'create', category: 'config', label: 'Test actions set', object: `${clean.length} ${clean.length === 1 ? 'action' : 'actions'} recorded as approved by the coach (live-test shortcut)`, clientId: LIVE_CLIENT });
  await applySettings(userId);
  return { ok: true } as const;
}
