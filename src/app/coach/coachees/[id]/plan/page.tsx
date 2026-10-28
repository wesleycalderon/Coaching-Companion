import { DraftPlanButton, PlanEditor, ScheduleForm } from '@/components/coach-tools';
import { allow, BackLink, NotFoundCard, PageHead, WrongRole } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
import { db } from '@/lib/db';
import { asJson, day, dayTime, firstName, now, time } from '@/lib/format';
import { commitmentBadge, isUpcoming } from '@/lib/queries';

/** Free times in both calendars. STUB: calendar integration; three weekday proposals. */
function proposedSlots(after: Date) {
  const days: Date[] = [];
  for (let d = new Date(after); days.length < 3; d = new Date(d.getTime() + 86_400_000)) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) days.push(d);
  }
  return days.map((base, k) => {
    const d = new Date(base);
    d.setUTCHours([10, 14, 9][k], k === 2 ? 30 : 0, 0, 0);
    const end = new Date(d.getTime() + 3_600_000);
    return { value: d.toISOString(), label: `${day(d)} · ${time(d)} to ${time(end)}` };
  });
}

export default async function NextSessionPlanPage({ params }: { params: { id: string } }) {
  const path = `/coach/coachees/${params.id}/plan`;
  const persona = allow(['coach']);
  if (!persona) return <WrongRole roles={['coach']} path={path} />;
  const e = await db.engagement.findFirst({
    where: { coacheeId: params.id, coachId: persona.userId },
    include: { coachee: true, client: true, sessions: { orderBy: { number: 'asc' }, include: { plan: true } } },
  });
  if (!e) return <NotFoundCard what="coachee" />;
  const next = e.sessions.find(isUpcoming);
  const plan = next?.plan;
  const who = firstName(e.coachee.name);
  const past = e.sessions.filter((s) => !isUpcoming(s));
  const ids = plan ? asJson<string[]>(plan.openCommitmentIds) : [];
  const open = (await db.commitment.findMany({ where: { id: { in: ids } } })).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  const nextNumber = next?.number ?? past.length + 1;
  const from = past.length === 0 ? 'your notes' : past.length === 1 ? 'session 1' : `sessions 1 to ${past.length}`;
  const lede = !next ? `No session ${nextNumber} is booked yet. Schedule it, then draft a plan.`
    : plan ? [
        `${plan.aiProvider === 'sample' ? 'Sample draft' : 'Drafted'} from ${from}, ${who}'s results and your notes${plan.draftedAt ? ` on ${dayTime(plan.draftedAt)}` : ''}.`,
        plan.editedAt ? `You edited it on ${dayTime(plan.editedAt)}.` : 'Edit anything before the session.',
      ].join(' ')
    : `Session ${nextNumber} is on ${dayTime(next.scheduledAt)}. No plan has been drafted yet.`;
  const slotsFrom = next?.scheduledAt ?? new Date(now().getTime() + 3 * 86_400_000);

  return (
    <div className="page">
      <BackLink href={`/coach/coachees/${e.coacheeId}`}>Back to {e.coachee.name}</BackLink>
      <PageHead title={`Plan for session ${nextNumber} with ${who}`} lede={lede}>
        {next && plan ? <DraftPlanButton sessionId={next.id} redraft edited={Boolean(plan.editedAt)} className="ecb-btn-secondary" /> : null}
      </PageHead>
      <div className="split">
        <div className="col--wide stack stack--200">
          {next && !plan ? (
            <section aria-labelledby="np-head" className="card card--pad card--stack">
              <h2 id="np-head" className="heading-xsmall heading-reset">No plan yet</h2>
              <p className="text-body">The AI drafts a focus and three to five questions from {from}, {who}'s results and your notes. It's usually drafted the day before; you can draft it now.</p>
              <div><DraftPlanButton sessionId={next.id} /></div>
            </section>
          ) : null}
          {next && plan ? (
            <PlanEditor
              key={plan.draftedAt?.toISOString() ?? plan.id}
              sessionId={next.id}
              focus={plan.suggestedFocus}
              evidence={asJson<Array<{ label: string; quote: string }> | null>(plan.focusEvidence) ?? []}
              questions={asJson<string[]>(plan.questions)}
              sample={plan.aiProvider === 'sample'}
              between={
                <section aria-labelledby="o-head" className="card card--pad card--stack">
                  <h2 id="o-head" className="heading-xsmall heading-reset">Open actions</h2>
                  <div className="stack ruled">
                    {open.length === 0 ? <p className="text-body">No open actions.</p> : null}
                    {open.map((c) => {
                      const b = commitmentBadge(c);
                      return <div key={c.id} className="row text-body"><span className="grow">{c.title}</span><StatusBadge tone={b.tone} label={b.label} title={b.title} /></div>;
                    })}
                  </div>
                </section>
              }
            />
          ) : null}
          {next ? (
            <section aria-labelledby="h-head" className="card card--pad card--stack">
              <h2 id="h-head" className="heading-xsmall heading-reset">What {who} wants to bring</h2>
              <p className="text-body">{plan?.coacheeTopic ?? `${who} will answer the day before. The reply appears here.`}</p>
            </section>
          ) : null}
        </div>

        <aside className="col--narrow">
          <ScheduleForm
            coacheeId={e.coacheeId}
            who={who}
            nextNumber={nextNumber}
            slots={proposedSlots(slotsFrom)}
            noCapture={e.client.capturePolicy === 'companion_mode' ? 'Companion mode, no capture' : e.client.capturePolicy === 'allowlist' && !e.captureAllowed ? 'Not on the capture allowlist' : null}
          />
        </aside>
      </div>
    </div>
  );
}
