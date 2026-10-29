import Link from 'next/link';
import { ConfirmButton } from '@/components/client';
import { allow, BackLink, NotFoundCard, PageHead, WrongRole } from '@/components/ui';
import { EventBadge, StatusBadge } from '@/ds/components';
import { CHANNEL_LABEL, ROLE_LABEL, type Channel, type EventAction, type Role } from '@/lib/domain';
import { day, firstName, time } from '@/lib/format';
import { sessionWithPeople } from '@/lib/queries';
import { ActionButton } from '@/components/admin-forms';
import { oneOffChoice, personState, SESSION_REASON } from '@/lib/companion-setup';
import { db } from '@/lib/db';
import { toggleOneAction } from '@/lib/setup-actions';

const PLATFORM: Record<string, string> = { zoom: 'Zoom, on your linked account', teams: 'Microsoft Teams', meet: 'Google Meet' };

export default async function SessionLivePage({ params }: { params: { id: string } }) {
  const path = `/coach/sessions/${params.id}/live`;
  const persona = allow(['coach']);
  if (!persona) return <WrongRole roles={['coach']} path={path} />;
  const s = await sessionWithPeople(params.id);
  if (!s || s.engagement.coachId !== persona.userId) return <NotFoundCard what="session" />;

  const who = firstName(s.engagement.coachee.name);
  const nextSession = await db.session.findFirst({ where: { engagementId: s.engagementId, number: s.number + 1 } });
  const coachState = await personState(persona.userId);
  const nextOff = nextSession ? oneOffChoice(coachState, { sessionId: nextSession.id }) === 'off' : false;
  const target = (id: string) => JSON.stringify({ sessionId: id, engagementId: s.engagementId });
  const live = s.events.length > 0;
  const waiting = s.consents.filter((c) => !c.grantedAt && !c.revokedAt);
  const capture = s.captureStatus === 'removed' ? { label: 'Companion removed', tone: 'neutral' as const }
    : s.captureStatus === 'no_capture' ? { label: s.captureReason && SESSION_REASON[s.captureReason] ? `Off: ${SESSION_REASON[s.captureReason](firstName(s.engagement.coach.name), who).toLowerCase()}` : 'No capture', tone: 'neutral' as const }
    : waiting.length > 0 ? { label: 'Paused, late joiner', tone: 'info' as const }
    : live ? { label: 'Capturing', tone: 'live' as const }
    : { label: s.captureStatus === 'consented' ? 'Ready to capture' : 'Waiting for consent', tone: 'neutral' as const };

  return (
    <div className="page">
      <BackLink href="/coach/sessions">Back to sessions</BackLink>
      <PageHead title={`${s.engagement.coachee.name} · Session ${s.number}`} lede={`${day(s.scheduledAt)} · ${time(s.scheduledAt)} · ${PLATFORM[s.platform] ?? s.platform}`}>
        {live ? <StatusBadge tone="live" label="In session" dot size="md" /> : <StatusBadge tone="neutral" label="Scheduled" size="md" />}
      </PageHead>

      <div className="split">
        <section aria-labelledby="cs-head" className="col card card--pad card--stack">
          <h2 id="cs-head" className="heading-xsmall heading-reset">Consent for this session</h2>
          <div className="stack ruled">
            {s.consents.length === 0 ? <p className="text-body">No one has been asked yet. We ask the day before.</p> : null}
            {s.consents.map((c) => {
              const name = c.user?.name ?? `${c.guestLabel ?? 'Guest'}, joined at ${c.joinedAt ? time(c.joinedAt) : 'unknown'}`;
              const role = c.user ? ` · ${ROLE_LABEL[c.user.role as Role]}` : '';
              const detail = c.revokedAt ? `Withdrew consent ${day(c.revokedAt)} at ${time(c.revokedAt)}`
                : c.grantedAt ? `Consented${c.channel === 'slack' || c.channel === 'teams' ? ` in ${CHANNEL_LABEL[c.channel as Channel]}` : ''}${c.channel === 'slack' || c.channel === 'teams' ? ',' : ''} ${day(c.grantedAt)} at ${time(c.grantedAt)}`
                : 'Capture paused until they consent';
              return (
                <div key={c.id} className="row text-body">
                  <span className="grow"><span className="strong">{name}</span>{role}<br /><span className="evidence">{detail}</span></span>
                  {c.revokedAt ? <StatusBadge tone="neutral" label="Withdrawn" /> : c.grantedAt ? <StatusBadge tone="success" label="Consented" /> : <StatusBadge tone="warning" label="Waiting for consent" />}
                </div>
              );
            })}
          </div>
          <p className="fine-print">Everyone in the meeting sees the companion's notice. Capture resumes only when every participant has agreed.</p>
        </section>

        <section aria-labelledby="ctl-head" className="col card card--pad card--stack">
          <h2 id="ctl-head" className="heading-xsmall heading-reset">Companion controls</h2>
          <div className="row text-body"><span className="grow">Capture status</span><StatusBadge tone={capture.tone} label={capture.label} size="md" /></div>
          <div className="btn-row">
            <button className="ecb-btn-secondary" type="button">Pause capture</button>
            <button className="ecb-btn-secondary" type="button">Resume capture</button>
            <ConfirmButton label="Remove companion from this session" className="ecb-btn-danger" action={toggleOneAction.bind(null, target(s.id), `session ${s.number} with ${s.engagement.coachee.name}`, 'off')} copy={{
              title: 'Remove the companion from this session?',
              body: <><p>Capture stops now and anything captured so far is deleted.</p><p>{who} and you both see that the companion left. No recap is made for this session.</p></>,
              undo: "You can't undo this for this session. Future sessions aren't affected.",
              cancelLabel: 'Keep companion',
              confirmLabel: 'Remove companion',
            }} />
          </div>
          <p className="fine-print">{who} has the same controls in Slack and in the <Link href={`/session/${s.id}/panel`}>meeting side panel</Link>.</p>
          <div className="divider" />
          <h3 className="text-body strong heading-reset">Upcoming sessions</h3>
          {nextSession ? (
            <div className="row row--wrap text-body">
              <span className="grow">Session {s.number + 1}, {day(nextSession.scheduledAt)}: {nextOff ? 'you turned the companion off' : 'follows your companion settings'}</span>
              <ActionButton action={toggleOneAction.bind(null, target(nextSession.id), `session ${s.number + 1} with ${s.engagement.coachee.name}`, nextOff ? 'default' : 'off')} label={nextOff ? `Turn session ${s.number + 1} back on` : `Run session ${s.number + 1} without capture`} pendingLabel="Saving…" className="ecb-btn-secondary" />
            </div>
          ) : <p className="text-body">No next session booked yet. <Link href="/coach/settings">Companion settings</Link></p>}
        </section>
      </div>

      <section aria-labelledby="log-head" className="card card--scroll">
        <div className="card__head"><h2 id="log-head" className="heading-xsmall heading-reset">Session events</h2></div>
        <table className="table table--w-560">
          <thead><tr><th>Time</th><th>Event</th><th>By</th></tr></thead>
          <tbody>
            {s.events.length === 0 ? <tr><td colSpan={3}>No events yet. They appear once the session starts.</td></tr> : null}
            {s.events.map((e) => (
              <tr key={e.id}><td>{time(e.at)}</td><td><EventBadge action={e.action as EventAction} label={e.label} /></td><td>{e.by}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
