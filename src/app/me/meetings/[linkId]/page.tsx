import Link from 'next/link';
import { ActionButton, ActionForm } from '@/components/admin-forms';
import { ConfirmButton } from '@/components/client';
import { CoacheeShell } from '@/components/coachee';
import { allow, BackLink, NotFoundCard, WrongRole } from '@/components/ui';
import { RoleBadge, StatusBadge } from '@/ds/components';
import { ATTEMPT_BADGE } from '@/lib/companion/view';
import { db } from '@/lib/db';
import { asJson, count, Count, dayTime, firstName } from '@/lib/format';
import { keepSeriesAction, sendReviewNowAction, shareSeriesAction, simulateMeetingAction, startMeetingAction, stopLinkAction, uploadMeetingAction } from '@/lib/meeting-actions';
import { isActive, OCCURRENCE_STATUS, refreshLinks, reviewDue, STOP_REASON, type Attendee, type WorkMeetingCheck } from '@/lib/work-meetings';

// Milestone 7. Not on the canvas yet: built from the participant patterns and flagged for design review.
export default async function LinkedMeetingPage({ params, searchParams }: { params: { linkId: string }; searchParams: { done?: string } }) {
  const path = `/me/meetings/${params.linkId}`;
  const persona = allow(['coachee']);
  if (!persona) return <WrongRole roles={['coachee']} path={path} />;
  await refreshLinks(persona.userId);
  const link = await db.meetingLink.findFirst({
    where: { id: params.linkId, coacheeId: persona.userId },
    include: { commitment: true, occurrences: { orderBy: { scheduledAt: 'desc' } }, coachee: { include: { client: true } } },
  });
  if (!link) return <NotFoundCard what="linked meeting" />;
  const engagement = await db.engagement.findFirst({ where: { coacheeId: persona.userId }, include: { coach: true } });
  const coach = engagement ? firstName(engagement.coach.name) : 'your coach';
  const short = link.coachee.client?.name.split(' ')[0] ?? 'your organization';
  const active = isActive(link);
  const series = link.scope === 'series';
  const captured = link.occurrences.filter((o) => o.captureStatus === 'captured').reverse();
  const checks = captured.map((o) => ({ o, check: asJson<WorkMeetingCheck>(o.check) }));
  const maxQ = Math.max(1, ...checks.map(({ check }) => check.counts.open_question + check.counts.curiosity_question));
  const notice = { linked: 'Linked. Everyone in the meeting sees a notice each time before anything is captured.', stopped: 'Stopped. Upcoming meetings won’t be captured. Feedback you already have stays here until you delete it.' }[searchParams.done ?? ''];

  return (
    <CoacheeShell userId={persona.userId} current="/me/meetings">
      <BackLink href="/me/meetings">Back to linked meetings</BackLink>
      <div className="stack stack--100">
        <span className="overline">{series ? `Series · ${link.cadence}` : 'One meeting'}</span>
        <h1 className="participant-title">{link.title}</h1>
        <p className="participant-lede">For your action: {link.commitment.ifThenText}</p>
      </div>
      {notice ? <div role="status" className="p-card row row--top text-body"><StatusBadge tone="success" label="Saved" /><span className="grow">{notice}</span></div> : null}

      <div className="p-card stack">
        <div className="row row--wrap row--tight">
          <span className="grow text-body">{active ? (series ? 'Linked. Each meeting is captured only after everyone in it agrees.' : 'Linked for this one meeting.') : `${link.stopReason ? STOP_REASON[link.stopReason] : 'Stopped'}.`}</span>
          <StatusBadge tone={active ? 'live' : 'neutral'} label={active ? 'Linked' : 'Stopped'} />
        </div>
        {active && reviewDue(link) ? (
          <div className="subtle-panel stack">
            <p className="text-body">It&apos;s been a month since you linked this series. Keep it linked?</p>
            <ActionButton action={keepSeriesAction.bind(null, link.id)} label="Keep it linked" pendingLabel="Saving…" className="ecb-btn-primary" />
          </div>
        ) : null}
        <div className="btn-row">
          <ActionButton action={shareSeriesAction.bind(null, link.id, !link.sharedWithCoach)} label={link.sharedWithCoach ? `Stop sharing with ${coach}` : `Share feedback with ${coach}`} pendingLabel="Saving…" className="ecb-btn-secondary" />
          {active ? (
            <ConfirmButton label={series ? 'Stop linking this series' : 'Stop linking this meeting'} className="ecb-btn-ghost" action={stopLinkAction.bind(null, link.id)} copy={{
              title: `Stop linking ${link.title}?`,
              body: <p>{series ? 'Upcoming meetings in this series' : 'This meeting'} won&apos;t be captured. Your colleagues stop seeing the notice. Feedback you already have stays here.</p>,
              undo: 'You can link it again at any time.',
              confirmLabel: 'Stop linking',
            }} />
          ) : null}
        </div>
        <p className="fine-print">{link.sharedWithCoach ? `${coach} can see the feedback below, never anyone else's words.` : `Only you see this feedback. ${coach} sees it only if you share it.`}</p>
      </div>

      {series && checks.length ? (
        <section aria-labelledby="tr-head" className="p-card stack">
          <div className="row row--tight"><h2 id="tr-head" className="heading-small heading-reset grow">Across the series</h2><RoleBadge label="AI" /></div>
          <p className="fine-print">Open and curiosity questions you asked in each meeting, counted from your own words.</p>
          {checks.map(({ o, check }) => {
            const q = check.counts.open_question + check.counts.curiosity_question;
            return (
              <div key={o.id} className="stack stack--tight text-small">
                <span>{dayTime(o.scheduledAt)} · {count(q)} {q === 1 ? 'question' : 'questions'} · {ATTEMPT_BADGE[check.attempted].label}</span>
                <div className="bar-track" aria-hidden="true"><div className="bar-fill" style={{ width: `${Math.round((q / maxQ) * 100)}%` }} /></div>
              </div>
            );
          })}
        </section>
      ) : null}

      <section aria-labelledby="oc-head" className="p-card stack">
        <h2 id="oc-head" className="heading-small heading-reset">{series ? 'Meetings' : 'The meeting'}</h2>
        {link.occurrences.length === 0 ? <p className="text-body">No meetings yet.</p> : null}
        <ul className="list ruled">
          {link.occurrences.map((o) => {
            const st = OCCURRENCE_STATUS[o.captureStatus] ?? { label: o.captureStatus, tone: 'neutral' as const };
            const check = o.check ? asJson<WorkMeetingCheck>(o.check) : null;
            const attendees = asJson<Attendee[]>(o.attendees);
            const waiting = ['scheduled', 'notice_shown', 'paused'].includes(o.captureStatus) && active;
            return (
              <li key={o.id} className="stack">
                <div className="row row--wrap row--tight">
                  <span className="strong grow">{dayTime(o.scheduledAt)}</span>
                  <StatusBadge tone={st.tone} label={st.label} />
                </div>
                {o.captureStatus === 'skipped_external' ? <p className="text-small">Someone from outside {short} was invited, so nothing was captured.</p> : null}
                {check ? (
                  <div className="stack stack--tight">
                    <div className="row row--wrap row--tight"><StatusBadge tone={ATTEMPT_BADGE[check.attempted].tone} label={ATTEMPT_BADGE[check.attempted].label} /><RoleBadge label="AI" />{o.aiProvider === 'sample' ? <span className="fine-print">Sample output</span> : null}</div>
                    <p className="text-body">{check.summary}</p>
                    {check.evidence.map((e) => <p key={e.time + e.quote} className="text-small">You said, {e.time}: &ldquo;{e.quote}&rdquo;</p>)}
                    <p className="fine-print">
                      {Count(check.counts.open_question)} open and {count(check.counts.curiosity_question)} curiosity {check.counts.curiosity_question === 1 ? 'question' : 'questions'} in {count(check.words)} of your words. Only your own words were analyzed; nothing anyone else said was kept.
                    </p>
                  </div>
                ) : null}
                {waiting ? (
                  <div className="subtle-panel stack">
                    <span className="overline">Prototype controls</span>
                    <p className="fine-print">
                      {o.captureStatus === 'scheduled' ? `In production the notice appears when the meeting starts. ${attendees.length} ${attendees.length === 1 ? 'colleague' : 'colleagues'} invited.` : `${attendees.filter((a) => a.agreedAt).length} of ${attendees.length} agreed.`}
                    </p>
                    <div className="btn-row">
                      {o.captureStatus === 'scheduled'
                        ? <ActionButton action={startMeetingAction.bind(null, o.id)} label="Start the meeting and show the notice" pendingLabel="Starting…" className="ecb-btn-secondary" />
                        : <Link className="ecb-btn-secondary" href={`/meeting/${o.id}/notice`}>Open the notice</Link>}
                      {o.captureStatus !== 'scheduled' ? <ActionButton action={simulateMeetingAction.bind(null, o.id)} label="Simulate the meeting transcript" pendingLabel="Analyzing your words…" className="ecb-btn-secondary" /> : null}
                    </div>
                    {o.captureStatus !== 'scheduled' ? (
                      <details>
                        <summary className="text-small">Or upload the meeting&apos;s transcript</summary>
                        <ActionForm action={uploadMeetingAction.bind(null, o.id)} submitLabel="Analyze my words" pendingLabel="Analyzing…" className="stack">
                          <div className="field"><label className="ecb-form-label" htmlFor={`up-${o.id}`}>Transcript (.txt, .vtt or .json)</label><input id={`up-${o.id}`} name="transcript" type="file" accept=".txt,.vtt,.json,text/plain,text/vtt,application/json" className="ecb-form-input" required /></div>
                          <p className="fine-print">Synthetic transcripts only. Everyone else&apos;s words are discarded before analysis.</p>
                        </ActionForm>
                      </details>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {series && active ? (
        <div className="p-card stack">
          <span className="overline">Prototype controls</span>
          <p className="fine-print">The monthly keep-or-stop check is due {reviewDue(link) ? 'now' : 'a month after you linked or last kept this series'}.</p>
          <ActionButton action={sendReviewNowAction.bind(null, link.id)} label="Send the monthly check now" pendingLabel="Sending…" className="ecb-btn-secondary" />
          <Link className="text-small" href="/preview/slack-dm">Open the companion chat</Link>
        </div>
      ) : null}
    </CoacheeShell>
  );
}
