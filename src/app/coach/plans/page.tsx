import Link from 'next/link';
import { DraftPlanButton } from '@/components/coach-tools';
import { allow, COACH_NAV, NavPage, PageHead, WrongRole } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
import { db } from '@/lib/db';
import { dayTime } from '@/lib/format';
import { isUpcoming } from '@/lib/queries';

export default async function CoachPlansPage() {
  const persona = allow(['coach']);
  if (!persona) return <WrongRole roles={['coach']} path="/coach/plans" />;
  const sessions = (await db.session.findMany({
    where: { engagement: { coachId: persona.userId, coachee: { status: { not: 'removed' } } } },
    include: { plan: true, engagement: { include: { coachee: true } } },
    orderBy: { scheduledAt: 'asc' },
  })).filter(isUpcoming);
  return (
    <NavPage nav={COACH_NAV} navLabel="Coach workspace" current="/coach/plans">
      <PageHead title="Next-session plans" lede="A plan is drafted from earlier sessions, check-ins and your notes before each session." />
      <div className="card card--scroll">
        <table className="table table--w-640">
          <thead><tr><th>Coachee</th><th>Session</th><th>Plan</th><th className="actions"><span className="visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td className="cell-title">{s.engagement.coachee.name}</td>
                <td>{dayTime(s.scheduledAt)} · Session {s.number}</td>
                <td>{!s.plan ? <StatusBadge tone="neutral" label="Not drafted yet" /> : s.plan.editedAt ? <StatusBadge tone="success" label="Edited by you" /> : <StatusBadge tone="success" label="Ready" />}</td>
                <td className="actions">{s.plan
                  ? <Link className="ecb-btn-ghost" href={`/coach/coachees/${s.engagement.coacheeId}/plan`} aria-label={`Open plan for ${s.engagement.coachee.name}`}>Open plan</Link>
                  : <DraftPlanButton sessionId={s.id} className="ecb-btn-ghost" label="Draft plan" ariaLabel={`Draft plan for ${s.engagement.coachee.name}`} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </NavPage>
  );
}
