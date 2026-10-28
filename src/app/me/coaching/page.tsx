import Link from 'next/link';
import { ActionForm } from '@/components/admin-forms';
import { CoacheeShell } from '@/components/coachee';
import { allow, WrongRole } from '@/components/ui';
import { RoleBadge, StatusBadge } from '@/ds/components';
import { coachById, COACHES, recommendCoach } from '@/lib/coaching/coaches';
import { buildBrief, coachingProvider } from '@/lib/coaching/conversations';
import { startCoachingAction } from '@/lib/coaching-actions';
import { db } from '@/lib/db';
import { day, firstName } from '@/lib/format';
import { commitmentBadge } from '@/lib/queries';

// Coaching guidance with BiTSy's coaches. Not on the canvas: built from the participant patterns
// and flagged for design review.
const PROPOSAL: Record<string, { label: string; tone: 'info' | 'success' | 'neutral' }> = {
  proposed: { label: 'Action waiting for your coach', tone: 'info' },
  approved: { label: 'Action approved', tone: 'success' },
  declined: { label: 'Action not approved', tone: 'neutral' },
};

export default async function CoachingPage({ searchParams }: { searchParams: { action?: string } }) {
  const persona = allow(['coachee']);
  if (!persona) return <WrongRole roles={['coachee']} path="/me/coaching" />;
  const userId = persona.userId;
  const engagement = await db.engagement.findFirst({ where: { coacheeId: userId }, include: { coach: true } });
  const coach = engagement ? firstName(engagement.coach.name) : 'your coach';
  const [actions, conversations] = await Promise.all([
    db.commitment.findMany({ where: { approved: true, status: { not: 'habit' }, session: { engagement: { coacheeId: userId } } }, orderBy: { createdAt: 'desc' } }),
    db.coachingConversation.findMany({ where: { coacheeId: userId }, include: { commitment: true }, orderBy: { startedAt: 'desc' } }),
  ]);
  const general = searchParams.action === 'general';
  const chosen = general ? null : actions.find((a) => a.id === searchParams.action) ?? null;
  const choosing = general || Boolean(chosen);
  const suggested = recommendCoach(chosen);
  const brief = choosing ? await buildBrief(userId, chosen?.id ?? null) : '';
  const provider = coachingProvider();

  return (
    <CoacheeShell userId={userId} current="/me/coaching">
      <div className="stack stack--100">
        <h1 className="participant-title">Coaching guidance</h1>
        <p className="participant-lede">Talk an action through with one of BiTSy&apos;s AI coaches: practise it, plan it, or work out what&apos;s getting in the way. Only you see these conversations unless you share one with {coach}.</p>
      </div>
      {provider === 'sample' ? (
        <div className="p-card row row--top text-body"><StatusBadge tone="neutral" label="Sample mode" /><span className="grow">BiTSy isn&apos;t connected, so coaches reply with pre-written sample answers. Nothing is sent anywhere.</span></div>
      ) : null}

      {!choosing ? (
        <section aria-labelledby="pick-head" className="p-card stack">
          <h2 id="pick-head" className="heading-small heading-reset">What would you like coaching on?</h2>
          {actions.length === 0 ? <p className="text-body">You have no actions yet. New ones appear after {coach} approves a recap.</p> : (
            <ul className="list ruled">
              {actions.map((a) => {
                const b = commitmentBadge(a);
                return (
                  <li key={a.id} className="row row--wrap">
                    <span className="participant-body basis-320">{a.ifThenText}</span>
                    <StatusBadge tone={b.tone} label={b.label} />
                    <Link className="ecb-btn-secondary" href={`/me/coaching?action=${a.id}`} aria-label={`Get coaching on: ${a.title}`}>Get coaching</Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Link className="text-body" href="/me/coaching?action=general">Or talk something else through</Link>
        </section>
      ) : (
        <section aria-labelledby="start-head" className="p-card stack">
          <div className="row row--tight"><h2 id="start-head" className="heading-small heading-reset grow">{chosen ? 'Get coaching on this action' : 'Talk something through'}</h2><RoleBadge label="AI" /></div>
          {chosen ? <p className="participant-body">{chosen.ifThenText}</p> : null}
          <ActionForm action={startCoachingAction} submitLabel="Start the conversation" pendingLabel="Starting… the coach can take a minute to reply" className="stack" secondary={<Link className="ecb-btn-ghost" href="/me/coaching">Cancel</Link>}>
            <input type="hidden" name="action" value={chosen?.id ?? ''} />
            <div className="field">
              <label className="ecb-form-label" htmlFor="co-coach">Coach</label>
              <select id="co-coach" name="coach" className="ecb-form-select" defaultValue={suggested}>
                {[coachById(suggested), ...COACHES.filter((c) => c.id !== suggested)].map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.id === suggested ? ' (suggested)' : ''}: {c.helps}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="ecb-form-label" htmlFor="co-open">What would you like help with?</label>
              <textarea id="co-open" name="opening" className="ecb-form-input" rows={3} maxLength={2000} placeholder={chosen ? 'For example: what got in the way last time, or what you’d like to practise.' : 'Describe the situation in a sentence or two.'} />
            </div>
            <details className="subtle-panel" open>
              <summary className="text-small strong">What the coach will be told</summary>
              <p className="fine-print">Sent with your first message{provider === 'sample' ? ' (in sample mode, nothing is sent)' : ' to BiTSy, BTS’s coaching service'}. Nothing else from your coaching is shared.</p>
              <pre className="text-small pre-wrap">{brief}</pre>
            </details>
          </ActionForm>
        </section>
      )}

      <section aria-labelledby="past-head" className="p-card stack">
        <h2 id="past-head" className="heading-small heading-reset">Your conversations</h2>
        {conversations.length === 0 ? <p className="text-body">No conversations yet.</p> : (
          <ul className="list ruled">
            {conversations.map((c) => (
              <li key={c.id} className="stack stack--tight">
                <div className="row row--wrap row--tight">
                  <Link className="strong grow" href={`/me/coaching/${c.id}`}>{coachById(c.agentName).name} · {day(c.startedAt)}</Link>
                  <StatusBadge tone={c.status === 'active' ? 'live' : 'neutral'} label={c.status === 'active' ? 'In progress' : 'Ended'} />
                  {PROPOSAL[c.proposalStatus] ? <StatusBadge tone={PROPOSAL[c.proposalStatus].tone} label={PROPOSAL[c.proposalStatus].label} /> : null}
                  {c.sharedWithCoach ? <StatusBadge tone="neutral" label={`Shared with ${coach}`} /> : null}
                </div>
                <span className="text-small">{c.commitment ? `About: ${c.commitment.ifThenText}` : 'Not about a specific action'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </CoacheeShell>
  );
}
