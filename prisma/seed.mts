// Seeds the prototype database with SYNTHETIC data only. No real people, clients or sessions.
//
// Two layers:
//  1. Named records from the design canvas (Priya Raman, Daniel Okafor, Northwind Logistics…),
//     written out by hand so the screens match the canvas copy.
//  2. Generated bulk records (more coachees, sessions, commitments, check-ins, audit events),
//     made with a fixed random seed. Their counts are chosen so that aggregates computed
//     from the data land on the canvas figures: 42 Northwind coachees, 214 commitments,
//     88 percent follow-up, 64 percent tried or further, +32 percent coaching language.
//
// Run with `npm run db:reset` (recreates the schema, then seeds) or `npm run db:seed`.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import prismaPkg from '@prisma/client';

const { PrismaClient } = prismaPkg;
const db = new PrismaClient();
const here = dirname(fileURLToPath(import.meta.url));

// ── helpers ──────────────────────────────────────────────────────────────────────────

/** Wall-clock time, stored as UTC (see the schema header). */
const t = (s: string) => new Date(s.replace(' ', 'T') + ':00Z');
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const addMinutes = (d: Date, n: number) => new Date(d.getTime() + n * 60_000);

let rngState = 20261025;
function rand(): number {
  // mulberry32: deterministic, so every reset produces the same database.
  rngState |= 0;
  rngState = (rngState + 0x6d2b79f5) | 0;
  let x = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const json = (v: unknown) => v as never;

function transcript(file: string) {
  return JSON.parse(readFileSync(join(here, 'seed-data/transcripts', file), 'utf8')).segments;
}

// createdAt drives "oldest first" ordering in admin lists, so it is assigned in insert order.
let createdCounter = 0;
const nextCreatedAt = () => addMinutes(t('2025-06-01 09:00'), createdCounter++);

// ── reference data ───────────────────────────────────────────────────────────────────

const RUBRICS = [
  {
    id: 'roadmap',
    name: 'Leadership Roadmap',
    usedFor: 'Coachee summaries',
    version: '1.2',
    status: 'published',
    clientId: null,
    sortOrder: 1,
    markers: [
      { id: 'thinking', name: 'Ways of thinking named', shortName: 'Ways of thinking', check: 'Coachee states a current and future way of thinking', kappa: 0.72 },
      { id: 'action', name: 'Action stated', shortName: 'Action', check: 'Coachee names a specific action and moment', kappa: 0.81 },
      { id: 'insight', name: 'Insight observed', shortName: 'Insight', check: 'Coachee describes something they noticed in a real situation', kappa: 0.64 },
      { id: 'outcome', name: 'Outcome link', shortName: 'Outcome', check: 'Coachee connects the change to an organizational outcome', kappa: 0.48 },
    ],
  },
  {
    id: 'grow',
    name: 'GROW',
    usedFor: 'Session structure',
    version: '1.0',
    status: 'published',
    clientId: null,
    sortOrder: 2,
    markers: [
      { id: 'goal', name: 'GROW: goal for the session agreed', shortName: 'Goal agreed', check: 'Coach and coachee state a goal for this session', kappa: 0.77 },
      { id: 'reality', name: 'GROW: current reality explored', shortName: 'Reality explored', check: 'Coach asks about what is happening now', kappa: 0.7 },
      { id: 'options', name: 'GROW: options explored before the way forward', shortName: 'Explores options before committing', check: 'Two or more options discussed before a commitment', kappa: 0.68 },
      { id: 'way_forward', name: 'GROW: way forward agreed', shortName: 'Way forward agreed', check: 'Session ends with a stated next step', kappa: 0.83 },
    ],
  },
  {
    id: 'icf',
    name: 'ICF core competencies',
    usedFor: 'Coach practice feedback',
    version: '2025',
    status: 'published',
    clientId: null,
    sortOrder: 3,
    markers: [
      { id: 'goal', name: 'Partners with the client to set the session goal', shortName: 'Partners on the session goal', check: 'Coach asks the client what they want from the session', kappa: 0.78 },
      { id: 'evoke', name: 'Asks questions that evoke new thinking', shortName: 'Evokes new thinking', check: 'Coach asks an open question about the client’s own view', kappa: 0.74 },
      { id: 'design', name: 'Invites the client to design their next step', shortName: 'Invites the client to design next steps', check: 'Coach asks what the client will try', kappa: 0.7 },
      { id: 'measure', name: 'Agrees how progress will be measured', shortName: 'Agrees how progress is measured', check: 'A date or measure is agreed for the next step', kappa: 0.66 },
    ],
  },
  {
    id: 'halden-leadership',
    name: 'Halden leadership competencies',
    usedFor: 'Coachee summaries',
    version: '0.3',
    status: 'draft',
    clientId: 'halden',
    sortOrder: 4,
    markers: [
      { id: 'client_focus', name: 'Client focus', shortName: 'Client focus', check: 'Coachee links a change to a client outcome', kappa: 0.51 },
    ],
  },
] as const;

const FLAGS_ON = { askAi: true, practiceFeedback: true, managerView: true, languageMetric: true, standalone: false };

const CLIENTS = [
  {
    id: 'northwind',
    name: 'Northwind Logistics',
    region: 'united_states',
    capturePolicy: 'sessions',
    retentionDays: 7,
    redactionOn: true,
    redactionTerms: ['Project Falcon', 'Harbor contract'],
    nudgeDefaults: { channels: ['slack', 'email'], midday: '12:00', endOfDay: '17:00', maxPerDay: 2, quietHours: '19:00 to 08:00', pauseOnHolidays: true },
    featureFlags: FLAGS_ON,
    workMeetings: 'coachee_picked',
    activeRubricIds: ['roadmap', 'grow', 'icf'],
    mcpScopes: ['goals', 'commitments'],
    coachingOffer: 'add_on',
    contractStart: t('2025-07-01 00:00'),
    contractEnd: t('2026-06-30 00:00'),
  },
  {
    id: 'halden',
    name: 'Halden Financial',
    region: 'european_union',
    capturePolicy: 'companion_mode',
    retentionDays: 0,
    redactionOn: true,
    redactionTerms: ['Deal and project code names', 'ticker symbols', 'client names'],
    nudgeDefaults: { channels: ['teams', 'email'], midday: '12:00', endOfDay: '17:00', maxPerDay: 2, quietHours: '19:00 to 08:00', pauseOnHolidays: true },
    featureFlags: { ...FLAGS_ON, languageMetric: false },
    activeRubricIds: ['roadmap', 'grow', 'icf'],
    mcpScopes: ['goals'],
    coachingOffer: 'add_on',
    contractStart: t('2025-07-01 00:00'),
    contractEnd: t('2026-06-30 00:00'),
  },
  {
    id: 'brightline',
    name: 'Brightline Health',
    region: 'united_states',
    capturePolicy: 'allowlist',
    retentionDays: 0,
    redactionOn: true,
    redactionTerms: ['Patient names', 'record numbers'],
    nudgeDefaults: { channels: ['slack', 'email'], midday: '12:00', endOfDay: '17:00', maxPerDay: 2, quietHours: '19:00 to 08:00', pauseOnHolidays: true },
    featureFlags: FLAGS_ON,
    activeRubricIds: ['roadmap', 'grow', 'icf'],
    mcpScopes: [],
    coachingOffer: 'add_on',
    contractStart: t('2025-08-01 00:00'),
    contractEnd: t('2026-07-31 00:00'),
  },
  {
    id: 'orrin',
    name: 'Orrin Retail Group',
    region: 'european_union',
    capturePolicy: 'sessions',
    retentionDays: 7,
    redactionOn: true,
    redactionTerms: [],
    nudgeDefaults: { channels: ['slack', 'email'], midday: '12:00', endOfDay: '17:00', maxPerDay: 2, quietHours: '19:00 to 08:00', pauseOnHolidays: true },
    featureFlags: { ...FLAGS_ON, standalone: true },
    workMeetings: 'coachee_picked',
    activeRubricIds: ['roadmap', 'grow', 'icf'],
    mcpScopes: [],
    coachingOffer: 'both',
    contractStart: t('2025-12-01 00:00'),
    contractEnd: t('2026-11-30 00:00'),
  },
];

function integrationsFor(clientId: string, name: string, slack: string, teams: string) {
  const short = name.split(' ')[0];
  return [
    { kind: 'zoom', status: 'connected', detail: 'BTS coaching account. Reads cloud transcripts of consented coaching sessions only.' },
    { kind: 'slack', status: slack, detail: `${short} workspace. Sends recaps and nudges by direct message. Reads only replies sent to the companion.` },
    { kind: 'teams', status: teams, detail: 'Installs the companion into scheduled coaching-session chats to read transcripts after the meeting.' },
    { kind: 'calendar', status: 'connected', detail: 'Reads meeting titles and times for coachees who allow it, to time check-ins.' },
    { kind: 'google_meet', status: 'planned', detail: 'Planned for a later release.' },
    { kind: 'sounding_board', status: 'connected', detail: "Saves approved insights and commitments to each coachee's Leadership Roadmap." },
  ].map((x, i) => ({ ...x, id: `${clientId}-${x.kind}`, clientId, sortOrder: i }));
}

// ── people ───────────────────────────────────────────────────────────────────────────

const COACHEE_PREFS = { midday: '12:00', endOfDay: '17:00', useCalendar: true, capturePreference: 'ask' };
const COACH_DONE = {
  onboardingComplete: true, introRead: true, zoomConnected: true, calendarConnected: true,
  reviewReminder: '24h', reminderChannel: 'email', showPracticeFeedback: true, draftPlans: true,
};

type NewUser = {
  id: string; role: string; name: string; email: string; clientId?: string | null; status?: string;
  jobTitle?: string; timeZone?: string; nudgeChannelOrder?: string[]; quietHours?: string;
  preferences?: unknown; growthArea?: string | null; managerId?: string | null;
};
const users: NewUser[] = [];
const addUser = (u: NewUser) => { users.push(u); return u.id; };

// Order matters: admin lists show people oldest first, matching the canvas.
addUser({ id: 'priya', role: 'coachee', clientId: 'northwind', name: 'Priya Raman', email: 'priya.raman@northwind.example', jobTitle: 'Engineering manager', timeZone: 'America/Chicago', nudgeChannelOrder: ['slack', 'email'], quietHours: '19:00 to 08:00', preferences: COACHEE_PREFS });
addUser({ id: 'marcus', role: 'coachee', clientId: 'northwind', name: 'Marcus Lee', email: 'marcus.lee@northwind.example', jobTitle: 'Depot operations lead', timeZone: 'America/Chicago', nudgeChannelOrder: ['slack', 'email'], preferences: COACHEE_PREFS });
addUser({ id: 'jun', role: 'coachee', clientId: 'northwind', name: 'Jun Park', email: 'jun.park@northwind.example', jobTitle: 'Fleet planning manager', timeZone: 'America/Los_Angeles', nudgeChannelOrder: ['slack', 'email'], preferences: COACHEE_PREFS });
addUser({ id: 'grace', role: 'coach_manager', name: 'Grace Mwangi', email: 'grace.mwangi@bts.example', timeZone: 'Europe/London', nudgeChannelOrder: ['email'] });
addUser({ id: 'daniel', role: 'coach', name: 'Daniel Okafor', email: 'daniel.okafor@bts.example', timeZone: 'America/Chicago', nudgeChannelOrder: ['email'], preferences: COACH_DONE, growthArea: 'Exploring options before the way forward', managerId: 'grace' });
addUser({ id: 'hannah', role: 'client_admin', status: 'invited', clientId: 'northwind', name: 'Hannah Weiss', email: 'hannah.weiss@northwind.example', nudgeChannelOrder: ['email'] });
addUser({ id: 'owen', role: 'client_admin', clientId: 'northwind', name: 'Owen Price', email: 'owen.price@northwind.example', nudgeChannelOrder: ['email'] });
addUser({ id: 'elena', role: 'coachee', clientId: 'halden', name: 'Elena Duarte', email: 'elena.duarte@halden.example', jobTitle: 'Head of client reporting', timeZone: 'Europe/Lisbon', nudgeChannelOrder: ['teams', 'email'], preferences: COACHEE_PREFS });
addUser({ id: 'tom', role: 'coachee', clientId: 'brightline', name: 'Tom Becker', email: 'tom.becker@brightline.example', jobTitle: 'Clinic operations manager', timeZone: 'America/New_York', nudgeChannelOrder: ['slack', 'email'], preferences: COACHEE_PREFS });
addUser({ id: 'aiko', role: 'coach', name: 'Aiko Tanaka', email: 'aiko.tanaka@bts.example', timeZone: 'America/Chicago', nudgeChannelOrder: ['email'], preferences: COACH_DONE, growthArea: 'Agreeing how progress is measured', managerId: 'grace' });
addUser({
  id: 'luis', role: 'coach', name: 'Luis Ortega', email: 'luis.ortega@bts.example', timeZone: 'America/Chicago', nudgeChannelOrder: ['email'], growthArea: null, managerId: 'grace',
  preferences: { onboardingComplete: false, introRead: true, zoomConnected: true, calendarConnected: false, reviewReminder: '24h', reminderChannel: 'email', showPracticeFeedback: true, draftPlans: true },
});
addUser({ id: 'sofia', role: 'coach', name: 'Sofia Brandt', email: 'sofia.brandt@bts.example', nudgeChannelOrder: ['email'], preferences: COACH_DONE });
addUser({ id: 'kwame', role: 'coach', name: 'Kwame Asante', email: 'kwame.asante@bts.example', nudgeChannelOrder: ['email'], preferences: COACH_DONE });
addUser({ id: 'meilin', role: 'coach', name: 'Mei Lin Chen', email: 'meilin.chen@bts.example', nudgeChannelOrder: ['email'], preferences: COACH_DONE });
// The companion itself: the actor for automatic events (transcripts arriving from Zoom, nudges).
addUser({ id: 'companion', role: 'system', name: 'Coaching companion', email: 'companion@bts.example', nudgeChannelOrder: [] });
addUser({ id: 'noor', role: 'bts_admin', name: 'Noor Haddad', email: 'noor.haddad@bts.example', nudgeChannelOrder: ['email'] });
addUser({ id: 'ines', role: 'client_admin', clientId: 'halden', name: 'Ines Moreau', email: 'ines.moreau@halden.example', nudgeChannelOrder: ['email'] });
addUser({ id: 'ravi', role: 'client_admin', clientId: 'brightline', name: 'Ravi Shah', email: 'ravi.shah@brightline.example', nudgeChannelOrder: ['email'] });

// Synthetic names for the generated coachees. Combined deterministically, never reused.
const FIRST = ['Amara', 'Ben', 'Carla', 'Dev', 'Eva', 'Femi', 'Gabriel', 'Hana', 'Isak', 'Jonas', 'Keira', 'Leo', 'Maya', 'Nikhil', 'Olga', 'Pablo', 'Quinn', 'Rosa', 'Samir', 'Tara', 'Uma', 'Victor', 'Wen', 'Yara', 'Zane', 'Alba', 'Bruno', 'Chloe', 'Dara', 'Emil'];
const LAST = ['Adeyemi', 'Bauer', 'Costa', 'Dubois', 'Eriksen', 'Fischer', 'Garcia', 'Holm', 'Ivanova', 'Jensen', 'Kowalski', 'Lindqvist', 'Mendes', 'Novak', 'Okoro', 'Pereira', 'Rossi', 'Sato', 'Tanaka-Ruiz', 'Varga', 'Weber', 'Yilmaz'];
const usedNames = new Set(users.map((u) => u.name));
function syntheticName(): string {
  for (;;) {
    const n = `${pick(FIRST)} ${pick(LAST)}`;
    if (!usedNames.has(n)) { usedNames.add(n); return n; }
  }
}
const DOMAIN: Record<string, string> = { northwind: 'northwind.example', halden: 'halden.example', brightline: 'brightline.example' };
function addBulkCoachee(clientId: string, idx: number, fixedName?: string, fixedId?: string) {
  if (fixedName && usedNames.has(fixedName)) throw new Error(`${fixedName} already used`);
  if (fixedName) usedNames.add(fixedName);
  const name = fixedName ?? syntheticName();
  const [first, last] = name.toLowerCase().split(' ');
  return addUser({
    id: fixedId ?? `${clientId}-c${String(idx).padStart(2, '0')}`, role: 'coachee', clientId, name,
    email: `${first}.${last}@${DOMAIN[clientId]}`, timeZone: 'UTC',
    nudgeChannelOrder: clientId === 'halden' ? ['teams', 'email'] : ['slack', 'email'], preferences: COACHEE_PREFS,
  });
}

// ── engagement records, built up below and written at the end ───────────────────────

const engagements: any[] = [];
const goals: any[] = [];
const sessions: any[] = [];
const consents: any[] = [];
const transcripts: any[] = [];
const summaries: any[] = [];
const commitments: any[] = [];
const checkIns: any[] = [];
const coachNotes: any[] = [];
const markers: any[] = [];
const practice: any[] = [];
const plans: any[] = [];
const sessionEvents: any[] = [];
const aiAnswers: any[] = [];
const audit: any[] = [];

// Option lists from the current Leadership Roadmap (HANDOFF.md). The seed only uses these.
const CAPABILITIES = ['Communication', 'Conflict management and resolution', 'Decision-making', 'Developing others', 'Execution', 'Executive presence', 'Influencing others', 'Interpersonal skills', 'Leading high-performing teams', 'Managing change', 'Organizational collaboration', 'Promoting diversity, equity and inclusion', 'Self-awareness', 'Setting vision and direction', 'Strategic thinking', 'Time management and prioritization'];
const ORG_OUTCOMES = ['Improve culture', 'Improve team effectiveness', 'Improve productivity', 'Improve internal process', 'Improve organizational collaboration', 'Improve organizational communication', 'Improve customer satisfaction'];
const PERSONAL_IMPACT = ['Higher confidence', 'Reduce stress', 'Key role transition', 'Level up execution', 'Better work-life balance', 'Better decision making', 'Build influence', 'Reduce anxiety'];
// Capabilities coaches tag on generated coachees' goals, by development theme. Client results
// show capabilities as themes (milestone 6).
const THEME_CAPABILITIES: Record<string, string[]> = {
  'Asking before advising': ['Communication', 'Developing others'],
  'Giving direct feedback': ['Communication', 'Interpersonal skills'],
  'Delegating decisions': ['Developing others', 'Decision-making'],
  'Prioritising strategic work': ['Strategic thinking', 'Time management and prioritization'],
  'Running effective one-to-ones': ['Developing others', 'Interpersonal skills'],
};

/** A Leadership Roadmap goal. Personal impact and organizational outcomes are the coachee's own choices. */
function goal(g: { id: string; engagementId: string; title: string; theme: string; capabilities: string[]; thinking: [string, string]; behaving: [string, string]; personalImpact: string[]; orgOutcomes: Array<[string, string]> }) {
  const unknown = [...g.capabilities.filter((c) => !CAPABILITIES.includes(c)), ...g.orgOutcomes.map(([o]) => o).filter((o) => !ORG_OUTCOMES.includes(o)), ...g.personalImpact.filter((p) => !PERSONAL_IMPACT.includes(p))];
  if (unknown.length) throw new Error(`Goal ${g.id} uses options outside the Roadmap lists: ${unknown.join(', ')}`);
  goals.push({
    id: g.id, engagementId: g.engagementId, title: g.title, theme: g.theme, capabilities: g.capabilities,
    thinkingCurrent: g.thinking[0], thinkingFuture: g.thinking[1], behavingCurrent: g.behaving[0], behavingFuture: g.behaving[1],
    personalImpact: g.personalImpact, orgOutcomes: g.orgOutcomes.map(([outcome, extent]) => ({ outcome, extent })),
  });
}

function session(engagementId: string, number: number, at: string, captureStatus: string, extra: Record<string, unknown> = {}) {
  const scheduledAt = t(at);
  const s = { id: `${engagementId}-s${number}`, engagementId, number, scheduledAt, endsAt: addMinutes(scheduledAt, 55), platform: 'zoom', captureStatus, ...extra };
  sessions.push(s);
  return s;
}

// ── Priya Raman · Northwind · coach Daniel ───────────────────────────────────────────

engagements.push({ id: 'eng-priya', clientId: 'northwind', coacheeId: 'priya', coachId: 'daniel', start: t('2025-09-09 00:00'), end: t('2026-01-31 00:00'), plannedSessions: 8, activeRubricIds: ['roadmap', 'grow', 'icf'] });
goal({
  id: 'goal-priya', engagementId: 'eng-priya', title: 'Ask before advising', theme: 'Asking before advising',
  capabilities: ['Communication', 'Developing others'],
  thinking: ['I need the answer first', 'I learn more by asking first'],
  behaving: ['advises first', 'asks curiosity questions before sharing a view'],
  personalImpact: ['Build influence', 'Key role transition'],
  orgOutcomes: [['Improve team effectiveness', 'moderately'], ['Improve organizational communication', 'moderately']],
});
const pS1 = session('eng-priya', 1, '2025-09-09 10:00', 'captured');
const pS2 = session('eng-priya', 2, '2025-09-23 10:00', 'captured');
const pS3 = session('eng-priya', 3, '2025-10-07 10:00', 'captured');
const pS4 = session('eng-priya', 4, '2025-10-21 10:00', 'captured');
const pS5 = session('eng-priya', 5, '2025-11-04 10:00', 'consented');

transcripts.push({ id: 'tr-priya-4', sessionId: pS4.id, segments: transcript('priya-session-4.json'), redacted: true, deleteAfter: addDays(pS4.endsAt, 7) });

const approved = (s: any, at: string) => ({ status: 'approved', approvedById: 'daniel', approvedAt: t(at) });
summaries.push(
  {
    id: 'sum-priya-1', sessionId: pS1.id, headline: 'Starting with a question', headlineAccent: 'question', sensitiveSpans: [], ...approved(pS1, '2025-09-09 15:00'),
    insights: [
      { kind: 'insight', text: 'When you spoke second, more of your team shared ideas.', evidenceQuote: 'They go quiet once I have said what I think.', evidenceTime: '12:05', source: 'ai' },
      { kind: 'behaving', from: 'opening team meetings with an update', to: 'opening with a question', text: 'From opening team meetings with an update to opening with a question.', evidenceQuote: 'I could start with a question instead.', evidenceTime: '38:40', source: 'ai', status: 'accepted' },
    ],
  },
  {
    id: 'sum-priya-2', sessionId: pS2.id, headline: 'A busy fortnight', headlineAccent: 'busy', sensitiveSpans: [], ...approved(pS2, '2025-09-23 15:00'),
    insights: [
      { kind: 'insight', text: 'Release pressure makes it harder to hold back advice in one-to-ones.', evidenceQuote: 'When the release is close I just tell people what to do.', evidenceTime: '09:45', source: 'ai' },
    ],
  },
  {
    id: 'sum-priya-3', sessionId: pS3.id, headline: 'Questions on paper', headlineAccent: 'paper', sensitiveSpans: [], ...approved(pS3, '2025-10-07 15:00'),
    insights: [
      { kind: 'insight', text: 'Writing questions down helped you stay curious under pressure.', evidenceQuote: 'If I write them down, I actually ask them.', evidenceTime: '15:30', source: 'ai' },
    ],
  },
  {
    id: 'sum-priya-4', sessionId: pS4.id, headline: 'Asking first is working', headlineAccent: 'first',
    sensitiveSpans: [{ start: '06:10', end: '08:45', topic: 'wellbeing' }], ...approved(pS4, '2025-10-21 14:20'),
    insights: [
      { kind: 'insight', text: 'When you wrote your questions down first, your team proposed a stronger rollout plan.', evidenceQuote: 'The team came up with a better rollout plan than mine.', evidenceTime: '00:41', source: 'ai' },
      { kind: 'thinking', from: 'I need the answer first', to: 'I learn more by asking first', text: 'From "I need the answer first" to "I learn more by asking first."', evidenceQuote: "If I'd needed to answer first, I'd have shut it down.", evidenceTime: '02:30', source: 'ai', status: 'suggested' },
      { kind: 'behaving', from: 'advising first', to: 'asking prepared questions before advising', text: 'From advising first to asking prepared questions before advising.', evidenceQuote: 'I went in with questions written down.', evidenceTime: '02:30', source: 'ai', status: 'suggested' },
    ],
  },
);

function commitment(c: Record<string, any>) {
  commitments.push({ goalId: null, needsCoachConfirmation: false, approved: true, ...c });
}
function checkIn(c: Record<string, any>) {
  checkIns.push({ id: `ci-${checkIns.length + 1}`, channel: 'slack', ...c });
}

commitment({ id: 'c-priya-1', sessionId: pS1.id, goalId: 'goal-priya', createdAt: pS1.endsAt, status: 'habit', ifThenText: "When a team meeting starts, I'll open with a question.", title: 'Open team meetings with a question', shortTitle: 'Open meetings with a question', cueMoment: 'Start of each team meeting', dueBy: t('2025-09-15 17:00'), evidenceTime: '38:40' });
for (const [day, refl] of [['2025-09-14', null], ['2025-09-21', null], ['2025-09-30', 'Doing this every week now']] as const) {
  checkIn({ commitmentId: 'c-priya-1', slot: 'end_of_day', prompt: 'Did you open the team meeting with a question?', sentAt: t(`${day} 17:00`), respondedAt: t(`${day} 17:05`), response: 'tried', reflectionText: refl });
}
commitment({ id: 'c-priya-2', sessionId: pS2.id, goalId: 'goal-priya', createdAt: pS2.endsAt, status: 'set_aside', setAsideReason: 'release deadline', ifThenText: "In my one-to-ones this week, I'll ask before suggesting a fix.", title: 'Try a different style in one-to-ones', shortTitle: 'Different style in one-to-ones', cueMoment: 'One-to-ones', dueBy: t('2025-10-02 17:00'), evidenceTime: '44:10' });
// Answered within the week ("I'll try it"), so the action counts as followed up (milestone 6).
checkIn({ commitmentId: 'c-priya-2', slot: 'midday', prompt: 'Your one-to-one with Ana this afternoon is a chance to ask before suggesting a fix.', sentAt: t('2025-09-29 12:00'), respondedAt: t('2025-09-29 12:04'), response: 'will_try' });
checkIn({ commitmentId: 'c-priya-2', slot: 'end_of_day', prompt: 'How did your one-to-ones go?', sentAt: t('2025-10-06 17:00'), respondedAt: t('2025-10-06 17:12'), response: 'set_aside', setAsideReason: 'time_pressure', reflectionText: 'No time this week' });
commitment({ id: 'c-priya-3', sessionId: pS3.id, goalId: 'goal-priya', createdAt: pS3.endsAt, status: 'practiced', ifThenText: "Before team planning, I'll write my questions down.", title: 'Write questions down before team planning', shortTitle: 'Questions written down', cueMoment: 'Before team planning', dueBy: t('2025-10-10 17:00'), evidenceTime: '41:02' });
for (const day of ['2025-10-09', '2025-10-13', '2025-10-17']) {
  checkIn({ commitmentId: 'c-priya-3', slot: 'end_of_day', prompt: 'Did you write your questions down before planning?', sentAt: t(`${day} 17:00`), respondedAt: t(`${day} 17:06`), response: 'tried' });
}
commitment({ id: 'c-priya-4', sessionId: pS4.id, goalId: 'goal-priya', createdAt: pS4.endsAt, status: 'tried', ifThenText: "In Thursday's team meeting, I'll ask three curiosity questions before sharing my view.", title: 'Ask three curiosity questions before sharing my view', shortTitle: 'Ask three curiosity questions', cueMoment: "Thursday's team meeting", dueBy: t('2025-10-23 17:00'), evidenceTime: '31:48' });
checkIn({ commitmentId: 'c-priya-4', slot: 'midday', prompt: 'Your 14:00 team meeting is a good moment to ask three curiosity questions. One to try: "What\'s making this hard right now?"', sentAt: t('2025-10-23 12:00'), respondedAt: t('2025-10-23 12:03'), response: 'will_try' });
checkIn({ commitmentId: 'c-priya-4', slot: 'end_of_day', prompt: 'How did the curiosity questions go?', sentAt: t('2025-10-23 17:00'), respondedAt: t('2025-10-23 17:04'), response: 'tried', reflectionText: "I asked two before jumping in. Ana suggested an approach I hadn't thought of." });
commitment({ id: 'c-priya-5', sessionId: pS4.id, goalId: 'goal-priya', createdAt: pS4.endsAt, status: 'not_started', ifThenText: "By Fri 24 Oct, I'll schedule a feedback conversation with Sam.", title: 'Schedule a feedback conversation with Sam', shortTitle: 'Feedback conversation with Sam', cueMoment: 'This week', dueBy: t('2025-10-24 17:00'), evidenceTime: '31:48', confirmationNote: 'No date was agreed in the session' });
checkIn({ commitmentId: 'c-priya-5', slot: 'end_of_day', prompt: 'Have you booked the feedback conversation with Sam?', sentAt: t('2025-10-22 17:00'), respondedAt: t('2025-10-22 17:10'), response: 'not_yet' });

coachNotes.push(
  { id: 'note-priya-1', sessionId: pS1.id, coachId: 'daniel', observations: 'First session. Clear about wanting her team to speak up more.', showUpTags: [] },
  { id: 'note-priya-2', sessionId: pS2.id, coachId: 'daniel', observations: 'Arrived rushed from a release meeting. Engaged once we slowed down.', showUpTags: ['rushed'] },
  { id: 'note-priya-3', sessionId: pS3.id, coachId: 'daniel', observations: 'Prepared and reflective. Brought examples from two planning meetings.', showUpTags: ['prepared', 'reflective'] },
  { id: 'note-priya-4', sessionId: pS4.id, coachId: 'daniel', observations: 'Arrived prepared and reflective. Took ownership of the dropped commitment without prompting.', showUpTags: ['prepared', 'reflective'] },
);
[pS1, pS2, pS3, pS4].forEach((s, i) => markers.push({ id: `lm-priya-${i + 1}`, sessionId: s.id, userId: 'priya', marker: 'open_question', count: [6, 9, 13, 16][i], per1kWords: [2, 3, 4, 5][i] }));

plans.push({
  id: 'plan-priya-5', engagementId: 'eng-priya', forSessionId: pS5.id, openCommitmentIds: ['c-priya-4', 'c-priya-5'],
  suggestedFocus: 'Keep the asking habit going under deadline pressure, and unblock the feedback conversation with Sam, which has stayed at "not started" for two weeks.',
  questions: [
    'What did you notice when Ana offered her approach?',
    "What's making the conversation with Sam hard to start?",
    'When deadlines hit, which commitment is easiest to keep?',
    'What would "asking first" look like in your next one-to-one?',
  ],
  coacheeTopic: null,
  draftedAt: t('2025-10-24 18:00'),
});
aiAnswers.push({
  id: 'ai-priya-1', scope: 'engagement', engagementId: 'eng-priya', sessionId: pS4.id, askedById: 'daniel', createdAt: t('2025-10-21 13:40'),
  question: 'How has Priya talked about time pressure across sessions?',
  answer: 'Priya named release deadlines as the reason she set commitments aside in sessions 2 and 4. In session 3 she said written questions helped her stay with the plan under pressure.',
  citedSessionNumbers: [2, 3, 4],
});

// Consent for sessions 1 to 4 (given the evening before), and the live-session moment for session 5.
for (const s of [pS1, pS2, pS3, pS4]) {
  const eve = addDays(s.scheduledAt, -1).toISOString().slice(0, 10);
  consents.push({ id: `cons-${s.id}-coach`, sessionId: s.id, userId: 'daniel', channel: 'web', grantedAt: t(`${eve} 09:12`) });
  consents.push({ id: `cons-${s.id}-coachee`, sessionId: s.id, userId: 'priya', channel: 'slack', grantedAt: t(`${eve} 17:20`) });
}
consents.push(
  { id: `cons-${pS5.id}-coach`, sessionId: pS5.id, userId: 'daniel', channel: 'web', grantedAt: t('2025-11-03 09:12') },
  { id: `cons-${pS5.id}-coachee`, sessionId: pS5.id, userId: 'priya', channel: 'slack', grantedAt: t('2025-11-03 17:20') },
  { id: `cons-${pS5.id}-guest`, sessionId: pS5.id, userId: null, guestLabel: 'Guest', channel: 'meeting', joinedAt: t('2025-11-04 10:22'), grantedAt: null },
);
sessionEvents.push(
  { id: 'se-1', sessionId: pS5.id, at: t('2025-11-04 10:00'), action: 'publish', label: 'Notice shown to participants', by: 'Companion' },
  { id: 'se-2', sessionId: pS5.id, at: t('2025-11-04 10:01'), action: 'create', label: 'Capture started', by: 'Companion' },
  { id: 'se-3', sessionId: pS5.id, at: t('2025-11-04 10:22'), action: 'update', label: 'Capture paused', by: 'Companion, guest joined' },
);

// ── Marcus Lee · Northwind · coach Daniel ────────────────────────────────────────────

engagements.push({ id: 'eng-marcus', clientId: 'northwind', coacheeId: 'marcus', coachId: 'daniel', start: t('2025-10-06 00:00'), end: t('2026-02-28 00:00'), plannedSessions: 8, activeRubricIds: ['roadmap', 'grow', 'icf'] });
goal({ id: 'goal-marcus', engagementId: 'eng-marcus', title: 'Give direct feedback', theme: 'Giving direct feedback', capabilities: ['Developing others', 'Communication'], thinking: ['Feedback is criticism', 'Feedback helps people grow'], behaving: ['fixes the work himself', 'names one specific observation in one-to-ones'], personalImpact: ['Build influence'], orgOutcomes: [['Improve team effectiveness', 'significantly']] });
const mS1 = session('eng-marcus', 1, '2025-10-06 15:30', 'captured');
const mS2 = session('eng-marcus', 2, '2025-10-20 15:30', 'captured');
session('eng-marcus', 3, '2025-11-03 15:30', 'scheduled');
transcripts.push({ id: 'tr-marcus-2', sessionId: mS2.id, segments: transcript('marcus-session-2.json'), redacted: true, deleteAfter: addDays(mS2.endsAt, 7) });
summaries.push(
  {
    id: 'sum-marcus-1', sessionId: mS1.id, headline: 'Saying what you see', headlineAccent: 'see', sensitiveSpans: [], ...approved(mS1, '2025-10-06 18:00'),
    insights: [{ kind: 'insight', text: 'You fix problems yourself to avoid giving feedback.', evidenceQuote: 'It is faster if I just do it.', evidenceTime: '07:15', source: 'ai' }],
  },
  {
    id: 'sum-marcus-2', sessionId: mS2.id, headline: null, headlineAccent: null, status: 'draft', approvedById: null, approvedAt: null, sensitiveSpans: [],
    insights: [
      { kind: 'insight', text: "When Marcus fixed the report himself, Leah didn't learn what good looks like, and his evenings went to rework.", evidenceQuote: "Leah doesn't learn what good looks like, and I lose my Friday evenings.", evidenceTime: '03:36', source: 'ai' },
      { kind: 'thinking', from: 'Feedback is criticism', to: 'Feedback helps people grow', text: 'From "Feedback is criticism" to "Feedback helps people grow."', evidenceQuote: "I think I see feedback as criticism. If I say it, I'm the bad guy.", evidenceTime: '02:05', source: 'ai', status: 'suggested' },
      { kind: 'behaving', from: 'fixing the work himself', to: 'naming one specific observation and asking how they would change it', text: 'From fixing the work himself to naming one specific observation and asking how they would change it.', evidenceQuote: "I said the report was fine when it wasn't, and then I fixed it myself.", evidenceTime: '00:24', source: 'ai', status: 'suggested' },
    ],
  },
);
commitment({ id: 'c-marcus-1', sessionId: mS1.id, goalId: 'goal-marcus', createdAt: mS1.endsAt, status: 'tried', ifThenText: "In Thursday's depot huddle, I'll name one thing that went well and why.", title: 'Name one thing that went well in the depot huddle', shortTitle: 'Name what went well', dueBy: t('2025-10-09 17:00'), evidenceTime: '40:12' });
checkIn({ commitmentId: 'c-marcus-1', slot: 'end_of_day', prompt: 'Did you name what went well in the huddle?', sentAt: t('2025-10-09 17:00'), respondedAt: t('2025-10-09 17:20'), response: 'tried' });
commitment({ id: 'c-marcus-2', sessionId: mS1.id, goalId: 'goal-marcus', createdAt: mS1.endsAt, status: 'not_started', ifThenText: "By Friday, I'll ask Leah how she wants to get feedback.", title: 'Ask Leah how she wants to get feedback', shortTitle: 'Ask Leah about feedback', dueBy: t('2025-10-10 17:00'), evidenceTime: '41:30' });
commitment({ id: 'c-marcus-3', sessionId: mS2.id, goalId: 'goal-marcus', createdAt: mS2.endsAt, status: 'not_started', approved: false, ifThenText: "In Wednesday's one-to-one with Leah, I'll tell her one specific thing about the report and ask how she'd change it.", title: 'Give Leah one specific point on the report', shortTitle: 'Specific point for Leah', cueMoment: "Wednesday's one-to-one", dueBy: t('2025-10-22 17:00'), evidenceTime: '19:02' });
commitment({ id: 'c-marcus-4', sessionId: mS2.id, goalId: 'goal-marcus', createdAt: mS2.endsAt, status: 'not_started', approved: false, needsCoachConfirmation: true, confirmationNote: 'Marcus said "maybe" and named no moment', ifThenText: "I'll give the depot team one piece of specific feedback.", title: 'Give the depot team specific feedback', shortTitle: 'Feedback for the depot team', evidenceTime: '19:02' });
coachNotes.push({ id: 'note-marcus-2', sessionId: mS2.id, coachId: 'daniel', observations: '', showUpTags: [] });
[mS1, mS2].forEach((s, i) => markers.push({ id: `lm-marcus-${i + 1}`, sessionId: s.id, userId: 'marcus', marker: 'open_question', count: [4, 5][i], per1kWords: [1.5, 1.8][i] }));
for (const s of [mS1, mS2]) {
  consents.push({ id: `cons-${s.id}-coach`, sessionId: s.id, userId: 'daniel', channel: 'web', grantedAt: addDays(s.scheduledAt, -1) });
  consents.push({ id: `cons-${s.id}-coachee`, sessionId: s.id, userId: 'marcus', channel: 'slack', grantedAt: addDays(s.scheduledAt, -1) });
}

// ── Elena Duarte · Halden (companion mode, never a transcript) · coach Daniel ───────

engagements.push({ id: 'eng-elena', clientId: 'halden', coacheeId: 'elena', coachId: 'daniel', start: t('2025-08-08 00:00'), end: t('2026-01-31 00:00'), plannedSessions: 10, activeRubricIds: ['roadmap', 'grow'] });
goal({ id: 'goal-elena', engagementId: 'eng-elena', title: 'Delegate decisions, not just tasks', theme: 'Delegating decisions', capabilities: ['Developing others', 'Decision-making'], thinking: ['If I sign off, nothing goes wrong', 'My team can own the decision'], behaving: ['keeps sign-off', 'hands over a full task, including the decision'], personalImpact: ['Key role transition'], orgOutcomes: [['Improve team effectiveness', 'moderately']] });
['2025-08-08', '2025-08-22', '2025-09-05', '2025-09-19', '2025-10-03', '2025-10-17'].forEach((day, i) => {
  const s = session('eng-elena', i + 1, `${day} 09:00`, 'no_capture', { platform: 'teams' });
  coachNotes.push({ id: `note-elena-${i + 1}`, sessionId: s.id, coachId: 'daniel', observations: i === 5 ? 'Wants to delegate more of the weekly reporting and keep time for client conversations.' : 'Notes from the session.', showUpTags: [] });
  summaries.push({
    id: `sum-elena-${i + 1}`, sessionId: s.id, headline: null, headlineAccent: null, sensitiveSpans: [], status: 'approved', approvedById: 'daniel', approvedAt: addMinutes(s.scheduledAt, 150),
    insights: i === 5
      ? [
          { kind: 'insight', text: 'You want to delegate more of the weekly reporting and keep time for client conversations.', source: 'coach_notes' },
          { kind: 'behaving', from: 'keeping sign-off', to: 'handing over a full task, including the decision', text: 'From keeping sign-off to handing over a full task, including the decision.', source: 'coach_notes', status: 'suggested' },
        ]
      : [{ kind: 'insight', text: 'Recap written from coach notes and check-ins.', source: 'coach_notes' }],
  });
  if (i === 5) {
    commitment({ id: 'c-elena-6', sessionId: s.id, goalId: 'goal-elena', createdAt: s.endsAt, status: 'not_started', ifThenText: "On Monday, I'll hand the weekly report to Marta, including sign-off.", title: 'Hand the weekly report to Marta, including sign-off', shortTitle: 'Weekly report to Marta', cueMoment: 'Monday', dueBy: t('2025-10-20 17:00') });
    checkIn({ commitmentId: 'c-elena-6', channel: 'teams', slot: 'end_of_day', prompt: "Anything from today's session you want to add in your own words?", sentAt: t('2025-10-17 17:00'), respondedAt: null, response: null, reflectionText: "Realised I hold on to sign-off because I worry about errors, not because Marta can't do it." });
  }
});
session('eng-elena', 7, '2025-10-31 09:00', 'no_capture', { platform: 'teams' });

// ── Tom Becker · Brightline (allowlisted sessions) · coach Daniel ───────────────────

engagements.push({ id: 'eng-tom', clientId: 'brightline', coacheeId: 'tom', coachId: 'daniel', start: t('2025-09-18 00:00'), end: t('2026-02-28 00:00'), plannedSessions: 8, activeRubricIds: ['roadmap', 'grow', 'icf'] });
goal({ id: 'goal-tom', engagementId: 'eng-tom', title: 'Run one-to-ones that help', theme: 'Running effective one-to-ones', capabilities: ['Developing others', 'Interpersonal skills'], thinking: ['One-to-ones are status updates', 'One-to-ones are for the other person'], behaving: ['runs the agenda', 'lets the other person set the agenda'], personalImpact: ['Build influence'], orgOutcomes: [['Improve culture', 'moderately']] });
const tS1 = session('eng-tom', 1, '2025-09-18 13:00', 'captured');
const tS2 = session('eng-tom', 2, '2025-10-02 13:00', 'captured');
session('eng-tom', 3, '2025-10-16 13:00', 'removed', { removedById: 'tom' });
session('eng-tom', 4, '2025-10-30 13:00', 'scheduled');
for (const [i, s] of [tS1, tS2].entries()) {
  summaries.push({ id: `sum-tom-${i + 1}`, sessionId: s.id, headline: null, headlineAccent: null, sensitiveSpans: [], status: 'approved', approvedById: 'daniel', approvedAt: addMinutes(s.scheduledAt, 180), insights: [{ kind: 'insight', text: 'Letting staff bring the first topic made the one-to-one more useful.', source: 'ai', evidenceQuote: 'I could ask them to bring the first topic.', evidenceTime: '22:10' }] });
}
consents.push({ id: 'cons-tom-3', sessionId: 'eng-tom-s3', userId: 'tom', channel: 'slack', grantedAt: t('2025-10-15 17:30'), revokedAt: t('2025-10-16 12:58') });

// ── generated Northwind coachees ─────────────────────────────────────────────────────
// Coach loads, sessions per coachee and commitment statuses are chosen so the client
// aggregates match the canvas (see the file header).

const THEMES: Array<[string, string, number]> = [
  // theme, goal title, how many generated Northwind coachees get it
  ['Asking before advising', 'ask before advising', 15],
  ['Giving direct feedback', 'give direct feedback', 11],
  ['Delegating decisions', 'delegate decisions', 8],
  ['Prioritising strategic work', 'make time for strategic work', 3],
  ['Running effective one-to-ones', 'run one-to-ones that help', 2],
];
const COMMITMENT_TEMPLATES: Record<string, Array<[string, string]>> = {
  'Asking before advising': [["In Monday's stand-up, I'll ask one open question before giving my view.", 'Ask an open question in stand-up'], ["When someone brings me a problem, I'll ask what they'd try first.", 'Ask what they would try first']],
  'Giving direct feedback': [["In my next one-to-one, I'll name one specific thing that went well.", 'Name one specific strength'], ["By Friday, I'll give one piece of feedback within a day of seeing it.", 'Give feedback within a day']],
  'Delegating decisions': [["When the weekly plan is due, I'll let my lead make the call.", 'Let my lead make the weekly call'], ["In Tuesday's review, I'll ask the owner for their decision before mine.", 'Ask the owner for their decision']],
  'Prioritising strategic work': [["On Monday mornings, I'll block two hours for planning.", 'Block planning time on Mondays']],
  'Running effective one-to-ones': [["In each one-to-one this week, I'll let them set the first topic.", 'Let them set the first topic']],
};

// [coach, sessions per coachee]. Daniel's four have fixed dates so his practice trends match.
const LOADS: Array<[string, number[]]> = [
  ['daniel', [2, 2, 1, 1]],
  ['aiko', [3, 3, 3, 3, 3, 3, 2, 2]],
  ['luis', [2, 2, 2, 2, 1]],
  ['sofia', [4, 4, 4, 3, 3, 3, 3, 3]],
  ['kwame', [4, 4, 3, 3, 3, 3, 3]],
  ['meilin', [3, 3, 3, 3, 4, 4, 3]],
];
const DEMO_COACHEE = 'Amara Okoro';
let demoCoacheeId = '';
const DANIEL_BULK_DATES = [['2025-08-04', '2025-08-18'], ['2025-08-06', '2025-08-20'], ['2025-08-27'], ['2025-09-01']];

const themePool = shuffle(THEMES.flatMap(([theme, title, n]) => Array.from({ length: n }, () => [theme, title] as const)));
const bulkSessions: any[] = []; // captured sessions of generated coachees, in creation order
let nwIdx = 0;
for (const [coachId, counts] of LOADS) {
  counts.forEach((count, k) => {
    // Daniel's third coachee is the named demo for transcript upload (milestone 2).
    const isDemo = coachId === 'daniel' && k === 2;
    const coacheeId = addBulkCoachee('northwind', ++nwIdx, isDemo ? DEMO_COACHEE : undefined, isDemo ? 'amara' : undefined);
    const engId = `eng-${coacheeId}`;
    const [theme, title] = isDemo
      ? themePool.splice(themePool.findIndex(([th]) => th === 'Delegating decisions'), 1)[0]
      : themePool.pop()!;
    if (isDemo) {
      demoCoacheeId = coacheeId;
      goal({ id: `goal-${coacheeId}`, engagementId: engId, title: 'Delegate decisions', theme, capabilities: ['Developing others', 'Decision-making'], thinking: ['If I make the call, it gets done right', 'My leads can own the decision'], behaving: ['steps in with the answer', 'lets the owner make the call'], personalImpact: ['Key role transition'], orgOutcomes: [['Improve team effectiveness', 'moderately']] });
    }
    engagements.push({ id: engId, clientId: 'northwind', coacheeId, coachId, start: t('2025-08-01 00:00'), end: t('2026-01-31 00:00'), plannedSessions: 8, activeRubricIds: ['roadmap', 'grow', 'icf'] });
    if (!isDemo) goal({ id: `goal-${coacheeId}`, engagementId: engId, title: title.charAt(0).toUpperCase() + title.slice(1), theme, capabilities: THEME_CAPABILITIES[theme], thinking: ['Synthetic current thinking', 'Synthetic future thinking'], behaving: ['synthetic current behaviour', 'synthetic future behaviour'], personalImpact: ['Build influence'], orgOutcomes: [['Improve team effectiveness', 'moderately']] });
    const startDay = addDays(t('2025-08-03 09:00'), Math.floor(rand() * 28));
    for (let n = 1; n <= count; n++) {
      const at = coachId === 'daniel'
        ? t(`${DANIEL_BULK_DATES[k][n - 1]} 11:00`)
        : addDays(startDay, (n - 1) * 14 + (count === 4 ? 0 : 7));
      const s = session(engId, n, at.toISOString().slice(0, 16).replace('T', ' '), 'captured');
      s.theme = theme;
      s.coacheeId = coacheeId;
      s.coachId = coachId;
      bulkSessions.push(s);
    }
    if (coachId === 'daniel' && k < 2) session(engId, counts[k] + 1, k === 0 ? '2025-11-05 11:00' : '2025-11-06 11:00', 'scheduled');
  });
}
// Jun Park has no coach yet. The rest of Northwind's 42 coachees are above.

// Milestone 2 demo: Amara's session 2 happened yesterday with consent from both people, and
// its transcript is waiting to be uploaded (prisma/seed-data/transcripts/amara-session-2.json).
const demoSession = session(`eng-${demoCoacheeId}`, 2, '2025-10-24 11:00', 'consented');
consents.push(
  { id: `cons-${demoSession.id}-coach`, sessionId: demoSession.id, userId: 'daniel', channel: 'web', grantedAt: t('2025-10-23 09:05') },
  { id: `cons-${demoSession.id}-coachee`, sessionId: demoSession.id, userId: demoCoacheeId, channel: 'slack', grantedAt: t('2025-10-23 17:15') },
);

// Summaries for every generated session.
for (const s of bulkSessions) {
  summaries.push({ id: `sum-${s.id}`, sessionId: s.id, headline: null, headlineAccent: null, sensitiveSpans: [], status: 'approved', approvedById: s.coachId, approvedAt: addMinutes(s.scheduledAt, 240), insights: [{ kind: 'insight', text: `Noticed progress on ${s.theme.toLowerCase()}.`, source: 'ai' }] });
}

// Commitments: 207 generated + 7 named = 214 approved Northwind commitments.
// Target statuses across all 214: 45 not started, 64 tried, 43 practiced, 30 habit, 32 set aside.
const STATUS_POOL = shuffle([
  ...Array(43).fill('not_started'), ...Array(62).fill('tried'), ...Array(42).fill('practiced'),
  ...Array(29).fill('habit'), ...Array(31).fill('set_aside'),
]);
const perSession = bulkSessions.map(() => 2);
// 110 sessions × 2 = 220, so 13 sessions get one commitment instead of two.
// Daniel's generated sessions all keep at least one.
shuffle(bulkSessions.map((_, i) => i)).slice(0, 13).forEach((i) => { perSession[i] = 1; });

const bulkCommitments: any[] = [];
bulkSessions.forEach((s, i) => {
  for (let j = 0; j < perSession[i]; j++) {
    const [text, title] = pick(COMMITMENT_TEMPLATES[s.theme]);
    const c = { id: `c-${s.id}-${j + 1}`, sessionId: s.id, goalId: `goal-${s.coacheeId}`, createdAt: s.endsAt, status: STATUS_POOL.pop(), ifThenText: text, title, shortTitle: title, dueBy: addDays(s.endsAt, 4) };
    commitment(c);
    bulkCommitments.push(c);
  }
});

// Fixed wording for the demo coachee's earlier actions, so the milestone 2 follow-up step
// (AI task 4) has stable actions to refer to. Statuses still come from the pool above.
const DEMO_ACTIONS: Array<[string, string]> = [
  ["When the weekly plan is due, I'll let my lead make the call.", 'Let my lead make the weekly call'],
  ["In Monday's stand-up, I'll let the leads run the meeting.", 'Let the leads run the Monday stand-up'],
];
// commitment() stores a copy, so update both the stored row and the local reference.
for (const list of [commitments, bulkCommitments]) {
  list.filter((c) => c.sessionId === `eng-${demoCoacheeId}-s1`).forEach((c, i) => {
    [c.ifThenText, c.title] = DEMO_ACTIONS[i];
    c.shortTitle = c.title;
  });
}

// Check-ins. 188 of 214 commitments get at least one (88 percent follow-up):
// all named ones except Marcus's second, and all generated ones except 25 not-started.
// 50 set-aside responses in all: reasons 34 time pressure, 12 less relevant, 4 other.
const reasonPool = [...Array(33).fill('time_pressure'), ...Array(12).fill('less_relevant'), ...Array(4).fill('other')]; // Priya's adds the 34th
const firstTryOffsets = [2, 3, 4, 5, 6];
let notStartedSeen = 0;
let extraSetAsides = 18;
for (const [i, c] of bulkCommitments.entries()) {
  const base = c.createdAt as Date;
  const ci = (dayOffset: number, response: string, extra: Record<string, unknown> = {}) =>
    checkIn({ commitmentId: c.id, slot: 'end_of_day', prompt: `How did it go: ${c.title.toLowerCase()}?`, sentAt: addDays(base, dayOffset), respondedAt: addMinutes(addDays(base, dayOffset), 9), response, ...extra });
  if (c.status === 'not_started') {
    if (notStartedSeen++ >= 25) ci(2, 'not_yet');
    continue;
  }
  if (c.status === 'set_aside') {
    ci(3, 'set_aside', { setAsideReason: reasonPool.pop() });
    continue;
  }
  // Some commitments were set aside once before the coachee came back to them.
  let offset = firstTryOffsets[i % firstTryOffsets.length];
  if (extraSetAsides > 0 && (c.status === 'tried' || c.status === 'practiced')) {
    extraSetAsides--;
    ci(1, 'set_aside', { setAsideReason: reasonPool.pop() });
  }
  const tries = c.status === 'tried' ? 1 : c.status === 'practiced' ? 3 : 4;
  for (let k = 0; k < tries; k++) ci(offset + k * 3, 'tried');
}
if (reasonPool.length !== 0 || extraSetAsides !== 0) throw new Error('Seed check-in targets not met; adjust the status pool.');

// Coaching-language markers for coachees with three or more sessions. Baseline is the mean
// of the first two sessions; the latest session is set so Northwind's aggregate is +32 percent:
// (Priya's latest 5 + n·L) / (Priya's baseline 2.5 + n·2.5) = 1.32.
const byCoachee = new Map<string, any[]>();
for (const s of bulkSessions) byCoachee.set(s.coacheeId, [...(byCoachee.get(s.coacheeId) ?? []), s]);
const eligible = [...byCoachee.values()].filter((ss) => ss.length >= 3);
const latestPer1k = 3.3 - 1.7 / eligible.length;
for (const ss of byCoachee.values()) {
  ss.forEach((s, k) => {
    const isLatest = k === ss.length - 1 && ss.length >= 3;
    const per1k = isLatest ? latestPer1k : k === 0 ? 2.4 : k === 1 ? 2.6 : 2.8;
    markers.push({ id: `lm-${s.id}`, sessionId: s.id, userId: s.coacheeId, marker: 'open_question', count: Math.round(per1k * 4), per1kWords: per1k });
  });
}

// ── practice feedback for the coaches Grace supports ─────────────────────────────────

const ICF = ['icf.goal', 'icf.evoke', 'icf.design', 'icf.measure', 'grow.options'];
function feedback(s: any, coachId: string, talk: number, open: number, observed: Record<string, boolean>, evidence: Record<string, string> = {}) {
  practice.push({
    id: `pf-${s.id}`, sessionId: s.id, coachId, rubricId: 'icf', coachTalkShare: talk, openQuestionShare: open, analysedAt: addMinutes(s.endsAt, 30),
    markerResults: ICF.map((m) => ({ markerId: m, observed: observed[m] ?? true, evidence: evidence[m] ?? (observed[m] === false ? 'Not seen in this session.' : 'Seen in this session.') })),
  });
}
// Daniel: 14 analysed sessions. Last six average 34 percent talk and 71 percent open questions;
// the eight before average 41 and 58. Markers: goal 13 of 14, design 12 of 14, options 6 of 14.
const danielSessions = [...bulkSessions.filter((s) => s.coachId === 'daniel'), pS1, pS2, pS3, pS4, mS1, mS2, tS1, tS2]
  .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
const danielTalk = [44, 42, 40, 41, 43, 39, 40, 39, 36, 33, 35, 34, 32, 34];
const danielOpen = [55, 57, 60, 58, 59, 56, 61, 58, 70, 72, 69, 73, 71, 71];
danielSessions.forEach((s, i) => {
  const isP4 = s.id === pS4.id;
  const obs: Record<string, boolean> = {
    'icf.goal': i !== 2,
    'icf.evoke': true,
    'icf.design': !(i === 1 || i === 5),
    'icf.measure': !isP4 && i % 3 !== 0,
    'grow.options': !isP4 && [0, 3, 6, 8, 10, 12].includes(i),
  };
  const ev = isP4
    ? {
        'icf.goal': '00:04 "What happened when you tried it?"',
        'icf.evoke': '02:15 "What made Friday different?"',
        'icf.design': '31:20 "What would you like to try before we meet again?"',
        'icf.measure': 'No due date agreed for the feedback conversation.',
        'grow.options': 'The session moved from reality to commitments.',
      }
    : {};
  feedback(s, 'daniel', danielTalk[i], danielOpen[i], obs, ev);
});
if (danielSessions.length !== 14) throw new Error(`Daniel should have 14 analysed sessions, has ${danielSessions.length}`);
// Aiko: 22 sessions, steady. Luis: 9 sessions, too few for a trend.
bulkSessions.filter((s) => s.coachId === 'aiko').forEach((s, i) => feedback(s, 'aiko', 28, 76, { 'icf.measure': i % 4 !== 0, 'grow.options': i % 3 !== 0 }));
bulkSessions.filter((s) => s.coachId === 'luis').forEach((s, i) => feedback(s, 'luis', 45 - i, 50 + i, { 'grow.options': i % 2 === 0 }));

// Consent rows for generated captured sessions.
for (const s of bulkSessions) {
  consents.push({ id: `cons-${s.id}-coach`, sessionId: s.id, userId: s.coachId, channel: 'web', grantedAt: addDays(s.scheduledAt, -1) });
  consents.push({ id: `cons-${s.id}-coachee`, sessionId: s.id, userId: s.coacheeId, channel: 'slack', grantedAt: addDays(s.scheduledAt, -1) });
}

// ── generated Halden and Brightline coachees (engagements only) ──────────────────────

const OTHER_COACHES = ['aiko', 'sofia', 'kwame', 'meilin'];
for (const [clientId, n, theme, title] of [['halden', 17, 'Delegating decisions', 'delegate decisions'], ['brightline', 26, 'Running effective one-to-ones', 'run one-to-ones that help']] as const) {
  for (let i = 1; i <= n; i++) {
    const coacheeId = addBulkCoachee(clientId, i);
    const engId = `eng-${coacheeId}`;
    engagements.push({ id: engId, clientId, coacheeId, coachId: OTHER_COACHES[i % OTHER_COACHES.length], start: t('2025-09-01 00:00'), end: t('2026-03-31 00:00'), plannedSessions: 8, activeRubricIds: ['roadmap', 'grow'],
      // Brightline captures allowlisted sessions only; a third of its engagements aren't on the list.
      captureAllowed: !(clientId === 'brightline' && i % 3 === 0) });
    goal({ id: `goal-${coacheeId}`, engagementId: engId, title: title.charAt(0).toUpperCase() + title.slice(1), theme, capabilities: THEME_CAPABILITIES[theme], thinking: ['Synthetic current thinking', 'Synthetic future thinking'], behaving: ['synthetic current behaviour', 'synthetic future behaviour'], personalImpact: ['Build influence'], orgOutcomes: [['Improve team effectiveness', 'moderately']] });
  }
}

// ── companion messages (milestone 3) ─────────────────────────────────────────────────
// Priya's Slack chat around session 4, and Elena's Teams recap, as stored messages.

const messages: any[] = [];
const ciFor = (commitmentId: string, at: string) => checkIns.find((c) => c.commitmentId === commitmentId && c.sentAt.getTime() === t(at).getTime())?.id;
function message(m: Record<string, any>) {
  messages.push({ id: `cm-seed-${messages.length + 1}`, deliveredVia: 'simulated', ...m });
}
message({ recipientId: 'priya', kind: 'consent_request', channel: 'slack', sentAt: t('2025-10-20 17:00'), sessionId: pS4.id, text: 'Your session with Daniel is tomorrow. Can we capture the transcript?', data: { dayLabel: 'Monday, the day before your session' }, response: { choice: 'allow' }, respondedAt: t('2025-10-20 17:20') });
message({ recipientId: 'priya', kind: 'pre_session_prompt', channel: 'slack', sentAt: t('2025-10-20 18:00'), sessionId: pS4.id, text: "What do you want to bring to tomorrow's session?" });
message({ recipientId: 'priya', kind: 'recap', channel: 'slack', sentAt: t('2025-10-21 14:20'), sessionId: pS4.id, text: 'Your session recap is ready' });
message({ recipientId: 'priya', kind: 'check_in', channel: 'slack', sentAt: t('2025-10-22 17:00'), commitmentId: 'c-priya-5', checkInId: ciFor('c-priya-5', '2025-10-22 17:00'), text: 'Have you booked the feedback conversation with Sam?', response: { choice: 'not_yet' }, respondedAt: t('2025-10-22 17:10') });
message({ recipientId: 'priya', kind: 'nudge', channel: 'slack', sentAt: t('2025-10-23 12:00'), commitmentId: 'c-priya-4', checkInId: ciFor('c-priya-4', '2025-10-23 12:00'), text: 'Your 14:00 team meeting is a good moment to ask three curiosity questions. One to try: "What\'s making this hard right now?"', response: { choice: 'will_try' }, respondedAt: t('2025-10-23 12:03') });
message({ recipientId: 'priya', kind: 'check_in', channel: 'slack', sentAt: t('2025-10-23 17:00'), commitmentId: 'c-priya-4', checkInId: ciFor('c-priya-4', '2025-10-23 17:00'), text: 'How did the curiosity questions go?', response: { choice: 'tried', text: "I asked two before jumping in. Ana suggested an approach I hadn't thought of." }, respondedAt: t('2025-10-23 17:04') });
message({ recipientId: 'priya', kind: 'ack', channel: 'slack', sentAt: t('2025-10-23 17:04'), text: "Nice work. We'll share this with Daniel before your next session.", data: { badge: { label: 'Tried', tone: 'info' } } });
message({ recipientId: 'elena', kind: 'recap', channel: 'teams', sentAt: t('2025-10-17 11:30'), sessionId: 'eng-elena-s6', text: 'Your session recap is ready' });
message({ recipientId: 'elena', kind: 'reflection_prompt', channel: 'teams', sentAt: t('2025-10-17 17:00'), commitmentId: 'c-elena-6', checkInId: ciFor('c-elena-6', '2025-10-17 17:00'), text: "Anything from today's session you want to add in your own words?", response: { text: "Realised I hold on to sign-off because I worry about errors, not because Marta can't do it." } });
if (messages.some((m) => (m.kind === 'check_in' || m.kind === 'nudge' || m.kind === 'reflection_prompt') && !m.checkInId)) throw new Error('Seed message without its check-in');

// ── audit log ────────────────────────────────────────────────────────────────────────
// The six most recent events are the canvas rows; 1,278 older generated events follow.

audit.push(
  { id: 'audit-6', actorId: 'tom', action: 'delete', category: 'delete', label: 'Data deleted', object: "Session 2 transcript, at the coachee's request", clientId: 'brightline', at: t('2025-10-25 16:40') },
  { id: 'audit-5', actorId: 'noor', action: 'update', category: 'config', label: 'Policy changed', object: 'Capture set to companion mode without transcripts', clientId: 'halden', at: t('2025-10-25 11:05') },
  { id: 'audit-4', actorId: 'noor', action: 'assign', category: 'config', label: 'Coach assigned', object: 'Aiko Tanaka assigned to Jun Park', clientId: 'northwind', at: t('2025-10-24 09:30') },
  { id: 'audit-3', actorId: 'daniel', action: 'publish', category: 'access', label: 'Summary approved', object: 'Session 4 recap sent to the coachee', clientId: 'northwind', at: t('2025-10-21 14:20') },
  { id: 'audit-2', actorId: 'priya', action: 'create', category: 'consent', label: 'Consent given', object: 'Capture of session 4', clientId: 'northwind', at: t('2025-10-20 17:20') },
  { id: 'audit-1', actorId: 'tom', action: 'unassign', category: 'consent', label: 'Companion removed', object: 'Removed from session 3 before it started', clientId: 'brightline', at: t('2025-10-16 12:58') },
);
const OLD_EVENTS = [
  { action: 'create', category: 'consent', label: 'Consent given', object: (n: number) => `Capture of session ${n}` },
  { action: 'publish', category: 'access', label: 'Summary approved', object: (n: number) => `Session ${n} recap sent to the coachee` },
  { action: 'delete', category: 'delete', label: 'Transcript deleted', object: (n: number) => `Session ${n} transcript, end of retention` },
  { action: 'update', category: 'config', label: 'Policy changed', object: () => 'Nudge quiet hours updated' },
  { action: 'assign', category: 'config', label: 'Coach assigned', object: () => 'Coach assigned to a new coachee' },
  { action: 'create', category: 'access', label: 'Summary viewed', object: (n: number) => `Session ${n} recap opened by the coach` },
] as const;
const actorsByClient: Record<string, string[]> = { northwind: [], halden: [], brightline: [] };
for (const e of engagements) actorsByClient[e.clientId]?.push(e.coacheeId, e.coachId);
const oldestRecent = t('2025-10-16 12:00').getTime();
const programStart = t('2025-07-01 09:00').getTime();
for (let i = 0; i < 1278; i++) {
  const ev = pick(OLD_EVENTS);
  const clientId = pick(['northwind', 'northwind', 'halden', 'brightline']);
  const at = new Date(programStart + Math.floor(rand() * (oldestRecent - programStart)));
  at.setUTCSeconds(0, 0);
  audit.push({ id: `audit-old-${i + 1}`, actorId: ev.category === 'config' ? 'noor' : pick(actorsByClient[clientId]), action: ev.action, category: ev.category, label: ev.label, object: ev.object(1 + Math.floor(rand() * 6)), clientId, at });
}

// ── work meetings (milestone 7) ─────────────────────────────────────────────────────
// Priya linked her Thursday team meeting series to her curiosity-questions action after
// session 4. The 23 Oct meeting has feedback (matching her own reflection: two questions, not
// three); 30 Oct is coming up. Two earlier links show the stop and external-participant rules.
// No transcripts are stored for work meetings: only the check, with Priya's own quotes.
const meetingLinks: any[] = [];
const occurrences: any[] = [];
const TEAM = [{ name: 'Ana Ruiz', internal: true }, { name: 'Sam Osei', internal: true }, { name: 'Leo Brandt', internal: true }];
const agreed = (list: Array<{ name: string; internal: boolean }>, at: string) => list.map((a) => ({ ...a, agreedAt: t(at).toISOString(), declinedAt: null }));
meetingLinks.push(
  { id: 'ml-priya-team', commitmentId: 'c-priya-4', coacheeId: 'priya', scope: 'series', calendarEventId: 'cal-priya-team', title: 'Weekly team meeting', cadence: 'Thursdays 14:00', createdAt: t('2025-10-21 17:30'), expiresAt: t('2026-01-31 00:00'), lastConfirmedAt: t('2025-10-21 17:30'), sharedWithCoach: true },
  { id: 'ml-priya-ana', commitmentId: 'c-priya-2', coacheeId: 'priya', scope: 'series', calendarEventId: 'cal-priya-ana', title: 'One-to-one with Ana', cadence: 'Mondays 15:00', createdAt: t('2025-09-24 09:10'), expiresAt: t('2026-01-31 00:00'), stoppedAt: t('2025-10-06 17:12'), stopReason: 'set_aside', lastConfirmedAt: t('2025-09-24 09:10') },
  { id: 'ml-priya-carrier', commitmentId: 'c-priya-3', coacheeId: 'priya', scope: 'single', calendarEventId: 'cal-priya-carrier-1015', title: 'Carrier review with Bluefin Freight', createdAt: t('2025-10-08 12:00'), expiresAt: t('2026-01-31 00:00'), lastConfirmedAt: t('2025-10-08 12:00') },
);
occurrences.push(
  {
    id: 'mo-priya-team-1023', linkId: 'ml-priya-team', scheduledAt: t('2025-10-23 14:00'), endsAt: t('2025-10-23 14:45'), attendees: agreed(TEAM, '2025-10-23 14:01'),
    captureStatus: 'captured', noticeShownAt: t('2025-10-23 14:00'), checkedAt: t('2025-10-23 15:05'), aiProvider: 'sample',
    check: {
      attempted: 'partly',
      summary: 'You asked two curiosity questions before sharing your view on the route changes, one short of the three you planned.',
      evidence: [
        { quote: "What's making this hard right now?", time: '04:12' },
        { quote: 'What would you try if I weren’t in the room?', time: '09:40' },
      ],
      counts: { open_question: 3, curiosity_question: 2, feedback_framing: 0 },
      words: 812,
      dropped: 0,
    },
  },
  { id: 'mo-priya-team-1030', linkId: 'ml-priya-team', scheduledAt: t('2025-10-30 14:00'), endsAt: t('2025-10-30 14:45'), attendees: TEAM.map((a) => ({ ...a, agreedAt: null, declinedAt: null })), captureStatus: 'scheduled' },
  { id: 'mo-priya-ana-1006', linkId: 'ml-priya-ana', scheduledAt: t('2025-10-06 15:00'), endsAt: t('2025-10-06 15:30'), attendees: [{ name: 'Ana Ruiz', internal: true, agreedAt: null, declinedAt: null }], captureStatus: 'stopped' },
  { id: 'mo-priya-carrier-1015', linkId: 'ml-priya-carrier', scheduledAt: t('2025-10-15 10:00'), endsAt: t('2025-10-15 11:00'), attendees: [{ name: 'Sam Osei', internal: true, agreedAt: null, declinedAt: null }, { name: 'Dana Whitlock (Bluefin Freight)', internal: false, agreedAt: null, declinedAt: null }], captureStatus: 'skipped_external', noticeShownAt: t('2025-10-15 10:00') },
);
message({ recipientId: 'priya', kind: 'meeting_feedback', channel: 'slack', sentAt: t('2025-10-23 15:05'), commitmentId: 'c-priya-4', text: 'Feedback from Weekly team meeting', data: { linkId: 'ml-priya-team', occurrenceId: 'mo-priya-team-1023' } });
audit.push(
  { id: 'audit-wm-1', actorId: 'priya', action: 'create', category: 'consent', label: 'Work meeting linked', object: 'Series "Weekly team meeting" (Thursdays 14:00) linked to an action; capture needs everyone\'s agreement each time', clientId: 'northwind', at: t('2025-10-21 17:30') },
  { id: 'audit-wm-2', actorId: 'priya', action: 'create', category: 'consent', label: 'Work-meeting notice shown', object: '"Weekly team meeting" on Thu 23 Oct, to three colleagues', clientId: 'northwind', at: t('2025-10-23 14:00') },
  { id: 'audit-wm-3', actorId: 'priya', action: 'create', category: 'access', label: 'Work meeting analyzed', object: '"Weekly team meeting" on Thu 23 Oct: the coachee\'s own words only; others\' words discarded, nothing stored but the feedback', clientId: 'northwind', at: t('2025-10-23 15:05') },
  { id: 'audit-wm-4', actorId: 'priya', action: 'assign', category: 'access', label: 'Work-meeting feedback shared', object: '"Weekly team meeting" feedback shared with the coach', clientId: 'northwind', at: t('2025-10-23 15:20') },
);

// ── write ────────────────────────────────────────────────────────────────────────────

async function main() {
  // Clear in dependency order so the seed can run on an existing database.
  for (const model of ['meetingOccurrence', 'meetingLink', 'managerNote', 'companionMessage', 'auditEvent', 'aiAnswer', 'sessionEvent', 'nextSessionPlan', 'practiceFeedback', 'languageMarker', 'coachNote', 'checkIn', 'commitment', 'summary', 'transcript', 'consent', 'session', 'goal', 'engagement', 'integration', 'rubric', 'user', 'client'] as const) {
    await (db as any)[model].deleteMany();
  }
  for (const c of CLIENTS) await db.client.create({ data: { ...c, redactionTerms: json(c.redactionTerms), nudgeDefaults: json(c.nudgeDefaults), featureFlags: json(c.featureFlags), activeRubricIds: json(c.activeRubricIds), mcpScopes: json(c.mcpScopes), createdAt: nextCreatedAt() } });
  for (const c of CLIENTS) {
    const slack = c.id === 'orrin' ? 'not_connected' : 'connected';
    const teams = c.id === 'halden' ? 'connected' : 'needs_approval';
    await db.integration.createMany({ data: integrationsFor(c.id, c.name, slack, teams) });
  }
  for (const r of RUBRICS) await db.rubric.create({ data: { ...r, markers: json(r.markers) } });
  // Users without a manager first, so the manager relation resolves.
  for (const u of users) {
    const { managerId, ...rest } = u;
    await db.user.create({ data: { ...rest, status: rest.status ?? 'active', nudgeChannelOrder: json(rest.nudgeChannelOrder ?? ['email']), preferences: rest.preferences === undefined ? undefined : json(rest.preferences), createdAt: nextCreatedAt() } });
  }
  for (const u of users) if (u.managerId) await db.user.update({ where: { id: u.id }, data: { managerId: u.managerId } });

  await db.engagement.createMany({ data: engagements.map((e) => ({ ...e, activeRubricIds: json(e.activeRubricIds) })) });
  await db.goal.createMany({ data: goals.map((g) => ({ ...g, capabilities: json(g.capabilities), personalImpact: json(g.personalImpact), orgOutcomes: json(g.orgOutcomes) })) });
  // Synthetic Zoom meeting IDs for Zoom sessions, so automatic transcripts can be matched.
  await db.session.createMany({ data: sessions.map(({ theme, coacheeId, coachId, ...s }, i) => ({ ...s, meetingId: s.platform === 'zoom' ? String(84_000_000_000 + i * 7919) : null, transcriptSource: s.captureStatus === 'captured' ? 'zoom' : null })) });
  await db.consent.createMany({ data: consents });
  await db.transcript.createMany({ data: transcripts.map((x) => ({ ...x, segments: json(x.segments) })) });
  await db.summary.createMany({ data: summaries.map((x) => ({ ...x, insights: json(x.insights), sensitiveSpans: json(x.sensitiveSpans) })) });
  await db.commitment.createMany({ data: commitments });
  await db.checkIn.createMany({ data: checkIns });
  await db.coachNote.createMany({ data: coachNotes.map((n) => ({ ...n, showUpTags: json(n.showUpTags) })) });
  await db.languageMarker.createMany({ data: markers });
  await db.practiceFeedback.createMany({ data: practice.map((p) => ({ ...p, markerResults: json(p.markerResults) })) });
  await db.nextSessionPlan.createMany({ data: plans.map((p) => ({ ...p, openCommitmentIds: json(p.openCommitmentIds), questions: json(p.questions) })) });
  await db.sessionEvent.createMany({ data: sessionEvents });
  await db.aiAnswer.createMany({ data: aiAnswers.map((a) => ({ ...a, citedSessionNumbers: json(a.citedSessionNumbers) })) });
  for (let i = 0; i < audit.length; i += 500) await db.auditEvent.createMany({ data: audit.slice(i, i + 500) });
  await db.companionMessage.createMany({ data: messages });
  await db.meetingLink.createMany({ data: meetingLinks });
  await db.meetingOccurrence.createMany({ data: occurrences.map((o) => ({ ...o, attendees: json(o.attendees), ...(o.check ? { check: json(o.check) } : {}) })) });
  // Grace's note for her next development conversation with Daniel (milestone 4).
  await db.managerNote.create({ data: { id: 'mnote-daniel-1', managerId: 'grace', coachId: 'daniel', createdAt: t('2025-10-20 15:30'), text: 'Your open questions are up a lot since August. In our next conversation, let’s look at one session where options came before the way forward and what made that work.' } });

  const counts = {
    users: users.length, sessions: sessions.length, commitments: commitments.length,
    checkIns: checkIns.length, transcripts: transcripts.length, auditEvents: audit.length,
  };
  console.log('Seeded synthetic data:', counts);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
