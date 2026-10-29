import { AnswerList, AskPracticeForm, GrowthAreaForm } from '@/components/coach-tools';
import { FilterSelect } from '@/components/client';
import { allow, COACH_NAV, NavPage, PageHead, SampleNote, WrongRole } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
import { MIN_MARKER_KAPPA, type MarkerResult } from '@/lib/domain';
import { db } from '@/lib/db';
import { asJson, Count, count, dayTime, firstName, percent } from '@/lib/format';
import { markerIndex, practiceFor } from '@/lib/practice';
import { answerView } from '@/lib/queries';
import { CoachMeetingsSection } from '@/components/coach-meetings';

export default async function MyPracticePage({ searchParams }: { searchParams: { session?: string } }) {
  const persona = allow(['coach']);
  if (!persona) return <WrongRole roles={['coach']} path="/coach/practice" />;
  const p = await practiceFor(persona.userId);
  const markers = await markerIndex();
  const latestFirst = [...p.rows].reverse();
  const selected = latestFirst.find((r) => r.sessionId === searchParams.session) ?? latestFirst[0];
  const label = (r: (typeof p.rows)[number]) => `Session ${r.session.number} · ${r.session.engagement.coachee.name}`;
  const me = await db.user.findUniqueOrThrow({ where: { id: persona.userId }, include: { manager: true } });
  const notes = await db.managerNote.findMany({ where: { coachId: persona.userId }, orderBy: { createdAt: 'desc' }, take: 5 });
  const answers = await db.aiAnswer.findMany({ where: { askedById: persona.userId, scope: 'practice' }, orderBy: { createdAt: 'desc' }, take: 3 });
  const results = selected ? asJson<MarkerResult[]>(selected.markerResults).filter((m) => (markers.get(m.markerId)?.kappa ?? 0) >= MIN_MARKER_KAPPA) : [];

  return (
    <NavPage nav={COACH_NAV} navLabel="Coach workspace" current="/coach/practice">
      <PageHead title="My practice" lede="Visible only to you and your coach manager. Developmental only; never used to assign work." />
      {p.rows.length === 0 ? <div className="card card--pad"><p className="text-body">No analysed sessions yet. Feedback appears after your first captured session.</p></div> : (
        <>
          <div className="grid grid--3">
            <div className="card card--pad metric-tile">
              <span className="overline">Your share of talk time</span>
              <span className="heading-medium-strong">{percent(p.talkNow)}</span>
              <span className="fine-print">Last {count(p.recent.length)} sessions. ICF guidance favours the client, around 20 to 80.</span>
            </div>
            <div className="card card--pad metric-tile">
              <span className="overline">Open questions</span>
              <span className="heading-medium-strong">{percent(p.openNow)}</span>
              <span className="fine-print">Of all questions you asked{p.earlier.length ? `, ${p.openNow >= p.openBefore ? 'up' : 'down'} from ${percent(p.openBefore)}` : ''}.</span>
            </div>
            <div className="card card--pad metric-tile">
              <span className="overline">Sessions ending with a commitment</span>
              <span className="heading-medium-strong">{Count(p.withCommitment)} of {count(p.recent.length)}</span>
              <span className="fine-print">The coachee named a next step in their own words.</span>
            </div>
          </div>

          {selected ? (
            <section aria-labelledby="m-head" className="card card--scroll">
              <div className="card__head">
                <h2 id="m-head" className="heading-xsmall heading-reset grow">Session {selected.session.number} with {selected.session.engagement.coachee.name.split(' ')[0]}: ICF and GROW markers</h2>
                <FilterSelect id="sess" label="Session" hideLabel value={selected.sessionId}
                  options={latestFirst.map((r) => ({ value: r.sessionId, label: label(r) }))}
                  hrefs={Object.fromEntries(latestFirst.map((r) => [r.sessionId, `/coach/practice?session=${r.sessionId}`]))} />
              </div>
              {selected.aiProvider === 'sample' ? <p className="fine-print card__inset">Sample AI output: no API key set. Talk share and open questions are counted from the transcript.</p> : null}
              {results.length === 0 ? <p className="text-body card__inset">Markers couldn't be assessed for this session. Talk share and open questions are still counted.</p> : (
              <table className="table table--w-640">
                <thead><tr><th>Marker</th><th>Result</th><th>Evidence</th></tr></thead>
                <tbody>
                  {results.map((m) => (
                    <tr key={m.markerId}>
                      <td>{markers.get(m.markerId)?.name ?? m.markerId}</td>
                      <td>{m.observed ? <StatusBadge tone="success" label="Observed" /> : <StatusBadge tone="neutral" label="Not observed" />}</td>
                      <td className="text-subtle">{m.evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </section>
          ) : null}
        </>
      )}

      <div className="split">
        <section aria-labelledby="dev-head" className="col card card--pad card--stack">
          <h2 id="dev-head" className="heading-xsmall heading-reset">Your development</h2>
          <GrowthAreaForm value={me.growthArea ?? ''} />
          <div className="stack ruled">
            <span className="strong">Notes from {me.manager ? firstName(me.manager.name) : 'your coach manager'}</span>
            {notes.length === 0 ? <p className="text-body text-subtle">No notes yet.</p> : null}
            {notes.map((n) => (
              <div key={n.id} className="stack stack--tight text-body">
                <span className="timestamp">{dayTime(n.createdAt)}</span>
                <span>{n.text}</span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="ask-head" className="col card card--pad card--stack">
          <h2 id="ask-head" className="heading-xsmall heading-reset">Ask about your practice</h2>
          <AskPracticeForm />
          <AnswerList answers={answers.map(answerView)} />
          <p className="fine-print">Markers are shown only once they reach agreement with PCC and MCC raters. Results are descriptive, not a grade.</p>
        </section>
      </div>
      <CoachMeetingsSection coachId={me.id} growthArea={me.growthArea} />
      <SampleNote />
    </NavPage>
  );
}
