import { allow, BackLink, NotFoundCard, PageHead, WrongRole } from '@/components/ui';
import { UploadForm, ZoomSimulator } from '@/components/review-forms';
import { zoomSimulatorOn } from '@/lib/integrations/zoom';
import { StatusBadge } from '@/ds/components';
import { aiProvider } from '@/lib/ai/client';
import { db } from '@/lib/db';
import { asJson, day, firstName, time } from '@/lib/format';

// Transcript upload (milestone 2). No canvas artboard: built from the review screen's patterns.
export default async function UploadPage({ params }: { params: { id: string } }) {
  const path = `/coach/sessions/${params.id}/upload`;
  const persona = allow(['coach']);
  if (!persona) return <WrongRole roles={['coach']} path={path} />;
  const s = await db.session.findUnique({
    where: { id: params.id },
    include: { engagement: { include: { coachee: true, client: true } }, consents: { include: { user: true } }, summary: true },
  });
  if (!s || s.engagement.coachId !== persona.userId) return <NotFoundCard what="session" />;
  const { coachee, client } = s.engagement;
  const who = firstName(coachee.name);
  const terms = client.redactionOn ? asJson<string[]>(client.redactionTerms) : [];
  const consented = (id: string) => s.consents.some((c) => c.userId === id && c.grantedAt && !c.revokedAt);
  const blocked = client.capturePolicy === 'companion_mode';
  const retention = client.retentionDays === 0 ? 'Deleted right after analysis' : `Kept ${client.retentionDays} days, then deleted`;

  return (
    <div className="page page--narrow">
      <BackLink href="/coach/sessions">Back to sessions</BackLink>
      <PageHead title={`Transcript: ${coachee.name} · Session ${s.number}`} lede={`${day(s.scheduledAt)} · ${time(s.scheduledAt)} to ${time(s.endsAt)}`} />

      <section aria-labelledby="chk-head" className="card card--pad card--stack">
        <h2 id="chk-head" className="heading-xsmall heading-reset">Before you upload</h2>
        <div className="stack ruled text-body">
          <div className="row"><span className="grow">Your consent for this session</span>{consented(persona.userId) ? <StatusBadge tone="success" label="Consented" /> : <StatusBadge tone="warning" label="Not given" />}</div>
          <div className="row"><span className="grow">{who}'s consent for this session</span>{consented(coachee.id) ? <StatusBadge tone="success" label="Consented" /> : <StatusBadge tone="warning" label="Not given" />}</div>
          <div className="row"><span className="grow">Raw transcript</span><span className="text-subtle">{retention}</span></div>
          <div className="row"><span className="grow">Redacted before anything is stored</span><span className="text-subtle">{terms.length ? terms.join(', ') : 'No client terms'}</span></div>
        </div>
        <p className="fine-print">The AI drafts insights, suggested Roadmap updates and actions, each with a quote from the transcript. {who} sees nothing until you approve it.</p>
      </section>

      {!blocked && s.platform === 'zoom' && s.meetingId ? (
        <section aria-labelledby="auto-head" className="card card--pad card--stack">
          <div className="row row--wrap"><h2 id="auto-head" className="heading-xsmall heading-reset grow">Automatic capture from Zoom</h2>{s.transcriptSource === 'zoom' ? <StatusBadge tone="success" label="Received" /> : <StatusBadge tone="info" label="Waiting for transcript" />}</div>
          <p className="text-body">The session ran on the BTS coaching account (meeting {s.meetingId}). Zoom sends the transcript here when its cloud recording finishes, usually within an hour, and the AI drafts the recap for your review.</p>
          <p className="fine-print">If it hasn't arrived, upload the transcript below instead.</p>
          {zoomSimulatorOn() ? <ZoomSimulator sessionId={s.id} /> : null}
        </section>
      ) : null}

      {blocked ? (
        <div className="card card--pad"><p className="text-body">{client.name} uses companion mode, so transcripts can't be uploaded or stored. Add your notes to the session instead.</p></div>
      ) : (
        <UploadForm sessionId={s.id} sampleMode={aiProvider() === 'sample'} hasDraft={s.summary?.status === 'draft'} />
      )}
    </div>
  );
}
