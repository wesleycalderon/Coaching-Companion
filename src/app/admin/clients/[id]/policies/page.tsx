import { ActionForm } from '@/components/admin-forms';
import { allow, BackLink, NotFoundCard, PageHead, WrongRole } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
import { captureLabel } from '@/lib/admin';
import { savePolicies } from '@/lib/admin-actions';
import { db } from '@/lib/db';
import { CHANNEL_LABEL, REGION_LABEL, type Channel, type FeatureFlags } from '@/lib/domain';
import { andList, asJson } from '@/lib/format';
import { btsPolicy, clientRestrictions, MIN_GROUP_FLOOR } from '@/lib/policy';

const FEATURES: Array<[keyof FeatureFlags, string]> = [
  ['askAi', 'Coaches can ask the AI about sessions'],
  ['practiceFeedback', 'Practice feedback for coaches'],
  ['managerView', 'Coach managers see practice trends'],
  ['languageMetric', 'Coaching-language metric'],
  ['standalone', 'Standalone companion for frontline leaders'],
];

export default async function ClientPoliciesPage({ params, searchParams }: { params: { id: string }; searchParams: { created?: string } }) {
  const path = `/admin/clients/${params.id}/policies`;
  const persona = allow(['bts_admin']);
  if (!persona) return <WrongRole roles={['bts_admin']} path={path} />;
  const c = await db.client.findUnique({ where: { id: params.id }, include: { users: { where: { role: 'client_admin', status: 'invited' } } } });
  if (!c) return <NotFoundCard what="client" />;
  const rubrics = await db.rubric.findMany({ where: { OR: [{ clientId: null }, { clientId: c.id }] }, orderBy: { sortOrder: 'asc' } });
  const active = asJson<string[]>(c.activeRubricIds);
  const b = btsPolicy(c);
  const r = clientRestrictions(c);
  const nudges = b.nudgeDefaults;
  const flags = asJson<FeatureFlags>(c.featureFlags);
  const cap = captureLabel(c);
  const channels: Channel[] = ['slack', 'teams', 'email'];
  const short = c.name.split(' ')[0];
  const rubricLabel = (x: (typeof rubrics)[number]) => {
    const name = x.usedFor === 'Coach practice feedback' ? `${x.name}, for coach feedback only` : x.name;
    if (x.status === 'draft') return `${name} · draft, publish it first`;
    return `${name} · ${/^\d+\.\d+$/.test(x.version) ? `v${x.version}` : x.version}`;
  };
  const tighter = [
    r.capture ? (r.capture === 'companion_mode' ? 'companion mode for everyone' : 'allowlisted sessions only') : null,
    r.retentionDays !== undefined ? (r.retentionDays === 0 ? 'transcripts deleted right after analysis' : `transcripts kept ${r.retentionDays} ${r.retentionDays === 1 ? 'day' : 'days'}`) : null,
    r.extraTerms?.length ? `${r.extraTerms.length} extra redaction ${r.extraTerms.length === 1 ? 'term' : 'terms'}` : null,
    r.maxPerDay ? `${r.maxPerDay} nudge a day` : null,
    r.quietHours ? `quiet hours ${r.quietHours}` : null,
    r.pauseOnHolidays ? 'nudges paused on public holidays' : null,
    r.workMeetingsOff ? 'work-meeting capture off' : null,
  ].filter(Boolean) as string[];

  return (
    <div className="page page--narrow">
      <BackLink href="/admin/clients">Back to clients</BackLink>
      <PageHead title={`${c.name} policies`} lede={`${REGION_LABEL[c.region]} data region. Client admins can make these settings stricter, never looser.`}>
        <StatusBadge tone={cap.tone} label={c.capturePolicy === 'companion_mode' ? 'Companion mode' : cap.label} size="md" />
      </PageHead>
      {searchParams.created ? (
        <div role="status" className="card card--pad row row--top text-body">
          <StatusBadge tone="success" label="Created" />
          <span className="grow">{c.name} is set up from the template.{c.users.length ? ` ${andList(c.users.map((u) => u.name))} ${c.users.length === 1 ? 'is' : 'are'} invited as client admin.` : ''} Connect {CHANNEL_LABEL[nudges.channels[0]]} on Integrations before nudges can go out.</span>
        </div>
      ) : null}
      {tighter.length ? (
        <div className="card card--pad row row--top text-body">
          <StatusBadge tone="info" label="Set by client" />
          <span className="grow">{short}&apos;s admins made some settings stricter: {andList(tighter)}. Their choices apply on top of these.</span>
        </div>
      ) : null}

      <ActionForm action={savePolicies.bind(null, c.id)} submitLabel="Save policies" pendingLabel="Saving policies…" resetLabel="Discard changes">
        <div className="card card--pad-lg card--stack-lg">
          <fieldset className="fieldset">
            <legend className="heading-xsmall">Capture</legend>
            <label className="check check--top"><input type="radio" name="capture" value="sessions" defaultChecked={b.capturePolicy === 'sessions'} /><span><span className="strong">Capture scheduled coaching sessions</span><br /><span className="text-subtle">With consent from coach and coachee for each session.</span></span></label>
            <label className="check check--top"><input type="radio" name="capture" value="allowlist" defaultChecked={b.capturePolicy === 'allowlist'} /><span><span className="strong">Capture allowlisted sessions only</span><br /><span className="text-subtle">Admins choose which engagements can be captured, on the People page.</span></span></label>
            <label className="check check--top"><input type="radio" name="capture" value="companion_mode" defaultChecked={b.capturePolicy === 'companion_mode'} /><span><span className="strong">Companion mode without transcripts</span><br /><span className="text-subtle">Recaps come from coach notes and coachee check-ins. Recommended where transcripts could hold market-sensitive information.</span></span></label>
          </fieldset>
          <div className="divider" />
          {/* Milestone 7. Not on the canvas yet: flagged for design review. */}
          <fieldset className="fieldset">
            <legend className="heading-xsmall">Work meetings</legend>
            <label className="check check--top"><input type="radio" name="workMeetings" value="off" defaultChecked={(b.workMeetings ?? 'off') === 'off'} /><span><span className="strong">Off</span><br /><span className="text-subtle">Only coaching sessions are captured. Recommended for companion mode and sensitive-data clients.</span></span></label>
            <label className="check check--top"><input type="radio" name="workMeetings" value="coachee_picked" defaultChecked={b.workMeetings === 'coachee_picked'} /><span><span className="strong">Meetings coachees pick</span><br /><span className="text-subtle">A coachee links a meeting or series to one of their actions. Everyone sees a notice each time, capture pauses for anyone who hasn&apos;t agreed, and meetings with an external participant are never captured. Only the coachee&apos;s own words are analyzed.</span></span></label>
          </fieldset>
          <div className="divider" />
          <fieldset className="fieldset">
            <legend className="heading-xsmall">Retention and redaction</legend>
            <div className="field">
              <label className="ecb-form-label" htmlFor="ret">Keep raw transcripts for</label>
              <select id="ret" name="retention" className="ecb-form-select select--max" defaultValue={String(b.retentionDays)}>
                <option value="0">Delete right after analysis</option><option value="1">1 day</option><option value="7">7 days</option>
              </select>
            </div>
            <label className="check"><input type="checkbox" role="switch" name="redact" defaultChecked={b.redactionOn} /> Redact client-sensitive terms before anything is stored</label>
            <div className="field">
              <label className="ecb-form-label" htmlFor="terms">Terms to redact</label>
              <textarea id="terms" name="terms" className="ecb-form-input" rows={2} defaultValue={b.redactionTerms.join(', ')} aria-describedby="terms-note" />
              <p id="terms-note" className="fine-print">Separate terms with commas.</p>
            </div>
          </fieldset>
          <div className="divider" />
          <fieldset className="fieldset">
            <legend className="heading-xsmall">Nudges</legend>
            <div className="grid grid--3">
              <div className="field"><label className="ecb-form-label" htmlFor="ch1">First channel</label><select id="ch1" name="ch1" className="ecb-form-select" defaultValue={nudges.channels[0]}>{channels.map((x) => <option key={x} value={x}>{CHANNEL_LABEL[x]}</option>)}</select></div>
              <div className="field"><label className="ecb-form-label" htmlFor="ch2">Fallback channel</label><select id="ch2" name="ch2" className="ecb-form-select" defaultValue={nudges.channels[1] ?? 'none'}>{channels.map((x) => <option key={x} value={x}>{CHANNEL_LABEL[x]}</option>)}<option value="none">No fallback</option></select></div>
              <div className="field"><label className="ecb-form-label" htmlFor="max">Most nudges per day</label><select id="max" name="maxPerDay" className="ecb-form-select" defaultValue={String(nudges.maxPerDay)}><option value="2">2</option><option value="1">1</option></select></div>
              <div className="field"><label className="ecb-form-label" htmlFor="t1">Midday nudge</label><input id="t1" name="midday" className="ecb-form-input" defaultValue={nudges.midday} inputMode="numeric" pattern="[0-2][0-9]:[0-5][0-9]" /></div>
              <div className="field"><label className="ecb-form-label" htmlFor="t2">End-of-day nudge</label><input id="t2" name="endOfDay" className="ecb-form-input" defaultValue={nudges.endOfDay} inputMode="numeric" pattern="[0-2][0-9]:[0-5][0-9]" /></div>
              <div className="field"><label className="ecb-form-label" htmlFor="qh">Quiet hours</label><input id="qh" name="quietHours" className="ecb-form-input" defaultValue={nudges.quietHours} /></div>
            </div>
            <p className="fine-print">Times follow each coachee&apos;s own time zone, in 24-hour format.</p>
          </fieldset>
          <div className="divider" />
          <fieldset className="fieldset fieldset--tight">
            <legend className="heading-xsmall">Coaching models</legend>
            {rubrics.map((x) => <label key={x.id} className="check"><input type="checkbox" name="rubric" value={x.id} defaultChecked={active.includes(x.id)} disabled={x.status === 'draft'} /> {rubricLabel(x)}</label>)}
          </fieldset>
          <div className="divider" />
          <fieldset className="fieldset fieldset--tight">
            <legend className="heading-xsmall">Features</legend>
            {FEATURES.map(([k, label]) => <label key={k} className="check"><input type="checkbox" role="switch" name={`flag-${k}`} defaultChecked={flags[k]} /> {label}</label>)}
          </fieldset>
          <div className="divider" />
          <fieldset className="fieldset fieldset--tight">
            <legend className="heading-xsmall">Reporting</legend>
            <div className="field">
              <label className="ecb-form-label" htmlFor="grp">Smallest group shown in client reports, in coachees</label>
              <input id="grp" name="minGroup" type="number" min={MIN_GROUP_FLOOR} max={500} step={1} className="ecb-form-input ecb-form-input-narrow" defaultValue={c.minGroupSize} aria-describedby="grp-note" />
            </div>
            <p id="grp-note" className="fine-print">At least {MIN_GROUP_FLOOR}. Client admins never see individual transcripts, summaries or commitments.</p>
          </fieldset>
        </div>
      </ActionForm>
    </div>
  );
}
