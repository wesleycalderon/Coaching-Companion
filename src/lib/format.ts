// Formatting in the BTS Studio content style: sentence case, "Tue 21 Oct", "34 percent",
// one through nine spelled out. Seeded times are wall-clock values stored as UTC, so
// every formatter here reads them in UTC (see prisma/schema.prisma).

import { PROTOTYPE_NOW } from '@/config';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');

/** "Tue 21 Oct" */
export const day = (d: Date) => `${WEEKDAY[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH[d.getUTCMonth()]}`;
/** "21 Oct" */
export const dayMonth = (d: Date) => `${d.getUTCDate()} ${MONTH[d.getUTCMonth()]}`;
/** "1 Jul 2026" */
export const fullDate = (d: Date) => `${d.getUTCDate()} ${MONTH[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
/** "10:00" */
export const time = (d: Date) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
/** "Tue 21 Oct · 10:00" */
export const dayTime = (d: Date) => `${day(d)} · ${time(d)}`;
/** "Monday" */
export const weekdayLong = (d: Date) => WEEKDAY_LONG[d.getUTCDay()];

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
/** One through nine as words, 10 and above as numerals. */
export function count(n: number): string {
  return n >= 0 && n < 10 ? WORDS[n] : n.toLocaleString('en-GB');
}
export function Count(n: number): string {
  const s = count(n);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
/** "34 percent" */
export const percent = (n: number) => `${Math.round(n)} percent`;
/** "+32 percent" */
export const signedPercent = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(Math.round(n))} percent`;

/** "sessions 3 and 4", "session 2", "sessions 1, 2 and 3" */
export function sessionList(nums: number[]): string {
  const sorted = [...nums].sort((a, b) => a - b);
  if (sorted.length === 1) return `session ${sorted[0]}`;
  return `sessions ${sorted.slice(0, -1).join(', ')} and ${sorted[sorted.length - 1]}`;
}

/** "a, b and c" */
export function andList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export const firstName = (name: string) => name.split(' ')[0];
export const initials = (name: string) => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

export const now = () => PROTOTYPE_NOW;

/** The live-test user (signed in with Google) runs on real time; everyone else on the prototype's. */
export const clockFor = (user: { liveClock?: boolean } | null | undefined) => (user?.liveClock ? new Date() : now());

/**
 * For display only. Seeded times are wall-clock values stored as UTC; real times for the live
 * user are true UTC, so shift them into the person's time zone before formatting.
 */
export function wall(d: Date, user: { liveClock?: boolean; timeZone?: string } | null | undefined): Date {
  if (!user?.liveClock || !user.timeZone || user.timeZone === 'UTC') return d;
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: user.timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return new Date(Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second')));
}
/**
 * Timestamp for something a person does in the prototype (uploading, approving). Prototype
 * time starts at PROTOTYPE_NOW and moves forward in real time from when the prototype was
 * built, so new events always sort after the seeded ones.
 */
const REAL_EPOCH = Date.UTC(2026, 9, 26, 0, 0);
export function eventTime(): Date {
  return new Date(PROTOTYPE_NOW.getTime() + Math.max(0, Date.now() - REAL_EPOCH));
}
export const daysUntil = (d: Date) => Math.max(0, Math.ceil((d.getTime() - PROTOTYPE_NOW.getTime()) / 86_400_000));

/** Narrow a Prisma Json value to the shape the schema comment documents. */
export const asJson = <T,>(v: unknown) => v as T;
