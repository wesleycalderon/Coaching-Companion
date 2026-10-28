// Output shapes for the AI tasks. Enforced through structured outputs, then checked again
// in the pipeline (evidence quotes must exist in the transcript).
import { z } from 'zod';

const quote = { evidenceQuote: z.string(), evidenceTime: z.string() };

export const SpeakerRolesSchema = z.object({
  speakers: z.array(z.object({
    label: z.string(),
    role: z.enum(['coach', 'coachee', 'other']),
    confidence: z.enum(['high', 'low']),
    reason: z.string(),
  })),
});

export const SessionSummarySchema = z.object({
  headline: z.string(),
  headlineAccent: z.string(),
  insights: z.array(z.object({ text: z.string(), ...quote })),
  suggestedUpdates: z.array(z.object({ kind: z.enum(['thinking', 'behaving']), from: z.string(), to: z.string(), ...quote })),
  sensitivePassages: z.array(z.object({ start: z.string(), end: z.string(), topic: z.enum(['wellbeing', 'legal', 'hr']) })),
});

export const ActionsSchema = z.object({
  actions: z.array(z.object({
    ifThenText: z.string(),
    title: z.string(),
    shortTitle: z.string(),
    cueMoment: z.string().nullable(),
    dueBy: z.string().nullable(),
    ...quote,
    needsCoachConfirmation: z.boolean(),
    confirmationNote: z.string().nullable(),
    linkedInsight: z.number().int().nullable(),
  })),
});

export const FollowUpSchema = z.object({
  updates: z.array(z.object({
    actionId: z.string(),
    proposedStatus: z.enum(['not_started', 'tried', 'practiced', 'habit', 'set_aside', 'no_change']),
    evidenceQuote: z.string().nullable(),
    evidenceTime: z.string().nullable(),
    note: z.string(),
  })),
});

export type SpeakerRoles = z.infer<typeof SpeakerRolesSchema>;
export type SessionSummaryOutput = z.infer<typeof SessionSummarySchema>;
export type ActionsOutput = z.infer<typeof ActionsSchema>;
export type FollowUpOutput = z.infer<typeof FollowUpSchema>;

export const NudgeSchema = z.object({ text: z.string() });

const citation = z.object({ sourceId: z.string(), quote: z.string() });

/** Task 7. Citations are checked against the sources before the answer is shown. */
export const AskSchema = z.object({
  found: z.boolean(),
  answer: z.string(),
  citations: z.array(citation),
});

/** Task 8. Open actions are chosen in code, not by the AI. */
export const PlanSchema = z.object({
  suggestedFocus: z.string(),
  focusEvidence: z.array(citation),
  questions: z.array(z.string()),
});

/** Task 9. Talk share and question rate are computed in code, not by the AI. */
export const PracticeSchema = z.object({
  markers: z.array(z.object({
    markerId: z.string(),
    observed: z.boolean(),
    evidenceQuote: z.string().nullable(),
    evidenceTime: z.string().nullable(),
    note: z.string(),
  })),
});

export type AskOutput = z.infer<typeof AskSchema>;
export type PlanOutput = z.infer<typeof PlanSchema>;
export type PracticeOutput = z.infer<typeof PracticeSchema>;
