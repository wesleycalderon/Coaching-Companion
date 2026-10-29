import Link from 'next/link';
import { CoacheeShell } from '@/components/coachee';
import { AccountsSection, AgreementSection, MeetingsSection } from '@/components/companion-setup';
import { allow, WrongRole } from '@/components/ui';
import { meetingsAllowed, personState, refreshUpcomingSessions, seriesFor, upcomingFor } from '@/lib/companion-setup';
import { db } from '@/lib/db';
import { firstName } from '@/lib/format';
import { refreshLinks } from '@/lib/work-meetings';

// Companion settings for coachees. Not on the design canvas yet: for design review.
export default async function CoacheeSettingsPage() {
  const persona = allow(['coachee']);
  if (!persona) return <WrongRole roles={['coachee']} path="/me/settings" />;
  await refreshUpcomingSessions(persona.userId);
  await refreshLinks(persona.userId);
  const st = await personState(persona.userId);
  const engagement = await db.engagement.findFirst({ where: { coacheeId: st.user.id }, include: { coach: true } });
  const coach = engagement ? firstName(engagement.coach.name) : undefined;
  const [series, upcoming] = await Promise.all([seriesFor(st), upcomingFor(st)]);
  const allowed = meetingsAllowed(st);

  return (
    <CoacheeShell userId={st.user.id} current="/me/settings">
      <div className="stack stack--100">
        <h1 className="participant-title">Companion settings</h1>
        <p className="participant-lede">Agree to use the companion, link your work accounts, and choose which sessions and meetings it joins.</p>
      </div>
      <AgreementSection st={st} variant="coachee" coachName={coach} />
      <AccountsSection st={st} variant="coachee" />
      <MeetingsSection st={st} variant="coachee" series={series} upcoming={upcoming} meetingsNote={allowed.ok ? undefined : `${allowed.why} Coaching sessions aren't affected.`} />
      <p className="text-body">Feedback from your work meetings is in <Link href="/me/meetings">My meetings</Link>. What the companion keeps is in <Link href="/me/data">My data</Link>.</p>
    </CoacheeShell>
  );
}
