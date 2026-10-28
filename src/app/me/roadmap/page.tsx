import { CoacheeShell } from '@/components/coachee';
import { allow, WrongRole } from '@/components/ui';
import { db } from '@/lib/db';
import type { OrgOutcome } from '@/lib/domain';
import { asJson } from '@/lib/format';

// The Leadership Roadmap lives in Sounding Board. In production this nav item opens it there;
// in the prototype it shows the goal profile read-only. STUB: Sounding Board integration.
export default async function RoadmapPage() {
  const persona = allow(['coachee']);
  if (!persona) return <WrongRole roles={['coachee']} path="/me/roadmap" />;
  const goals = await db.goal.findMany({ where: { engagement: { coacheeId: persona.userId } } });
  return (
    <CoacheeShell userId={persona.userId} current="/me/roadmap">
      <div className="stack stack--100">
        <span className="overline">Opens in Sounding Board</span>
        <h1 className="participant-title">Your Leadership Roadmap</h1>
        <p className="participant-lede">Your goals, as your coach and the companion see them. Personal impact and outcomes are yours to choose.</p>
      </div>
      {goals.map((g) => (
        <section key={g.id} className="p-card" aria-labelledby={`goal-${g.id}`}>
          <h2 id={`goal-${g.id}`} className="heading-small heading-reset">Goal: {g.title}</h2>
          <p className="fine-print">Capabilities: {asJson<string[]>(g.capabilities).join(', ')}</p>
          <div className="grid grid--2 grid--loose participant-body">
            <div><span className="overline">Ways of thinking</span><br />Current: "{g.thinkingCurrent}"<br />Future: "{g.thinkingFuture}"</div>
            <div><span className="overline">Ways of behaving</span><br />Current: {g.behavingCurrent}<br />Future: {g.behavingFuture}</div>
            <div><span className="overline">Personal impact</span><br />{asJson<string[]>(g.personalImpact).join(', ')}</div>
            <div><span className="overline">Organizational outcomes</span><br />{asJson<OrgOutcome[]>(g.orgOutcomes).map((o) => `${o.outcome}, ${o.extent}`).join('; ')}</div>
          </div>
        </section>
      ))}
    </CoacheeShell>
  );
}
