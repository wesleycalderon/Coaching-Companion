import Link from 'next/link';
import { allow, COACH_NAV, NavPage, PageHead, WrongRole } from '@/components/ui';
import { db } from '@/lib/db';
import { day } from '@/lib/format';
import { isUpcoming } from '@/lib/queries';

export default async function CoachCoacheesPage() {
  const persona = allow(['coach']);
  if (!persona) return <WrongRole roles={['coach']} path="/coach/coachees" />;
  const engagements = await db.engagement.findMany({
    where: { coachId: persona.userId, coachee: { status: { not: 'removed' } } },
    include: { coachee: true, client: true, goals: true, sessions: { orderBy: { scheduledAt: 'asc' } } },
    orderBy: { coachee: { name: 'asc' } },
  });
  return (
    <NavPage nav={COACH_NAV} navLabel="Coach workspace" current="/coach/coachees">
      <PageHead title="Your coachees" lede="Roadmap goals, actions and patterns for each person you coach." />
      <div className="card card--scroll">
        <table className="table table--w-640">
          <thead><tr><th>Coachee</th><th>Goal</th><th>Sessions</th><th>Next session</th></tr></thead>
          <tbody>
            {engagements.map((e) => {
              const next = e.sessions.find(isUpcoming);
              const done = e.sessions.filter((s) => !isUpcoming(s)).length;
              return (
                <tr key={e.id}>
                  <td><Link className="cell-title" href={`/coach/coachees/${e.coacheeId}`}>{e.coachee.name}</Link><div className="cell-sub">{e.client.name}</div></td>
                  <td>{e.goals[0]?.title ?? 'No goal yet'}</td>
                  <td>{done} of {e.plannedSessions}</td>
                  <td>{next ? day(next.scheduledAt) : 'Not scheduled'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </NavPage>
  );
}
