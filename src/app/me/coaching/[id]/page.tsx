import { ActionButton, ActionForm } from '@/components/admin-forms';
import { ConfirmButton } from '@/components/client';
import { CoachText } from '@/components/coach-text';
import { CoacheeShell } from '@/components/coachee';
import { allow, BackLink, NotFoundCard, WrongRole } from '@/components/ui';
import { RoleBadge, StatusBadge } from '@/ds/components';
import { coachById } from '@/lib/coaching/coaches';
import { endCoachingAction, proposeActionAction, sendCoachingMessageAction, shareCoachingAction } from '@/lib/coaching-actions';
import { db } from '@/lib/db';
import { asJson, dayTime, firstName } from '@/lib/format';

// Coaching guidance: one conversation with a BiTSy AI coach. Not on the canvas: flagged for design review.
export default async function CoachingConversationPage({ params, searchParams }: { params: { id: string }; searchParams: { done?: string } }) {
  const path = `/me/coaching/${params.id}`;
  const persona = allow(['coachee']);
  if (!persona) return <WrongRole roles={['coachee']} path={path} />;
  const conv = await db.coachingConversation.findFirst({
    where: { id: params.id, coacheeId: persona.userId },
    include: { commitment: true, turns: { orderBy: { createdAt: 'asc' } } },
  });
  if (!conv) return <NotFoundCard what="conversation" />;
  const engagement = await db.engagement.findFirst({ where: { coacheeId: persona.userId }, include: { coach: true } });
  const coachName = engagement ? firstName(engagement.coach.name) : 'your coach';
  const coach = coachById(conv.agentName);
  const brief = conv.turns.find((t) => t.role === 'brief');
  const turns = conv.turns.filter((t) => t.role !== 'brief');
  const active = conv.status === 'active';
  const sample = conv.provider === 'sample';
  const summary = conv.insights ? asJson<{ keyTopics: string[]; insights: string[] }>(conv.insights) : null;

  return (
    <CoacheeShell userId={persona.userId} current="/me/coaching">
      <BackLink href="/me/coaching">Back to coaching guidance</BackLink>
      <div className="stack stack--100">
        <span className="overline">BiTSy AI coach · {coach.name}</span>
        <h1 className="participant-title">{conv.commitment ? 'Coaching on your action' : 'Talking it through'}</h1>
        {conv.commitment ? <p className="participant-lede">{conv.commitment.ifThenText}</p> : null}
      </div>
      {searchParams.done === 'ended' ? <div role="status" className="p-card row row--top text-body"><StatusBadge tone="success" label="Ended" /><span className="grow">Conversation ended. You can still read it here.</span></div> : null}

      <section aria-labelledby="th-head" className="p-card stack">
        <div className="row row--wrap row--tight">
          <h2 id="th-head" className="heading-small heading-reset grow">Conversation</h2>
          <RoleBadge label="AI" />
          {sample ? <span className="fine-print">Sample output</span> : null}
          <StatusBadge tone={active ? 'live' : 'neutral'} label={active ? 'In progress' : 'Ended'} />
        </div>
        {brief ? (
          <details className="subtle-panel">
            <summary className="text-small">What the AI coach was told</summary>
            <pre className="text-small pre-wrap">{brief.text}</pre>
          </details>
        ) : null}
        <div className="coach-thread" aria-live="polite">
          {turns.map((t) => t.role === 'coach' ? (
            <div key={t.id} className="coach-turn">
              <span className="coach-turn__meta"><strong>BiTSy coach</strong> · AI · {dayTime(t.createdAt)}</span>
              <CoachText text={t.text} />
            </div>
          ) : (
            <div key={t.id} className="coach-turn coach-turn--me">
              <span className="coach-turn__meta"><strong>You</strong> · {dayTime(t.createdAt)}</span>
              <p className="coach-text__p pre-wrap">{t.text}</p>
            </div>
          ))}
        </div>
        {active ? (
          <>
            <ActionForm action={sendCoachingMessageAction.bind(null, conv.id)} submitLabel="Send" pendingLabel="The AI coach is replying… this can take a minute" clearOnSuccess className="stack">
              <div className="field">
                <label className="ecb-form-label" htmlFor="co-msg">Your reply</label>
                <textarea id="co-msg" name="message" className="ecb-form-input" rows={3} maxLength={2000} required />
              </div>
            </ActionForm>
            <div className="btn-row">
              <ConfirmButton label="End the conversation" className="ecb-btn-ghost" action={endCoachingAction.bind(null, conv.id)} copy={{
                title: 'End this conversation?',
                body: <p>You can read it afterwards and propose a new action to {coachName}.{sample ? '' : ' BiTSy keeps a summary in its coaching memory for the test account.'}</p>,
                undo: 'To keep going later, start a new conversation.',
                confirmLabel: 'End conversation',
                confirmTone: 'primary',
              }} />
            </div>
          </>
        ) : null}
        <p className="fine-print">BiTSy&apos;s coaches are AI. They don&apos;t replace {coachName}, and they can be wrong. If something feels urgent or unsafe, talk to someone you trust or your organization&apos;s support line.</p>
      </section>

      {!active && summary && (summary.keyTopics.length || summary.insights.length) ? (
        <section aria-labelledby="su-head" className="p-card stack">
          <div className="row row--tight"><h2 id="su-head" className="heading-small heading-reset grow">What you covered</h2><RoleBadge label="AI" />{sample ? <span className="fine-print">Sample output</span> : null}</div>
          {summary.keyTopics.length ? <ul className="list list--tight text-body">{summary.keyTopics.map((k) => <li key={k}>{k}</li>)}</ul> : null}
          {summary.insights.length ? <ul className="list list--tight text-body">{summary.insights.map((k) => <li key={k}>{k}</li>)}</ul> : null}
        </section>
      ) : null}

      <section aria-labelledby="pr-head" className="p-card stack">
        <h2 id="pr-head" className="heading-small heading-reset">Propose a new action to {coachName}</h2>
        {conv.proposalStatus === 'approved' ? (
          <div className="row row--top text-body"><StatusBadge tone="success" label="Approved" /><span className="grow">{coachName} approved &ldquo;{conv.proposedAction}&rdquo;. It&apos;s now one of your actions.</span></div>
        ) : (
          <>
            {conv.proposalStatus === 'proposed' ? <div className="row row--top text-body"><StatusBadge tone="info" label={`Waiting for ${coachName}`} /><span className="grow">&ldquo;{conv.proposedAction}&rdquo;</span></div> : null}
            {conv.proposalStatus === 'declined' ? <div className="row row--top text-body"><StatusBadge tone="neutral" label="Not approved" /><span className="grow">{coachName} would rather talk about &ldquo;{conv.proposedAction}&rdquo; in your next session.</span></div> : null}
            <p className="fine-print">Write it in your own words. {coachName} approves it before it becomes one of your actions and check-ins start.</p>
            <ActionForm action={proposeActionAction.bind(null, conv.id)} submitLabel={conv.proposalStatus === 'none' ? `Send to ${coachName}` : 'Send the new version'} pendingLabel="Sending…" className="stack">
              <div className="field">
                <label className="ecb-form-label" htmlFor="co-prop">Your action</label>
                <textarea id="co-prop" name="proposal" className="ecb-form-input" rows={2} maxLength={300} defaultValue={conv.proposalStatus === 'proposed' ? conv.proposedAction ?? '' : ''} placeholder="When [moment], I'll [what you'll do]." required />
              </div>
            </ActionForm>
          </>
        )}
      </section>

      <div className="p-card stack">
        <ActionButton action={shareCoachingAction.bind(null, conv.id, !conv.sharedWithCoach)} label={conv.sharedWithCoach ? `Stop sharing with ${coachName}` : `Share this conversation with ${coachName}`} pendingLabel="Saving…" className="ecb-btn-secondary" />
        <p className="fine-print">{conv.sharedWithCoach ? `${coachName} can read this conversation.` : `Only you can read this conversation. ${coachName} sees an action you propose, but not the conversation unless you share it.`}</p>
      </div>
    </CoacheeShell>
  );
}
