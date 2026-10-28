import Link from 'next/link';
import { ActionForm } from '@/components/admin-forms';
import { CoacheeShell } from '@/components/coachee';
import { allow, WrongRole } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
import { calendarFor } from '@/lib/calendar';
import { db } from '@/lib/db';
import { day, dayTime, firstName } from '@/lib/format';
import { linkMeetingAction } from '@/lib/meeting-actions';
import { isActive, LINKABLE_STATUSES, refreshLinks, reviewDue, STOP_REASON } from '@/lib/work-meetings';

// Milestone 7. Not on the canvas yet: built from the participant patterns and flagged for design review.
export default async function LinkedMeetingsPage({ searchParams }: { searchParams: { action?: string } }) {
  const persona = allow(['coachee']);
  if (!persona) return <WrongRole roles={['coachee']} path="/me/meetings" />;
  await refreshLinks(persona.userId);
  const user = await db.user.findUniqueOrThrow({ where: { id: persona.userId }, include: { client: true } });
  const engagement = await db.engagement.findFirst({ where: { coacheeId: user.id }, include: { coach: true } });
  const coach = engagement ? firstName(engagement.coach.name) : 'your coach';
  const short = user.client?.name.split(' ')[0] ?? 'your organization';
  const on = user.client?.workMeetings === 'coachee_picked';
  const [links, actions] = await Promise.all([
    db.meetingLink.findMany({ where: { coacheeId: user.id }, include: { commitment: true, occurrences: { orderBy: { scheduledAt: 'asc' } } }, orderBy: { createdAt: 'desc' } }),
    db.commitment.findMany({ where: { approved: true, status: { in: LINKABLE_STATUSES }, session: { engagement: { coacheeId: user.id } } }, orderBy: { createdAt: 'desc' } }),
  ]);
  const nextFor = (l: (typeof links)[number]) => l.occurrences.find((o) => ['scheduled', 'notice_shown', 'paused'].includes(o.captureStatus));
  // A one-off meeting that has happened moves to the history list.
  const finished = (l: (typeof links)[number]) => !isActive(l) || (l.scope === 'single' && !nextFor(l) && l.occurrences.length > 0);
  const active = links.filter((l) => !finished(l));
  const stopped = links.filter(finished);
  const calendar = calendarFor(user);
  const linkedIds = new Set(active.map((l) => l.calendarEventId));
  const free = calendar.filter((e) => !linkedIds.has(e.id));
  const latestCaptured = (l: (typeof links)[number]) => [...l.occurrences].reverse().find((o) => o.captureStatus === 'captured');

  return (
    <CoacheeShell userId={user.id} current="/me/meetings">
      <div className="stack stack--100">
        <h1 className="participant-title">Linked meetings</h1>
        <p className="participant-lede">Link a work meeting to one of your actions and get feedback on your own words. Only you see it unless you share it with {coach}.</p>
      </div>

      {!on ? (
        <div className="p-card"><p className="text-body">{short} has turned off work-meeting capture, so meetings can&apos;t be linked. Your coaching sessions work as before.</p></div>
      ) : (
        <section aria-labelledby="lk-head" className="p-card stack">
          <h2 id="lk-head" className="heading-small heading-reset">Link a meeting</h2>
          {actions.length === 0 ? <p className="text-body">You have no actions you&apos;re still practicing. New ones appear after your coach approves a recap.</p> : (
            <ActionForm action={linkMeetingAction} submitLabel="Link this meeting" pendingLabel="Linking…" className="stack">
              <div className="grid grid--2">
                <div className="field">
                  <label className="ecb-form-label" htmlFor="lm-action">Your action</label>
                  <select id="lm-action" name="action" className="ecb-form-select" defaultValue={actions.some((a) => a.id === searchParams.action) ? searchParams.action : actions[0].id}>
                    {actions.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="ecb-form-label" htmlFor="lm-meeting">Meeting from your calendar</label>
                  <select id="lm-meeting" name="meeting" className="ecb-form-select">
                    {free.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title} · {e.recurring ? e.cadence : dayTime(e.nextAt)}{e.attendees.some((a) => !a.internal) ? ` · includes someone outside ${short}, won't be captured` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <fieldset className="fieldset fieldset--tight">
                <legend className="ecb-form-label">Which meetings</legend>
                <label className="check"><input type="radio" name="scope" value="series" defaultChecked /> This and all future meetings in the series</label>
                <label className="check"><input type="radio" name="scope" value="single" /> Only the next one</label>
              </fieldset>
              <ul className="list list--tight fine-print">
                <li>Everyone in the meeting sees a notice each time, and capture pauses for anyone who hasn&apos;t agreed.</li>
                <li>A meeting with anyone from outside {short} is never captured.</li>
                <li>Only your own words are analyzed. Everything anyone else says is discarded right after the meeting and never stored.</li>
                <li>A series stays linked until you stop it, the action becomes a habit or is set aside, or your coaching ends. We check with you every month.</li>
              </ul>
            </ActionForm>
          )}
          <p className="fine-print">The companion reads meeting titles, times and who's invited, nothing else. Synthetic calendar in this prototype.</p>
        </section>
      )}

      <section aria-labelledby="ac-head" className="p-card stack">
        <h2 id="ac-head" className="heading-small heading-reset">Linked now</h2>
        {active.length === 0 ? <p className="text-body">Nothing is linked.</p> : (
          <ul className="list ruled">
            {active.map((l) => {
              const next = nextFor(l);
              const last = latestCaptured(l);
              return (
                <li key={l.id} className="stack stack--tight">
                  <div className="row row--wrap row--tight">
                    <Link className="strong grow" href={`/me/meetings/${l.id}`}>{l.title}</Link>
                    <StatusBadge tone="info" label={l.scope === 'series' ? `Series · ${l.cadence}` : 'One meeting'} />
                    {l.sharedWithCoach ? <StatusBadge tone="neutral" label={`Shared with ${coach}`} /> : null}
                    {reviewDue(l) ? <StatusBadge tone="warning" label="Monthly check due" /> : null}
                  </div>
                  <span className="text-small">For your action: {l.commitment.ifThenText}</span>
                  <span className="fine-print">
                    {next ? `Next: ${dayTime(next.scheduledAt)}.` : l.scope === 'single' ? 'This meeting has passed.' : 'No upcoming meeting in your calendar.'}
                    {last ? ` Latest feedback: ${day(last.scheduledAt)}.` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {stopped.length ? (
        <section aria-labelledby="st-head" className="p-card stack">
          <h2 id="st-head" className="heading-small heading-reset">Past and stopped</h2>
          <ul className="list ruled">
            {stopped.map((l) => (
              <li key={l.id} className="row row--wrap row--tight">
                <Link className="grow" href={`/me/meetings/${l.id}`}>{l.title}</Link>
                <StatusBadge tone="neutral" label={l.stopReason ? STOP_REASON[l.stopReason] : isActive(l) ? 'Meeting has passed' : 'Stopped'} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </CoacheeShell>
  );
}
