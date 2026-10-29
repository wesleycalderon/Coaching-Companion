import Link from 'next/link';
import { ConfirmButton, LinkTabs } from '@/components/client';
import { allow, COACH_NAV, NavPage, PageHead, WrongRole } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
import { db } from '@/lib/db';
import { Count, dayTime, firstName, now } from '@/lib/format';
import { captureBadge, isUpcoming, summaryState } from '@/lib/queries';
import { personState, refreshUpcomingSessions, SESSION_REASON } from '@/lib/companion-setup';
import { toggleOneAction } from '@/lib/setup-actions';

type View = 'upcoming' | 'review' | 'done';

export default async function CoachSessionsPage({ searchParams }: { searchParams: { view?: string } }) {
  const persona = allow(['coach']);
  if (!persona) return <WrongRole roles={['coach']} path="/coach/sessions" />;
  await refreshUpcomingSessions(persona.userId);
  const setup = await personState(persona.userId);

  const sessions = await db.session.findMany({
    where: { engagement: { coachId: persona.userId, coachee: { status: { not: 'removed' } } } },
    include: { summary: true, engagement: { include: { coachee: true, client: true } }, plan: true, consents: true },
    orderBy: { scheduledAt: 'desc' },
  });
  const upcoming = sessions.filter(isUpcoming).reverse();
  const past = sessions.filter((s) => !isUpcoming(s));
  const needsReview = past.filter((s) => s.summary?.status === 'draft' || (!s.summary && s.captureStatus === 'consented'));
  const completed = past.filter((s) => s.summary && s.summary.status !== 'draft');
  // "Needs review" also lists the last three weeks, so recent sessions stay in view.
  const recentCutoff = now().getTime() - 21 * 86_400_000;
  const view: View = (['upcoming', 'review', 'done'] as const).includes(searchParams.view as View) ? (searchParams.view as View) : 'review';
  const rows = view === 'upcoming' ? upcoming
    : view === 'done' ? completed
    : [...needsReview, ...past.filter((s) => !needsReview.includes(s) && s.scheduledAt.getTime() >= recentCutoff)];
  const comingUp = upcoming.filter((s) => s.plan);

  const drafts = needsReview.filter((s) => s.summary?.status === 'draft').length;
  const uploads = needsReview.length - drafts;
  const lede = [
    drafts ? `${Count(drafts)} ${drafts === 1 ? 'summary is' : 'summaries are'} waiting for your review.` : null,
    uploads ? `${Count(uploads)} ${uploads === 1 ? 'transcript hasn’t' : 'transcripts haven’t'} arrived yet.` : null,
  ].filter(Boolean).join(' ') || 'Nothing is waiting for your review.';
  const ledeFull = `${lede} Coachees see nothing until you approve it.`;

  const rendered = await Promise.all(rows.map(async (s) => ({ s, capture: await captureBadge(s), state: summaryState(s, s.summary) })));

  return (
    <NavPage nav={COACH_NAV} navLabel="Coach workspace" current="/coach/sessions">
      <PageHead title="Your sessions" lede={ledeFull}>
        <button className="ecb-btn-primary" type="button">Schedule a session</button>
      </PageHead>
      {!setup.optedIn ? (
        <div role="status" className="card card--pad row row--wrap text-body">
          <StatusBadge tone="warning" label="Not set up" />
          <span className="grow">Finish setting up the companion. Until you agree to use it, it doesn&apos;t join your sessions.</span>
          <Link className="ecb-btn-primary" href="/coach/welcome">Finish setup</Link>
        </div>
      ) : null}
      <LinkTabs
        ariaLabel="Session views"
        value={view}
        tabs={[
          { value: 'upcoming', label: 'Upcoming', count: upcoming.length },
          { value: 'review', label: 'Needs review', count: needsReview.length },
          { value: 'done', label: 'Completed', count: completed.length },
        ]}
        hrefs={{ upcoming: '/coach/sessions?view=upcoming', review: '/coach/sessions', done: '/coach/sessions?view=done' }}
      />
      <div className="card card--scroll">
        <table className="table table--w-760">
          <thead><tr><th>Coachee</th><th>Session</th><th>Capture</th><th>Summary</th><th className="actions"><span className="visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            {rendered.length === 0 ? <tr><td colSpan={5}>No sessions in this view.</td></tr> : null}
            {rendered.map(({ s, capture, state }) => (
              <tr key={s.id}>
                <td><div className="cell-title">{s.engagement.coachee.name}</div><div className="cell-sub">{s.engagement.client.name}</div></td>
                <td>{dayTime(s.scheduledAt)} · Session {s.number}</td>
                <td><StatusBadge tone={capture.tone} label={capture.label} title={capture.title} /></td>
                <td><StatusBadge tone={state.badge.tone} label={state.badge.label} /></td>
                <td className="actions"><Link className={state.action.primary ? 'ecb-btn-secondary' : 'ecb-btn-ghost'} href={state.action.href}>{state.action.label}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {comingUp.length > 0 ? (
        <div className="stack section-rule">
          <h2 className="heading-small heading-reset">Coming up</h2>
          {comingUp.map((s) => {
            const who = firstName(s.engagement.coachee.name);
            const consented = s.captureStatus === 'consented';
            const off = s.captureStatus === 'no_capture' || s.captureStatus === 'removed';
            return (
              <div key={s.id} className="card card--pad row row--wrap">
                <div className="grow">
                  <div className="strong">{s.engagement.coachee.name} · {dayTime(s.scheduledAt)}</div>
                  <div className="cell-sub">{consented ? `You and ${who} both have the companion on. ` : off && s.captureReason && SESSION_REASON[s.captureReason] ? `${SESSION_REASON[s.captureReason]('You', who).replace("You hasn't", "You haven't")}. ` : ''}Your plan for this session is ready.</div>
                </div>
                <StatusBadge tone={consented ? 'info' : 'neutral'} label={consented ? 'Companion on' : off ? 'Companion off' : 'Waiting for consent'} />
                <Link className="ecb-btn-secondary" href={`/coach/coachees/${s.engagement.coacheeId}/plan`}>Open plan</Link>
                {consented ? (
                  <ConfirmButton label="Turn off for this session" action={toggleOneAction.bind(null, JSON.stringify({ sessionId: s.id, engagementId: s.engagementId }), `session ${s.number} with ${s.engagement.coachee.name}`, 'off')} copy={{
                    title: 'Turn the companion off for this session?',
                    body: <><p>The companion won't join session {s.number}, so nothing is captured.</p><p>{who} sees that it's off. No recap is made from a transcript; you can still add notes.</p></>,
                    undo: 'You can turn it back on in Companion settings before the session starts.',
                    cancelLabel: 'Keep it on',
                    confirmLabel: 'Turn it off',
                  }} />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </NavPage>
  );
}
