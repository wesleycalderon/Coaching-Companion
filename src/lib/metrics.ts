// The three renewal metrics, computed from data for one client:
//  1. Commitment follow-up rate: actions revisited within seven days of being set, by a
//     check-in the coachee answered or by the next session (a quote shows it discussed).
//  2. Commitment movement: actions tried, practiced or now a habit.
//  3. Coaching-language adoption: open and curiosity questions per 1,000 of the coachee's own
//     words, latest session against their first two.
//
// Minimum group size: every figure is shown only when the coachees behind it number at least
// the client's minimum (15 by default). A figure from fewer people is hidden, never rounded or
// blurred, so no one can be singled out. Client admins and BTS admins see the same rule.

import { db } from './db';
import type { CommitmentStatus, FeatureFlags, SetAsideReason } from './domain';
import { asJson, now } from './format';

export type Period = 'all' | '30d';
export const PERIOD_LABEL: Record<Period, string> = { all: 'Since program start', '30d': 'Last 30 days' };
export const FOLLOW_UP_DAYS = 7;
const DAY = 86_400_000;

/** A figure, or the reason it's hidden: too few coachees behind it, or turned off. */
export type Gated<T> = { shown: true; coachees: number; value: T } | { shown: false; coachees: number; reason: 'small_group' | 'off' | 'no_data' };

const STATUSES: CommitmentStatus[] = ['not_started', 'tried', 'practiced', 'habit', 'set_aside'];

