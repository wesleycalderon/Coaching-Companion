// Coach tools (milestone 4): AI tasks 7 (Ask the AI), 8 (next-session plan) and 9 (practice
// feedback). Callers check who is acting; these functions assume the coach owns the work.
//
// Guardrails in code:
//  - Ask the AI and the plan cite source lines; a quote that isn't in its source is dropped,
//    and an answer left with no valid citation is replaced by "couldn't find support".
//  - Sensitive transcript passages never reach either task (see sources.ts).
//  - Practice feedback: talk share and question rate are counted in code; a marker the AI
//    calls observed is kept only when its quote is in the transcript.
//  - Without an API key, Ask the AI shows matching passages and the plan uses a template.
//    Both are labelled as sample output.

import type { Commitment, Prisma } from '@prisma/client';
import { db } from '../db';
import { COMMITMENT_STATUS, MIN_MARKER_KAPPA, PRACTICE_MARKERS, type CommitmentStatus, type MarkerResult, type RubricMarker, type TranscriptSegment } from '../domain';
import { asJson, eventTime, firstName } from '../format';
import { OPEN_START } from '../language';
import { findQuote, forModel, redact } from '../transcript';
import { AiError, aiProvider, runTask, type AiProvider } from './client';
import { AskSchema, PlanSchema, PracticeSchema } from './schemas';
import { bestMatches, checkCitations, engagementSources, excerpt, practiceSources, sourcesForModel, type Citation, type Source } from './sources';

export type AskScope = 'session' | 'engagement' | 'practice';

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

// ── Task 7: Ask the AI ──────────────────────────────────────────────────────────────

export async function askAi(input: { askerId: string; scope: AskScope; question: string; engagementId?: string; sessionId?: string }): Promise<{ id: string } | { error: string }> {
  const raw = input.question.trim().replace(/\s+/g, ' ');
  if (raw.length < 5) return { error: 'Write a question of at least a few words.' };
  if (raw.length > 300) return { error: 'Keep the question under 300 characters.' };

  let sources: Source[];
  let scopeText: string;
  let question = raw;
  let clientId: string | null = null;
  let auditObject = '';
  if (input.scope === 'practice') {
    sources = await practiceSources(input.askerId);
    scopeText = "the coach's own practice feedback (talk share, question rate and ICF and GROW markers per session) and notes from their coach manager";
  } else {
    const e = await db.engagement.findUniqueOrThrow({ where: { id: input.engagementId! }, include: { coachee: true, client: true } });
    const session = input.sessionId ? await db.session.findUnique({ where: { id: input.sessionId } }) : null;
    sources = await engagementSources(e.id, input.scope === 'session' ? input.sessionId : undefined);
    scopeText = input.scope === 'session' && session ? `session ${session.number} with ${e.coachee.name}` : `every session so far with ${e.coachee.name}`;
    // The client's redaction terms apply to the question too, before it's stored or sent.
    if (e.client.redactionOn) question = redact([{ speakerName: '', start: '', end: '', text: raw }], asJson<string[]>(e.client.redactionTerms)).segments[0].text;
    clientId = e.clientId;
    auditObject = input.scope === 'session' && session ? `Session ${session.number} with ${e.coachee.name}` : `All sessions with ${e.coachee.name}`;
  }
  if (sources.length === 0) return { error: input.scope === 'practice' ? 'There’s no practice feedback to search yet.' : 'There’s nothing to search yet: no transcript, recap, notes or results.' };

  let answer: string;
  let citations: Citation[];
  const provider = aiProvider();
  if (provider === 'sample') {
    const matches = bestMatches(sources, question);
    citations = matches.map((s) => ({ sessionNumber: s.sessionNumber, label: s.label, quote: excerpt(s) }));
    answer = matches.length
      ? 'Sample answer: no API key is set, so these are the passages that best match your question, not an AI-written answer.'
      : 'Sample answer: no API key is set, and no passage matches the words in your question. With an API key, Claude can answer questions that need more than matching words.';
  } else {
    try {
      const out = await runTask('ask-the-ai', { scope: scopeText, question, sources: sourcesForModel(sources) }, AskSchema, { effort: 'medium', transcriptHash: '' });
      citations = out.output.found ? checkCitations(sources, out.output.citations) : [];
      answer = out.output.found && citations.length
        ? out.output.answer.trim()
        : out.output.found
          ? "I couldn't find a quote in these sources that supports an answer, so none is shown."
          : out.output.answer.trim() || "These sources don't answer that question.";
    } catch (e) {
      if (e instanceof AiError) return { error: e.message };
      throw e;
    }
  }

  const now = eventTime();
  const id = `ai-${input.askerId}-${now.getTime()}`;
  const nums = [...new Set(citations.map((c) => c.sessionNumber).filter((n): n is number => n !== null))].sort((a, b) => a - b);
  await db.aiAnswer.create({
    data: {
      id, scope: input.scope, engagementId: input.engagementId ?? null, sessionId: input.sessionId ?? null, askedById: input.askerId,
      question, answer, citedSessionNumbers: nums, citations: citations as unknown as Prisma.InputJsonValue, aiProvider: provider, createdAt: now,
    },
  });
  if (input.scope !== 'practice') {
    // Data access by the AI on the coach's behalf. The question itself isn't logged.
    await db.auditEvent.create({ data: { id: `audit-${id}`, actorId: input.askerId, action: 'create', category: 'access', label: 'AI question asked', object: auditObject, clientId, at: now } });
  }
  return { id };
}

