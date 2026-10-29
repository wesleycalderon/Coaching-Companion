import { ActionButton, ActionForm } from '@/components/admin-forms';
import { ConfirmButton, FilterSelect } from '@/components/client';
import { ADMIN_NAV, allow, NavPage, PageHead, WrongRole } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
import { pickClient } from '@/lib/admin';
import { changeIntegration, saveMcpScopes } from '@/lib/admin-actions';
import { db } from '@/lib/db';
import { CHANNEL_LABEL, INTEGRATION_LABEL, INTEGRATION_STATUS, type Channel, type IntegrationStatus, type NudgeDefaults } from '@/lib/domain';
import { asJson, day } from '@/lib/format';

// Connections are simulated in the prototype: connecting flips the status and writes an
// audit event. STUB: BTS Studio engineering (OAuth, Slack and Teams app installs, tenant approval).
export default async function IntegrationsPage({ searchParams }: { searchParams: { client?: string; done?: string; which?: string } }) {
  const persona = allow(['bts_admin']);
  if (!persona) return <WrongRole roles={['bts_admin']} path="/admin/integrations" />;
  const clients = await db.client.findMany({ include: { integrations: { orderBy: { sortOrder: 'asc' } } }, orderBy: { createdAt: 'asc' } });
  const client = pickClient(clients, searchParams.client);
  const scopes = asJson<string[]>(client.mcpScopes);
  const channels = asJson<NudgeDefaults>(client.nudgeDefaults).channels;
  const short = client.name.split(' ')[0];
  const installers = await db.user.findMany({ where: { id: { in: client.integrations.map((i) => i.installedById).filter((x): x is string => Boolean(x)) } } });
  const disconnectEffect = (kind: string) => {
    const i = channels.indexOf(kind as Channel);
    if (i >= 0) return i < channels.length - 1 ? `Nudges and recaps go by ${channels[i + 1] === 'email' ? 'email' : CHANNEL_LABEL[channels[i + 1]]} instead.` : 'Coachees stop getting nudges and recaps there.';
    if (kind === 'zoom') return 'Transcripts stop arriving automatically. Coaches can still upload them.';
    if (kind === 'calendar') return 'Check-ins go out at the default times instead of around meetings.';
    if (kind === 'sounding_board') return "Approved insights and actions stop reaching coachees' Leadership Roadmaps.";
    return 'The companion stops using it.';
  };

  return (
    <NavPage nav={ADMIN_NAV} navLabel="Admin" current="/admin/integrations">
      <PageHead title="Integrations" lede={`${client.name}. Each connection lists exactly what it can read.`} />
      <div className="row row--wrap row--bottom">
        <FilterSelect id="ic" label="Client" value={client.id} options={clients.map((c) => ({ value: c.id, label: c.name }))}
          hrefs={Object.fromEntries(clients.map((c) => [c.id, `/admin/integrations?client=${c.id}`]))} />
      </div>
      {searchParams.which && INTEGRATION_LABEL[searchParams.which] && (searchParams.done === 'connected' || searchParams.done === 'disconnected') ? (
        <div role="status" className="card card--pad row row--top text-body">
          <StatusBadge tone="success" label="Saved" />
          <span className="grow">{INTEGRATION_LABEL[searchParams.which]} is {searchParams.done === 'connected' ? 'connected (simulated)' : 'disconnected'} for {client.name}.</span>
        </div>
      ) : null}
      <div className="grid grid--2">
        {client.integrations.map((i) => {
          const st = INTEGRATION_STATUS[i.status as IntegrationStatus];
          const label = INTEGRATION_LABEL[i.kind];
          return (
            <div key={i.id} className="card card--pad card--stack card--stack-100">
              <div className="row row--tight"><span className="strong grow">{label}</span><StatusBadge tone={st.tone} label={i.status === 'planned' ? 'Planned' : st.label} /></div>
              <p className="fine-print">{i.detail}</p>
              {i.status === 'connected' && i.installedAt ? <p className="text-small">Installed by {installers.find((u) => u.id === i.installedById)?.name ?? 'BTS'} on {day(i.installedAt)}.</p> : null}
              {i.status === 'connected' ? (
                <ConfirmButton label="Disconnect" ariaLabel={`Disconnect ${label}`} action={changeIntegration.bind(null, i.id, 'disconnect')} copy={{
                  title: `Disconnect ${label} from ${short}?`,
                  body: <p>{disconnectEffect(i.kind)} Data already saved stays where it is.</p>,
                  undo: 'You can connect it again at any time.',
                  confirmLabel: `Disconnect ${label}`,
                }} />
              ) : i.status === 'needs_approval' ? (
                <ActionButton action={changeIntegration.bind(null, i.id, 'request')} label="Send approval request" pendingLabel="Sending…" className="ecb-btn-secondary" ariaLabel={`Send ${label} approval request`} />
              ) : i.status === 'not_connected' ? (
                <ActionButton action={changeIntegration.bind(null, i.id, 'connect')} label="Connect" pendingLabel="Connecting…" className="ecb-btn-secondary" ariaLabel={`Connect ${label}`} />
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="fine-print">Connections are simulated in the prototype. No accounts are contacted.</p>
      <section aria-labelledby="mcp-head" className="card card--pad card--stack">
        <div className="row row--wrap row--tight"><h2 id="mcp-head" className="heading-xsmall heading-reset grow">Studio memory over MCP</h2><StatusBadge tone="info" label="Read only" /></div>
        <p className="text-body">Other agents, such as Copilot or Claude, can read what each coachee has approved. Raw transcripts are never shared.</p>
        <ActionForm key={client.id} action={saveMcpScopes.bind(null, client.id)} submitLabel="Save access" pendingLabel="Saving…" className="stack">
          <fieldset className="fieldset fieldset--tight">
            <legend className="ecb-form-label">What agents can read</legend>
            <label className="check"><input type="checkbox" name="scope-goals" defaultChecked={scopes.includes('goals')} /> Goals</label>
            <label className="check"><input type="checkbox" name="scope-commitments" defaultChecked={scopes.includes('commitments')} /> Commitments and their status</label>
            <label className="check"><input type="checkbox" name="scope-summaries" defaultChecked={scopes.includes('summaries')} /> Approved session summaries</label>
          </fieldset>
          <p className="fine-print">Each coachee can turn this off for their own data.</p>
        </ActionForm>
      </section>
    </NavPage>
  );
}
