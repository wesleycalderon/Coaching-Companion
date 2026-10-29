import Link from 'next/link';
import { RoleBadge, StatusBadge } from '@/ds/components';
import { ATTEMPT_BADGE } from '@/lib/companion/view';
import { db } from '@/lib/db';
import { asJson, day, dayTime } from '@/lib/format';
import { refreshLinks, type WorkMeetingCheck } from '@/lib/work-meetings';

export const COACH_ATTEMPT: Record<WorkMeetingCheck['attempted'], string> = { yes: 'Shows your growth area', partly: 'Partly shows it', no: 'Not this time', unclear: 'Not clear' };

/** My practice: feedback from the coach's own meetings (not coaching sessions). For design review. */
export async function CoachMeetingsSection({ coachId, growthArea }: { coachId: string; growthArea: string | null }) {
  await refreshLinks(coachId);
  const links = await db.meetingLink.findMany({ where: { coacheeId: coachId, ownerRole: 'coach' }, include: { occurrences: { orderBy: { scheduledAt: 'desc' } } }, orderBy: { title: 'asc' } });
  const captured = links.flatMap((l) => l.occurrences.filter((o) => o.captureStatus === 'captured').map((o) => ({ l, o, check: asJson<WorkMeetingCheck>(o.check) })))
    .sort((a, b) => b.o.scheduledAt.getTime() - a.o.scheduledAt.getTime());
  const active = links.filter((l) => !l.stoppedAt);

  return (
    <section id="meetings" aria-labelledby="cm-head" className="card card--pad card--stack">
      <div className="row row--tight"><h2 id="cm-head" className="heading-xsmall heading-reset grow">From your other meetings</h2><RoleBadge label="AI" /></div>
      <p className="text-body">When the companion joins your own meetings, it checks only your words against your growth area{growthArea ? `: ${growthArea}` : ''}. <Link href="/coach/settings">Choose which meetings it joins</Link></p>
      {captured.length === 0 ? <p className="text-body">No feedback from your meetings yet.</p> : (
        <div className="stack ruled">
          {captured.slice(0, 5).map(({ l, o, check }) => (
            <div key={o.id} className="stack stack--tight">
              <div className="row row--wrap row--tight">
                <Link className="strong grow" href={`/coach/meetings/${l.id}`}>{l.title} · {day(o.scheduledAt)}</Link>
                <StatusBadge tone={ATTEMPT_BADGE[check.attempted].tone} label={COACH_ATTEMPT[check.attempted]} />
              </div>
              <p className="text-small">{check.summary}</p>
              {check.evidence.slice(0, 1).map((e) => <p key={e.time} className="fine-print">You said, {e.time}: &ldquo;{e.quote}&rdquo;</p>)}
              {o.aiProvider === 'sample' ? <span className="fine-print">Sample output</span> : null}
            </div>
          ))}
        </div>
      )}
      {active.length ? (
        <p className="fine-print">On now: {active.map((l, i) => <span key={l.id}>{i ? ', ' : ''}<Link href={`/coach/meetings/${l.id}`}>{l.title}</Link></span>)}. Next: {(() => { const next = active.flatMap((l) => l.occurrences).filter((o) => o.captureStatus === 'scheduled').sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0]; return next ? dayTime(next.scheduledAt) : 'none in the next two weeks'; })()}.</p>
      ) : null}
    </section>
  );
}
