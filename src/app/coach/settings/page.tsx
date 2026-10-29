import { ActionForm } from '@/components/admin-forms';
import { CoachPrefsFields } from '@/components/coach-prefs';
import { AccountsSection, AgreementSection, MeetingsSection } from '@/components/companion-setup';
import { allow, COACH_NAV, NavPage, PageHead, WrongRole } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
import { linked, meetingsAllowed, personState, refreshUpcomingSessions, seriesFor, upcomingFor } from '@/lib/companion-setup';
import type { CoachPreferences } from '@/lib/domain';
import { saveCoachPrefsAction } from '@/lib/setup-actions';
import { refreshLinks } from '@/lib/work-meetings';

// Companion settings for coaches. Not on the design canvas yet: for design review.
export default async function CoachSettingsPage({ searchParams }: { searchParams: { done?: string } }) {
  const persona = allow(['coach']);
  if (!persona) return <WrongRole roles={['coach']} path="/coach/settings" />;
  await refreshUpcomingSessions(persona.userId);
  await refreshLinks(persona.userId);
  const st = await personState(persona.userId);
  const [series, upcoming] = await Promise.all([seriesFor(st), upcomingFor(st)]);
  const prefs = (st.user.preferences ?? {}) as Partial<CoachPreferences>;
  const allowed = meetingsAllowed(st);
  const note = !linked(st, 'zoom') ? 'Link your Zoom account so Zoom sessions and meetings can be captured.' : !allowed.ok ? allowed.why : undefined;

  return (
    <NavPage nav={COACH_NAV} navLabel="Coach workspace" current="/coach/settings">
      <PageHead title="Companion settings" lede="Agree to use the companion, link your accounts, and choose which sessions and meetings it joins." />
      {searchParams.done === 'setup' ? (
        <div role="status" className="card card--pad row row--top text-body"><StatusBadge tone="success" label="Saved" /><span className="grow">You&apos;re set up. Change any of this here at any time.</span></div>
      ) : null}
      <AgreementSection st={st} variant="coach" />
      <AccountsSection st={st} variant="coach" />
      <MeetingsSection st={st} variant="coach" series={series} upcoming={upcoming} meetingsNote={note} />
      <section aria-labelledby="pr-head" className="card card--pad card--stack">
        <h2 id="pr-head" className="heading-small heading-reset">Preferences</h2>
        <ActionForm action={saveCoachPrefsAction} submitLabel="Save preferences" pendingLabel="Saving…" className="stack">
          <CoachPrefsFields prefs={prefs} />
        </ActionForm>
      </section>
    </NavPage>
  );
}
