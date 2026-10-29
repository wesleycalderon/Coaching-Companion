import Link from 'next/link';
import { ActionForm } from '@/components/admin-forms';
import { CoachPrefsFields } from '@/components/coach-prefs';
import { AccountsSection, AgreementSection, ModeFields } from '@/components/companion-setup';
import { allow, WrongRole } from '@/components/ui';
import { personState } from '@/lib/companion-setup';
import type { CoachPreferences } from '@/lib/domain';
import { firstName } from '@/lib/format';
import { finishWelcomeAction } from '@/lib/setup-actions';

// Artboard 22, now working: agree, link accounts, choose meetings. Steps 1 and 2 save as you go.
export default async function CoachWelcomePage() {
  const persona = allow(['coach']);
  if (!persona) return <WrongRole roles={['coach']} path="/coach/welcome" />;
  const st = await personState(persona.userId);
  const prefs = (st.user.preferences ?? {}) as Partial<CoachPreferences>;

  return (
    <div className="page page--narrow">
      <div className="stack stack--tight">
        <span className="overline">Set up your workspace · About five minutes</span>
        <h1 className="heading-large page-title">Welcome, {firstName(st.user.name)}</h1>
        <p className="lede">The companion supports your coaching between sessions. You stay in charge of what your coachees see, and of which meetings it joins.</p>
      </div>

      <AgreementSection st={st} variant="coach" heading="1. Agree to use the companion" />
      <AccountsSection st={st} variant="coach" heading="2. Link your accounts" />

      <section aria-labelledby="w3" className="card card--pad card--stack">
        <h2 id="w3" className="heading-small heading-reset">3. Choose your meetings and preferences</h2>
        <ActionForm action={finishWelcomeAction} submitLabel="Finish setup" pendingLabel="Saving…" className="stack" secondary={<Link className="ecb-btn-ghost" href="/coach/sessions">Finish later</Link>}>
          <ModeFields st={st} />
          <p className="fine-print">You can turn off any coachee&apos;s sessions, any meeting series or any single meeting in Companion settings afterwards.</p>
          <CoachPrefsFields prefs={prefs} />
        </ActionForm>
        <p className="fine-print">Under ICF Code of Ethics standard 2.5 you&apos;re responsible for the technology you use with clients. <a href="#data-practices">Read our data practices ↗</a></p>
      </section>
    </div>
  );
}
