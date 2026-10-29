import Link from 'next/link';
import { ActionButton } from '@/components/admin-forms';
import { CoachText } from '@/components/coach-text';
import { allow, NotFoundCard, PageHead, SampleNote, WrongRole } from '@/components/ui';
import { RoleBadge, StatusBadge } from '@/ds/components';
import { coachById } from '@/lib/coaching/coaches';
import { decideProposalAction } from '@/lib/coaching-actions';
import { ATTEMPT_BADGE } from '@/lib/companion/view';
import type { WorkMeetingCheck } from '@/lib/work-meetings';
import { db } from '@/lib/db';
import type { OrgOutcome } from '@/lib/domain';
import { asJson, day, firstName } from '@/lib/format';
import { coacheePatterns, commitmentBadge, isUpcoming, lastCheckInText } from '@/lib/queries';

export default async function CoacheeProfilePage({ params }: { params: { id: string } }) {
  const path = `/coach/coachees/${params.id}`;
  const persona = allow(['coach']);
  if (!persona) return <WrongRole roles={['coach']} path={path} />;
  // Coaches see only their own coachees.
  const e = await db.engagement.findFirst({
    where: { coacheeId: params.id, coachId: persona.userId },
    include: {
      coachee: true, client: true, goals: true,
      sessions: { orderBy: { number: 'asc' }, include: { commitments: { where: { approved: true }, include: { checkIns: true } } } },
    },
  });
  if (!e) return <NotFoundCard what="coachee" />;
  const done = e.sessions.filter((s) => !isUpcoming(s));
  const next = e.sessions.find(isUpcoming);
  const goal = e.goals[0];
  // Newest session first; within a session, in the order they were made.
  const commitments = [...e.sessions].reverse().flatMap((s) => [...s.commitments].sort((a, b) => a.id.localeCompare(b.id)).map((c) => ({ ...c, sessionNumber: s.number })));
  const patterns = await coacheePatterns(e.id, e.coachee.name);
  // Work meetings appear only when the coachee shared that series (milestone 7).
  const shared = await db.meetingLink.findMany({
    where: { coacheeId: e.coacheeId, sharedWithCoach: true },
    include: { commitment: true, occurrences: { where: { captureStatus: 'captured' }, orderBy: { scheduledAt: 'desc' } } },
    orderBy: { createdAt: 'desc' },
  });
  // Coaching guidance: actions the coachee proposed after a BiTSy conversation (always sent to
  // the coach), and conversations the coachee chose to share.
  const coaching = await db.coachingConversation.findMany({
    where: { coacheeId: e.coacheeId, OR: [{ sharedWithCoach: true }, { proposalStatus: { not: 'none' } }] },
    include: { commitment: true, turns: { where: { role: { in: ['coach', 'coachee'] } }, orderBy: { createdAt: 'asc' } } },
    orderBy: { startedAt: 'desc' },
  });
  const waiting = coaching.filter((c) => c.proposalStatus === 'proposed');
  const lede = [e.coachee.jobTitle, e.client.name, `Session ${done.length} of ${e.plannedSessions}`, next ? `Next session ${day(next.scheduledAt)}` : null].filter(Boolean).join(' · ');

  return (
    <div className="page">
      <PageHead title={e.coachee.name} lede={lede}>
        <Link className="ecb-btn-primary" href={`/coach/coachees/${e.coacheeId}/plan`}>Plan next session</Link>
      </PageHead>

      {goal ? (
        <section aria-labelledby="g-head" className="card card--pad card--stack">
          <h2 id="g-head" className="heading-xsmall heading-reset">Leadership Roadmap goal: {goal.title}</h2>
          <p className="fine-print">Capabilities: {asJson<string[]>(goal.capabilities).join(', ')} · Personal impact and outcomes chosen by {firstName(e.coachee.name)}</p>
          <div className="grid grid--4 text-body">
            <div className="stack stack--tight"><span className="overline">Ways of thinking</span><span>Current: "{goal.thinkingCurrent}"<br />Future: "{goal.thinkingFuture}"</span></div>
            <div className="stack stack--tight"><span className="overline">Ways of behaving</span><span>Current: {goal.behavingCurrent}<br />Future: {goal.behavingFuture}</span></div>
            <div className="stack stack--tight"><span className="overline">Personal impact</span><span>{asJson<string[]>(goal.personalImpact).map((x, k) => <span key={x}>{k ? <br /> : null}{x}</span>)}</span></div>
            <div className="stack stack--tight"><span className="overline">Organizational outcomes</span><span>{asJson<OrgOutcome[]>(goal.orgOutcomes).map((o, k) => <span key={o.outcome}>{k ? <br /> : null}{o.outcome}, {o.extent}</span>)}</span></div>
          </div>
        </section>
      ) : null}

      <div className="split">
        <section aria-labelledby="c-head" className="col--wide card card--scroll">
          <div className="card__head"><h2 id="c-head" className="heading-xsmall heading-reset">Actions and results</h2></div>
          <table className="table table--w-520">
            <thead><tr><th>Action</th><th>From</th><th>Status</th><th>Latest result</th></tr></thead>
            <tbody>
              {commitments.map((c) => {
                const b = commitmentBadge(c);
                return (
                  <tr key={c.id}>
                    <td>{c.title}</td>
                    <td>Session {c.sessionNumber}</td>
                    <td><StatusBadge tone={b.tone} label={b.label} title={b.title} /></td>
                    <td className="text-subtle">{lastCheckInText(c)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section aria-labelledby="p-head" className="col--narrow card card--pad card--stack">
          <h2 id="p-head" className="heading-xsmall heading-reset">Patterns across sessions</h2>
          <p className="fine-print">From your observations and {firstName(e.coachee.name)}'s own check-ins. Never inferred from voice or video.</p>
          <div className="stack ruled text-body">
            <div className="stack stack--tight"><span className="strong">How {firstName(e.coachee.name)} shows up</span><span>{patterns.showUp}</span></div>
            <div className="stack stack--tight"><span className="strong">Homework follow-through</span><span>{patterns.followThrough}</span></div>
            <div className="stack stack--tight"><span className="strong">Coaching language</span><span>{patterns.language}</span></div>
          </div>
        </section>
      </div>

      {shared.length ? (
        <section aria-labelledby="wm-head" className="card card--pad card--stack">
          <div className="row row--tight"><h2 id="wm-head" className="heading-xsmall heading-reset grow">Work meetings {firstName(e.coachee.name)} shared</h2><RoleBadge label="AI" /></div>
          <p className="fine-print">Feedback from work meetings {firstName(e.coachee.name)} chose to share with you. It comes from {firstName(e.coachee.name)}&apos;s own words only; no one else&apos;s words are kept.</p>
          <div className="stack ruled">
            {shared.map((l) => (
              <div key={l.id} className="stack stack--tight">
                <span className="strong">{l.title}{l.cadence ? ` · ${l.cadence}` : ''}</span>
                <span className="text-small">{l.commitment ? `For the action: ${l.commitment.title}` : 'Checked against all of their active actions'}</span>
                {l.occurrences.length === 0 ? <span className="fine-print">No feedback yet.</span> : l.occurrences.map((o) => {
                  const check = asJson<WorkMeetingCheck>(o.check);
                  const badge = ATTEMPT_BADGE[check.attempted];
                  return (
                    <div key={o.id} className="row row--top row--tight text-small">
                      <span className="nowrap">{day(o.scheduledAt)}</span>
                      <StatusBadge tone={badge.tone} label={badge.label.replace(/^You tried it$/, 'Tried')} />
                      <span className="grow">Feedback to {firstName(e.coachee.name)}: &ldquo;{check.summary}&rdquo;</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {coaching.length ? (
        <section aria-labelledby="cg-head" className="card card--pad card--stack">
          <div className="row row--tight"><h2 id="cg-head" className="heading-xsmall heading-reset grow">From {firstName(e.coachee.name)}&apos;s coaching guidance</h2>{waiting.length ? <StatusBadge tone="info" label={`${waiting.length} to approve`} /> : null}</div>
          <p className="fine-print">{firstName(e.coachee.name)} talked actions through with BiTSy&apos;s AI coaches. You see actions {firstName(e.coachee.name)} proposed, and a conversation only if {firstName(e.coachee.name)} shared it.</p>
          <div className="stack ruled">
            {coaching.map((c) => (
              <div key={c.id} className="stack stack--tight">
                <span className="strong">{coachById(c.agentName).name} coach · {day(c.startedAt)}</span>
                {c.commitment ? <span className="text-small">About the action: {c.commitment.title}</span> : null}
                {c.proposedAction ? (
                  <div className="stack stack--tight">
                    <div className="row row--top row--tight text-small">
                      <StatusBadge tone={c.proposalStatus === 'approved' ? 'success' : c.proposalStatus === 'declined' ? 'neutral' : 'info'} label={c.proposalStatus === 'approved' ? 'Approved' : c.proposalStatus === 'declined' ? 'Declined' : 'Proposed action'} />
                      <span className="grow">In {firstName(e.coachee.name)}&apos;s words: &ldquo;{c.proposedAction}&rdquo;</span>
                    </div>
                    {c.proposalStatus === 'proposed' ? (
                      <div className="btn-row">
                        <ActionButton action={decideProposalAction.bind(null, c.id, true)} label="Approve the action" ariaLabel={`Approve the action: ${c.proposedAction}`} pendingLabel="Approving…" className="ecb-btn-primary" />
                        <ActionButton action={decideProposalAction.bind(null, c.id, false)} label="Discuss it in the next session" ariaLabel={`Decline for now and discuss in the next session: ${c.proposedAction}`} pendingLabel="Saving…" className="ecb-btn-ghost" />
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {c.sharedWithCoach ? (
                  <details>
                    <summary className="text-small">Read the conversation (AI coach)</summary>
                    <div className="coach-thread">
                      {c.turns.map((t) => (
                        <div key={t.id} className={t.role === 'coach' ? 'coach-turn' : 'coach-turn coach-turn--me'}>
                          <span className="coach-turn__meta"><strong>{t.role === 'coach' ? 'BiTSy coach · AI' : firstName(e.coachee.name)}</strong></span>
                          {t.role === 'coach' ? <CoachText text={t.text} /> : <p className="coach-text__p pre-wrap">{t.text}</p>}
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <SampleNote />
    </div>
  );
}
