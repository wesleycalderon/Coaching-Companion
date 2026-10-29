import Link from 'next/link';
import { ActionForm } from '@/components/admin-forms';
import { CoacheeShell } from '@/components/coachee';
import { AccountsSection, AgreementSection } from '@/components/companion-setup';
import { allow, WrongRole } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
import { linked, personState } from '@/lib/companion-setup';
import { db } from '@/lib/db';
import { googleConfigured } from '@/lib/integrations/google';
import { saveLiveActionsAction } from '@/lib/live-actions';

const ERRORS: Record<string, string> = {
  zoom_not_configured: 'Zoom isn’t set up yet: add ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET and ZOOM_REDIRECT_URL to .env and restart the app.',
  state: 'That sign-in link had expired. Press Link Zoom again.',
  zoom_cancelled: 'Zoom didn’t finish linking. Press Link Zoom to try again.',
  zoom_failed: 'Zoom linking failed. Check the app’s scopes and redirect URL, then try again. The server log has the detail.',
};

// Live test: the signed-in person's start page (see docs/live-test.md). Not on the design canvas.
export default async function LiveStartPage({ searchParams }: { searchParams: { error?: string; done?: string; scope?: string } }) {
  const persona = allow(['coachee']);
  if (!persona) return <WrongRole roles={['coachee']} path="/me/start" />;
  const st = await personState(persona.userId);
  if (!st.user.liveClock) {
    // Not signed in as yourself yet: you're viewing a demo coachee.
    return (
      <CoacheeShell userId={st.user.id} current="/me/start">
        <div className="stack stack--100">
          <h1 className="participant-title">Set up your live test</h1>
          <p className="participant-lede">You&apos;re viewing the demo coachee {st.user.name}. To test with your own calendar, Zoom and Slack, sign in with Google first.</p>
        </div>
        <div className="p-card stack">
          <p className="text-body">{googleConfigured() ? 'Google sign-in is ready.' : 'Google sign-in isn’t set up yet. Add LIVE_TEST="true", GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env and restart the app (docs/live-test.md, step 1).'}</p>
          <div className="btn-row">
            {googleConfigured() ? <a className="ecb-btn-primary" href="/api/auth/google/start">Sign in with Google</a> : null}
            <Link className="ecb-btn-secondary" href="/live">See the setup checklist</Link>
          </div>
        </div>
      </CoacheeShell>
    );
  }
  const actions = await db.commitment.findMany({ where: { sessionId: `s-${st.user.id}-1`, status: { not: 'set_aside' } }, orderBy: { createdAt: 'asc' } });
  const steps = [
    { label: 'Write the actions you want to practice', done: actions.length > 0 },
    { label: 'Agree to use the companion', done: st.optedIn },
    { label: 'Link Zoom', done: Boolean(linked(st, 'zoom')) },
  ];
  const ready = steps.every((s) => s.done);

  return (
    <CoacheeShell userId={st.user.id} current="/me/start">
      <div className="stack stack--100">
        <h1 className="participant-title">Set up your live test</h1>
        <p className="participant-lede">You&apos;re signed in as yourself with your real Google Calendar. Three steps, then choose which meetings the companion joins.</p>
      </div>
      {searchParams.error && ERRORS[searchParams.error] ? <div role="alert" className="p-card row row--top text-body"><StatusBadge tone="warning" label="Not linked" /><span className="grow">{ERRORS[searchParams.error]}</span></div> : null}
      {searchParams.error === 'zoom_scope' ? <div role="alert" className="p-card row row--top text-body"><StatusBadge tone="warning" label="Not linked" /><span className="grow">Your Zoom app is missing the scope <code>{searchParams.scope ?? 'unknown'}</code>. In the Zoom App Marketplace, open your app, go to Scopes, add it, then press Link Zoom again.</span></div> : null}
      {searchParams.done === 'zoom' ? <div role="status" className="p-card row row--top text-body"><StatusBadge tone="success" label="Linked" /><span className="grow">Zoom is linked.</span></div> : null}

      <ol className="list list--tight text-body">
        {steps.map((s) => <li key={s.label} className="row row--tight"><StatusBadge tone={s.done ? 'success' : 'neutral'} label={s.done ? 'Done' : 'To do'} /><span>{s.label}</span></li>)}
      </ol>

      <section aria-labelledby="ac-actions" className="p-card stack">
        <h2 id="ac-actions" className="heading-small heading-reset">1. Your actions</h2>
        <p className="text-body">Normally these come from a session with your coach, who approves them. For the test, write one or two yourself: they&apos;re recorded as approved by Daniel (test shortcut). Your meetings are checked against them.</p>
        <ActionForm action={saveLiveActionsAction} submitLabel="Save actions" pendingLabel="Saving…" className="stack">
          {[0, 1].map((i) => (
            <div key={i} className="field">
              <label className="ecb-form-label" htmlFor={`la-${i}`}>Action {i + 1}{i === 1 ? ' (optional)' : ''}</label>
              <textarea id={`la-${i}`} name={`action${i + 1}`} className="ecb-form-input" rows={2} maxLength={240}
                defaultValue={actions[i]?.ifThenText ?? ''} placeholder={i === 0 ? 'When someone brings me a problem, I’ll ask a question before suggesting a fix.' : 'At the start of a meeting, I’ll say what I want us to decide.'} />
            </div>
          ))}
        </ActionForm>
      </section>

      <AgreementSection st={st} variant="coachee" coachName="Daniel" heading="2. Agree to use the companion" />
      <AccountsSection st={st} variant="coachee" heading="3. Link your accounts" />

      <section aria-labelledby="ac-next" className="p-card stack">
        <h2 id="ac-next" className="heading-small heading-reset">Then</h2>
        {ready ? (
          <>
            <p className="text-body">Choose which meetings the companion joins in <Link href="/me/settings">Companion settings</Link>. Only Google Calendar events with a Zoom link can be captured.</p>
            <p className="text-body">Then hold the meeting, record it to the cloud in Zoom, and watch Slack. <Link href="/live">The live test page</Link> shows where each meeting stands.</p>
          </>
        ) : <p className="text-body">Finish the steps above first.</p>}
      </section>
    </CoacheeShell>
  );
}
