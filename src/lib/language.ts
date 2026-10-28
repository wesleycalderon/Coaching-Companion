// Coaching-language markers (AI task 6), counted in code from the coachee's own words so the
// numbers are repeatable and every count traces to a sentence. No tone or emotion is inferred.

export const OPEN_START = /^(what|how|why|where|when|which|who|tell|describe|walk|say more|talk me)/i;
// For coaching language, an open question can follow a lead-in: "Before I jump in, what's hard?"
const OPEN_CLAUSE = /(^|[,;:]\s*)(what|how|why|where|when|which|who|tell me|describe|walk me|say more|talk me)\b/i;
const CURIOSITY = /\b(i wonder|i'm curious|i am curious|what if|help me understand|tell me more|what would happen if)\b/i;
const FEEDBACK = /\b(i noticed|i've noticed|i observed|what i saw|when you .{3,60}, i |the impact (?:of|was|on))\b/i;

/** Below this many coachee words a session is too short to measure. */
export const MIN_WORDS = 150;

export type LanguageMarkerKind = 'open_question' | 'curiosity_question' | 'feedback_framing';

export function countLanguage(segments: Array<{ speakerRole: string; text: string; sensitive?: boolean }>) {
  const own = segments.filter((s) => s.speakerRole === 'coachee' && !s.sensitive);
  const words = own.reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0);
  const sentences = own.flatMap((s) => s.text.split(/(?<=[.?!])\s+/)).map((x) => x.trim()).filter(Boolean);
  const questions = sentences.filter((x) => x.endsWith('?'));
  const counts: Record<LanguageMarkerKind, number> = {
    open_question: questions.filter((q) => OPEN_CLAUSE.test(q) && !CURIOSITY.test(q)).length,
    curiosity_question: questions.filter((q) => CURIOSITY.test(q)).length,
    feedback_framing: sentences.filter((x) => FEEDBACK.test(x)).length,
  };
  const per1k = (n: number) => (words ? Math.round((n / words) * 1000 * 10) / 10 : 0);
  return { words, measurable: words >= MIN_WORDS, markers: (Object.keys(counts) as LanguageMarkerKind[]).map((marker) => ({ marker, count: counts[marker], per1kWords: per1k(counts[marker]) })) };
}
