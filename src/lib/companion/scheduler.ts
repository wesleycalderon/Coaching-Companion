// The twice-daily nudge slots (HANDOFF: about 12:00 and 17:00 in the coachee's time zone).
// Every five minutes, each coachee whose local time is inside a slot gets one message about
// their most recent open action: a midday nudge or an end-of-day check-in. Respects each
// client's quiet hours and daily maximum, and never sends a slot twice in one day.

import { db } from '../db';
import type { CoacheePreferences, NudgeDefaults } from '../domain';
import { asJson, eventTime } from '../format';
import { sendNudge } from './send';

const SLOT_MINUTES = 5;
type Slot = 'midday' | 'end_of_day';

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

function localMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

function inQuietHours(minutes: number, quiet: string | null | undefined): boolean {
  const m = /^(\d{1,2}:\d{2}) to (\d{1,2}:\d{2})$/.exec(quiet ?? '');
  if (!m) return false;
  const [from, to] = [toMinutes(m[1]), toMinutes(m[2])];
  return from <= to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
}

/**
 * Send whatever is due. `force` sends a slot to every eligible coachee regardless of their
 * local time (the prototype's "run the scheduler now" control).
 */
export async function runNudges(at: Date = new Date(), force?: Slot): Promise<string[]> {
  const log: string[] = [];
  const coachees = await db.user.findMany({
    where: { role: 'coachee', status: 'active', coacheeEngagements: { some: {} } },
    include: { client: true },
  });
  const dayStart = new Date(eventTime());
  dayStart.setUTCHours(0, 0, 0, 0);

  for (const u of coachees) {
    if (!u.client) continue;
    const defaults = asJson<NudgeDefaults>(u.client.nudgeDefaults);
    const prefs = (u.preferences ?? {}) as Partial<CoacheePreferences>;
    const local = localMinutes(at, u.timeZone);
    const slots: Array<[Slot, string]> = [['midday', prefs.midday ?? defaults.midday], ['end_of_day', prefs.endOfDay ?? defaults.endOfDay]];
    const due = force ?? slots.find(([, t]) => local >= toMinutes(t) && local < toMinutes(t) + SLOT_MINUTES)?.[0];
    if (!due) continue;
    if (!force && inQuietHours(local, u.quietHours ?? defaults.quietHours)) continue;

    const sentToday = await db.companionMessage.findMany({ where: { recipientId: u.id, kind: { in: ['nudge', 'check_in'] }, sentAt: { gte: dayStart } } });
    if (sentToday.length >= defaults.maxPerDay) continue;
    if (sentToday.some((m) => m.kind === (due === 'midday' ? 'nudge' : 'check_in'))) continue;

    const action = await db.commitment.findFirst({
      where: { approved: true, status: { in: ['not_started', 'tried', 'practiced'] }, session: { engagement: { coacheeId: u.id } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    if (!action) continue;
    await sendNudge(action.id, due);
    log.push(`${due} → ${u.name}: ${action.title}`);
  }
  return log;
}

/**
 * AI task 8 runs the day before: draft a plan for every session in the next 36 hours that
 * doesn't have one. The coach edits it before the session.
 */
export async function draftDuePlans(at: Date = eventTime()): Promise<string[]> {
  const { draftPlan } = await import('../ai/coach-tools');
  const due = await db.session.findMany({
    where: { scheduledAt: { gt: at, lte: new Date(at.getTime() + 36 * 3_600_000) }, plan: null },
    include: { engagement: { include: { coachee: true } } },
  });
  const log: string[] = [];
  for (const s of due) {
    const r = await draftPlan(s.id);
    log.push('error' in r ? `plan for ${s.engagement.coachee.name} session ${s.number} not drafted: ${r.error}` : `drafted plan for ${s.engagement.coachee.name} session ${s.number}`);
  }
  return log;
}
