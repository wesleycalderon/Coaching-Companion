import Link from 'next/link';
import { ActionButton } from '@/components/admin-forms';
import { ConfirmButton } from '@/components/client';
import { COACH_ATTEMPT } from '@/components/coach-meetings';
import { allow, BackLink, COACH_NAV, NavPage, NotFoundCard, PageHead, WrongRole } from '@/components/ui';
import { RoleBadge, StatusBadge } from '@/ds/components';
import { ATTEMPT_BADGE } from '@/lib/companion/view';
import { db } from '@/lib/db';
import { asJson, count, dayTime } from '@/lib/format';
import { simulateMeetingAction, startMeetingAction, stopLinkAction } from '@/lib/meeting-actions';
import { isActive, OCCURRENCE_STATUS, refreshLinks, STOP_REASON, type Attendee, type WorkMeetingCheck } from '@/lib/work-meetings';

// A coach's own meeting (not a coaching session): practice feedback on the coach's words against
// their growth area. Not on the design canvas yet: for design review.
export default async function CoachMeetingPage({ params, searchParams }: { params: { linkId: string }; searchParams: { done?: string } }) {
  const path = `/coach/meetings/${params.linkId}`;
  const persona = allow(['coach']);
  if (!persona) return <WrongRole roles={['coach']} path={path} />;
  await refreshLinks(persona.userId);
  const link = await db.meetingLink.findFirst({ where: { id: params.linkId, coacheeId: persona.userId, ownerRole: 'coach' }, include: { occurrences: { orderBy: { scheduledAt: 'desc' } }, coachee: true } });
  if (!link) return <NotFoundCard what="meeting" />;
  const active = isActive(link);
  const series = link.scope === 'series';

  return (
    <NavPage nav={COACH_NAV} navLabel="Coach workspace" current="/coach/practice">
      <BackLink href="/coach/practice#meetings">Back to my practice</BackLink>
      <PageHead title={link.title} lede={`${series ? `Series · ${link.cadence}. ` : ''}Checked against your growth area: ${link.coachee.growthArea ?? 'not chosen yet'}.`} />
      {searchParams.done === 'stopped' ? <div role="status" className="card card--pad row row--top text-body"><StatusBadge tone="success" label="Saved" /><span className="grow">Turned off. Upcoming meetings won&apos;t be captured.</span></div> : null}
      <div className="card card--pad card--stack">
        <div className="row row--wrap row--tight">
          <span className="grow text-body">{active ? 'On. Each meeting is captured only after everyone in it agrees, and only your words are kept.' : `${link.stopReason ? STOP_REASON[link.stopReason] : 'Stopped'}.`}</span>
          <StatusBadge tone={active ? 'live' : 'neutral'} label={active ? 'On' : 'Stopped'} />
        </div>
        <div className="btn-row">
          {active ? (
            <ConfirmButton label={series ? 'Turn off this series' : 'Turn off this meeting'} action={stopLinkAction.bind(null, link.id)} copy={{
              title: `Turn off the companion for ${link.title}?`,
              body: <p>Upcoming meetings won&apos;t be captured, and your colleagues stop seeing the notice. Feedback you already have stays.</p>,
              undo: 'You can turn it on again in Companion settings.',
              confirmLabel: 'Turn it off',
            }} />
          ) : null}
          <Link className="ecb-btn-ghost" href="/coach/settings">Companion settings</Link>
        </div>
        <p className="fine-print">Visible to you and your coach manager only. Developmental, never used to assign or rank work.</p>
      </div>

      <section aria-labelledby="oc-head" className="card card--pad card--stack">
        <h2 id="oc-head" className="heading-small heading-reset">Meetings</h2>
        {link.occurrences.length === 0 ? <p className="text-body">No meetings yet.</p> : null}
        <ul className="list ruled">
          {link.occurrences.map((o) => {
            const st = OCCURRENCE_STATUS[o.captureStatus] ?? { label: o.captureStatus, tone: 'neutral' as const };
            const check = o.check ? asJson<WorkMeetingCheck>(o.check) : null;
            const attendees = asJson<Attendee[]>(o.attendees);
            const waiting = ['scheduled', 'notice_shown', 'paused'].includes(o.captureStatus) && active;
            return (
              <li key={o.id} className="stack">
                <div className="row row--wrap row--tight"><span className="strong grow">{dayTime(o.scheduledAt)}</span><StatusBadge tone={st.tone} label={st.label} /></div>
                {o.captureStatus === 'skipped_external' ? <p className="text-small">Someone from outside BTS was invited, so nothing was captured.</p> : null}
                {check ? (
                  <div className="stack stack--tight">
                    <div className="row row--wrap row--tight"><StatusBadge tone={ATTEMPT_BADGE[check.attempted].tone} label={COACH_ATTEMPT[check.attempted]} /><RoleBadge label="AI" />{o.aiProvider === 'sample' ? <span className="fine-print">Sample output</span> : null}</div>
                    <p className="text-body">{check.summary}</p>
                    {check.evidence.map((e) => <p key={e.time + e.quote} className="text-small">You said, {e.time}: &ldquo;{e.quote}&rdquo;</p>)}
                    <p className="fine-print">{count(check.counts.open_question)} open questions in {count(check.words)} of your words. Only your own words were analyzed; nothing anyone else said was kept.</p>
                  </div>
                ) : null}
                {waiting ? (
                  <div className="subtle-panel stack">
                    <span className="overline">Prototype controls</span>
                    <p className="fine-print">{o.captureStatus === 'scheduled' ? `In production the notice appears when the meeting starts. ${attendees.length} ${attendees.length === 1 ? 'colleague' : 'colleagues'} invited.` : `${attendees.filter((a) => a.agreedAt).length} of ${attendees.length} agreed.`}</p>
                    <div className="btn-row">
                      {o.captureStatus === 'scheduled'
                        ? <ActionButton action={startMeetingAction.bind(null, o.id)} label="Start the meeting and show the notice" pendingLabel="Starting…" className="ecb-btn-secondary" />
                        : <Link className="ecb-btn-secondary" href={`/meeting/${o.id}/notice`}>Open the notice</Link>}
                      {o.captureStatus !== 'scheduled' ? <ActionButton action={simulateMeetingAction.bind(null, o.id)} label="Simulate the meeting transcript" pendingLabel="Analyzing your words…" className="ecb-btn-secondary" /> : null}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </NavPage>
  );
}
