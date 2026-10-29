import Link from 'next/link';
import { ActionButton } from '@/components/admin-forms';
import { PageHead } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
import { bitsyConfigured } from '@/lib/coaching/bitsy';
import { slackEnabled } from '@/lib/companion/send';
import { db } from '@/lib/db';
import { dayTime, wall } from '@/lib/format';
import { googleConfigured, liveTestOn } from '@/lib/integrations/google';
import { zoomOAuthConfigured } from '@/lib/integrations/zoom-user';
import { checkNowAction } from '@/lib/live-actions';
import { currentPersona } from '@/lib/persona';

export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = {
  google_not_configured: 'Google sign-in isn’t set up: add LIVE_TEST=true, GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env and restart the app.',
  google_cancelled: 'Google sign-in was cancelled.',
  calendar_not_granted: 'Google didn’t grant calendar access. Sign in again and tick “See your calendars”.',
  state: 'That sign-in link had expired. Try again.',
  google_failed: 'Google sign-in failed. The server log has the detail.',
  sign_in_first: 'Sign in with Google first.',
  signed_out: 'Your test account was removed, probably because the demo data was reset. Sign in with Google again to set it up.',
};

const STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'neutral' | 'info' }> = {
  scheduled: { label: 'On, waiting', tone: 'info' },
  notice_shown: { label: 'Notice sent', tone: 'info' },
  paused: { label: 'Paused', tone: 'warning' },
  skipped_external: { label: 'Skipped: outside guest', tone: 'neutral' },
  captured: { label: 'Feedback sent', tone: 'success' },
  off: { label: 'Off', tone: 'neutral' },
  stopped: { label: 'Stopped', tone: 'neutral' },
};
const LIVE_STATUS: Record<string, string> = {
  waiting_recording: 'Looking for the Zoom transcript',
  no_transcript: 'No transcript arrived',
  failed: 'Couldn’t finish',
};

// Live test: what's set up, and where each real meeting stands. Not on the design canvas.
export default async function LiveTestPage({ searchParams }: { searchParams: { error?: string } }) {
  const persona = currentPersona();
  const me = persona.userId.startsWith('live-') ? await db.user.findUnique({ where: { id: persona.userId } }) : null;
  const checks = [
    { label: 'LIVE_TEST=true', ok: liveTestOn() },
    { label: 'Google sign-in (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)', ok: googleConfigured() },
    { label: 'Zoom (ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_REDIRECT_URL)', ok: zoomOAuthConfigured() },
    { label: 'Slack connected (SLACK_ENABLED, tokens, SLACK_TEST_USER_ID)', ok: slackEnabled() && Boolean(process.env.SLACK_TEST_USER_ID) },
    { label: 'BiTSy AI coaches (otherwise sample replies)', ok: bitsyConfigured() },
    { label: 'Anthropic API key, for meeting feedback', ok: Boolean(process.env.ANTHROPIC_API_KEY) },
  ];
  const occurrences = me ? await db.meetingOccurrence.findMany({
    where: { link: { coacheeId: me.id }, scheduledAt: { gte: new Date(Date.now() - 2 * 86_400_000) } },
    include: { link: true }, orderBy: { scheduledAt: 'asc' }, take: 30,
  }) : [];

  return (
    <div className="page page--narrow">
      <PageHead title="Live test" lede="Test the companion as yourself: your Google Calendar, a real Zoom meeting, feedback in Slack, and an AI coach in the thread. Setup steps are in docs/live-test.md." />
      {searchParams.error && ERRORS[searchParams.error] ? <div role="alert" className="card card--pad row row--top text-body"><StatusBadge tone="warning" label="Not signed in" /><span className="grow">{ERRORS[searchParams.error]}</span></div> : null}

      <section aria-labelledby="lt-setup" className="card card--pad card--stack">
        <h2 id="lt-setup" className="heading-small heading-reset">Setup</h2>
        <ul className="list ruled">
          {checks.map((c) => <li key={c.label} className="row row--wrap text-body"><span className="grow">{c.label}</span><StatusBadge tone={c.ok ? 'success' : 'warning'} label={c.ok ? 'Ready' : 'Missing'} /></li>)}
        </ul>
        <div className="btn-row">
          {me ? <Link className="ecb-btn-primary" href="/me/start">Continue your setup</Link> : googleConfigured() ? <a className="ecb-btn-primary" href="/api/auth/google/start">Sign in with Google</a> : null}
        </div>
        {!me && !googleConfigured() ? <p className="text-body">Sign-in appears here once LIVE_TEST and the Google keys are in .env and the app has restarted. Steps 1 to 3 of docs/live-test.md walk through it.</p> : null}
        {me ? <p className="fine-print">Signed in as {me.name} ({me.email}). Times show in {me.timeZone}.</p> : null}
      </section>

      {me ? (
        <section aria-labelledby="lt-meetings" className="card card--pad card--stack">
          <h2 id="lt-meetings" className="heading-small heading-reset">Your meetings the companion is following</h2>
          <p className="text-body">Meetings that are on and have a Zoom link, from the last two days and the next two weeks. The app checks every minute; you can also check now.</p>
          {occurrences.length === 0 ? <p className="text-body">None yet. Turn meetings on in <Link href="/me/settings">Companion settings</Link>; only Google Calendar events with a Zoom link are listed.</p> : (
            <ul className="list ruled">
              {occurrences.map((o) => {
                const st = STATUS[o.captureStatus] ?? { label: o.captureStatus, tone: 'neutral' as const };
                return (
                  <li key={o.id} className="row row--wrap text-body">
                    <span className="basis-320">
                      <span className="strong">{o.link.title}</span><br />
                      <span className="text-subtle">{dayTime(wall(o.scheduledAt, me))}{o.zoomMeetingId ? ` · Zoom ${o.zoomMeetingId}` : ''}</span>
                      {o.liveStatus ? <><br /><span className="fine-print">{LIVE_STATUS[o.liveStatus] ?? o.liveStatus}{o.liveNote ? `: ${o.liveNote}` : ''}</span></> : null}
                    </span>
                    <StatusBadge tone={st.tone} label={st.label} />
                    {o.captureStatus === 'captured' ? <Link href={`/me/meetings/${o.linkId}`}>See feedback</Link> : null}
                  </li>
                );
              })}
            </ul>
          )}
          <ActionButton action={checkNowAction} label="Check calendar and Zoom now" pendingLabel="Checking…" className="ecb-btn-secondary" />
        </section>
      ) : null}
    </div>
  );
}
