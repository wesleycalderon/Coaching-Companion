import Link from 'next/link';
import { CoacheeShell } from '@/components/coachee';
import { allow, WrongRole } from '@/components/ui';
import { db } from '@/lib/db';
import { day } from '@/lib/format';

export default async function PastSessionsPage() {
  const persona = allow(['coachee']);
  if (!persona) return <WrongRole roles={['coachee']} path="/me/sessions" />;
  const sessions = await db.session.findMany({
    where: { engagement: { coacheeId: persona.userId }, summary: { status: 'approved' } },
    include: { summary: true, engagement: { include: { coach: true } } },
    orderBy: { scheduledAt: 'desc' },
  });
  return (
    <CoacheeShell userId={persona.userId} current="/me/sessions">
      <h1 className="participant-title">Past sessions</h1>
      <div className="p-card">
        {sessions.length === 0 ? <p className="text-body">No recaps yet. Your first appears after your coach reviews it.</p> : (
          <ul className="list">
            {sessions.map((s) => (
              <li key={s.id}><Link href={`/me/recap/${s.id}`}>Session {s.number} with {s.engagement.coach.name}, {day(s.scheduledAt)}</Link>{s.summary?.headline ? `: ${s.summary.headline}` : ''}</li>
            ))}
          </ul>
        )}
      </div>
    </CoacheeShell>
  );
}
