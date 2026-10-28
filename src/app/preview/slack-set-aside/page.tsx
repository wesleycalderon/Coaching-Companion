import { BotMessage, DmFrame } from '@/components/chat';
import { StatusBadge } from '@/ds/components';
import { db } from '@/lib/db';
import { day, firstName } from '@/lib/format';
import { commitmentBadge } from '@/lib/queries';

// Artboard 12: setting a commitment aside, giving a reason, then rescheduling or swapping.
// A sample run of the flow for one seeded commitment; the flow itself is built in milestone 3.
export default async function SetAsidePreview() {
  const c = await db.commitment.findUniqueOrThrow({
    where: { id: 'c-priya-5' },
    include: { checkIns: { orderBy: { sentAt: 'desc' }, take: 1 }, session: { include: { engagement: { include: { coach: true } } } } },
  });
  const coachFirst = firstName(c.session.engagement.coach.name);
  const newDue = c.dueBy ? new Date(c.dueBy.getTime() + 7 * 86_400_000) : null;
  const b = commitmentBadge(c);
  return (
    <DmFrame app="Slack" note="Preview: a sample run of the set-aside flow for one seeded action. The suggestions are AI drafts; nothing changes until the coachee chooses.">
      <BotMessage meta="Wed 17:00">
        <div className="dm-card">
          <span className="dm-card__question">{c.checkIns[0]?.prompt ?? `How is it going: ${c.title.toLowerCase()}?`}</span>
          <div className="btn-row">
            <button className="ecb-btn-secondary" type="button">Booked it</button>
            <button className="ecb-btn-secondary" type="button">Not yet</button>
            <button className="ecb-btn-secondary ecb-btn-secondary-active" type="button" aria-pressed="true">Set aside for now</button>
            <button className="ecb-btn-secondary" type="button">Swap for another</button>
          </div>
        </div>
      </BotMessage>
      <BotMessage meta="Wed 17:01">
        <div className="dm-card">
          <span className="dm-card__question">That's okay. What's getting in the way?</span>
          <fieldset className="fieldset fieldset--tight">
            <legend className="visually-hidden">Reason for setting aside</legend>
            <label className="check"><input type="radio" name="why" defaultChecked /> A busy week or a deadline</label>
            <label className="check"><input type="radio" name="why" /> It's less relevant to my work than I thought</label>
            <label className="check"><input type="radio" name="why" /> Something else</label>
          </fieldset>
          <div className="field">
            <label className="ecb-form-label" htmlFor="note">Anything to add for {coachFirst}?</label>
            <textarea id="note" className="ecb-form-input" rows={2} defaultValue="Release week. Sam is also out until Monday." />
          </div>
        </div>
      </BotMessage>
      <BotMessage meta="Wed 17:02">
        <div className="dm-card">
          <span className="dm-card__question">What would you like to do with it?</span>
          <div className="btn-stack">
            <button className="ecb-btn-secondary ecb-btn-secondary-active" type="button" aria-pressed="true">Move it to next week: book with Sam by {newDue ? day(newDue) : 'next week'}</button>
            <button className="ecb-btn-secondary" type="button">Swap for a smaller step: ask Sam for 15 minutes on Monday</button>
            <button className="ecb-btn-secondary" type="button">Keep it set aside and talk to {coachFirst}</button>
          </div>
          <p className="fine-print">Suggestions are drafts. Nothing changes until you choose.</p>
          <button className="ecb-btn-primary self-start" type="button">Update my action</button>
        </div>
      </BotMessage>
      <BotMessage meta="Wed 17:03">
        <div className="row row--tight text-body"><span className="grow">Updated. New due date {newDue ? day(newDue) : 'next week'}. {coachFirst} will see your note.</span><StatusBadge tone={b.tone} label={b.label} /></div>
      </BotMessage>
    </DmFrame>
  );
}
