// Transcript parsing, redaction and evidence checks. Accepts:
//  - JSON: { segments: [{ speakerName | speaker, start, end?, text }] } or a bare array
//  - plain text or PDF text: "[00:00:05] Daniel Okafor: text" (brackets optional), or a
//    "Daniel Okafor 00:00:05" heading line followed by the words; wrapped lines are joined
//  - WebVTT: "00:00:05.000 --> 00:00:38.000" cue lines followed by "<v Name>text" or "Name: text"
import { createHash } from 'node:crypto';
import type { TranscriptSegment } from './domain';

export interface RawSegment {
  speakerName: string;
  start: string;
  end: string;
  text: string;
}

export class TranscriptFormatError extends Error {}

/** "00:00:05" or "0:05" or "00:05.000" → "00:05" ("1:02:03" past the hour). */
export function normalizeTime(t: string): string {
  const parts = t.trim().replace(/\.\d+$/, '').split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) throw new TranscriptFormatError(`"${t}" isn't a timestamp. Use mm:ss or hh:mm:ss.`);
  const secs = parts.reduce((acc, n) => acc * 60 + n, 0);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export const toSeconds = (t: string) => t.split(':').map(Number).reduce((acc, n) => acc * 60 + n, 0);

export function parseTranscript(content: string, fileName: string): RawSegment[] {
  const text = content.replace(/^﻿/, '').trim();
  if (!text) throw new TranscriptFormatError('The file is empty.');
  let segs: Array<Omit<RawSegment, 'end'> & { end?: string }>;
  const looksJson = fileName.toLowerCase().endsWith('.json') || ((text.startsWith('{') || text.startsWith('[')) && isJson(text));
  if (looksJson) segs = parseJson(text);
  else if (text.startsWith('WEBVTT') || fileName.toLowerCase().endsWith('.vtt')) segs = parseVtt(text);
  else segs = parseLines(text);
  if (segs.length === 0) throw new TranscriptFormatError('We found no speaker turns. Each line needs a timestamp, a speaker name and their words, like "[00:05] Daniel Okafor: Hello".');
  // Straight quotes everywhere, whatever the source tool used, so quotes compare reliably.
  const plain = (t: string) => t.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
  return segs.map((s, i) => ({ ...s, speakerName: plain(s.speakerName), text: plain(s.text), end: s.end ?? segs[i + 1]?.start ?? s.start }));
}

function isJson(text: string) {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function parseJson(text: string) {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new TranscriptFormatError("The JSON file couldn't be read. Check that it is valid JSON.");
  }
  const list = Array.isArray(data) ? data : (data as { segments?: unknown }).segments;
  if (!Array.isArray(list)) throw new TranscriptFormatError('The JSON needs a "segments" list.');
  return list.map((raw, i) => {
    const s = raw as Record<string, unknown>;
    const speakerName = String(s.speakerName ?? s.speaker ?? s.name ?? '').trim();
    const body = String(s.text ?? '').trim();
    if (!speakerName || !body || s.start === undefined) throw new TranscriptFormatError(`Segment ${i + 1} needs a speaker, a start time and text.`);
    return { speakerName, start: normalizeTime(String(s.start)), end: s.end ? normalizeTime(String(s.end)) : undefined, text: body };
  });
}

const LINE = /^\[?(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?)\]?\s+([^:\n]{1,80}?):\s*(.+)$/;
// "Daniel Okafor   00:00:05" on its own line, then the words (Zoom and Teams document exports).
const HEADING = /^([^\d:][^:\n]{0,79}?)\s+\[?(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?)\]?$/;

