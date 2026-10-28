// Coach practice feedback (AI task 9) aggregates: shown to the coach and, as trends only,
// to their coach manager. Developmental only; never used to assign work.

import { db } from './db';
import { MIN_SESSIONS_FOR_TREND, type MarkerResult, type RubricMarker } from './domain';
import { asJson, now, percent } from './format';

const WINDOW_DAYS = 90;
const RECENT = 6;

export async function practiceFor(coachId: string) {
  const since = new Date(now().getTime() - WINDOW_DAYS * 86_400_000);
  const rows = await db.practiceFeedback.findMany({
    where: { coachId, session: { scheduledAt: { gte: since, lte: now() } } },
    include: { session: { include: { engagement: { include: { coachee: true } }, commitments: true } } },
    orderBy: { session: { scheduledAt: 'asc' } },
  });
  const recent = rows.slice(-RECENT);
  const earlier = rows.slice(0, -RECENT);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  const talkNow = avg(recent.map((r) => r.coachTalkShare));
  const talkBefore = avg(earlier.map((r) => r.coachTalkShare));
  const openNow = avg(recent.map((r) => r.openQuestionShare));
  const openBefore = avg(earlier.map((r) => r.openQuestionShare));
  const withCommitment = recent.filter((r) => r.session.commitments.length > 0).length;
  return { rows, recent, earlier, talkNow, talkBefore, openNow, openBefore, withCommitment };
}

export function trend(current: number, previous: number, n: number): string {
  if (n < MIN_SESSIONS_FOR_TREND) return 'Not enough sessions yet';
  const d = current - previous;
  if (Math.abs(d) < 1) return `${percent(current)}, steady`;
  return `${percent(current)}, ${d < 0 ? 'down' : 'up'} from ${previous}`;
}

/** Marker id ("icf.goal") to its rubric definition. Markers below the agreement bar are dropped. */
export async function markerIndex() {
  const rubrics = await db.rubric.findMany();
  const map = new Map<string, RubricMarker>();
  for (const r of rubrics) for (const m of asJson<RubricMarker[]>(r.markers)) map.set(`${r.id}.${m.id}`, m);
  return map;
}

export function observedCount(rows: { markerResults: unknown }[], markerId: string) {
  return rows.filter((r) => asJson<MarkerResult[]>(r.markerResults).some((m) => m.markerId === markerId && m.observed)).length;
}
