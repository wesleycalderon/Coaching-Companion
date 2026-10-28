import Link from 'next/link';
import { allow, NotFoundCard, PageHead, SampleNote, WrongRole } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
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
      <SampleNote />
    </div>
  );
}
