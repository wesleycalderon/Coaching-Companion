import type { Client, Integration } from '@prisma/client';
import type { StatusBadgeTone } from '@/ds/types';
import { INTEGRATION_LABEL, type FeatureFlags, type NudgeDefaults, type RubricMarker } from './domain';
import { asJson } from './format';

export function captureLabel(c: Pick<Client, 'capturePolicy'>): { label: string; tone: StatusBadgeTone } {
  switch (c.capturePolicy) {
    case 'sessions': return { label: 'Coaching sessions', tone: 'success' };
    case 'allowlist': return { label: 'Allowlisted sessions only', tone: 'info' };
    default: return { label: 'Companion mode, no capture', tone: 'neutral' };
  }
}

export function retentionLabel(c: Pick<Client, 'capturePolicy' | 'retentionDays'>) {
  if (c.capturePolicy === 'companion_mode') return 'None';
  if (c.retentionDays === 0) return 'Delete after analysis';
  return `${c.retentionDays} day${c.retentionDays === 1 ? '' : 's'}`;
}

/** A client is set up once its first nudge channel is connected. */
export function setupIssue(c: Client & { integrations: Integration[] }): string | null {
  const first = asJson<NudgeDefaults>(c.nudgeDefaults).channels[0];
  const i = c.integrations.find((x) => x.kind === first);
  if (i && i.status !== 'connected') return `${INTEGRATION_LABEL[first]} workspace not connected`;
  return null;
}

/** Client chosen with ?client=, defaulting to the first client (Northwind on the canvas). */
export function pickClient<T extends { id: string }>(clients: T[], id?: string): T {
  return clients.find((c) => c.id === id) ?? clients[0];
}

export const FEATURE_LABEL: Record<keyof FeatureFlags, string> = {
  askAi: 'Ask the AI',
  practiceFeedback: 'Practice feedback',
  managerView: 'Manager practice trends',
  languageMetric: 'Coaching-language metric',
  standalone: 'Standalone companion',
};

/** publishedAt is null for versions published before the prototype's data starts. */
export interface RubricVersion { version: string; publishedAt: string | null; markers: RubricMarker[] }
export const USED_FOR = ['Coachee summaries', 'Session structure', 'Coach practice feedback'];

/** Version a model gets when published: drafts start at 1.0, later versions bump the minor number. */
export const nextVersion = (v: string, status: string) => (status === 'draft' ? '1.0' : /^\d+\.\d+$/.test(v) ? `${v.split('.')[0]}.${Number(v.split('.')[1]) + 1}` : `${v}.1`);
