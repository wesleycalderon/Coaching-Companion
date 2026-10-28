import type { ReactNode } from 'react';
import { ConfirmButton } from '@/components/client';
import { SideNav } from '@/components/ui';
import { db } from '@/lib/db';
import { count, Count, day, firstName, initials } from '@/lib/format';
import { latestRecapSessionId } from '@/lib/queries';

/** Participant shell: cool page background, light left rail, white cards. */
export async function CoacheeShell({ userId, current, children }: { userId: string; current: string; children: ReactNode }) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const latest = await latestRecapSessionId(userId);
  const recap = latest ? `/me/recap/${latest}` : '/me/sessions';
  const items = [
    { href: recap, label: 'Latest recap' },
    { href: '/me/roadmap', label: 'Leadership Roadmap ↗' },
    { href: '/me/sessions', label: 'Past sessions' },
    { href: '/me/meetings', label: 'Linked meetings' },
    { href: '/me/data', label: 'My data' },
  ];
  return (
    <div className="participant">
      <div className="page page--with-nav">
        <SideNav label="Your coaching" items={items} current={current === 'recap' ? recap : current} className="participant-nav">
          <div className="row row--tight pad-100">
            <div className="avatar" aria-hidden="true">{initials(user.name)}</div>
            <span className="strong text-body">{user.name}</span>
          </div>
        </SideNav>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}

/** "My data": what is kept, until when, and the controls to delete it. */
export async function MyDataSection({ userId }: { userId: string }) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { client: true } });
  const engagement = await db.engagement.findFirst({ where: { coacheeId: userId }, include: { coach: true } });
  const sessions = await db.session.findMany({
    where: { engagement: { coacheeId: userId } },
    include: { transcript: true, summary: true, commitments: { where: { approved: true } } },
    orderBy: { number: 'asc' },
  });
  const transcripts = sessions.filter((s) => s.transcript);
  const recaps = sessions.filter((s) => s.summary?.status === 'approved');
  const commitmentCount = sessions.reduce((n, s) => n + s.commitments.length, 0);
  const coach = engagement ? firstName(engagement.coach.name) : 'Your coach';
  const clientShort = user.client?.name.split(' ')[0] ?? 'Your organization';
  const prefs = (user.preferences ?? {}) as { capturePreference?: string };

  const deleteAllBody = (
    <>
      <p>We'll delete {andCounts(transcripts.length, recaps.length, commitmentCount)} and your results.</p>
      <p>{coach} will no longer see your history. Your coaching continues, and new sessions start fresh.</p>
    </>
  );

  return (
    <section id="data" aria-labelledby="d-head" className="p-card">
      <div className="stack stack--tight">
        <h2 id="d-head" className="heading-small heading-reset">My data</h2>
        <p className="lede">{clientShort} sees only totals across {user.client?.minGroupSize ?? 15} or more coachees. {coach} sees what's listed here.</p>
      </div>
      <div className="table-scroll">
        <table className="table table--flush table--w-560">
          <thead><tr><th>What we keep</th><th>Kept until</th><th className="actions"><span className="visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            {transcripts.map((s) => (
              <tr key={s.id}>
                <td>Session {s.number} transcript</td>
                <td>{day(s.transcript!.deleteAfter)}</td>
                <td className="actions">
                  <div className="row row--tight row--end">
                    <button className="ecb-btn-ghost" type="button">View</button>
                    <ConfirmButton label="Delete now" copy={{
                      title: `Delete your session ${s.number} transcript?`,
                      body: <p>We'll delete the transcript now instead of on {day(s.transcript!.deleteAfter)}. Your recap and actions stay. {coach} can no longer read it.</p>,
                      undo: "This can't be undone.",
                      confirmLabel: 'Delete transcript',
                    }} />
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <td>Recaps, {count(recaps.length)} sessions</td>
              <td>End of your coaching</td>
              <td className="actions"><div className="row row--tight row--end"><button className="ecb-btn-ghost" type="button">Download</button><ConfirmButton label="Delete" copy={{ title: 'Delete your recaps?', body: <p>We'll delete {count(recaps.length)} recaps. {coach} will no longer see them.</p>, undo: "This can't be undone. You can download a copy first.", confirmLabel: 'Delete recaps' }} /></div></td>
            </tr>
            <tr>
              <td>Insights, actions and results</td>
              <td>End of your coaching</td>
              <td className="actions"><div className="row row--tight row--end"><button className="ecb-btn-ghost" type="button">Download</button><ConfirmButton label="Delete" copy={{ title: 'Delete your insights, actions and results?', body: <p>We'll delete your insights, {count(commitmentCount)} actions and your results. Check-ins stop.</p>, undo: "This can't be undone. You can download a copy first.", confirmLabel: 'Delete actions and results' }} /></div></td>
            </tr>
            <tr>
              <td>Calendar times for check-ins</td>
              <td>Not stored, read when needed</td>
              <td className="actions"><button className="ecb-btn-ghost" type="button">Turn off</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="row row--wrap section-rule">
        <label className="grow text-body" htmlFor="capture-pref">Ask before each session is captured</label>
        <select id="capture-pref" className="ecb-form-select select--max" defaultValue={prefs.capturePreference ?? 'ask'}>
          <option value="ask">Ask me each time</option>
          <option value="never">Never capture my sessions</option>
        </select>
      </div>
      <div>
        <ConfirmButton label="Delete all my coaching data" className="ecb-btn-danger" copy={{
          title: 'Delete all your coaching data?',
          body: deleteAllBody,
          undo: "This can't be undone. You can download a copy first.",
          confirmLabel: 'Delete my data',
          typeToConfirm: 'delete',
          extraAction: <button className="ecb-btn-ghost" type="button">Download a copy</button>,
        }} />
      </div>
    </section>
  );
}

function andCounts(transcripts: number, recaps: number, commitments: number) {
  const parts = [
    transcripts ? `${count(transcripts)} transcript${transcripts === 1 ? '' : 's'}` : null,
    `${count(recaps)} recap${recaps === 1 ? '' : 's'}`,
    `${count(commitments)} action${commitments === 1 ? '' : 's'}`,
  ].filter(Boolean) as string[];
  return parts.join(', ');
}

export { Count };
