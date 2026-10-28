import Link from 'next/link';
import { AnswerList, AskSessionForm } from '@/components/coach-tools';
import { ReviewForm, type ReviewAction, type ReviewFollowUp, type ReviewItem } from '@/components/review-forms';
import { allow, BackLink, NotFoundCard, PageHead, WrongRole } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
import type { FollowUpProposal } from '@/lib/ai/pipeline';
import { COMMITMENT_STATUS, summaryItemLabel, type CommitmentStatus, type FeatureFlags, type SummaryItem, type TranscriptSegment } from '@/lib/domain';
import { asJson, count, day, daysUntil, firstName, time } from '@/lib/format';
import { answerView, fromNotes, sessionWithPeople } from '@/lib/queries';

const PLATFORM: Record<string, string> = { zoom: 'Zoom', teams: 'Microsoft Teams', meet: 'Google Meet' };

export default async function SessionReviewPage({ params }: { params: { id: string } }) {
  const path = `/coach/sessions/${params.id}/review`;
  const persona = allow(['coach']);
  if (!persona) return <WrongRole roles={['coach']} path={path} />;
  const s = await sessionWithPeople(params.id);
  if (!s || s.engagement.coachId !== persona.userId) return <NotFoundCard what="session" />;

  const { coachee, client, goals } = s.engagement;
  const who = firstName(coachee.name);
  const summary = s.summary;
  const items = summary ? asJson<SummaryItem[]>(summary.insights) : [];
  const goal = goals[0];
  const capabilities = goal ? asJson<string[]>(goal.capabilities) : [];
  const hasInsight = items.some((i) => i.kind === 'insight');
  const segments = s.transcript ? asJson<TranscriptSegment[]>(s.transcript.segments) : [];
  const flags = asJson<FeatureFlags>(client.featureFlags);
  const status = !summary ? { label: 'No summary', tone: 'neutral' as const }
    : summary.status === 'draft' ? { label: 'Needs your review', tone: 'warning' as const }
    : summary.status === 'suppressed' ? { label: 'Kept private', tone: 'neutral' as const }
    : { label: 'Approved', tone: 'success' as const };
  const transcriptNote = s.transcript ? `Transcript deletes in ${count(daysUntil(s.transcript.deleteAfter))} days`
    : s.captureStatus === 'no_capture' ? 'Companion mode, no transcript'
    : s.captureStatus === 'removed' ? 'Companion removed, no transcript'
    : s.captureStatus === 'consented' ? 'Waiting for transcript'
    : client.retentionDays === 0 ? 'Transcript deleted after analysis'
    : 'Transcript deleted';
  const goalTitle = (id: string | null) => goals.find((g) => g.id === id)?.title;
  const check = summary?.speakerCheck as { unsure?: string[]; droppedForMissingEvidence?: number; redactions?: number } | null;

  // Merge runs of sensitive segments into one collapsed passage.
  const blocks: Array<{ kind: 'seg'; seg: TranscriptSegment } | { kind: 'sensitive'; start: string; end: string }> = [];
  for (const seg of segments) {
    const last = blocks[blocks.length - 1];
    if (seg.sensitive && last?.kind === 'sensitive') last.end = seg.end;
    else blocks.push(seg.sensitive ? { kind: 'sensitive', start: seg.start, end: seg.end } : { kind: 'seg', seg });
  }

  const reviewItems: ReviewItem[] = items.map((i) => ({
    label: summaryItemLabel(i, 'coach'),
    text: i.text,
    evidence: i.evidenceQuote ? `Evidence ${i.evidenceTime}: "${i.evidenceQuote}"` : i.source === 'ai' ? 'No evidence quoted' : null,
  }));
  const reviewActions: ReviewAction[] = s.commitments.map((c) => ({
    id: c.id,
    ifThenText: c.ifThenText,
    needsConfirmation: c.needsCoachConfirmation,
    dueIso: c.dueBy ? c.dueBy.toISOString().slice(0, 10) : null,
    approved: c.approved,
    note: [
      c.needsCoachConfirmation && c.confirmationNote ? c.confirmationNote : goalTitle(c.goalId) ? `Goal: ${goalTitle(c.goalId)}${hasInsight ? ' · From the insight above' : ''}` : 'No linked goal',
      c.dueBy && !c.needsCoachConfirmation ? `Due ${day(c.dueBy)}` : null,
      c.evidenceTime ? `Evidence ${c.evidenceTime}` : null,
    ].filter(Boolean).join(' · '),
  }));
  const followUps: ReviewFollowUp[] = asJson<FollowUpProposal[]>(summary?.followUps ?? []).map((f) => ({
    id: f.commitmentId,
    title: f.title,
    from: COMMITMENT_STATUS[f.currentStatus as CommitmentStatus]?.label.toLowerCase() ?? f.currentStatus,
    to: COMMITMENT_STATUS[f.proposedStatus as CommitmentStatus]?.label.toLowerCase() ?? f.proposedStatus,
    evidence: f.evidenceQuote ? `Evidence ${f.evidenceTime}: "${f.evidenceQuote}"` : null,
    note: f.note,
  }));
  const summaryTitle = !summary ? 'Summary' : fromNotes(summary) ? 'Recap from your notes' : summary.status === 'draft' ? 'AI summary draft' : 'Approved summary';

  return (
    <div className="page">
      <BackLink href="/coach/sessions">Back to sessions</BackLink>
      <PageHead title={`${coachee.name} · Session ${s.number}`} lede={`${day(s.scheduledAt)} · ${time(s.scheduledAt)} to ${time(s.endsAt)} · ${PLATFORM[s.platform] ?? s.platform} · ${transcriptNote}`}>
        <StatusBadge tone={status.tone} label={status.label} size="md" />
      </PageHead>

      {check && ((check.unsure?.length ?? 0) > 0 || (check.droppedForMissingEvidence ?? 0) > 0) ? (
        <div className="card card--pad callout">
          <StatusBadge tone="warning" label="Check before approving" size="md" />
          <span>
            {check.unsure?.length ? `The AI wasn't sure who ${check.unsure.join(' and ')} ${check.unsure.length === 1 ? 'is' : 'are'}. ` : ''}
            {check.droppedForMissingEvidence ? `${count(check.droppedForMissingEvidence)} AI suggestions were left out because their quotes weren't in the transcript.` : ''}
          </span>
        </div>
      ) : null}

      <div className="split">
        <section aria-labelledby="t-head" className="col card stack stack-flush">
          <div className="card__head">
            <h2 id="t-head" className="heading-xsmall heading-reset grow">Transcript</h2>
            {segments.length ? <span className="timestamp">{check?.redactions ? `Client terms redacted: ${count(check.redactions)}` : 'Speakers confirmed at session start'}</span> : null}
          </div>
          <div className="transcript">
            {blocks.length === 0 ? (
              <div className="stack">
                <p className="text-body text-subtle">
                  {s.captureStatus === 'no_capture' ? `No transcript for this session. ${client.name} uses companion mode, so the recap comes from your notes and ${who}'s check-ins.`
                    : s.captureStatus === 'consented' ? `${who} and you both consented to capture. The transcript arrives from Zoom after the session, or you can upload it.`
                    : 'No transcript for this session. Add your notes on the right.'}
                </p>
                {s.captureStatus === 'consented' ? <Link className="ecb-btn-primary self-start" href={`/coach/sessions/${s.id}/upload`}>Get transcript</Link> : null}
              </div>
            ) : null}
            {blocks.map((b, k) => b.kind === 'seg' ? (
              <div key={k}><span className="strong">{b.seg.speakerName.split(' ')[0]}</span> <span className="timestamp">{b.seg.start}</span><br />{b.seg.text}</div>
            ) : (
              <div key={k} className="subtle-panel">
                <StatusBadge tone="warning" label="Sensitive, left out of summary" />
                <div className="text-subtle mt-100">{b.start} to {b.end} · Only you can see this passage.</div>
              </div>
            ))}
          </div>
          {flags.askAi && (s.transcript || summary) ? (
            <div className="card__foot stack">
              <AskSessionForm sessionId={s.id} who={who} sessionNumber={s.number} placeholder={`What has ${who} said about time pressure?`} />
              <AnswerList answers={s.aiAnswers.map(answerView)} />
              <p className="fine-print">Answers come only from this coachee's transcripts, recaps, your notes and their results, with quotes checked against the source. Sensitive passages are never searched.</p>
            </div>
          ) : null}
        </section>

        <ReviewForm
          sessionId={s.id}
          status={summary ? (summary.status as 'draft' | 'approved' | 'suppressed') : 'none'}
          title={summaryTitle}
          caption={goal ? `For ${who}'s Leadership Roadmap${capabilities.length ? ` · Capabilities: ${capabilities.join(', ')}` : ''}` : null}
          sampleNote={summary?.aiProvider === 'sample' ? 'Sample AI output: no API key set' : null}
          items={reviewItems}
          actions={reviewActions}
          followUps={followUps}
          observations={s.coachNotes[0]?.observations ?? ''}
          who={who}
          hasGoal={Boolean(goal)}
          hasSuggestions={items.some((i) => i.kind !== 'insight' && i.status === 'suggested')}
          approvedNote={summary?.approvedAt ? `You approved this on ${day(summary.approvedAt)} at ${time(summary.approvedAt)}. ${who} has the recap. Saved changes are sent as an update.` : null}
          channel={client.capturePolicy === 'companion_mode' ? 'Teams' : 'Slack'}
        />
      </div>
    </div>
  );
}
