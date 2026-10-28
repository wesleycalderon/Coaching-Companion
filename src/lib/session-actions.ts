'use server';

// Server actions for the session loop: upload and analyze, coach review, coachee Roadmap okay.
// Every action re-checks who is acting. STUB: BTS Studio engineering (production auth).

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { analyzeTranscript, type FollowUpProposal } from './ai/pipeline';
import { extractPdfText } from './pdf-text';
import { db } from './db';
import type { SummaryItem } from './domain';
import { asJson, eventTime, firstName } from './format';
import { currentPersona } from './persona';

export interface FormState {
  error?: string;
  message?: string;
}

const MAX_BYTES = 10_000_000;

export async function uploadTranscript(sessionId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const persona = currentPersona();
  if (persona.role !== 'coach') return { error: 'Only the coach can upload a transcript.' };
  const file = formData.get('transcript');
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a transcript file to upload.' };
  if (file.size > MAX_BYTES) return { error: 'The file must be a .txt, .vtt, .json or .pdf transcript under 10 MB. Please choose a different file.' };
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  let content: string;
  try {
    content = isPdf ? await extractPdfText(new Uint8Array(await file.arrayBuffer())) : await file.text();
  } catch (e) {
    console.error('PDF text extraction failed', e);
    return { error: "We couldn't read text from this PDF. If it's a scanned image, export the transcript as text or VTT instead." };
  }
  if (isPdf && !content.trim()) return { error: "This PDF has no text layer, so it may be a scanned image. Export the transcript as text or VTT instead." };
  const result = await analyzeTranscript({ sessionId, actorId: persona.userId, source: 'upload', fileName: isPdf ? `${file.name}.txt` : file.name, content });
  if ('error' in result) return { error: result.error };
  revalidatePath('/coach/sessions');
  redirect(`/coach/sessions/${sessionId}/review`);
}

/** Save, approve or keep private. Approval makes the recap and actions visible to the coachee. */
export async function saveReview(sessionId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const persona = currentPersona();
  const intent = String(formData.get('intent') ?? 'draft') as 'draft' | 'approve' | 'private' | 'update';
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { engagement: { include: { coachee: true } }, summary: true, commitments: true, coachNotes: true },
  });
  if (persona.role !== 'coach' || !session || session.engagement.coachId !== persona.userId) return { error: "We couldn't find this session." };
  const summary = session.summary;
  if (!summary) return { error: 'This session has no summary to review yet.' };
  if (summary.status === 'approved' && intent !== 'update') return { error: 'This recap is already approved.' };
  const who = firstName(session.engagement.coachee.name);

  // Edited items: an emptied text removes the item.
  const items = asJson<SummaryItem[]>(summary.insights)
    .map((item, k) => {
      const text = formData.get(`item-${k}`);
      return typeof text === 'string' ? { ...item, text: text.trim() } : item;
    })
    .filter((i) => i.text.length > 0);

  const drafts = session.commitments.filter((c) => !c.approved);
  const keep = new Set(formData.getAll('keepAction').map(String));
  const dueFor = (id: string) => {
    const v = String(formData.get(`due-${id}`) ?? '');
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T17:00:00Z`) : null;
  };
  if (intent === 'approve') {
    const missing = drafts.filter((c) => keep.has(c.id) && c.needsCoachConfirmation && !dueFor(c.id) && !c.dueBy);
    if (missing.length) return { error: `Add a due date for "${missing[0].title}", or leave that action out, before approving.` };
  }

  const proposals = asJson<FollowUpProposal[]>(summary.followUps ?? []);
  const apply = new Set(formData.getAll('applyFollowUp').map(String));
  const observations = String(formData.get('observations') ?? '').trim();
  const now = eventTime();
  const status = intent === 'approve' ? 'approved' : intent === 'private' ? 'suppressed' : summary.status;

  await db.$transaction(async (tx) => {
    await tx.summary.update({
      where: { id: summary.id },
      data: {
        insights: items as unknown as Prisma.InputJsonValue,
        status,
        ...(intent === 'approve' ? { approvedById: persona.userId, approvedAt: now } : {}),
      },
    });
    for (const c of drafts) {
      const due = dueFor(c.id) ?? c.dueBy;
      await tx.commitment.update({ where: { id: c.id }, data: { dueBy: due, needsCoachConfirmation: c.needsCoachConfirmation && !due } });
    }
    if (intent === 'approve') {
      await tx.commitment.deleteMany({ where: { id: { in: drafts.filter((c) => !keep.has(c.id)).map((c) => c.id) } } });
      await tx.commitment.updateMany({ where: { id: { in: drafts.filter((c) => keep.has(c.id)).map((c) => c.id) } }, data: { approved: true, needsCoachConfirmation: false, confirmationNote: null } });
      // Earlier actions this session revisited count toward the follow-up rate.
      const discussed = asJson<string[] | null>(summary.discussedActionIds) ?? [];
      if (discussed.length) {
        await tx.commitment.updateMany({ where: { id: { in: discussed }, approved: true, discussedAt: null, session: { engagementId: session.engagementId } }, data: { discussedAt: session.scheduledAt } });
      }
      for (const p of proposals.filter((p) => apply.has(p.commitmentId))) {
        await tx.commitment.update({ where: { id: p.commitmentId }, data: { status: p.proposedStatus, ...(p.proposedStatus === 'set_aside' ? { setAsideReason: p.note } : {}) } });
      }
      await tx.auditEvent.create({ data: { id: `audit-${session.id}-approve-${now.getTime()}`, actorId: persona.userId, action: 'publish', category: 'access', label: 'Summary approved', object: `Session ${session.number} recap sent to the coachee`, clientId: session.engagement.clientId, at: now } });
    }
    if (intent === 'private') {
      await tx.commitment.deleteMany({ where: { id: { in: drafts.map((c) => c.id) } } });
      await tx.auditEvent.create({ data: { id: `audit-${session.id}-private-${now.getTime()}`, actorId: persona.userId, action: 'update', category: 'access', label: 'Summary kept private', object: `Session ${session.number} recap not shared with the coachee`, clientId: session.engagement.clientId, at: now } });
    }
    const note = session.coachNotes[0];
    if (note) await tx.coachNote.update({ where: { id: note.id }, data: { observations } });
    else if (observations) await tx.coachNote.create({ data: { id: `note-${session.id}`, sessionId: session.id, coachId: persona.userId, observations, showUpTags: [] } });
  });

  if (intent === 'approve') {
    // Milestone 7: an action that's now a habit or set aside stops its linked work meetings.
    const { stopLinksForCommitment } = await import('./work-meetings');
    for (const p of proposals.filter((p) => apply.has(p.commitmentId))) await stopLinksForCommitment(p.commitmentId, p.proposedStatus);
  }
  revalidatePath(`/coach/sessions/${sessionId}/review`);
  revalidatePath('/coach/sessions');
  if (intent === 'approve') {
    // Milestone 3: the approved recap goes to the coachee's first channel (Slack, or the simulated chat).
    const { sendRecap } = await import('./companion/send');
    const sent = await sendRecap(sessionId);
    return { message: `Approved. ${who} can now see the recap and actions${sent.deliveredVia === 'slack' ? ', and has it in Slack' : sent.deliveredVia === 'teams' ? ', and has it in Teams' : ''}.` };
  }
  if (intent === 'private') return { message: `Kept private. ${who} won't see this summary.` };
  return { message: 'Changes saved.' };
}