// ── Task 8: next-session plan ───────────────────────────────────────────────────────

/** Approved actions still in play: not yet a habit. Newest first, at most four. */
async function openActions(engagementId: string, beforeNumber: number) {
  const list = await db.commitment.findMany({
    where: { approved: true, status: { not: 'habit' }, session: { engagementId, number: { lt: beforeNumber } } },
    include: { session: true, checkIns: { orderBy: { sentAt: 'desc' } } },
  });
  return list.sort((a, b) => b.session.number - a.session.number || a.id.localeCompare(b.id)).slice(0, 4);
}

const statusLabel = (c: Commitment) => (COMMITMENT_STATUS[c.status as CommitmentStatus]?.label ?? c.status).toLowerCase();

export async function draftPlan(sessionId: string): Promise<{ ok: true } | { error: string }> {
  const s = await db.session.findUnique({ where: { id: sessionId }, include: { plan: true, engagement: { include: { coachee: true, goals: true } } } });
  if (!s) return { error: "We couldn't find this session." };
  const who = firstName(s.engagement.coachee.name);
  const open = await openActions(s.engagementId, s.number);
  const sources = await engagementSources(s.engagementId);
  if (!open.length && !sources.length) return { error: `There's nothing to plan from yet. Add notes or a transcript for ${who}'s first session.` };
  const topic = s.plan?.coacheeTopic ?? null;

  let focus: string;
  let evidence: Citation[];
  let questions: string[];
  const provider = aiProvider();
  if (provider === 'sample') {
    ({ focus, evidence, questions } = templatePlan(who, open, sources, topic));
  } else {
    const goal = s.engagement.goals[0];
    try {
      const out = await runTask('next-session-plan', {
        coacheeName: s.engagement.coachee.name,
        goal: goal ? `${goal.title}. Ways of thinking: from "${goal.thinkingCurrent}" to "${goal.thinkingFuture}". Ways of behaving: from ${goal.behavingCurrent} to ${goal.behavingFuture}.` : 'No Roadmap goal yet.',
        actions: open.map((c) => `- ${statusLabel(c)}: ${c.ifThenText}`).join('\n') || 'None.',
        // The last three sessions keep the prompt focused and short.
        sources: sourcesForModel(sources.filter((x) => (x.sessionNumber ?? 0) > s.number - 4)),
        coacheeTopic: topic ?? 'Not answered yet.',
      }, PlanSchema, { effort: 'medium', transcriptHash: '' });
      focus = out.output.suggestedFocus.trim();
      evidence = checkCitations(sources, out.output.focusEvidence);
      questions = out.output.questions.map((q) => q.trim()).filter(Boolean).slice(0, 5);
      if (!evidence.length) focus = `${focus} (No quote supporting this focus was found in the sources. Check it before the session.)`;
    } catch (e) {
      if (e instanceof AiError) return { error: e.message };
      throw e;
    }
  }

  const data = {
    openCommitmentIds: open.map((c) => c.id),
    suggestedFocus: focus,
    focusEvidence: evidence as unknown as Prisma.InputJsonValue,
    questions,
    aiProvider: provider,
    draftedAt: eventTime(),
    editedAt: null,
  };
  await db.nextSessionPlan.upsert({
    where: { forSessionId: s.id },
    create: { id: `plan-${s.id}`, engagementId: s.engagementId, forSessionId: s.id, coacheeTopic: topic, ...data },
    update: data,
  });
  return { ok: true };
}

