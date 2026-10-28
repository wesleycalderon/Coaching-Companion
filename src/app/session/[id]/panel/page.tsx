import { NotFoundCard } from '@/components/ui';
import { RoleBadge, StatusBadge } from '@/ds/components';
import { db } from '@/lib/db';
import { firstName } from '@/lib/format';
import { commitmentBadge } from '@/lib/queries';

// Artboard 20: mock of the in-meeting side panel (coachee's view), the same panel paused,
// and the notice a late joiner sees. Gap: no meeting side panel in the system yet.
export default async function MeetingPanelPage({ params }: { params: { id: string } }) {
  const s = await db.session.findUnique({
    where: { id: params.id },
    include: { engagement: { include: { coach: true, coachee: true, client: true, sessions: { include: { commitments: { where: { approved: true } } } } } } },
  });
  if (!s) return <NotFoundCard what="session" />;
  const { coach, coachee, client } = s.engagement;
  const coachFirst = firstName(coach.name);
  const open = s.engagement.sessions.flatMap((x) => x.commitments).filter((c) => c.status === 'not_started' || c.status === 'tried');
  const retention = client.retentionDays === 0 ? 'Deleted right after analysis.' : `Deleted after ${client.retentionDays} days.`;
  return (
    <div className="meeting-stage">
      <div className="meeting-panel">
        <span className="overline">Side panel in the meeting app · {firstName(coachee.name)}'s view</span>
        <div className="card">
          <div className="card__head"><span className="strong grow">Coaching companion</span><RoleBadge label="AI" /></div>
          <div className="card--pad card--stack">
            <div className="row row--tight"><span className="grow text-body">Session with {coach.name}</span><StatusBadge tone="live" label="Capturing" dot /></div>
            <p className="fine-print">Transcript only, no audio or video kept. {coachFirst} reviews the recap before you see it. {retention}</p>
            <div className="btn-stack">
              <button className="ecb-btn-secondary" type="button">Pause for 10 minutes</button>
              <button className="ecb-btn-secondary" type="button">Pause until I resume</button>
              <button className="ecb-btn-ghost" type="button">Remove companion from this session</button>
            </div>
            <div className="dm-card__split stack--tight">
              <span className="overline">Your open actions</span>
              {open.map((c) => <span key={c.id} className="text-small">{c.shortTitle} · {commitmentBadge(c).label}</span>)}
            </div>
          </div>
        </div>

        <span className="overline">Same panel, paused</span>
        <div className="card card--pad card--stack">
          <div className="row row--tight"><span className="grow text-body strong">Capture paused</span><StatusBadge tone="neutral" label="Paused" /></div>
          <p className="fine-print">Nothing is captured until you or {coachFirst} resume. Resumes automatically in 8 minutes.</p>
          <button className="ecb-btn-primary" type="button">Resume capture</button>
        </div>

        <span className="overline">Notice a late joiner sees</span>
        <div className="card card--pad card--stack notice-raised">
          <span className="dm-card__title">This session uses an AI coaching companion</span>
          <p className="text-body">It creates a transcript for {firstName(coachee.name)} and their coach. Capture is paused until you choose.</p>
          <div className="btn-stack">
            <button className="ecb-btn-primary" type="button">Allow capture while I'm here</button>
            <button className="ecb-btn-secondary" type="button">Keep capture paused</button>
          </div>
          <p className="fine-print">Your words are never used to train AI models.</p>
        </div>
      </div>
    </div>
  );
}