export async function clientMetrics(clientId: string, period: Period = 'all') {
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } });
  const min = client.minGroupSize;
  const end = now();
  const from = period === '30d' ? new Date(end.getTime() - 30 * DAY) : null;
  const gate = <T,>(coachees: number, value: () => T): Gated<T> => (coachees >= min ? { shown: true, coachees, value: value() } : { shown: false, coachees, reason: 'small_group' });

  const enrolled = await db.user.count({ where: { clientId, role: 'coachee', status: { not: 'removed' } } });
  const inPeriod = from
    ? (await db.session.findMany({
        where: { engagement: { clientId, coachee: { status: { not: 'removed' } } }, scheduledAt: { gt: from, lte: end } },
        select: { engagement: { select: { coacheeId: true } } },
      })).map((s) => s.engagement.coacheeId)
    : null;
  const coachees = inPeriod ? new Set(inPeriod).size : enrolled;
  const hidden = coachees < min;
  const base = { client, period, from, end, coachees, enrolled, min, hidden };
  if (hidden) return { ...base, hidden: true } as const;

  // Approved actions set in the period, by coachees still in the program.
  const commitments = await db.commitment.findMany({
    where: { approved: true, createdAt: { ...(from ? { gt: from } : {}), lte: end }, session: { engagement: { clientId, coachee: { status: { not: 'removed' } } } } },
    include: { checkIns: true, session: { select: { engagement: { select: { coacheeId: true } } } } },
  });
  const owner = (c: (typeof commitments)[number]) => c.session.engagement.coacheeId;
  const people = (list: typeof commitments) => new Set(list.map(owner)).size;

  // 2. Movement and where actions are now.
  const movement = gate(people(commitments), () => {
    const total = commitments.length;
    const share = (n: number) => (total ? (n / total) * 100 : 0);
    const status = Object.fromEntries(STATUSES.map((s) => [s, share(commitments.filter((c) => c.status === s).length)])) as Record<CommitmentStatus, number>;
    const firstTries = commitments.flatMap((c) => {
      const tries = c.checkIns.filter((x) => x.response === 'tried').map((x) => (x.respondedAt ?? x.sentAt).getTime());
      return tries.length ? [(Math.min(...tries) - c.createdAt.getTime()) / DAY] : [];
    });
    return {
      total,
      status,
      triedOrFurther: status.tried + status.practiced + status.habit,
      daysToTry: firstTries.length ? Math.round(firstTries.reduce((a, b) => a + b, 0) / firstTries.length) : null,
    };
  });

  // 1. Follow-up. Only actions at least seven days old can be judged.
  const judged = commitments.filter((c) => end.getTime() - c.createdAt.getTime() >= FOLLOW_UP_DAYS * DAY);
  const revisitedAt = (c: (typeof commitments)[number]) => {
    const times = [...c.checkIns.filter((x) => x.respondedAt).map((x) => x.respondedAt!.getTime()), ...(c.discussedAt ? [c.discussedAt.getTime()] : [])];
    return times.length ? Math.min(...times) : null;
  };
  const followUp = gate(people(judged), () => {
    const done = judged.filter((c) => {
      const t = revisitedAt(c);
      return t !== null && t - c.createdAt.getTime() <= FOLLOW_UP_DAYS * DAY;
    });
    return { rate: judged.length ? (done.length / judged.length) * 100 : 0, judged: judged.length, byCheckIn: done.filter((c) => c.checkIns.some((x) => x.respondedAt)).length, bySession: done.filter((c) => c.discussedAt).length };
  });

  // Why actions are set aside, from the coachee's own answers.
  const setAsides = commitments.flatMap((c) => c.checkIns.filter((x) => x.response === 'set_aside').map((x) => ({ who: owner(c), reason: x.setAsideReason })));
  const reasons = gate(new Set(setAsides.map((x) => x.who)).size, () => (['time_pressure', 'less_relevant', 'other'] as SetAsideReason[]).map((r) => ({
    reason: r,
    pct: setAsides.length ? (setAsides.filter((x) => x.reason === r).length / setAsides.length) * 100 : 0,
  })));

  // 3. Coaching language: open and curiosity questions per 1,000 words, latest measured
  // session in the period against the mean of the coachee's first two, for coachees with
  // three or more measured sessions.
  let language: Gated<{ change: number; baseline: number; latest: number }>;
  if (!asJson<FeatureFlags>(client.featureFlags).languageMetric) {
    language = { shown: false, coachees: 0, reason: 'off' };
  } else {
    const markers = await db.languageMarker.findMany({
      where: { marker: { in: ['open_question', 'curiosity_question'] }, session: { scheduledAt: { lte: end }, engagement: { clientId, coachee: { status: { not: 'removed' } } } } },
      include: { session: { select: { scheduledAt: true } } },
    });
    const perCoachee = new Map<string, Map<number, number>>();
    for (const m of markers) {
      const sessions = perCoachee.get(m.userId) ?? new Map<number, number>();
      const at = m.session.scheduledAt.getTime();
      sessions.set(at, (sessions.get(at) ?? 0) + m.per1kWords);
      perCoachee.set(m.userId, sessions);
    }
    let baseline = 0, latest = 0, n = 0;
    for (const sessions of perCoachee.values()) {
      const ordered = [...sessions.entries()].sort((a, b) => a[0] - b[0]);
      if (ordered.length < 3) continue;
      const last = ordered[ordered.length - 1];
      if (from && last[0] <= from.getTime()) continue;
      baseline += (ordered[0][1] + ordered[1][1]) / 2;
      latest += last[1];
      n++;
    }
    language = n === 0 ? { shown: false, coachees: 0, reason: 'no_data' }
      : gate(n, () => ({ change: baseline ? (latest / baseline - 1) * 100 : 0, baseline: baseline / n, latest: latest / n }));
  }

  // Development themes: the Roadmap leadership capabilities on coachees' goals, each listed
  // only when enough coachees share it.
  const goals = await db.goal.findMany({ where: { engagement: { clientId, coachee: { status: { not: 'removed' } } } }, include: { engagement: { select: { coacheeId: true } } } });
  const byTheme = new Map<string, Set<string>>();
  for (const g of goals) for (const cap of asJson<string[]>(g.capabilities)) byTheme.set(cap, (byTheme.get(cap) ?? new Set()).add(g.engagement.coacheeId));
  const ranked = [...byTheme.entries()].map(([theme, who]) => ({ theme, coachees: who.size })).sort((a, b) => b.coachees - a.coachees);
  const themes = { listed: ranked.filter((t) => t.coachees >= min).slice(0, 3).map((t) => t.theme), withheld: ranked.filter((t) => t.coachees < min).length };

  return { ...base, hidden: false, movement, followUp, reasons, language, themes } as const;
}

export type ClientMetrics = Awaited<ReturnType<typeof clientMetrics>>;