function parseLines(text: string) {
  const out: Array<{ start: string; speakerName: string; text: string }> = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  lines.forEach((l, i) => {
    const turn = LINE.exec(l);
    if (turn) {
      out.push({ start: normalizeTime(turn[1]), speakerName: turn[2].trim(), text: turn[3].trim() });
      return;
    }
    const heading = HEADING.exec(l);
    if (heading) {
      out.push({ start: normalizeTime(heading[2]), speakerName: heading[1].trim(), text: '' });
      return;
    }
    // Anything else continues the previous turn (wrapped lines in PDFs and documents).
    const prev = out[out.length - 1];
    if (!prev) throw new TranscriptFormatError(`Line ${i + 1} isn't in the form "[00:05] Speaker name: words".`);
    // A line that ends in a hyphen was split inside a word ("stand-" + "up").
    prev.text = !prev.text ? l : prev.text.endsWith('-') ? `${prev.text}${l}` : `${prev.text} ${l}`;
  });
  const empty = out.find((s) => !s.text);
  if (empty) throw new TranscriptFormatError(`${empty.speakerName} at ${empty.start} has no words after the timestamp.`);
  return out;
}

function parseVtt(text: string) {
  const out: Array<{ speakerName: string; start: string; end?: string; text: string }> = [];
  const blocks = text.split(/\r?\n\r?\n/);
  for (const b of blocks) {
    const lines = b.split(/\r?\n/);
    const cue = lines.findIndex((l) => l.includes('-->'));
    if (cue < 0) continue;
    const [start, end] = lines[cue].split('-->').map((x) => x.trim().split(' ')[0]);
    const body = lines.slice(cue + 1).join(' ').trim();
    const voice = /^<v\s+([^>]+)>(.*)$/.exec(body);
    const named = /^([^:]{1,80}):\s*(.+)$/.exec(body);
    const speakerName = (voice?.[1] ?? named?.[1] ?? 'Unknown speaker').trim();
    const words = (voice?.[2] ?? named?.[2] ?? body).replace(/<\/v>/g, '').trim();
    if (words) out.push({ speakerName, start: normalizeTime(start), end: normalizeTime(end), text: words });
  }
  return out;
}

/** Stable fingerprint of a transcript's content, used to match the seeded sample outputs. */
export function transcriptHash(segs: RawSegment[]): string {
  const canonical = segs.map((s) => `${s.start}|${s.speakerName}|${s.text}`).join('\n');
  return createHash('sha256').update(canonical).digest('hex');
}

/** Replace the client's redaction terms before anything is stored or sent to the AI. */
export function redact(segs: RawSegment[], terms: string[]): { segments: RawSegment[]; count: number } {
  let count = 0;
  const patterns = terms.map((t) => t.trim()).filter((t) => t.length > 1)
    .map((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'));
  const segments = segs.map((s) => ({
    ...s,
    text: patterns.reduce((acc, re) => acc.replace(re, () => { count++; return '[redacted]'; }), s.text),
  }));
  return { segments, count };
}

export function forModel(segs: Array<RawSegment & { speakerRole?: string }>): string {
  return segs.map((s) => `[${s.start}] ${s.speakerName}${s.speakerRole ? ` (${s.speakerRole})` : ''}: ${s.text}`).join('\n');
}

const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/["]/g, '').replace(/\s+/g, ' ').replace(/[.,!?…]+$/, '').trim();

/** The segment a quote comes from, or null when the quote isn't in the transcript. */
export function findQuote(segs: Array<{ text: string; start: string }>, quote: string): { index: number; start: string } | null {
  const q = norm(quote);
  if (q.length < 3) return null;
  const index = segs.findIndex((s) => norm(s.text).includes(q));
  return index < 0 ? null : { index, start: segs[index].start };
}

export function inSpans(time: string, spans: Array<{ start: string; end: string }>): boolean {
  const t = toSeconds(time);
  return spans.some((s) => t >= toSeconds(s.start) && t <= toSeconds(s.end));
}

export function toStoredSegments(segs: Array<RawSegment & { speakerRole: TranscriptSegment['speakerRole']; sensitive?: boolean }>): TranscriptSegment[] {
  return segs.map((s) => ({ speakerRole: s.speakerRole, speakerName: s.speakerName, start: s.start, end: s.end, text: s.text, ...(s.sensitive ? { sensitive: true } : {}) }));
}
