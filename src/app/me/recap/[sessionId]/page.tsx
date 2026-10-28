import Link from 'next/link';
import { CoacheeShell, MyDataSection } from '@/components/coachee';
import { allow, NotFoundCard, WrongRole } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
import { db } from '@/lib/db';
import { summaryItemLabel, type SummaryItem } from '@/lib/domain';
import { asJson, day, firstName } from '@/lib/format';
import { commitmentBadge } from '@/lib/queries';
import { acceptSuggestion } from '@/lib/session-actions';

export default async function RecapPage({ params }: { params: { sessionId: string } }) {
  const path = `/me/recap/${params.sessionId}`;
  const persona = allow(['coachee']);
  if (!persona) return <WrongRole roles={['coachee']} path={path} />;

  const s = await db.session.findUnique({
    where: { id: params.sessionId },
    include: { engagement: { include: { coach: true, goals: true } }, summary: true, commitments: { where: { approved: true }, orderBy: { id: 'asc' } } },
  });
  // Coachees only ever see their own, coach-approved recaps.
  if (!s || s.engagement.coacheeId !== persona.userId || s.summary?.status !== 'approved') return <NotFoundCard what="recap" />;

  const coach = s.engagement.coach;
  const items = asJson<SummaryItem[]>(s.summary.insights);
  const goal = s.engagement.goals[0];
  const capabilities = goal ? asJson<string[]>(goal.capabilities) : [];
  const insightsFirst = [...items.filter((i) => i.kind === 'insight'), ...items.filter((i) => i.kind !== 'insight')];
  const headline = s.summary.headline;
  const accent = s.summary.headlineAccent;
  const [before, after] = headline && accent ? headline.split(accent) : [headline ?? `Your session ${s.number} recap`, undefined];

  return (
    <CoacheeShell userId={persona.userId} current="recap">
      <div id="recap" className="stack stack--100">
        <span className="overline">Session {s.number} with {coach.name} · {day(s.scheduledAt)}</span>
        <h1 className="participant-title">
          {before}{after !== undefined ? <><span className="accent">{accent}</span>{after}</> : null}
        </h1>
        <p className="participant-lede">Your recap, reviewed by {firstName(coach.name)}. Everything here is yours to keep or delete.</p>
      </div>

      <div className="p-card">
        <div className="grid grid--2 grid--loose participant-body">
          {insightsFirst.map((i, k) => (
            <div key={k}>
              <span className="overline">{summaryItemLabel(i, 'coachee', firstName(coach.name))}</span><br />
              {i.text}
              {i.kind !== 'insight' && i.status === 'suggested' ? (
                <form action={acceptSuggestion}>
                  <input type="hidden" name="summaryId" value={s.summary!.id} />
                  <input type="hidden" name="index" value={items.indexOf(i)} />
                  <button className="ecb-btn-ghost" type="submit">Add to my Roadmap</button>
                </form>
              ) : null}
            </div>
          )).flatMap((el, k) => (k === insightsFirst.filter((x) => x.kind === 'insight').length - 1 && goal ? [el, (
            <div key="saved">
              <span className="overline">Saved to your Roadmap</span><br />
              Goal: {goal.title}.{capabilities.length ? ` Capabilities: ${capabilities.join(', ')}.` : ''}
            </div>
          )] : [el]))}
        </div>
      </div>

      <section id="commitments" aria-labelledby="c-head" className="p-card">
        <h2 id="c-head" className="heading-small heading-reset">Your actions</h2>
        <div className="ruled stack stack--200">
          {s.commitments.length === 0 ? <p className="text-body">No actions from this session.</p> : null}
          {s.commitments.map((c) => {
            const b = commitmentBadge(c);
            return (
              <div key={c.id} className="row row--wrap">
                <span className="participant-body basis-320">{c.ifThenText}</span>
                <StatusBadge tone={b.tone} label={b.label} title={b.title} size="md" />
                {c.status === 'not_started' ? <Link className="text-body" href="/preview/slack-set-aside">Update</Link> : null}
              </div>
            );
          })}
        </div>
      </section>

      <MyDataSection userId={persona.userId} />
    </CoacheeShell>
  );
}
