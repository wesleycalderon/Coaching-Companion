// The session loop's analysis step (milestone 2): transcript upload → AI tasks 1 to 4 →
// a draft the coach reviews. Nothing here is visible to the coachee until the coach approves.
//
// Guardrails enforced in code, not only in prompts:
//  - capture needs this session's consent from coach and coachee, and a client policy that allows it
//  - client redaction terms are applied before the transcript is stored or sent to the AI
//  - every quote the AI cites must exist in the transcript; uncited claims are dropped
//  - nothing from a sensitive passage reaches insights, updates or actions
//  - raw transcripts are kept only for the client's retention period (0 = deleted after analysis)

import type { Prisma } from '@prisma/client';
import { countLanguage } from '../language';
import { db } from '../db';
import type { FeatureFlags, OrgOutcome, SensitiveSpan, SummaryItem, TranscriptSegment } from '../domain';
import { asJson, count, day, eventTime, firstName, now as prototypeNow } from '../format';
import { findQuote, forModel, inSpans, parseTranscript, redact, transcriptHash, toStoredSegments, TranscriptFormatError, type RawSegment } from '../transcript';
import { AiError, runTask, type AiProvider } from './client';
import { runPracticeFeedback } from './coach-tools';
import { ActionsSchema, FollowUpSchema, SessionSummarySchema, SpeakerRolesSchema } from './schemas';

export interface FollowUpProposal {
  commitmentId: string;
  title: string;
  currentStatus: string;
  proposedStatus: string;
  evidenceQuote: string | null;
  evidenceTime: string | null;
  note: string;
}

export type AnalyzeResult = { ok: true } | { error: string };

const STATUS_ORDER = ['not_started', 'tried', 'practiced', 'habit'];

export type TranscriptSource = 'upload' | 'zoom';

/**
 * Analyze one session's transcript. `upload`: the coach uploaded it (actorId is the coach).
 * `zoom`: it arrived automatically from the Zoom account after the meeting (actorId is the
 * companion's system user). Both paths run the same checks and produce the same draft.
 */
