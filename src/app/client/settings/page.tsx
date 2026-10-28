import { ActionForm } from '@/components/admin-forms';
import { allow, CLIENT_NAV, NavPage, PageHead, WrongRole } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
import { saveClientSettings } from '@/lib/admin-actions';
import { db } from '@/lib/db';
import { btsPolicy, clientRestrictions, RETENTION_CHOICES } from '@/lib/policy';

// Client admins can make settings stricter than BTS's, never looser. What they choose is
// stored apart from BTS's policy, so BTS's changes and theirs combine (src/lib/policy.ts).
export default async function ClientSettingsPage() {
  const persona = allow(['client_admin']);
  if (!persona) return <WrongRole roles={['client_admin']} path="/client/settings" />;
  const admin = await db.user.findUniqueOrThrow({ where: { id: persona.userId }, include: { client: true } });
  const c = admin.client!;
  const short = c.name.split(' ')[0];
  const b = btsPolicy(c);
  const r = clientRestrictions(c);
  const btsDefault = b.capturePolicy === 'sessions' ? 'capture scheduled coaching sessions with consent' : b.capturePolicy === 'allowlist' ? 'capture allowlisted sessions only' : 'companion mode without transcripts';
  const capture = r.capture ?? b.capturePolicy;
  const retentionOptions = RETENTION_CHOICES.filter((d) => d <= b.retentionDays).sort((x, y) => y - x);
  const retentionText = (d: number) => (d === 0 ? 'Delete right after analysis' : `${d} ${d === 1 ? 'day' : 'days'}`);
  const maxOptions = Array.from({ length: b.nudgeDefaults.maxPerDay }, (_, i) => b.nudgeDefaults.maxPerDay - i);

  return (
    <NavPage nav={CLIENT_NAV} navLabel="Client admin" current="/client/settings">
      <PageHead title="Settings" lede={`You can make these stricter than BTS's defaults for ${short}. To loosen a setting, contact your BTS program lead.`} />
      <ActionForm action={saveClientSettings} submitLabel="Save settings" pendingLabel="Saving settings…" resetLabel="Discard changes">
        <div className="card card--pad-lg card--stack-lg">
          <fieldset className="fieldset">
            <legend className="heading-xsmall">Capture</legend>
            <div className="row row--tight text-body"><span className="grow">BTS default: {btsDefault}</span><StatusBadge tone="neutral" label="Set by BTS" /></div>
            {b.capturePolicy === 'sessions' ? (
              <label className="check"><input type="checkbox" name="allowlist" defaultChecked={capture === 'allowlist'} /> Limit capture to allowlisted engagements</label>
            ) : null}
            {b.capturePolicy !== 'companion_mode' ? (
              <label className="check"><input type="checkbox" name="companion" defaultChecked={capture === 'companion_mode'} /> Use companion mode without transcripts for all coachees</label>
            ) : null}
            {b.capturePolicy !== 'sessions' ? <p className="fine-print">Your BTS program lead chooses which engagements are on the allowlist.</p> : null}
          </fieldset>
          <div className="divider" />
          {/* Milestone 7. Not on the canvas yet: flagged for design review. */}
          <fieldset className="fieldset">
            <legend className="heading-xsmall">Work meetings</legend>
            {b.workMeetings === 'coachee_picked' ? (
              <>
                <div className="row row--tight text-body"><span className="grow">BTS default: coachees can link meetings they pick to an action</span><StatusBadge tone="neutral" label="Set by BTS" /></div>
                <label className="check"><input type="checkbox" name="workMeetingsOff" defaultChecked={Boolean(r.workMeetingsOff)} /> Turn off work-meeting capture for all coachees</label>
                <p className="fine-print">Turning it off stops every linked meeting right away.</p>
              </>
            ) : (
              <div className="row row--tight text-body"><span className="grow">Work meetings aren&apos;t captured. Only coaching sessions are.</span><StatusBadge tone="neutral" label="Set by BTS" /></div>
            )}
          </fieldset>
          <div className="divider" />
          <fieldset className="fieldset">
            <legend className="heading-xsmall">Retention and redaction</legend>
            {b.capturePolicy === 'companion_mode' ? (
              <p className="text-body">Companion mode stores no transcripts, so there&apos;s nothing to keep.</p>
            ) : (
              <div className="field">
                <label className="ecb-form-label" htmlFor="r">Keep raw transcripts for</label>
                <select id="r" name="retention" className="ecb-form-select select--max" defaultValue={String(r.retentionDays ?? b.retentionDays)}>
                  {retentionOptions.map((d) => <option key={d} value={d}>{retentionText(d)}{d === b.retentionDays ? ', the BTS maximum' : ''}</option>)}
                </select>
              </div>
            )}
            {b.capturePolicy === 'companion_mode' ? <input type="hidden" name="retention" value={String(b.retentionDays)} /> : null}
            {b.redactionOn && b.redactionTerms.length ? <p className="text-body">BTS redacts: {b.redactionTerms.join(', ')}.</p> : null}
            <div className="field">
              <label className="ecb-form-label" htmlFor="t">Extra terms to redact</label>
              <textarea id="t" name="terms" className="ecb-form-input" rows={2} defaultValue={(r.extraTerms ?? []).join(', ')} aria-describedby="t-note" />
              <p id="t-note" className="fine-print">Separate terms with commas. They&apos;re removed before anything is stored or sent to the AI.</p>
            </div>
          </fieldset>
          <div className="divider" />
          <fieldset className="fieldset">
            <legend className="heading-xsmall">Nudges</legend>
            <div className="grid grid--2">
              <div className="field">
                <label className="ecb-form-label" htmlFor="mx">Most nudges per day</label>
                <select id="mx" name="maxPerDay" className="ecb-form-select" defaultValue={String(r.maxPerDay ?? b.nudgeDefaults.maxPerDay)}>
                  {maxOptions.map((n) => <option key={n} value={n}>{n}{n === b.nudgeDefaults.maxPerDay ? ', the BTS maximum' : ''}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="ecb-form-label" htmlFor="qh">Quiet hours</label>
                <input id="qh" name="quietHours" className="ecb-form-input" defaultValue={r.quietHours ?? b.nudgeDefaults.quietHours} aria-describedby="qh-note" />
              </div>
            </div>
            <p id="qh-note" className="fine-print">Quiet hours can only be longer than BTS&apos;s, {b.nudgeDefaults.quietHours}. Nudges go out at {b.nudgeDefaults.midday} and {b.nudgeDefaults.endOfDay} in each coachee&apos;s time zone.</p>
            {b.nudgeDefaults.pauseOnHolidays ? (
              <div className="row row--tight text-body"><span className="grow">Nudges pause on public holidays</span><StatusBadge tone="neutral" label="Set by BTS" /></div>
            ) : (
              <label className="check"><input type="checkbox" role="switch" name="pauseOnHolidays" defaultChecked={Boolean(r.pauseOnHolidays)} /> Pause nudges on public holidays</label>
            )}
          </fieldset>
          <div className="divider" />
          <fieldset className="fieldset">
            <legend className="heading-xsmall">Locked by BTS</legend>
            <div className="row row--tight text-body"><span className="grow">Smallest group in your reports: {c.minGroupSize} coachees</span><StatusBadge tone="neutral" label="Locked" /></div>
            <div className="row row--tight text-body"><span className="grow">Individual transcripts, summaries and commitments stay private to coachee and coach</span><StatusBadge tone="neutral" label="Locked" /></div>
            <div className="row row--tight text-body"><span className="grow">Session data is never used to train AI models</span><StatusBadge tone="neutral" label="Locked" /></div>
          </fieldset>
        </div>
      </ActionForm>
    </NavPage>
  );
}
