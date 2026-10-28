import Link from 'next/link';
import { BotMessage, DmFrame, retentionSentence } from '@/components/chat';
import { db } from '@/lib/db';
import type { CoacheePreferences } from '@/lib/domain';
import { asJson, day, firstName, time } from '@/lib/format';

// Artboard 10: the coachee's welcome flow in Slack.
export default async function SlackWelcomePreview() {
  const e = await db.engagement.findFirstOrThrow({
    where: { coacheeId: 'priya' },
    include: { coachee: true, coach: true, client: true, sessions: { orderBy: { number: 'asc' }, take: 1 } },
  });
  const { coachee, coach, client } = e;
  const prefs = asJson<CoacheePreferences>(coachee.preferences);
  const coachFirst = firstName(coach.name);
  const first = e.sessions[0];
  const clientShort = client.name.split(' ')[0];
  return (
    <DmFrame app="Slack" note={`Preview of the welcome flow ${coachee.name} gets in Slack. Live with the Slack app in milestone 3.`}>
      <BotMessage meta="Welcome">
        <div className="dm-card">
          <span className="dm-card__title">Hi {firstName(coachee.name)}, I'm your coaching companion</span>
          <p className="text-body">I'm an AI assistant working alongside your coach, {coach.name}. Between sessions, I'll help you keep the commitments you make together.</p>
          <div className="stack stack--100 text-body">
            <span><span className="strong">After each session</span>, {coachFirst} reviews a recap before you see it.</span>
            <span><span className="strong">During the week</span>, I'll check in on your commitments at times you choose.</span>
            <span><span className="strong">Before your next session</span>, I'll ask what you want to bring.</span>
          </div>
        </div>
      </BotMessage>
      <BotMessage meta="Your privacy">
        <div className="dm-card">
          <span className="dm-card__question">Who sees what</span>
          <div className="stack stack--100 ruled">
            <div className="who-row"><span>You</span><span>Everything about your coaching, including transcripts</span></div>
            <div className="who-row"><span>{coachFirst}</span><span>Your sessions, recaps, commitments and check-ins</span></div>
            <div className="who-row"><span>{clientShort}</span><span>Only totals across {client.minGroupSize} or more coachees, never your content</span></div>
          </div>
          <p className="fine-print">You'll be asked before each session is captured. {retentionSentence(client)} You can delete anything at any time.</p>
          <Link className="text-small" href="/me/data">Review your data and privacy settings ↗</Link>
        </div>
      </BotMessage>
      <BotMessage meta="Check-in times">
        <div className="dm-card">
          <span className="dm-card__question">When should I check in?</span>
          <div className="grid grid--2">
            <div className="field"><label className="ecb-form-label" htmlFor="mid">Midday</label><select id="mid" className="ecb-form-select" defaultValue={prefs.midday}><option>12:00</option><option>12:30</option><option>13:00</option></select></div>
            <div className="field"><label className="ecb-form-label" htmlFor="eod">End of day</label><select id="eod" className="ecb-form-select" defaultValue={prefs.endOfDay}><option>17:00</option><option>17:30</option><option>18:00</option></select></div>
          </div>
          <label className="check"><input type="checkbox" defaultChecked={prefs.useCalendar} /> Use my calendar to time check-ins before meetings</label>
          <p className="fine-print">I'll only read meeting titles and times, never their content.</p>
          <button className="ecb-btn-primary self-start" type="button">Start my companion</button>
        </div>
      </BotMessage>
      <BotMessage meta="Ready">
        <p className="text-body">You're set. Your first session with {coachFirst} is {day(first.scheduledAt)} at {time(first.scheduledAt)}. I'll ask for your consent the day before.</p>
      </BotMessage>
    </DmFrame>
  );
}
