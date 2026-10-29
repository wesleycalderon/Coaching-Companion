import Link from 'next/link';
import { ActionButton } from '@/components/admin-forms';
import { allow, NotFoundCard, WrongRole } from '@/components/ui';
import { RoleBadge, StatusBadge } from '@/ds/components';
import { db } from '@/lib/db';
import { asJson, dayTime, firstName } from '@/lib/format';
import { answerNoticeAction } from '@/lib/meeting-actions';
import type { Attendee } from '@/lib/work-meetings';

// Milestone 7: the notice everyone sees in each occurrence of a linked work meeting, as a mock
// of the meeting app (like artboard 20). Not on the canvas yet: flagged for design review.
// The prototype lets the coachee answer for each colleague. STUB: BTS Studio engineering
// (meeting-app notice, per-person consent storage).
export default async function WorkMeetingNoticePage({ params }: { params: { occurrenceId: string } }) {
  const path = `/meeting/${params.occurrenceId}/notice`;
  const persona = allow(['coachee', 'coach']);
  if (!persona) return <WrongRole roles={['coachee', 'coach']} path={path} />;
  const o = await db.meetingOccurrence.findFirst({ where: { id: params.occurrenceId, link: { coacheeId: persona.userId } }, include: { link: { include: { coachee: { include: { client: true } } } } } });
  if (!o) return <NotFoundCard what="meeting" />;
  const who = o.link.coachee.name;
  const first = firstName(who);
  const isCoach = o.link.ownerRole === 'coach';
  const short = isCoach ? 'BTS' : o.link.coachee.client?.name.split(' ')[0] ?? 'your organization';
  const attendees = asJson<Attendee[]>(o.attendees);
  const agreed = attendees.filter((a) => a.agreedAt).length;
  const external = o.captureStatus === 'skipped_external';
  const state = external ? { label: 'Not captured', tone: 'neutral' as const, text: `Someone from outside ${short} is invited, so nothing in this meeting is captured.` }
    : ['stopped', 'off'].includes(o.captureStatus) ? { label: 'Not captured', tone: 'neutral' as const, text: `${first} turned the companion off for this meeting.` }
    : o.captureStatus === 'captured' ? { label: 'Done', tone: 'success' as const, text: `The meeting has ended. Only ${first}'s words were analyzed.` }
    : agreed === attendees.length ? { label: `Capturing ${first}'s words`, tone: 'live' as const, text: `Everyone agreed. Only ${first}'s own words are analyzed.` }
    : { label: 'Paused', tone: 'warning' as const, text: `Capture is paused until everyone here agrees. ${agreed} of ${attendees.length} have.` };

  return (
    <div className="meeting-stage">
      <div className="meeting-panel">
        <Link className="text-small" href={`${isCoach ? '/coach' : '/me'}/meetings/${o.linkId}`}>‹ Back to {o.link.title}</Link>
        <span className="overline">In the meeting app · what everyone sees · {o.link.title}, {dayTime(o.scheduledAt)}</span>
        <div className="card card--pad card--stack notice-raised">
          <div className="row row--tight"><span className="dm-card__title grow">This meeting uses an AI coaching companion</span><RoleBadge label="AI" /></div>
          <p className="text-body">{isCoach ? `${first} is a BTS coach and uses the companion for feedback on their own practice.` : `${first} is practicing leadership actions and has the companion on for this meeting.`} Only {first}&apos;s own words are analyzed, for {first}&apos;s eyes. What anyone else says is discarded right after the meeting and never stored.</p>
          <div className="row row--tight text-body"><span className="grow">{state.text}</span><StatusBadge tone={state.tone} label={state.label} /></div>
          <p className="fine-print">Your words are never used to train AI models. You can say no without giving a reason; {first} just won&apos;t get feedback from this meeting.</p>
        </div>

        {!external && ['notice_shown', 'paused'].includes(o.captureStatus) ? (
          <>
            <span className="overline">Prototype controls · answer for each colleague</span>
            <div className="card card--pad card--stack">
              <ul className="list ruled">
                {attendees.map((a) => (
                  <li key={a.name} className="stack stack--tight">
                    <div className="row row--wrap row--tight">
                      <span className="grow text-body">{a.name}</span>
                      <StatusBadge tone={a.agreedAt ? 'success' : a.declinedAt ? 'warning' : 'neutral'} label={a.agreedAt ? 'Agreed' : a.declinedAt ? 'Declined' : 'Waiting'} />
                    </div>
                    <div className="btn-row">
                      <ActionButton action={answerNoticeAction.bind(null, o.id, a.name, true)} label="Agree to capture" ariaLabel={`Agree to capture as ${a.name}`} pendingLabel="Saving…" className="ecb-btn-secondary" />
                      <ActionButton action={answerNoticeAction.bind(null, o.id, a.name, false)} label="Keep capture paused" ariaLabel={`Keep capture paused as ${a.name}`} pendingLabel="Saving…" className="ecb-btn-ghost" />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="fine-print">Each answer is logged as a consent event. Someone who joins late sees the same notice, and capture pauses until they answer.</p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