/** The plan without an API key: built from action statuses and the coachee's latest results. */
function templatePlan(who: string, open: Awaited<ReturnType<typeof openActions>>, sources: Source[], topic: string | null) {
  const moving = open.find((c) => c.status === 'tried' || c.status === 'practiced');
  const stuck = open.find((c) => c.status === 'not_started' || c.status === 'set_aside');
  const parts = [
    moving ? `build on "${moving.title}" (${statusLabel(moving)})` : null,
    stuck ? `look at what's holding back "${stuck.title}" (${statusLabel(stuck)})` : null,
  ].filter(Boolean);
  const focus = parts.length
    ? `${parts.join(', and ').replace(/^./, (x) => x.toUpperCase())}.`
    : `Review what ${who} noticed since the last session and choose the next action together.`;

  // Evidence: the coachee's latest written result for each action, or the action itself.
  const evidence: Citation[] = [];
  for (const c of [moving, stuck]) {
    if (!c) continue;
    const result = c.checkIns.find((ci) => ci.respondedAt && ci.reflectionText);
    const src = result
      ? sources.find((x) => x.sessionNumber === c.session.number && x.text.endsWith(result.reflectionText!.trim()))
      : sources.find((x) => x.sessionNumber === c.session.number && x.text.startsWith(c.ifThenText));
    if (src) evidence.push({ sessionNumber: src.sessionNumber, label: src.label, quote: result ? result.reflectionText!.trim() : c.ifThenText });
  }

  const questions = [topic ? `What would you like to leave this session with on what you raised?` : 'What would you like to get from this session?'];
  // Action titles are in the coachee's words ("…my view"); the coach asks in the second person.
  const yours = (s: string) => lower(s).replace(/\bmy\b/g, 'your').replace(/\bI\b/g, 'you').replace(/\bme\b/g, 'you').replace(/\bmyself\b/g, 'yourself');
  for (const c of open.slice(0, 3)) {
    const t = yours(c.title);
    if (c.status === 'tried' || c.status === 'practiced') questions.push(`What did you notice when you tried to ${t}?`);
    else if (c.status === 'set_aside') questions.push(`What would a smaller step toward "${t}" look like?`);
    else questions.push(`What would make it easier to ${t} this week?`);
  }
  for (const q of [`What have you noticed since we last met?`, 'What will you try before we meet again?']) {
    if (questions.length < 3) questions.push(q);
  }
  return { focus, evidence, questions: questions.slice(0, 5) };
}

// ── Task 9: practice feedback ───────────────────────────────────────────────────────


/** Coach talk share (by words) and the share of the coach's questions that were open. */
export function talkStats(segs: Array<{ speakerRole: string; text: string }>) {
  const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
  const coachWords = segs.filter((s) => s.speakerRole === 'coach').reduce((n, s) => n + words(s.text), 0);
  const allWords = segs.filter((s) => s.speakerRole !== 'guest').reduce((n, s) => n + words(s.text), 0);
  const questions = segs.filter((s) => s.speakerRole === 'coach')
    .flatMap((s) => s.text.split(/(?<=[.?!])\s+/))
    .filter((x) => x.trim().endsWith('?'));
  const open = questions.filter((q) => OPEN_START.test(q.trim())).length;
  return {
    coachTalkShare: allWords ? Math.round((coachWords / allWords) * 100) : 0,
    openQuestionShare: questions.length ? Math.round((open / questions.length) * 100) : 0,
    questions: questions.length,
  };
}

/**
 * Runs after a transcript is analyzed. Never fails the upload: errors are logged and the coach
 * simply has no feedback for that session.
 */
export async function runPracticeFeedback(input: { sessionId: string; coachId: string; coachName: string; segments: TranscriptSegment[]; transcriptHash: string }): Promise<void> {
  const rubrics = await db.rubric.findMany({ where: { id: { in: ['icf', 'grow'] } } });
  const markers: Array<RubricMarker & { key: string }> = [];
  for (const r of rubrics) for (const m of asJson<RubricMarker[]>(r.markers)) {
    const key = `${r.id}.${m.id}`;
    if (PRACTICE_MARKERS.includes(key) && m.kappa >= MIN_MARKER_KAPPA) markers.push({ ...m, key });
  }
  markers.sort((a, b) => PRACTICE_MARKERS.indexOf(a.key) - PRACTICE_MARKERS.indexOf(b.key));
  const usable = input.segments.filter((s) => !s.sensitive);
  const stats = talkStats(usable);
  let results: MarkerResult[] = [];
  let provider: AiProvider = aiProvider();
  try {
    const out = await runTask('practice-feedback', {
      coachName: input.coachName,
      markers: markers.map((m) => `- ${m.key}: ${m.check}`).join('\n'),
      transcript: forModel(usable),
    }, PracticeSchema, { effort: 'medium', transcriptHash: input.transcriptHash });
    provider = out.provider;
    for (const m of markers) {
      const r = out.output.markers.find((x) => x.markerId === m.key);
      if (!r) continue;
      if (r.observed) {
        const at = r.evidenceQuote ? findQuote(usable, r.evidenceQuote) : null;
        if (!at) continue; // no verifiable evidence: leave the marker out rather than guess
        results.push({ markerId: m.key, observed: true, evidence: `${at.start} "${r.evidenceQuote!.trim()}"` });
      } else {
        results.push({ markerId: m.key, observed: false, evidence: r.note.trim() || 'Not seen in this session.' });
      }
    }
  } catch (e) {
    // Without markers the talk and question numbers are still useful.
    console.error('[practice] marker feedback failed', e);
    results = [];
  }
  const data = {
    coachId: input.coachId, rubricId: 'icf', markerResults: results as unknown as Prisma.InputJsonValue,
    coachTalkShare: stats.coachTalkShare, openQuestionShare: stats.openQuestionShare, analysedAt: eventTime(), aiProvider: provider,
  };
  await db.practiceFeedback.upsert({ where: { sessionId: input.sessionId }, create: { id: `pf-${input.sessionId}`, sessionId: input.sessionId, ...data }, update: data });
}
