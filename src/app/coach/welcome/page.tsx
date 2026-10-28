import Link from 'next/link';
import { allow, WrongRole } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
import { db } from '@/lib/db';
import type { CoachPreferences } from '@/lib/domain';
import { asJson, firstName } from '@/lib/format';

export default async function CoachWelcomePage() {
  const persona = allow(['coach']);
  if (!persona) return <WrongRole roles={['coach']} path="/coach/welcome" />;
  const user = await db.user.findUniqueOrThrow({ where: { id: persona.userId } });
  const prefs = asJson<CoachPreferences>(user.preferences);
  const toConnect = [prefs.zoomConnected, prefs.calendarConnected].filter((x) => !x).length;

  return (
    <div className="page page--narrow">
      <div className="stack stack--tight">
        <span className="overline">Set up your workspace · About five minutes</span>
        <h1 className="heading-large page-title">Welcome, {firstName(user.name)}</h1>
        <p className="lede">The companion supports your coaching between sessions. You stay in charge of what your coachees see.</p>
      </div>

      <section aria-labelledby="w1" className="card card--pad card--stack">
        <div className="row row--tight"><h2 id="w1" className="heading-xsmall heading-reset grow">1. How it works with your coaching</h2>{prefs.introRead ? <StatusBadge tone="success" label="Read" /> : <StatusBadge tone="neutral" label="Not read yet" />}</div>
        <ul className="list list--tight">
          <li>Sessions are captured only when you and your coachee both agree.</li>
          <li>You approve every recap and commitment before your coachee sees it.</li>
          <li>Practice feedback is visible to you and your coach manager only, and never used to assign work.</li>
          <li>Session data is never used to train AI models.</li>
        </ul>
        <p className="fine-print">Under ICF Code of Ethics standard 2.5 you're responsible for the technology you use with clients. <a href="#data-practices">Read our data practices ↗</a></p>
      </section>

      <section aria-labelledby="w2" className="card card--pad card--stack">
        <div className="row row--tight"><h2 id="w2" className="heading-xsmall heading-reset grow">2. Connect your tools</h2>{toConnect === 0 ? <StatusBadge tone="success" label="Done" /> : <StatusBadge tone="warning" label={toConnect === 1 ? 'One to go' : 'Two to go'} />}</div>
        <div className="stack ruled">
          <div className="row row--wrap text-body">
            <span className="basis-320"><span className="strong">Zoom</span><br /><span className="evidence">Your sessions run on the BTS coaching account.</span></span>
            {prefs.zoomConnected ? <StatusBadge tone="success" label="Connected" /> : <button className="ecb-btn-primary" type="button">Connect Zoom</button>}
          </div>
          <div className="row row--wrap text-body">
            <span className="basis-320"><span className="strong">Calendar</span><br /><span className="evidence">To schedule sessions and see free times. We read times only.</span></span>
            {prefs.calendarConnected ? <StatusBadge tone="success" label="Connected" /> : <button className="ecb-btn-primary" type="button">Connect calendar</button>}
          </div>
        </div>
      </section>

      <section aria-labelledby="w3" className="card card--pad card--stack">
        <h2 id="w3" className="heading-xsmall heading-reset">3. Your preferences</h2>
        <div className="grid grid--2">
          <div className="field"><label className="ecb-form-label" htmlFor="rev">Remind me to review summaries</label><select id="rev" className="ecb-form-select" defaultValue={prefs.reviewReminder}><option value="24h">Within 24 hours</option><option value="48h">Within 48 hours</option></select></div>
          <div className="field"><label className="ecb-form-label" htmlFor="rem">Where I get review reminders</label><select id="rem" className="ecb-form-select" defaultValue={prefs.reminderChannel}><option value="email">Email</option><option value="slack">Slack</option><option value="teams">Microsoft Teams</option></select></div>
        </div>
        <label className="check"><input type="checkbox" role="switch" defaultChecked={prefs.showPracticeFeedback} /> Show practice feedback on my sessions</label>
        <label className="check"><input type="checkbox" role="switch" defaultChecked={prefs.draftPlans} /> Draft a plan before each session</label>
      </section>

      <div className="btn-row">
        <Link className="ecb-btn-primary" href="/coach/sessions">Go to my sessions</Link>
        <button className="ecb-btn-ghost" type="button">Finish later</button>
      </div>
    </div>
  );
}
