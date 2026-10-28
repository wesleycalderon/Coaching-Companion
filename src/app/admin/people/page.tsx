import Link from 'next/link';
import { ActionButton, ActionForm } from '@/components/admin-forms';
import { ConfirmButton, FilterSelect, LinkChips } from '@/components/client';
import { ADMIN_NAV, allow, NavPage, PageHead, Pagination, WrongRole } from '@/components/ui';
import { RoleBadge, StatusBadge } from '@/ds/components';
import { PAGE_SIZE } from '@/config';
import { pickClient } from '@/lib/admin';
import { assignCoach, importPeople, invitePerson, removePerson, resendInvite, restorePerson, setCaptureAllowed } from '@/lib/admin-actions';
import { db } from '@/lib/db';
import { ROLE_LABEL, type Role } from '@/lib/domain';
import { firstName } from '@/lib/format';

const FILTERS: Record<string, Role[]> = { all: ['coachee', 'coach', 'client_admin'], coachee: ['coachee'], coach: ['coach'], admin: ['client_admin'], removed: ['coachee', 'client_admin'] };

type Search = { client?: string; role?: string; q?: string; page?: string; coach?: string; change?: string; add?: string; done?: string; who?: string };

export default async function PeoplePage({ searchParams }: { searchParams: Search }) {
  const persona = allow(['bts_admin']);
  if (!persona) return <WrongRole roles={['bts_admin']} path="/admin/people" />;
  const clients = await db.client.findMany({ orderBy: { createdAt: 'asc' } });
  const client = pickClient(clients, searchParams.client);
  const role = FILTERS[searchParams.role ?? ''] ? searchParams.role! : 'all';
  const q = (searchParams.q ?? '').trim().toLowerCase();
  const allowlist = client.capturePolicy === 'allowlist';

  // A client's people: its own users plus the BTS coaches working with its coachees.
  const engagements = await db.engagement.findMany({ where: { clientId: client.id, coachee: { status: { not: 'removed' } } }, include: { coach: true } });
  const coachIds = [...new Set(engagements.map((e) => e.coachId))];
  const people = await db.user.findMany({
    where: { OR: [{ clientId: client.id }, { id: { in: coachIds } }] },
    include: { coacheeEngagements: { include: { coach: true } } },
    orderBy: { createdAt: 'asc' },
  });
  // Coach load across every client, as on the canvas.
  const loads = await db.engagement.groupBy({ by: ['coachId'], where: { coachId: { in: coachIds }, coachee: { status: { not: 'removed' } } }, _count: true });
  const coachLoad = (id: string) => loads.find((l) => l.coachId === id)?._count ?? 0;
  const current = people.filter((p) => p.status !== 'removed');
  const tally = (r: Role) => current.filter((p) => p.role === r).length;
  const coachFilter = searchParams.coach ? people.find((p) => p.id === searchParams.coach && p.role === 'coach') : undefined;
  const filtered = people.filter((p) =>
    FILTERS[role].includes(p.role as Role)
    && (role === 'removed' ? p.status === 'removed' : p.status !== 'removed')
    && (!coachFilter || p.coacheeEngagements.some((e) => e.clientId === client.id && e.coachId === coachFilter.id))
    && (!q || `${p.name} ${p.email}`.toLowerCase().includes(q)));
  const page = Math.max(1, Number(searchParams.page) || 1);
  const rows = filtered.slice((page - 1) * PAGE_SIZE.people, page * PAGE_SIZE.people);
  const base = { client: client.id, role, ...(q ? { q } : {}), ...(coachFilter ? { coach: coachFilter.id } : {}), ...(searchParams.page ? { page: searchParams.page } : {}) };
  const href = (over: Record<string, string | undefined>) => {
    const merged = Object.fromEntries(Object.entries({ ...base, ...over }).filter(([, v]) => v !== undefined)) as Record<string, string>;
    return `/admin/people?${new URLSearchParams(merged)}`;
  };
  const allCoaches = await db.user.findMany({ where: { role: 'coach' }, orderBy: { name: 'asc' } });
  const removedCount = people.filter((p) => p.status === 'removed').length;
  const short = client.name.split(' ')[0];
  const here = href({});
  // Result of the last assign, change, remove or restore (the row it came from may have moved).
  const subject = searchParams.who ? people.find((p) => p.id === searchParams.who) : undefined;
  const subjectCoach = subject?.coacheeEngagements.find((e) => e.clientId === client.id)?.coach.name;
  const notice = !subject ? null : ({
    assigned: `${subjectCoach} is assigned to ${subject.name}. The coach books the first session from their plan page.`,
    changed: `${subjectCoach} now coaches ${subject.name}.`,
    removed: `${subject.name} is removed. You can restore them from Removed within 30 days.`,
    restored: `${subject.name} is restored.${subject.role === 'coachee' ? ' Their coach books the next session.' : ''}`,
  } as Record<string, string>)[searchParams.done ?? ''] ?? null;

  return (
    <NavPage nav={ADMIN_NAV} navLabel="Admin" current="/admin/people">
      <PageHead title="People" lede={`${client.name} · ${tally('coachee')} coachees, ${tally('coach')} coaches, ${tally('client_admin')} client admins`}>
        <Link className="ecb-btn-secondary" href={href({ add: 'import' })} aria-current={searchParams.add === 'import' ? 'true' : undefined}>Import from CSV</Link>
        <Link className="ecb-btn-primary" href={href({ add: 'invite' })} aria-current={searchParams.add === 'invite' ? 'true' : undefined}>Invite people</Link>
      </PageHead>

      {notice ? <div role="status" className="card card--pad row row--top text-body"><StatusBadge tone="success" label="Saved" /><span className="grow">{notice}</span></div> : null}
      {searchParams.add === 'invite' ? (
        <section aria-labelledby="inv-head" className="card card--pad card--stack">
          <h2 id="inv-head" className="heading-xsmall heading-reset">Invite someone to {client.name}</h2>
          <ActionForm action={invitePerson.bind(null, client.id)} clearOnSuccess submitLabel="Send invite" pendingLabel="Inviting…" secondary={<Link className="ecb-btn-ghost" href={href({ add: undefined })}>Close</Link>}>
            <div className="grid grid--2">
              <div className="field"><label className="ecb-form-label" htmlFor="iname">Name</label><input id="iname" name="name" className="ecb-form-input" required maxLength={80} autoComplete="off" /></div>
              <div className="field"><label className="ecb-form-label" htmlFor="iemail">Email</label><input id="iemail" name="email" type="email" className="ecb-form-input" required autoComplete="off" placeholder="name@company.com" /></div>
              <div className="field"><label className="ecb-form-label" htmlFor="irole">Role</label><select id="irole" name="role" className="ecb-form-select"><option value="coachee">Coachee</option><option value="client_admin">Client admin</option></select></div>
              <div className="field"><label className="ecb-form-label" htmlFor="icoach">Coach, for coachees</label><select id="icoach" name="coach" className="ecb-form-select" defaultValue=""><option value="">Assign later</option>{allCoaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </div>
            <p className="fine-print">Synthetic people only. The prototype doesn&apos;t send invite emails.</p>
          </ActionForm>
        </section>
      ) : null}
      {searchParams.add === 'import' ? (
        <section aria-labelledby="imp-head" className="card card--pad card--stack">
          <h2 id="imp-head" className="heading-xsmall heading-reset">Import people into {client.name}</h2>
          <ActionForm action={importPeople.bind(null, client.id)} clearOnSuccess submitLabel="Import people" pendingLabel="Importing…" secondary={<Link className="ecb-btn-ghost" href={href({ add: undefined })}>Close</Link>}>
            <div className="field"><label className="ecb-form-label" htmlFor="csv">CSV file</label><input id="csv" name="file" type="file" accept=".csv,text/csv" className="ecb-form-input" required aria-describedby="csv-note" /></div>
            <p id="csv-note" className="fine-print">First row: name, email and, optionally, role (coachee or client admin; coachee if left out). Up to 500 people. Everyone is invited without a coach; assign coaches below.</p>
          </ActionForm>
        </section>
      ) : null}

      <div className="row row--wrap row--bottom">
        <FilterSelect id="pc" label="Client" value={client.id} options={clients.map((c) => ({ value: c.id, label: c.name }))}
          hrefs={Object.fromEntries(clients.map((c) => [c.id, `/admin/people?client=${c.id}`]))} />
        <form className="field basis-280" role="search">
          <input type="hidden" name="client" value={client.id} />
          <input type="hidden" name="role" value={role} />
          <label className="ecb-form-label" htmlFor="ps">Search people</label>
          <input id="ps" name="q" className="ecb-form-input" placeholder="Name or email" defaultValue={searchParams.q ?? ''} />
        </form>
        <LinkChips ariaLabel="Filter by role" value={role}
          choices={[{ value: 'all', label: 'All' }, { value: 'coachee', label: 'Coachees' }, { value: 'coach', label: 'Coaches' }, { value: 'admin', label: 'Client admins' }, ...(removedCount ? [{ value: 'removed', label: `Removed (${removedCount})` }] : [])]}
          hrefs={Object.fromEntries(Object.keys(FILTERS).map((r) => [r, href({ role: r, page: '1', coach: undefined, change: undefined })]))} />
      </div>
      {coachFilter ? (
        <div className="row row--tight text-body"><span>Coachees of {coachFilter.name} at {short}</span><Link className="ecb-btn-ghost" href={href({ coach: undefined, role: 'all', page: '1' })}>Show everyone</Link></div>
      ) : null}
      {allowlist ? <p className="fine-print">{client.name} captures allowlisted sessions only. Add a coachee to the allowlist to capture their sessions, with consent each time.</p> : null}

      <div className="card card--scroll">
        <table className="table table--w-760">
          <thead><tr><th>Name</th><th>Role</th><th>Coach</th><th>Status</th>{allowlist ? <th>Capture</th> : null}<th className="actions"><span className="visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={allowlist ? 6 : 5}>No people match this filter.</td></tr> : null}
            {rows.map((p) => {
              const eng = p.coacheeEngagements.find((e) => e.clientId === client.id);
              const removed = p.status === 'removed';
              const needsCoach = p.role === 'coachee' && !eng && !removed;
              const changing = searchParams.change === p.id && p.role === 'coachee' && !removed;
              const coachSelect = (id: string, label: string, defaultValue = '') => (
                <ActionForm action={assignCoach.bind(null, p.id, here)} submitLabel={label} pendingLabel="Saving…" className="inline-assign" buttonsClassName="row row--tight"
                  secondary={changing ? <Link className="ecb-btn-ghost" href={href({ change: undefined })}>Cancel</Link> : undefined}>
                  <div className="field">
                    <label className="visually-hidden" htmlFor={id}>{eng ? `New coach for ${p.name}` : `Coach for ${p.name}`}</label>
                    <select id={id} name="coach" className="ecb-form-select" defaultValue={defaultValue} required>
                      <option value="" disabled>Choose a coach</option>
                      {allCoaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </ActionForm>
              );
              return (
                <tr key={p.id}>
                  <td><div className="cell-title">{p.name}</div><div className="cell-sub">{p.email}</div></td>
                  <td><RoleBadge label={ROLE_LABEL[p.role as Role]} /></td>
                  <td className={p.role === 'coachee' ? undefined : 'text-subtle'}>
                    {p.role === 'coachee'
                      ? needsCoach ? coachSelect(`assign-${p.id}`, 'Assign')
                        : changing ? coachSelect(`change-${p.id}`, 'Change coach', eng?.coachId)
                        : eng ? eng.coach.name : 'None'
                      : p.role === 'coach' ? `${coachLoad(p.id)} coachees` : 'Not applicable'}
                    {changing ? <p className="fine-print">{firstName(p.name)}&apos;s approved recaps, actions and results move to the new coach.</p> : null}
                  </td>
                  <td>
                    {removed ? <StatusBadge tone="neutral" label="Removed" title="Deleted 30 days after removal" />
                      : needsCoach ? <StatusBadge tone="warning" label="Needs a coach" />
                      : p.status === 'invited' ? <StatusBadge tone="info" label="Invited" />
                      : <StatusBadge tone="success" label="Active" />}
                  </td>
                  {allowlist ? (
                    <td>
                      {p.role === 'coachee' && eng && !removed ? (
                        <div className="cell-stack">
                          <StatusBadge tone={eng.captureAllowed ? 'success' : 'neutral'} label={eng.captureAllowed ? 'On allowlist' : 'Not on allowlist'} />
                          <ActionButton action={setCaptureAllowed.bind(null, eng.id, !eng.captureAllowed)} label={eng.captureAllowed ? 'Take off allowlist' : 'Add to allowlist'} pendingLabel="Saving…" srOnlyResult ariaLabel={`${eng.captureAllowed ? 'Take' : 'Add'} ${p.name} ${eng.captureAllowed ? 'off the' : 'to the'} allowlist`} />
                        </div>
                      ) : <span className="text-subtle">Not applicable</span>}
                    </td>
                  ) : null}
                  <td className="actions">
                    <div className="row row--tight row--end">
                      {removed ? (
                        <ActionButton action={restorePerson.bind(null, p.id, here)} label="Restore" pendingLabel="Restoring…" ariaLabel={`Restore ${p.name}`} />
                      ) : p.role === 'coachee' ? (
                        <>
                          {eng && !changing ? <Link className="ecb-btn-ghost" href={href({ change: p.id })} aria-label={`Change coach for ${p.name}`}>Change coach</Link> : null}
                          <ConfirmButton label="Remove" ariaLabel={`Remove ${p.name}`} action={removePerson.bind(null, p.id, here)} copy={{
                            title: `Remove ${p.name} from ${short}?`,
                            body: <><p>{firstName(p.name)} loses access to the companion and their upcoming session is cancelled.</p><p>Their data is kept for 30 days in case they return, then deleted.</p></>,
                            undo: `You can restore ${firstName(p.name)} within 30 days.`,
                            confirmLabel: 'Remove participant',
                          }} />
                        </>
                      ) : p.role === 'coach' ? (
                        <Link className="ecb-btn-ghost" href={href({ coach: p.id, role: 'coachee', page: '1' })} aria-label={`View ${p.name}'s coachees at ${short}`}>View coachees</Link>
                      ) : (
                        <>
                          {p.status === 'invited' ? <ActionButton action={resendInvite.bind(null, p.id)} label="Resend invite" pendingLabel="Sending…" ariaLabel={`Resend invite to ${p.name}`} /> : null}
                          <ConfirmButton label="Remove access" ariaLabel={`Remove access for ${p.name}`} action={removePerson.bind(null, p.id, here)} copy={{
                            title: `Remove ${p.name}'s admin access?`,
                            body: <p>{firstName(p.name)} can no longer see {short}&apos;s results or change its settings.</p>,
                            undo: `You can restore ${firstName(p.name)} within 30 days.`,
                            confirmLabel: 'Remove access',
                          }} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination page={page} pageSize={PAGE_SIZE.people} total={filtered.length} noun="people" hrefFor={(n) => href({ page: String(n) })} />
      </div>
    </NavPage>
  );
}
