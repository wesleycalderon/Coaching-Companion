// Domain vocabulary shared by the seed, queries and screens. The database stores these
// as strings (see prisma/schema.prisma); this file is where they are typed and labelled.

import type { StatusBadgeTone, EventAction } from '@/ds/types';

export type Role = 'coachee' | 'coach' | 'coach_manager' | 'client_admin' | 'bts_admin' | 'system';
export const ROLE_LABEL: Record<Role, string> = {
  coachee: 'Coachee',
  coach: 'Coach',
  coach_manager: 'Coach manager',
  client_admin: 'Client admin',
  bts_admin: 'BTS admin',
  system: 'Companion',
};

export type CapturePolicy = 'sessions' | 'allowlist' | 'companion_mode';
export type CaptureStatus = 'scheduled' | 'consented' | 'captured' | 'paused' | 'removed' | 'no_capture';
export type SummaryStatus = 'draft' | 'approved' | 'suppressed';
export type CommitmentStatus = 'not_started' | 'tried' | 'practiced' | 'habit' | 'set_aside';
export type CheckInResponse = 'tried' | 'not_yet' | 'set_aside' | 'swapped' | 'will_try';
export type SetAsideReason = 'time_pressure' | 'less_relevant' | 'other';
/** What a recap holds: insights, and suggested updates to the Roadmap goal. */
export type SummaryItemKind = 'insight' | 'thinking' | 'behaving';
export type AuditCategory = 'consent' | 'config' | 'access' | 'delete';
export type IntegrationStatus = 'connected' | 'needs_approval' | 'not_connected' | 'planned';
export type Channel = 'slack' | 'teams' | 'email';

// Status tone mapping from HANDOFF.md.
export const COMMITMENT_STATUS: Record<CommitmentStatus, { label: string; tone: StatusBadgeTone }> = {
  not_started: { label: 'Not started', tone: 'neutral' },
  tried: { label: 'Tried', tone: 'info' },
  practiced: { label: 'Practiced', tone: 'live' },
  habit: { label: 'Habit', tone: 'success' },
  set_aside: { label: 'Set aside', tone: 'warning' },
};

export const CHECK_IN_RESPONSE_LABEL: Record<CheckInResponse, string> = {
  tried: 'Tried it',
  not_yet: 'Not yet',
  set_aside: 'Set aside for now',
  swapped: 'Swapped for another',
  will_try: "I'll try it",
};

export const SET_ASIDE_REASON_LABEL: Record<SetAsideReason, string> = {
  time_pressure: 'Time pressure',
  less_relevant: 'Less relevant to daily work',
  other: 'Other',
};

/**
 * Label for a recap item. Suggested updates to ways of thinking and behaving wait for the
 * coachee's okay before they change the Roadmap goal.
 */
export function summaryItemLabel(item: SummaryItem, audience: 'coach' | 'coachee', coachFirst?: string): string {
  if (item.kind === 'insight') {
    if (item.source === 'coach_notes') return audience === 'coach' ? 'Insight · from your notes' : `Insight · from ${coachFirst ?? 'your coach'}'s notes`;
    return 'Insight';
  }
  const base = item.kind === 'thinking' ? 'Ways of thinking' : 'Ways of behaving';
  if (item.status === 'accepted') return base;
  return `${base} · ${audience === 'coach' ? 'suggested update' : 'suggested'}`;
}

export const REGION_LABEL: Record<string, string> = {
  united_states: 'United States',
  european_union: 'European Union',
  united_kingdom: 'United Kingdom',
};

export const CHANNEL_LABEL: Record<Channel, string> = {
  slack: 'Slack',
  teams: 'Microsoft Teams',
  email: 'Email',
};

export const AUDIT_CATEGORY_LABEL: Record<AuditCategory, string> = {
  consent: 'Consent',
  config: 'Configuration',
  access: 'Data access',
  delete: 'Deletions',
};

export const INTEGRATION_LABEL: Record<string, string> = {
  zoom: 'Zoom',
  slack: 'Slack',
  teams: 'Microsoft Teams',
  calendar: 'Calendar',
  google_meet: 'Google Meet',
  sounding_board: 'Sounding Board',
};

export const INTEGRATION_STATUS: Record<IntegrationStatus, { label: string; tone: StatusBadgeTone }> = {
  connected: { label: 'Connected', tone: 'success' },
  needs_approval: { label: 'Needs tenant admin approval', tone: 'warning' },
  not_connected: { label: 'Not connected', tone: 'neutral' },
  planned: { label: 'Not connected', tone: 'neutral' },
};

export type { EventAction };

// Json column shapes.
export interface NudgeDefaults {
  channels: Channel[];
  midday: string;
  endOfDay: string;
  maxPerDay: number;
  quietHours: string;
  pauseOnHolidays: boolean;
}

export interface FeatureFlags {
  askAi: boolean;
  practiceFeedback: boolean;
  managerView: boolean;
  languageMetric: boolean;
  standalone: boolean;
}

export interface TranscriptSegment {
  speakerRole: 'coach' | 'coachee' | 'guest';
  speakerName: string;
  start: string; // mm:ss
  end: string;
  text: string;
  sensitive?: boolean;
}

export interface SummaryItem {
  kind: SummaryItemKind;
  /** Display text. For suggested updates: "From … to …." */
  text: string;
  from?: string;
  to?: string;
  evidenceQuote?: string;
  evidenceTime?: string;
  source: 'ai' | 'coach' | 'coach_notes';
  /** Suggested updates only. */
  status?: 'suggested' | 'accepted';
}

export interface OrgOutcome {
  outcome: string;
  extent: string;
}

export interface SensitiveSpan {
  start: string;
  end: string;
  topic: 'wellbeing' | 'legal' | 'hr';
}

export interface RubricMarker {
  id: string;
  name: string;
  shortName: string;
  check: string;
  kappa: number;
}

export interface MarkerResult {
  markerId: string; // "<rubricId>.<markerId>"
  observed: boolean;
  evidence: string;
}

export interface CoachPreferences {
  onboardingComplete: boolean;
  introRead: boolean;
  zoomConnected: boolean;
  calendarConnected: boolean;
  reviewReminder: '24h' | '48h';
  reminderChannel: 'email' | 'slack' | 'teams';
  showPracticeFeedback: boolean;
  draftPlans: boolean;
}

export interface CoacheePreferences {
  midday: string;
  endOfDay: string;
  useCalendar: boolean;
  capturePreference: 'ask' | 'never';
}

// Below this, the agreement with human raters is too low to show a marker.
export const MIN_MARKER_KAPPA = 0.6;
// The markers practice feedback (AI task 9) reports on, as "<rubricId>.<markerId>".
export const PRACTICE_MARKERS = ['icf.goal', 'icf.evoke', 'icf.design', 'icf.measure', 'grow.options'];
// Coaches need this many analysed sessions before the manager view shows a trend.
export const MIN_SESSIONS_FOR_TREND = 10;
