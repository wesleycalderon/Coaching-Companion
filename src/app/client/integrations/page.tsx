import { ActionButton } from '@/components/admin-forms';
import { ConfirmButton } from '@/components/client';
import { allow, CLIENT_NAV, NavPage, PageHead, WrongRole } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
import { db } from '@/lib/db';
import { INTEGRATION_LABEL } from '@/lib/domain';
import { count, day } from '@/lib/format';
import { clientIntegrationAction } from '@/lib/setup-actions';

const KINDS = ['slack', 'teams', 'zoom', 'calendar'];
const PURPOSE: Record<string, string> = {
  slack: 'Coachees link their own Slack account. The companion sends recaps, check-ins and consent questions by direct message, and reads only replies sent to it.',
  teams: 'Coachees link their own Teams account. Same messages as Slack, in a chat with the companion.',
  zoom: 'Lets the companion join work meetings coachees have on, with a notice to everyone. Coaching sessions run on each coach’s own Zoom.',
  calendar: 'Coachees link their own calendar. The companion reads meeting titles, times and who’s invited, to list meetings and time check-ins.',
};
const REMOVE_EFFECT: Record<string, string> = {
  slack: 'Coachees’ Slack links stop working, and messages go to their next channel.',
  teams: 'Coachees’ Teams links stop working, and messages go to their next channel.',
  zoom: 'The companion stops joining coachees’ work meetings on Zoom.',
  calendar: 'Coachees’ calendars stop working, so the companion stops joining work meetings and check-ins go out at default times.',
};

// Client admins install the companion's tools for their company. Not on the design canvas yet:
// for design review. Installs are simulated. STUB: BTS Studio engineering (OAuth, app installs).
export default async function ClientIntegrationsPage({ searchParams }: { searchParams: { done?: string; which?: string } }) {
  const persona = allow(['client_admin']);
  if (!persona) return <WrongRole roles={['client_admin']} path="/client/integrations" />;
  const admin = await db.user.findUniqueOrThrow({ where: { id: persona.userId }, include: { client: { include: { integrations: { orderBy: { sortOrder: 'asc' } } } } } });
  const c = admin.client!;
  const short = c.name.split(' ')[0];
  const integrations = c.integrations.filter((i) => KINDS.includes(i.kind));
  const installers = await db.user.findMany({ where: { id: { in: integrations.map((i) => i.installedById).filter((x): x is string => Boolean(x)) } } });
  const linkCounts = await db.accountLink.groupBy({ by: ['provider'], where: { workspace: c.id, status: 'linked' }, _count: true });
  const coachees = await db.user.count({ where: { clientId: c.id, role: 'coachee', status: 'active' } });
  const banner = searchParams.which && INTEGRATION_LABEL[searchParams.which] && (searchParams.done === 'installed' || searchParams.done === 'removed')
    ? `${INTEGRATION_LABEL[searchParams.which]} is ${searchParams.done === 'installed' ? 'installed (simulated)' : 'removed'} for ${c.name}.` : null;

  return (
    <NavPage nav={CLIENT_NAV} navLabel="Client admin" current="/client/integrations">
      <PageHead title="Integrations" lede={`Install the companion's tools for ${short}. Each coachee then links their own account and chooses what the companion joins.`} />
      {banner ? <div role="status" className="card card--pad row row--top text-body"><StatusBadge tone="success" label="Saved" /><span className="grow">{banner}</span></div> : null}
      <div className="grid grid--2">
        {integrations.map((i) => {
          const label = INTEGRATION_LABEL[i.kind];
          const installed = i.status === 'connected';
          const by = installers.find((u) => u.id === i.installedById);
          const linkedCount = linkCounts.find((l) => l.provider === i.kind)?._count ?? 0;
          return (
            <div key={i.id} className="card card--pad card--stack card--stack-100">
              <div className="row row--tight"><span className="strong grow">{label}</span><StatusBadge tone={installed ? 'success' : i.status === 'needs_approval' ? 'warning' : 'neutral'} label={installed ? 'Installed' : i.status === 'needs_approval' ? 'Waiting for your approval' : 'Not installed'} /></div>
              <p className="fine-print">{PURPOSE[i.kind]}</p>
              {installed ? (
                <p className="text-small">{by ? `Installed by ${by.name}${i.installedAt ? ` on ${day(i.installedAt)}` : ''}.` : 'Installed by BTS.'}{i.kind !== 'zoom' ? ` ${count(linkedCount)} of ${count(coachees)} coachees linked.` : ''}</p>
              ) : null}
              {installed ? (
                <ConfirmButton label="Remove" ariaLabel={`Remove ${label}`} action={clientIntegrationAction.bind(null, i.id, 'remove')} copy={{
                  title: `Remove ${label} from ${short}?`,
                  body: <p>{REMOVE_EFFECT[i.kind]} Data already saved stays where it is.</p>,
                  undo: 'You can install it again at any time; coachees’ links work again.',
                  confirmLabel: `Remove ${label}`,
                }} />
              ) : (
                <ActionButton action={clientIntegrationAction.bind(null, i.id, 'install')} label={i.status === 'needs_approval' ? `Approve and install ${label}` : `Install ${label}`} pendingLabel="Installing…" className="ecb-btn-secondary" />
              )}
            </div>
          );
        })}
      </div>
      <p className="fine-print">Installs are simulated in the prototype. No accounts are contacted. BTS sees what you install on its admin console.</p>
    </NavPage>
  );
}
