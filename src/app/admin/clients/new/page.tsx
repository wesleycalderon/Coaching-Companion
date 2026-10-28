import Link from 'next/link';
import { ActionForm } from '@/components/admin-forms';
import { allow, BackLink, PageHead, WrongRole } from '@/components/ui';
import { createClient } from '@/lib/admin-actions';
import { REGION_LABEL } from '@/lib/domain';

export default function CreateClientPage() {
  const persona = allow(['bts_admin']);
  if (!persona) return <WrongRole roles={['bts_admin']} path="/admin/clients/new" />;
  return (
    <div className="page page--narrow">
      <BackLink href="/admin/clients">Back to clients</BackLink>
      <PageHead title="Create client" lede="Start from a policy template. You can change every setting after the client is created." />
      <ActionForm action={createClient} submitLabel="Create client" pendingLabel="Creating client…" secondary={<Link className="ecb-btn-secondary" href="/admin/clients">Cancel</Link>}>
        <div className="card card--pad-lg card--stack-lg">
          <fieldset className="fieldset">
            <legend className="heading-xsmall">Client details</legend>
            <div className="grid grid--2">
              <div className="field"><label className="ecb-form-label" htmlFor="cname">Client name</label><input id="cname" name="name" className="ecb-form-input" placeholder="Orrin Retail Group" required maxLength={80} /></div>
              <div className="field"><label className="ecb-form-label" htmlFor="region">Data region</label><select id="region" name="region" className="ecb-form-select" defaultValue="european_union">{Object.entries(REGION_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
              <div className="field"><label className="ecb-form-label" htmlFor="start">Contract start</label><input id="start" name="start" type="date" className="ecb-form-input" /></div>
              <div className="field"><label className="ecb-form-label" htmlFor="end">Contract end</label><input id="end" name="end" type="date" className="ecb-form-input" /></div>
            </div>
            {/* STUB: BTS Studio engineering (file storage). The logo isn't stored in the prototype. */}
            <div className="field"><label className="ecb-form-label" htmlFor="logo">Client logo</label><input id="logo" type="file" accept="image/png,image/svg+xml" className="ecb-form-input" aria-describedby="logo-note" /></div>
            <p id="logo-note" className="fine-print">PNG or SVG. The prototype doesn't store logos.</p>
          </fieldset>
          <div className="divider" />
          <fieldset className="fieldset">
            <legend className="heading-xsmall">Policy template</legend>
            <label className="option-card"><input type="radio" name="template" value="standard" defaultChecked /><span><span className="strong">Standard</span><br /><span className="text-subtle">Capture scheduled coaching sessions with consent. Transcripts kept 7 days. Nudges twice a day.</span></span></label>
            <label className="option-card"><input type="radio" name="template" value="regulated" /><span><span className="strong">Regulated industry</span><br /><span className="text-subtle">Allowlisted sessions only. Transcripts deleted right after analysis. Redaction on.</span></span></label>
            <label className="option-card"><input type="radio" name="template" value="financial" /><span><span className="strong">Financial services</span><br /><span className="text-subtle">Companion mode without transcripts. Recaps from coach notes and check-ins only.</span></span></label>
          </fieldset>
          <div className="divider" />
          <fieldset className="fieldset">
            <legend className="heading-xsmall">Program</legend>
            <div className="grid grid--2">
              <div className="field"><label className="ecb-form-label" htmlFor="mode">Coaching offer</label><select id="mode" name="offer" className="ecb-form-select"><option value="add_on">Add-on to human coaching</option><option value="standalone">Standalone for frontline leaders</option><option value="both">Both</option></select></div>
              <div className="field"><label className="ecb-form-label" htmlFor="chan">Nudge channel</label><select id="chan" name="channel" className="ecb-form-select"><option value="slack">Slack, then email</option><option value="teams">Microsoft Teams, then email</option><option value="email">Email only</option></select></div>
            </div>
            <div className="field"><label className="ecb-form-label" htmlFor="admin">First client admin email</label><input id="admin" name="adminEmail" type="email" className="ecb-form-input" placeholder="name@company.com" autoComplete="off" /></div>
            <p className="fine-print">Synthetic data only in this prototype. No invite email is sent.</p>
          </fieldset>
        </div>
      </ActionForm>
    </div>
  );
}
