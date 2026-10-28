import { ActionButton, ActionForm } from '@/components/admin-forms';
import { allow, CLIENT_NAV, NavPage, PageHead, Pagination, WrongRole } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
import { invitePerson, resendInvite } from '@/lib/admin-actions';
import { db } from '@/lib/db';

const PAGE = 10;

// Not on the canvas. Client admins invite their own coachees and see who is enrolled, but
// never anything about anyone's coaching: no coach, sessions, actions or results per person.
export default async function ClientCoacheesPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const persona = allow(['client_admin']);
  if (!persona) return <WrongRole roles={['client_admin']} path="/client/coachees" />;
  const admin = await db.user.findUniqueOrThrow({ where: { id: persona.userId }, include: { client: true } });
  const clientId = admin.clientId!;
  const enrolled = { clientId, role: 'coachee', status: { not: 'removed' } };
  const q = (searchParams.q ?? '').trim();
  const [active, waiting, invited, people] = await Promise.all([
    db.user.count({ where: { ...enrolled, coacheeEngagements: { some: {} } } }),
    db.user.count({ where: { ...enrolled, coacheeEngagements: { none: {} } } }),
    db.user.count({ where: { ...enrolled, status: 'invited' } }),
    db.user.findMany({ where: { ...enrolled, ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}) }, orderBy: { name: 'asc' } }),
  ]);
  const page = Math.max(1, Number(searchParams.page) || 1);
  const rows = people.slice((page - 1) * PAGE, page * PAGE);
  const href = (n: number) => `/client/coachees?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) })}`;

  return (
    <NavPage nav={CLIENT_NAV} navLabel="Client admin" current="/client/coachees">
      <PageHead title="Coachees" lede="Invite people into the program. BTS matches each coachee with a coach. You never see anyone's sessions, actions or results, only totals on the Results page." />
      <div className="grid grid--3">
        <div className="card card--pad metric-tile"><span className="overline">In coaching</span><span className="heading-medium-strong">{active}</span></div>
        <div className="card card--pad metric-tile"><span className="overline">Waiting for a coach</span><span className="heading-medium-strong">{waiting}</span></div>
        <div className="card card--pad metric-tile"><span className="overline">Invite not accepted</span><span className="heading-medium-strong">{invited}</span></div>
      </div>
      <section aria-labelledby="ci-head" className="card card--pad card--stack">
        <h2 id="ci-head" className="heading-xsmall heading-reset">Invite a coachee</h2>
        <ActionForm action={invitePerson.bind(null, clientId)} clearOnSuccess submitLabel="Send invite" pendingLabel="Inviting…" className="stack">
          <div className="grid grid--2">
            <div className="field"><label className="ecb-form-label" htmlFor="cn">Name</label><input id="cn" name="name" className="ecb-form-input" required maxLength={80} autoComplete="off" /></div>
            <div className="field"><label className="ecb-form-label" htmlFor="ce">Work email</label><input id="ce" name="email" type="email" className="ecb-form-input" required autoComplete="off" placeholder="name@company.com" /></div>
          </div>
          <p className="fine-print">Synthetic people only. The prototype doesn&apos;t send invite emails. To remove someone, contact your BTS program lead.</p>
        </ActionForm>
      </section>
      <form className="field field--max" role="search">
        <label className="ecb-form-label" htmlFor="cs">Search coachees</label>
        <input id="cs" name="q" className="ecb-form-input" placeholder="Name or email" defaultValue={q} />
      </form>
      <div className="card card--scroll">
        <table className="table table--w-520">
          <thead><tr><th>Name</th><th>Account</th><th className="actions"><span className="visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={3}>No coachees match this search.</td></tr> : null}
            {rows.map((p) => (
              <tr key={p.id}>
                <td><div className="cell-title">{p.name}</div><div className="cell-sub">{p.email}</div></td>
                <td>{p.status === 'invited' ? <StatusBadge tone="info" label="Invited" /> : <StatusBadge tone="success" label="Active" />}</td>
                <td className="actions">{p.status === 'invited' ? <ActionButton action={resendInvite.bind(null, p.id)} label="Resend invite" pendingLabel="Sending…" ariaLabel={`Resend invite to ${p.name}`} /> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} pageSize={PAGE} total={people.length} noun="coachees" hrefFor={href} />
      </div>
    </NavPage>
  );
}