/** The coachee okays a suggested update to their ways of thinking or behaving. */
export async function acceptSuggestion(formData: FormData) {
  const persona = currentPersona();
  const summaryId = String(formData.get('summaryId'));
  const index = Number(formData.get('index'));
  const summary = await db.summary.findUnique({ where: { id: summaryId }, include: { session: { include: { engagement: { include: { goals: true } } } } } });
  if (persona.role !== 'coachee' || !summary || summary.session.engagement.coacheeId !== persona.userId || summary.status !== 'approved') return;
  const items = asJson<SummaryItem[]>(summary.insights);
  const item = items[index];
  const goal = summary.session.engagement.goals[0];
  if (!item || item.kind === 'insight' || item.status !== 'suggested' || !item.to || !goal) return;
  items[index] = { ...item, status: 'accepted' };
  await db.$transaction([
    db.summary.update({ where: { id: summaryId }, data: { insights: items as unknown as Prisma.InputJsonValue } }),
    db.goal.update({
      where: { id: goal.id },
      data: item.kind === 'thinking' ? { thinkingFuture: item.to, ...(item.from ? { thinkingCurrent: item.from } : {}) } : { behavingFuture: item.to, ...(item.from ? { behavingCurrent: item.from } : {}) },
    }),
  ]);
  revalidatePath(`/me/recap/${summary.sessionId}`);
  revalidatePath('/me/roadmap');
}

/**
 * Local development only: act as Zoom and send a signed recording.transcript_completed event
 * to our own webhook, then wait for the draft. Exercises the real webhook path end to end.
 */
export async function simulateZoomTranscript(sessionId: string, _prev: FormState): Promise<FormState> {
  const { zoomSimulatorOn, zoomSecret, signZoomRequest } = await import('./integrations/zoom');
  const { headers } = await import('next/headers');
  const persona = currentPersona();
  if (!zoomSimulatorOn()) return { error: 'The Zoom simulator is off. Set ZOOM_SIMULATOR=true and ZOOM_WEBHOOK_SECRET_TOKEN in .env.' };
  const session = await db.session.findUnique({ where: { id: sessionId }, include: { engagement: true, summary: true } });
  if (persona.role !== 'coach' || !session || session.engagement.coachId !== persona.userId) return { error: "We couldn't find this session." };
  if (!session.meetingId) return { error: 'This session has no Zoom meeting.' };
  const host = headers().get('host') ?? 'localhost:3000';
  const origin = `http://${host}`;
  const secret = zoomSecret()!;
  const body = JSON.stringify({
    event: 'recording.transcript_completed',
    event_ts: Date.now(),
    download_token: `sim-${secret}`,
    payload: { object: { id: Number(session.meetingId), recording_files: [{ file_type: 'TRANSCRIPT', status: 'completed', download_url: `${origin}/api/dev/zoom-recording/${session.id}` }] } },
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const res = await fetch(`${origin}/api/integrations/zoom/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-zm-request-timestamp': timestamp, 'x-zm-signature': signZoomRequest(secret, timestamp, body) },
    body,
  });
  if (!res.ok) return { error: `The webhook answered ${res.status}.` };
  const before = session.summary?.aiDraft ? JSON.stringify(session.summary.aiDraft) : null;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const s = await db.summary.findUnique({ where: { sessionId } });
    if (s && JSON.stringify(s.aiDraft) !== before) {
      revalidatePath('/coach/sessions');
      redirect(`/coach/sessions/${sessionId}/review`);
    }
  }
  return { error: 'Zoom sent the transcript, but no draft appeared. Check the server log for the reason.' };
}
