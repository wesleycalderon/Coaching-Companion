import Link from 'next/link';
import { ManagerNoteForm } from '@/components/coach-tools';
import { allow, PageHead, SampleNote, WrongRole } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
import { db } from '@/lib/db';
import { MIN_SESSIONS_FOR_TREND } from '@/lib/domain';
import { count, dayTime, firstName } from '@/lib/format';
import { markerIndex, observedCount, practiceFor, trend } from '@/lib/practice';

// Trends only. The manager never sees coachee transcripts, summaries or commitments,
// so nothing here queries them.
const SHOWN_MARKERS = ['icf.goal', 'icf.design', 'grow.options'];

export default async function ManagerCoachesPage({ searchParams }: { searchParams: { coach?: string } }) {
  const persona = allow(['coach_manager']);
  if (!persona) return <WrongRole roles={['coach_manager']} path="/manager/coaches" />;
  const coaches = await db.user.findMany({ where: { managerId: persona.userId, role: 'coach' }, orderBy: { createdAt: 'asc' } });
  const stats = await Promise.all(coaches.map(async (c) => ({ coach: c, p: await practiceFor(c.id) })));
  const markers = await markerIndex();
  const focus = stats.find((s) => s.coach.id === searchParams.coach) ?? stats[0];
  const notes = focus ? await db.managerNote.findMany({ where: { coachId: focus.coach.id, managerId: persona.userId }, orderBy: { createdAt: 'desc' }, take: 5 }) : [];

  return (
    <div className="page">
      <PageHead title="Coaches you support" lede="Practice trends over the last 90 days. You never see coachee transcripts, summaries or commitments." />
      <div className="card card--pad callout">
        <StatusBadge tone="info" label="Developmental only" size="md" />
        <span>Use these trends for coaching conversations with your coaches. They are not used to assign or rank coaching work.</span>
      </div>
      <div className="card card--scroll">
        <table className="table table--w-820">
          <thead><tr><th>Coach</th><th>Sessions analysed</th><th>Coach talk share</th><th>Open questions</th><th>Growth area the coach chose</th><th className="actions"><span className="visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            {stats.map(({ coach, p }) => (
              <tr key={coach.id}>
                <td className="cell-title">{coach.name}</td>
                <td>{p.rows.length}</td>
                <td>{trend(p.talkNow, p.talkBefore, p.rows.length)}</td>
                <td>{trend(p.openNow, p.openBefore, p.rows.length)}</td>
                <td>{coach.growthArea ?? 'Not chosen yet'}</td>
                <td className="actions"><Link className="ecb-btn-ghost" href={`/manager/coaches?coach=${coach.id}`} aria-label={`View trends for ${coach.name}`}>View trends</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {focus ? (
        <section aria-labelledby="dn-head" className="card card--pad card--stack">
          <h2 id="dn-head" className="heading-xsmall heading-reset">{focus.coach.name} · markers over time</h2>
          {focus.p.rows.length < MIN_SESSIONS_FOR_TREND ? <p className="text-body">Trends appear after {MIN_SESSIONS_FOR_TREND} analysed sessions. {focus.coach.name.split(' ')[0]} has {count(focus.p.rows.length)}.</p> : (
            <div className="grid grid--3 text-body">
              {SHOWN_MARKERS.map((id) => (
                <div key={id} className="stack stack--tight">
                  <span className="strong">{markers.get(id)?.shortName ?? id}</span>
                  <span className="text-subtle">Observed in {observedCount(focus.p.rows, id)} of {focus.p.rows.length} sessions</span>
                  <span className="fine-print">Last {focus.p.recent.length}: {observedCount(focus.p.recent, id)} of {focus.p.recent.length} · Before that: {observedCount(focus.p.earlier, id)} of {focus.p.earlier.length}</span>
                </div>
              ))}
            </div>
          )}
          <ManagerNoteForm key={focus.coach.id} coachId={focus.coach.id} coachFirst={firstName(focus.coach.name)} />
          {notes.length ? (
            <div className="stack ruled">
              <span className="strong">Notes you've shared</span>
              {notes.map((n) => (
                <div key={n.id} className="stack stack--tight text-body">
                  <span className="timestamp">{dayTime(n.createdAt)}</span>
                  <span>{n.text}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
      <SampleNote />
    </div>
  );
}
