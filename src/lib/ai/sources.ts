// Source lines for Ask the AI (task 7) and the next-session plan (task 8). Each line has an id
// the AI cites, so every quote in an answer can be checked against the line it came from.
//
// What goes in: retained transcript lines (never sensitive passages), insights, the coach's
// own notes, approved actions with their status, and the coachee's results from check-ins.
// Only the coach who owns the engagement ever reaches these functions.

import { db } from '../db';
import { CHECK_IN_RESPONSE_LABEL, COMMITMENT_STATUS, type CheckInResponse, type CommitmentStatus, type MarkerResult, type SummaryItem, type TranscriptSegment } from '../domain';
import { asJson, day, firstName, percent } from '../format';
import { isUpcoming } from '../queries';
import { findQuote } from '../transcript';

export interface Source {
  id: string; // "S2 00:06" · "S3 result 1" · "S4 note"
  sessionNumber: number | null;
  label: string; // shown with a citation: "Session 2, 00:06, Amara"
  text: string;
}

export interface Citation {
  sessionNumber: number | null;
  label: string;
  quote: string;
}

/** Sources for one session, or every completed session with this coachee. */
export async function engagementSources(engagementId: string, onlySessionId?: string): Promise<Source[]> {
  const e = await db.engagement.findUniqueOrThrow({
    where: { id: engagementId },
    include: {
      coachee: true,
      sessions: {
        orderBy: { number: 'asc' },
        include: {
          summary: true, transcript: true, coachNotes: true,
          commitments: { where: { approved: true }, orderBy: { id: 'asc' }, include: { checkIns: { orderBy: { sentAt: 'asc' } } } },
        },
      },
    },
  });
  const who = firstName(e.coachee.name);
  const out: Source[] = [];
  for (const s of e.sessions) {
    if (isUpcoming(s) || (onlySessionId && s.id !== onlySessionId)) continue;
    const n = s.number;
    const add = (id: string, label: string, text: string) => { if (text.trim()) out.push({ id: `S${n} ${id}`, sessionNumber: n, label: `Session ${n}, ${label}`, text: text.trim() }); };

    asJson<SummaryItem[]>(s.summary?.insights ?? []).filter((i) => i.kind === 'insight').forEach((i, k) => add(`insight ${k + 1}`, 'insight', i.text));
    for (const note of s.coachNotes) add('note', 'your notes', note.observations);
    s.commitments.forEach((c, k) => {
      const status = COMMITMENT_STATUS[c.status as CommitmentStatus]?.label ?? c.status;
      add(`action ${k + 1}`, 'action', `${c.ifThenText} (${status}${c.setAsideReason ? `, set aside: ${c.setAsideReason}` : ''})`);
      c.checkIns.filter((ci) => ci.respondedAt).forEach((ci, j) => {
        const answer = CHECK_IN_RESPONSE_LABEL[ci.response as CheckInResponse] ?? ci.response;
        add(`result ${k + 1}.${j + 1}`, `${who}'s result, ${day(ci.respondedAt!)}`, ci.reflectionText ? `${answer}: ${ci.reflectionText}` : `${answer} (${c.title})`);
      });
    });
    const segs = s.transcript ? asJson<TranscriptSegment[]>(s.transcript.segments) : [];
    for (const seg of segs) {
      if (seg.sensitive) continue;
      add(seg.start, `${seg.start}, ${firstName(seg.speakerName)}`, `${firstName(seg.speakerName)} (${seg.speakerRole}): ${seg.text}`);
    }
  }
  return out;
}

/** Sources for a coach's questions about their own practice: feedback rows and manager notes. */
export async function practiceSources(coachId: string): Promise<Source[]> {
  const rows = await db.practiceFeedback.findMany({
    where: { coachId },
    include: { session: { include: { engagement: { include: { coachee: true } } } } },
    orderBy: { session: { scheduledAt: 'asc' } },
  });
  const rubrics = await db.rubric.findMany();
  const names = new Map<string, string>();
  for (const r of rubrics) for (const m of asJson<Array<{ id: string; shortName: string }>>(r.markers)) names.set(`${r.id}.${m.id}`, m.shortName);
  const out: Source[] = [];
  for (const r of rows) {
    const who = firstName(r.session.engagement.coachee.name);
    const n = r.session.number;
    const base = `${who} S${n}`;
    const label = `Session ${n} with ${who}`;
    out.push({ id: `${base} talk`, sessionNumber: n, label, text: `Coach talk share ${percent(r.coachTalkShare)}; open questions ${percent(r.openQuestionShare)} of questions asked.` });
    for (const m of asJson<MarkerResult[]>(r.markerResults)) {
      const name = names.get(m.markerId) ?? m.markerId;
      out.push({ id: `${base} ${m.markerId}`, sessionNumber: n, label: `${label}, ${name}`, text: `${name}: ${m.observed ? 'observed' : 'not observed'}. ${m.evidence}` });
    }
  }
  const notes = await db.managerNote.findMany({ where: { coachId }, include: { manager: true }, orderBy: { createdAt: 'asc' } });
  notes.forEach((note, k) => out.push({ id: `manager note ${k + 1}`, sessionNumber: null, label: `Note from ${firstName(note.manager.name)}, ${day(note.createdAt)}`, text: note.text }));
  return out;
}

export const sourcesForModel = (sources: Source[]) => sources.map((s) => `[${s.id}] ${s.text}`).join('\n');

/** Keep only citations whose quote appears in the source they name. */
export function checkCitations(sources: Source[], cites: Array<{ sourceId: string; quote: string }>): Citation[] {
  const byId = new Map(sources.map((s) => [s.id.toLowerCase(), s]));
  const out: Citation[] = [];
  for (const c of cites) {
    const src = byId.get(c.sourceId.replace(/^\[|\]$/g, '').trim().toLowerCase());
    if (!src || !findQuote([{ text: src.text, start: src.id }], c.quote)) continue;
    if (out.some((o) => o.label === src.label && o.quote === c.quote)) continue;
    out.push({ sessionNumber: src.sessionNumber, label: src.label, quote: c.quote.trim() });
  }
  return out;
}

// ── Sample mode (no API key): find the passages that best match the question ────────────

const STOP = new Set('about above after again against also been before being between both could does doing down during each from further have having here into itself just more most much once only other over same should some such than that their them then there these they this those through under until very were what when where which while will with would your yours across sessions session tend think said says talked talk'.split(' '));

const terms = (s: string) => [...new Set(s.toLowerCase().replace(/[^a-z\s'-]/g, ' ').split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w)).map((w) => w.slice(0, 5)))];

export function bestMatches(sources: Source[], question: string, limit = 3): Source[] {
  const q = terms(question);
  if (!q.length) return [];
  return sources
    .map((s, i) => ({ s, i, score: q.filter((t) => s.text.toLowerCase().split(/[^a-z'-]+/).some((w) => w.startsWith(t))).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.i - a.i)
    .slice(0, limit)
    .map((x) => x.s);
}

/** A short verbatim quote from a source line, for sample-mode citations. */
export function excerpt(s: Source): string {
  const text = s.text.replace(/^[^:]{1,40}\((coach|coachee|guest)\):\s*/, '');
  const words = text.split(/\s+/);
  return words.length <= 28 ? text : `${words.slice(0, 28).join(' ')}`;
}
