import Link from 'next/link';
import { ADMIN_NAV, allow, NavPage, PageHead, Pagination, WrongRole } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
import { PAGE_SIZE } from '@/config';
import { captureLabel, retentionLabel, setupIssue } from '@/lib/admin';
import { db } from '@/lib/db';
import { REGION_LABEL } from '@/lib/domain';

export default async function AdminClientsPage({ searchParams }: { searchParams: { q?: string } }) {
  const persona = allow(['bts_admin']);
  if (!persona) return <WrongRole roles={['bts_admin']} path="/admin/clients" />;
  const q = (searchParams.q ?? '').trim();
  const clients = await db.client.findMany({
    where: q ? { name: { contains: q } } : undefined,
    include: { integrations: true, _count: { select: { users: { where: { role: 'coachee' } } } } },
    orderBy: { createdAt: 'asc' },
  });
  return (
    <NavPage nav={ADMIN_NAV} navLabel="Admin" current="/admin/clients">
      <PageHead title="Clients" lede="Each client has its own capture, retention and nudge policies.">
        <Link className="ecb-btn-primary" href="/admin/clients/new">Create client</Link>
      </PageHead>
      <form className="field field--max" role="search">
        <label className="ecb-form-label" htmlFor="search">Search clients</label>
        <input id="search" name="q" className="ecb-form-input" placeholder="Client name" defaultValue={q} />
      </form>
      <div className="card card--scroll">
        <table className="table table--w-760">
          <thead><tr><th>Client</th><th>Data region</th><th>Capture</th><th>Transcript retention</th><th>Coachees</th><th className="actions"><span className="visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            {clients.length === 0 ? <tr><td colSpan={6}>No clients match this search.</td></tr> : null}
            {clients.map((c) => {
              const issue = setupIssue(c);
              const cap = captureLabel(c);
              return (
                <tr key={c.id}>
                  <td className="cell-title">{c.name}</td>
                  <td>{REGION_LABEL[c.region]}</td>
                  <td>{issue ? <StatusBadge tone="warning" label="Setup incomplete" title={issue} /> : <StatusBadge tone={cap.tone} label={cap.label} />}</td>
                  <td>{retentionLabel(c)}</td>
                  <td>{c._count.users}</td>
                  <td className="actions">
                    <div className="row row--tight row--end">
                      <Link className="ecb-btn-ghost" href={`/admin/clients/${c.id}/results`} aria-label={`View results for ${c.name}`}>View results</Link>
                      <Link className="ecb-btn-ghost" href={`/admin/clients/${c.id}/policies`} aria-label={`${issue ? 'Finish setup' : 'Edit policies'} for ${c.name}`}>{issue ? 'Finish setup' : 'Edit policies'}</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination page={1} pageSize={PAGE_SIZE.clients} total={clients.length} noun="clients" hrefFor={() => '/admin/clients'} />
      </div>
    </NavPage>
  );
}
