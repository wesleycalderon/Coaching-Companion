import { FilterSelect, LinkChips } from '@/components/client';
import { ADMIN_NAV, allow, NavPage, PageHead, Pagination, SampleNote, WrongRole } from '@/components/ui';
import { EventBadge } from '@/ds/components';
import { PAGE_SIZE } from '@/config';
import { db } from '@/lib/db';
import { AUDIT_CATEGORY_LABEL, type AuditCategory, type EventAction } from '@/lib/domain';
import { dayMonth, time } from '@/lib/format';

export default async function AuditLogPage({ searchParams }: { searchParams: { client?: string; type?: string; page?: string } }) {
  const persona = allow(['bts_admin']);
  if (!persona) return <WrongRole roles={['bts_admin']} path="/admin/audit" />;
  const clients = await db.client.findMany({ orderBy: { createdAt: 'asc' } });
  const clientId = clients.some((c) => c.id === searchParams.client) ? searchParams.client! : 'all';
  const type = (Object.keys(AUDIT_CATEGORY_LABEL) as string[]).includes(searchParams.type ?? '') ? searchParams.type! : 'all';
  const where = { ...(clientId !== 'all' ? { clientId } : {}), ...(type !== 'all' ? { category: type } : {}) };
  const page = Math.max(1, Number(searchParams.page) || 1);
  const [total, events] = await Promise.all([
    db.auditEvent.count({ where }),
    db.auditEvent.findMany({ where, include: { actor: true, client: true }, orderBy: { at: 'desc' }, skip: (page - 1) * PAGE_SIZE.audit, take: PAGE_SIZE.audit }),
  ]);
  const href = (over: Record<string, string>) => `/admin/audit?${new URLSearchParams({ client: clientId, type, ...over })}`;

  return (
    <NavPage nav={ADMIN_NAV} navLabel="Admin" current="/admin/audit">
      <PageHead title="Audit log" lede="Consent, configuration, data access and deletion events. Entries can't be edited.">
        {/* A plain link: the route returns a CSV download. */}
        <a className="ecb-btn-secondary" href={`/admin/audit/export?${new URLSearchParams({ client: clientId, type })}`} download>Export as CSV</a>
      </PageHead>
      <div className="row row--wrap row--bottom">
        <FilterSelect id="ac" label="Client" value={clientId}
          options={[{ value: 'all', label: 'All clients' }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
          hrefs={Object.fromEntries(['all', ...clients.map((c) => c.id)].map((id) => [id, href({ client: id, page: '1' })]))} />
        <LinkChips ariaLabel="Filter by event type" value={type}
          choices={[{ value: 'all', label: 'All' }, ...(Object.entries(AUDIT_CATEGORY_LABEL) as [AuditCategory, string][]).map(([value, label]) => ({ value, label }))]}
          hrefs={Object.fromEntries(['all', ...Object.keys(AUDIT_CATEGORY_LABEL)].map((t) => [t, href({ type: t, page: '1' })]))} />
      </div>
      <div className="card card--scroll">
        <table className="table table--w-820">
          <thead><tr><th>When</th><th>Event</th><th>What</th><th>By</th><th>Client</th></tr></thead>
          <tbody>
            {events.length === 0 ? <tr><td colSpan={5}>No events match this filter.</td></tr> : null}
            {events.map((e) => (
              <tr key={e.id}>
                <td>{dayMonth(e.at)} · {time(e.at)}</td>
                <td><EventBadge action={e.action as EventAction} label={e.label} /></td>
                <td>{e.object}</td>
                {/* BTS admins are shown by role, as on the canvas. */}
                <td>{e.actor.role === 'bts_admin' ? 'BTS admin' : e.actor.role === 'system' ? 'Companion' : e.actor.name}</td>
                <td>{e.client?.name ?? 'All clients'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} pageSize={PAGE_SIZE.audit} total={total} noun="events" hrefFor={(n) => href({ page: String(n) })} />
      </div>
      <p className="sample-note">The log shows who did what, never the content of sessions.</p>
      <SampleNote />
    </NavPage>
  );
}