export async function analyzeTranscript(input: { sessionId: string; actorId: string; source: TranscriptSource; fileName: string; content: string }): Promise<AnalyzeResult> {
  const session = await db.session.findUnique({
    where: { id: input.sessionId },
    include: {
      engagement: { include: { coachee: true, coach: true, client: true, goals: true } },
      consents: true,
      transcript: true,
      summary: true,
    },
  });
  if (!session || (input.source === 'upload' && session.engagement.coachId !== input.actorId)) return { error: "We couldn't find this session." };
  const { client, coachee, coach } = session.engagement;
  const who = firstName(coachee.name);

  // Policy and consent. STUB: BTS Studio engineering (production consent storage).
  if (client.capturePolicy === 'companion_mode') {
    return { error: `${client.name} uses companion mode, so transcripts can't be uploaded or stored. Add your notes to the session instead.` };
  }
  if (client.capturePolicy === 'allowlist' && !session.engagement.captureAllowed) {
    return { error: `${client.name} captures allowlisted sessions only, and sessions with ${who} aren't on the list. Add your notes to the session instead.` };
  }
  if (session.summary?.status === 'approved') return { error: 'This session already has an approved recap.' };
  const granted = (userId: string) => session.consents.some((c) => c.userId === userId && c.grantedAt && !c.revokedAt);
  if (!granted(coach.id)) return { error: input.source === 'upload' ? 'You haven’t consented to capture of this session.' : `${coach.name} hasn’t consented to capture of this session.` };
  if (!granted(coachee.id)) return { error: `${who} hasn’t consented to capture of this session, so it can’t be analyzed.` };
  if (session.consents.some((c) => !c.userId && !c.grantedAt)) {
    return { error: 'Someone in the session didn’t consent to capture. Upload a transcript that leaves out the time they were present.' };
  }

  // Parse, then redact before anything is stored or sent anywhere.
  let parsed: RawSegment[];
  try {
    parsed = parseTranscript(input.content, input.fileName);
  } catch (e) {
    if (e instanceof TranscriptFormatError) return { error: e.message };
    throw e;
  }
  const hash = transcriptHash(parsed);
  const { segments: redacted, count: redactions } = client.redactionOn
    ? redact(parsed, asJson<string[]>(client.redactionTerms))
    : { segments: parsed, count: 0 };

  const goal = session.engagement.goals[0];
  const priorActions = await db.commitment.findMany({
    where: { approved: true, session: { engagementId: session.engagementId, number: { lt: session.number } }, status: { notIn: ['habit'] } },
    orderBy: { id: 'asc' },
  });

  try {
    // AI task 1: speaker roles.
    const labels = [...new Set(redacted.map((s) => s.speakerName))];
    const roles = await runTask('speaker-roles', {
      coachName: coach.name, coacheeName: coachee.name, speakerLabels: labels.join(', '), transcript: forModel(redacted),
    }, SpeakerRolesSchema, { effort: 'low', transcriptHash: hash });
    const roleOf = new Map(roles.output.speakers.map((s) => [s.label, s]));
    const unsure = labels.filter((l) => !roleOf.has(l) || roleOf.get(l)!.confidence === 'low');
    const labelled = redacted.map((s) => {
      const r = roleOf.get(s.speakerName)?.role;
      return { ...s, speakerRole: (r === 'coach' || r === 'coachee' ? r : 'guest') as TranscriptSegment['speakerRole'] };
    });
    const transcriptText = forModel(labelled);

    // AI tasks 2 and 4 in parallel; task 3 uses the insights from task 2.
    const goalText = goal ? describeGoal(goal) : 'No Roadmap goal yet.';
    const [summary, followUp] = await Promise.all([
      runTask('session-summary', { coacheeName: coachee.name, coachName: coach.name, goal: goalText, transcript: transcriptText }, SessionSummarySchema, { effort: 'high', transcriptHash: hash }),
      priorActions.length
        ? runTask('action-follow-up', {
            actions: priorActions.map((a) => `- ${a.id} · ${a.status} · ${a.ifThenText}`).join('\n'), transcript: transcriptText,
          }, FollowUpSchema, { effort: 'medium', transcriptHash: hash })
        : Promise.resolve(null),
    ]);

    // Sensitive passages: flag the segments, and keep anything quoted from them out of the draft.
    const sensitive: SensitiveSpan[] = summary.output.sensitivePassages;
    const stored = labelled.map((s) => ({ ...s, sensitive: inSpans(s.start, sensitive) }));
    const usable = stored.filter((s) => !s.sensitive);
    const cite = (quote: string | null | undefined) => (quote ? findQuote(usable, quote) : null);

    const items: SummaryItem[] = [];
    let dropped = 0;
    for (const i of summary.output.insights) {
      const at = cite(i.evidenceQuote);
      if (!at) { dropped++; continue; }
      items.push({ kind: 'insight', text: i.text, evidenceQuote: i.evidenceQuote, evidenceTime: at.start, source: 'ai' });
    }
    for (const u of summary.output.suggestedUpdates) {
      const at = cite(u.evidenceQuote);
      if (!at) { dropped++; continue; }
      const text = u.kind === 'thinking' ? `From "${u.from}" to "${u.to}."` : `From ${u.from} to ${u.to}.`;
      items.push({ kind: u.kind, from: u.from, to: u.to, text, evidenceQuote: u.evidenceQuote, evidenceTime: at.start, source: 'ai', status: 'suggested' });
    }

    // AI task 3: actions, at most three, each with evidence.
    const actions = await runTask('action-extraction', {
      sessionDate: day(session.scheduledAt) + ' ' + session.scheduledAt.getUTCFullYear(),
      coacheeName: coachee.name,
      calendar: '- Monday stand-up (weekly)\n- Team planning (Tuesdays)', // STUB: calendar integration (titles only)
      insights: items.filter((i) => i.kind === 'insight').map((i, k) => `${k + 1}. ${i.text}`).join('\n') || 'None.',
      transcript: transcriptText,
    }, ActionsSchema, { effort: 'high', transcriptHash: hash });

    const newActions = actions.output.actions.slice(0, 3).map((a, k) => {
      const at = cite(a.evidenceQuote);
      const due = a.dueBy && /^\d{4}-\d{2}-\d{2}$/.test(a.dueBy) ? new Date(`${a.dueBy}T17:00:00Z`) : null;
      const needs = a.needsCoachConfirmation || !at || !due;
      const note = !at ? 'The quote for this action wasn’t found in the transcript. Check it before approving.'
        : a.confirmationNote ?? (!due ? 'No date was agreed in the session.' : null);
      return {
        id: `c-${session.id}-${k + 1}`, sessionId: session.id, goalId: goal?.id ?? null, createdAt: session.endsAt,
        status: 'not_started', approved: false, ifThenText: a.ifThenText, title: a.title, shortTitle: a.shortTitle,
        cueMoment: a.cueMoment, dueBy: due, evidenceTime: at?.start ?? null, needsCoachConfirmation: needs, confirmationNote: needs ? note : null,
      };
    });

    // AI task 4: proposals only. The coach confirms each one; only moves forward, or set aside, count.
    const proposals: FollowUpProposal[] = [];
    // Earlier actions the session revisited, with a quote that's really in the transcript.
    const discussed = new Set<string>();
    for (const u of followUp?.output.updates ?? []) {
      const sampleRef = /^earlier-(\d+)$/.exec(u.actionId);
      const action = sampleRef ? priorActions[Number(sampleRef[1]) - 1] : priorActions.find((a) => a.id === u.actionId);
      if (action && cite(u.evidenceQuote)) discussed.add(action.id);
      if (!action || u.proposedStatus === 'no_change' || u.proposedStatus === action.status) continue;
      const forward = STATUS_ORDER.indexOf(u.proposedStatus) > STATUS_ORDER.indexOf(action.status);
      if (u.proposedStatus !== 'set_aside' && !forward) continue;
      const at = cite(u.evidenceQuote);
      if (!at) continue;
      proposals.push({ commitmentId: action.id, title: action.title, currentStatus: action.status, proposedStatus: u.proposedStatus, evidenceQuote: u.evidenceQuote, evidenceTime: at.start, note: u.note });
    }

    const language = countLanguage(stored);
    const provider: AiProvider = roles.provider;
    const now = eventTime();
    const keepDays = client.retentionDays;
    // Retention runs from the end of the session, or from now if the transcript arrives late.
    const deleteAfter = new Date(Math.max(prototypeNow().getTime(), session.endsAt.getTime()) + keepDays * 86_400_000);
    const summaryData = {
      headline: summary.output.headline,
      headlineAccent: summary.output.headline.includes(summary.output.headlineAccent) ? summary.output.headlineAccent : null,
      insights: items as unknown as Prisma.InputJsonValue,
      status: 'draft',
      approvedById: null,
      approvedAt: null,
      sensitiveSpans: sensitive as unknown as Prisma.InputJsonValue,
      aiProvider: provider,
      aiModel: roles.model,
      aiDraft: { items, actions: newActions.map((a) => ({ ifThenText: a.ifThenText, title: a.title })) } as unknown as Prisma.InputJsonValue,
      followUps: proposals as unknown as Prisma.InputJsonValue,
      discussedActionIds: [...discussed],
      speakerCheck: { unsure, droppedForMissingEvidence: dropped, redactions } as unknown as Prisma.InputJsonValue,
    };

    await db.$transaction(async (tx) => {
      // Re-uploading replaces an earlier draft.
      await tx.commitment.deleteMany({ where: { sessionId: session.id, approved: false } });
      await tx.summary.upsert({ where: { sessionId: session.id }, create: { id: `sum-${session.id}`, sessionId: session.id, ...summaryData }, update: summaryData });
      await tx.commitment.createMany({ data: newActions });
      // AI task 6, counted in code: coaching language in the coachee's own words.
      await tx.languageMarker.deleteMany({ where: { sessionId: session.id } });
      if (language.measurable) {
        await tx.languageMarker.createMany({ data: language.markers.map((m) => ({ id: `lm-${session.id}-${m.marker}`, sessionId: session.id, userId: coachee.id, ...m })) });
      }
      if (keepDays > 0) {
        const segs = toStoredSegments(stored) as unknown as Prisma.InputJsonValue;
        await tx.transcript.upsert({
          where: { sessionId: session.id },
          create: { id: `tr-${session.id}`, sessionId: session.id, segments: segs, redacted: true, deleteAfter },
          update: { segments: segs, redacted: true, deleteAfter },
        });
      }
      await tx.session.update({ where: { id: session.id }, data: { captureStatus: 'captured', transcriptSource: input.source } });
      await tx.auditEvent.create({ data: { id: `audit-${session.id}-upload-${now.getTime()}`, actorId: input.actorId, action: 'create', category: 'access', label: input.source === 'zoom' ? 'Transcript received' : 'Transcript uploaded', object: `Session ${session.number} transcript${input.source === 'zoom' ? ' from Zoom' : ''}, analyzed by AI${redactions ? `, ${count(redactions)} redacted ${redactions === 1 ? 'term' : 'terms'}` : ''}`, clientId: client.id, at: now } });
      if (keepDays === 0) {
        await tx.auditEvent.create({ data: { id: `audit-${session.id}-delete-${now.getTime()}`, actorId: input.actorId, action: 'delete', category: 'delete', label: 'Transcript deleted', object: `Session ${session.number} transcript, deleted right after analysis`, clientId: client.id, at: new Date(now.getTime() + 1000) } });
      }
    });

    // AI task 9: practice feedback for the coach. Runs after the draft is saved and never
    // blocks it; the transcript is still in memory even when the client keeps none.
    if (asJson<FeatureFlags>(client.featureFlags).practiceFeedback) {
      await runPracticeFeedback({ sessionId: session.id, coachId: coach.id, coachName: coach.name, segments: toStoredSegments(stored), transcriptHash: hash })
        .catch((e) => console.error('[practice] feedback failed', e));
    }
    return { ok: true };
  } catch (e) {
    if (e instanceof AiError) return { error: e.message };
    console.error('Transcript analysis failed', e);
    return { error: "We couldn't analyze this transcript. Try again in a few minutes." };
  }
}

function describeGoal(g: { title: string; capabilities: unknown; thinkingCurrent: string; thinkingFuture: string; behavingCurrent: string; behavingFuture: string; personalImpact: unknown; orgOutcomes: unknown }) {
  return [
    `Goal: ${g.title}`,
    `Capabilities: ${asJson<string[]>(g.capabilities).join(', ')}`,
    `Ways of thinking: current "${g.thinkingCurrent}", future "${g.thinkingFuture}"`,
    `Ways of behaving: current "${g.behavingCurrent}", future "${g.behavingFuture}"`,
    `Personal impact (chosen by the coachee, do not change): ${asJson<string[]>(g.personalImpact).join(', ')}`,
    `Organizational outcomes (chosen by the coachee, do not change): ${asJson<OrgOutcome[]>(g.orgOutcomes).map((o) => `${o.outcome}, ${o.extent}`).join('; ')}`,
  ].join('\n');
}
