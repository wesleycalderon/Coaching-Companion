// Client policy has two layers. BTS admins set the policy; client admins can make it
// stricter, never looser. The Client row's own fields hold the combination in force, so
// everything else in the app reads one place.

import type { Client } from '@prisma/client';
import type { NudgeDefaults } from './domain';
import { asJson } from './format';

export type CapturePolicy = 'sessions' | 'allowlist' | 'companion_mode';

export type WorkMeetingPolicy = 'off' | 'coachee_picked';

export interface BtsPolicy {
  capturePolicy: CapturePolicy;
  /** Work meetings the coachee links to an action (milestone 7). */
  workMeetings?: WorkMeetingPolicy;
  retentionDays: number;
  redactionOn: boolean;
  redactionTerms: string[];
  nudgeDefaults: NudgeDefaults;
}

/** Only what the client admin changed. Each field can only tighten BTS's policy. */
export interface ClientRestrictions {
  capture?: 'allowlist' | 'companion_mode';
  retentionDays?: number;
  extraTerms?: string[];
  maxPerDay?: number;
  quietHours?: string;
  pauseOnHolidays?: boolean;
  workMeetingsOff?: boolean;
}

export const CAPTURE_RANK: Record<CapturePolicy, number> = { sessions: 0, allowlist: 1, companion_mode: 2 };
export const RETENTION_CHOICES = [0, 1, 7];
export const MAX_RETENTION_DAYS = 7;
/** BTS admins can raise the reporting threshold but never go under this. */
export const MIN_GROUP_FLOOR = 15;

type PolicyFields = Pick<Client, 'capturePolicy' | 'retentionDays' | 'redactionOn' | 'redactionTerms' | 'nudgeDefaults' | 'btsPolicy' | 'clientRestrictions' | 'workMeetings'>;

export function btsPolicy(c: PolicyFields): BtsPolicy {
  if (c.btsPolicy) {
    const b = asJson<BtsPolicy>(c.btsPolicy);
    return { ...b, workMeetings: b.workMeetings ?? (c.workMeetings as WorkMeetingPolicy) };
  }
  return {
    capturePolicy: c.capturePolicy as CapturePolicy,
    workMeetings: c.workMeetings as WorkMeetingPolicy,
    retentionDays: c.retentionDays,
    redactionOn: c.redactionOn,
    redactionTerms: asJson<string[]>(c.redactionTerms),
    nudgeDefaults: asJson<NudgeDefaults>(c.nudgeDefaults),
  };
}

export const clientRestrictions = (c: PolicyFields): ClientRestrictions => asJson<ClientRestrictions | null>(c.clientRestrictions) ?? {};

/** The policy in force: BTS's, tightened by the client's restrictions. */
export function combine(b: BtsPolicy, r: ClientRestrictions) {
  const capture = r.capture && CAPTURE_RANK[r.capture] > CAPTURE_RANK[b.capturePolicy] ? r.capture : b.capturePolicy;
  const extra = r.extraTerms ?? [];
  const terms = [...new Set([...(b.redactionOn ? b.redactionTerms : []), ...extra])];
  // The client's quiet hours apply only while they still cover BTS's (BTS may have changed them).
  const btsQuiet = parseQuietHours(b.nudgeDefaults.quietHours);
  const clientQuiet = r.quietHours ? parseQuietHours(r.quietHours) : null;
  const quietHours = clientQuiet && (!btsQuiet || covers(clientQuiet, btsQuiet)) ? r.quietHours! : b.nudgeDefaults.quietHours;
  return {
    capturePolicy: capture,
    workMeetings: (r.workMeetingsOff ? 'off' : b.workMeetings ?? 'off') as WorkMeetingPolicy,
    retentionDays: Math.min(b.retentionDays, r.retentionDays ?? MAX_RETENTION_DAYS),
    redactionOn: b.redactionOn || extra.length > 0,
    redactionTerms: terms,
    nudgeDefaults: {
      ...b.nudgeDefaults,
      maxPerDay: Math.min(b.nudgeDefaults.maxPerDay, r.maxPerDay ?? b.nudgeDefaults.maxPerDay),
      quietHours,
      pauseOnHolidays: b.nudgeDefaults.pauseOnHolidays || Boolean(r.pauseOnHolidays),
    },
  };
}

// ── Quiet hours ("19:00 to 08:00") ──────────────────────────────────────────────────

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const isTime = (s: string) => HHMM.test(s);
const mins = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));

export function parseQuietHours(s: string): [number, number] | null {
  const m = s.trim().match(/^(\d{2}:\d{2})\s*(?:to|-|–)\s*(\d{2}:\d{2})$/);
  if (!m || !isTime(m[1]) || !isTime(m[2]) || m[1] === m[2]) return null;
  return [mins(m[1]), mins(m[2])];
}

export const formatQuietHours = (s: string) => s.trim().replace(/\s*(?:-|–|to)\s*/, ' to ');

const inside = ([from, to]: [number, number], t: number) => (from < to ? t >= from && t < to : t >= from || t < to);

/** True when the outer window covers every minute of the inner one. */
export function covers(outer: [number, number], inner: [number, number]): boolean {
  const length = (inner[1] - inner[0] + 1440) % 1440;
  for (let k = 0; k < length; k += 5) if (!inside(outer, (inner[0] + k) % 1440)) return false;
  return true;
}

export const splitTerms = (s: string) => [...new Set(s.split(/[,\n]/).map((t) => t.trim()).filter(Boolean))];
