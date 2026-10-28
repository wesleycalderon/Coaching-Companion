import Link from 'next/link';
import { ActionButton, ActionForm } from '@/components/admin-forms';
import { ConfirmButton } from '@/components/client';
import { ADMIN_NAV, allow, NavPage, PageHead, SampleNote, WrongRole } from '@/components/ui';
import { StatusBadge } from '@/ds/components';
import { nextVersion, USED_FOR, type RubricVersion } from '@/lib/admin';
import { addMarker, addModel, discardDraft, publishModel, removeMarker } from '@/lib/admin-actions';
import { db } from '@/lib/db';
import { MIN_MARKER_KAPPA, type RubricMarker } from '@/lib/domain';
import { asJson, count, fullDate } from '@/lib/format';

export default async function CoachingModelsPage({ searchParams }: { searchParams: { model?: string; add?: string; history?: string; done?: string } }) {
  const persona = allow(['bts_admin']);
  if (!persona) return <WrongRole roles={['bts_admin']} path="/admin/models" />;
  const [rubrics, clients] = await Promise.all([
    db.rubric.findMany({ include: { client: true }, orderBy: { sortOrder: 'asc' } }),
    db.client.findMany({ orderBy: { createdAt: 'asc' } }),
  ]);
  const selected = rubrics.find((r) => r.id === searchParams.model) ?? rubrics[0];
  const draft = asJson<RubricMarker[] | null>(selected.draftMarkers);
  const markers = draft ?? asJson<RubricMarker[]>(selected.markers);
  const editing = Boolean(draft) || selected.status === 'draft';
  const version = nextVersion(selected.version, selected.status);
  const history = asJson<RubricVersion[] | null>(selected.history) ?? [];
  const usedBy = clients.filter((c) => asJson<string[]>(c.activeRubricIds).includes(selected.id));
  const notice = ({
    published: `${selected.name} version ${selected.version} is published. New analyses use it from now on.`,
    'marker-removed': 'Marker removed from the draft. Publish to apply it.',
    discarded: 'Unpublished changes discarded.',
  } as Record<string, string>)[searchParams.done ?? ''];
  const modelHref = (over: Record<string, string> = {}) => `/admin/models?${new URLSearchParams({ model: selected.id, ...over })}`;

  return (
    <NavPage nav={ADMIN_NAV} navLabel="Admin" current="/admin/models">
      <PageHead title="Coaching models" lede="Rubrics the AI analyses sessions against. Each marker is a yes or no check with transcript evidence.">
        <Link className="ecb-btn-primary" href={modelHref({ add: 'model' })}>Add a model</Link>
      </PageHead>
      {notice ? <div role="status" className="card card--pad row row--top text-body"><StatusBadge tone="success" label="Saved" /><span className="grow">{notice}</span></div> : null}
      {searchParams.add === 'model' ? (
        <section aria-labelledby="am-head" className="card card--pad card--stack">
          <h2 id="am-head" className="heading-xsmall heading-reset">Add a coaching model</h2>
          <ActionForm action={addModel} submitLabel="Add model as draft" pendingLabel="Adding…" secondary={<Link className="ecb-btn-ghost" href={modelHref()}>Close</Link>}>
            <div className="grid grid--3">
              <div className="field"><label className="ecb-form-label" htmlFor="mn">Model name</label><input id="mn" name="name" className="ecb-form-input" required maxLength={60} autoComplete="off" /></div>
              <div className="field"><label className="ecb-form-label" htmlFor="mu">Used for</label><select id="mu" name="usedFor" className="ecb-form-select">{USED_FOR.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
              <div className="field"><label className="ecb-form-label" htmlFor="mc">Clients</label><select id="mc" name="client" className="ecb-form-select"><option value="all">All clients</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </div>
            <p className="fine-print">New models start as drafts. Add markers, then publish; clients turn it on in their policies.</p>
          </ActionForm>
        </section>
      ) : null}
      <div className="card card--scroll">
        <table className="table table--w-760">
          <thead><tr><th>Model</th><th>Used for</th><th>Version</th><th>Status</th><th>Clients</th></tr></thead>
          <tbody>
            {rubrics.map((r) => (
              <tr key={r.id} className={r.id === selected.id ? 'is-selected' : undefined}>
                <td className="cell-title"><Link href={`/admin/models?model=${r.id}`} aria-current={r.id === selected.id ? 'true' : undefined}>{r.name}</Link></td>
                <td>{r.usedFor}</td>
                <td>{r.version}</td>
                <td>
                  <div className="row row--tight row--wrap">
                    {r.status === 'published' ? <StatusBadge tone="success" label="Published" /> : <StatusBadge tone="neutral" label="Draft" />}
                    {r.status === 'published' && r.draftMarkers ? <StatusBadge tone="warning" label="Unpublished changes" /> : null}
                  </div>
                </td>
                <td>{r.client?.name ?? 'All'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section aria-labelledby="mk-head" className="card card--pad card--stack">
        <div className="row row--wrap">
          <h2 id="mk-head" className="heading-xsmall heading-reset grow">
            {editing ? `Draft of ${selected.name} ${version}` : `Markers in ${selected.name} ${selected.version}`}
          </h2>
          <Link className="ecb-btn-secondary" href={modelHref({ add: 'marker' })}>Add marker</Link>
        </div>
        {editing && selected.status === 'published' ? <p className="fine-print">Changes are saved as a draft. Analyses keep using version {selected.version} until you publish.</p> : null}
        {searchParams.add === 'marker' ? (
          <ActionForm action={addMarker.bind(null, selected.id)} clearOnSuccess submitLabel="Add to draft" pendingLabel="Adding…" className="subtle-panel stack" secondary={<Link className="ecb-btn-ghost" href={modelHref()}>Close</Link>}>
            <div className="grid grid--3">
              <div className="field"><label className="ecb-form-label" htmlFor="kn">Marker</label><input id="kn" name="name" className="ecb-form-input" required maxLength={80} autoComplete="off" /></div>
              <div className="field"><label className="ecb-form-label" htmlFor="kc">Yes or no check</label><input id="kc" name="check" className="ecb-form-input" required maxLength={160} autoComplete="off" placeholder="Coach asks …" /></div>
              <div className="field"><label className="ecb-form-label" htmlFor="kk">Agreement with raters (kappa)</label><input id="kk" name="kappa" type="number" min={0} max={1} step={0.01} className="ecb-form-input" required /></div>
            </div>
            <p className="fine-print">Measure agreement with PCC and MCC raters on consented sample transcripts first. Markers below {MIN_MARKER_KAPPA} stay hidden.</p>
          </ActionForm>
        ) : null}
        <div className="table-scroll">
          <table className="table table--flush table--w-640">
            <thead><tr><th>Marker</th><th>Yes or no check</th><th>Agreement with raters</th><th>Shown to users</th>{editing ? <th className="actions"><span className="visually-hidden">Actions</span></th> : null}</tr></thead>
            <tbody>
              {markers.length === 0 ? <tr><td colSpan={editing ? 5 : 4}>No markers yet. Add the first one.</td></tr> : null}
              {markers.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.check}</td>
                  <td>Kappa {m.kappa.toFixed(2)}</td>
                  <td>{m.kappa >= MIN_MARKER_KAPPA ? <StatusBadge tone="success" label="Shown" /> : <StatusBadge tone="warning" label={`Hidden, below ${MIN_MARKER_KAPPA}`} title={`Markers show only once agreement reaches ${MIN_MARKER_KAPPA}`} />}</td>
                  {editing ? <td className="actions"><ActionButton action={removeMarker.bind(null, selected.id, m.id)} label="Remove" pendingLabel="Removing…" ariaLabel={`Remove ${m.name} from the draft`} /></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fine-print">Agreement is measured against PCC and MCC raters on consented sample transcripts. Markers below {MIN_MARKER_KAPPA} stay hidden.</p>
        <div className="btn-row">
          {editing ? (
            <ConfirmButton label={`Publish version ${version}`} className="ecb-btn-primary" action={publishModel.bind(null, selected.id)} copy={{
              title: `Publish ${selected.name} ${version}?`,
              body: <p>{usedBy.length ? `New analyses for ${count(usedBy.length)} ${usedBy.length === 1 ? 'client' : 'clients'} use it from now on.` : 'No client uses this model yet; turn it on in a client’s policies.'} Feedback already given keeps the version it was made with.</p>,
              undo: 'A published version can’t be withdrawn. To change it, publish a new version.',
              confirmLabel: `Publish version ${version}`,
              confirmTone: 'primary',
            }} />
          ) : <span className="text-subtle">No unpublished changes.</span>}
          {draft && selected.status === 'published' ? <ActionButton action={discardDraft.bind(null, selected.id)} label="Discard changes" pendingLabel="Discarding…" className="ecb-btn-secondary" /> : null}
          <Link className="ecb-btn-ghost" href={searchParams.history ? modelHref() : modelHref({ history: '1' })} aria-expanded={Boolean(searchParams.history)}>{searchParams.history ? 'Hide version history' : 'Review version history'}</Link>
        </div>
        {searchParams.history ? (
          <div className="subtle-panel stack">
            <h3 className="text-body strong heading-reset">Version history</h3>
            <ul className="list text-body">
              {selected.status === 'published' ? <li>Version {selected.version}, in use{selected.publishedAt ? `, published ${fullDate(selected.publishedAt)}` : ''}: {count(asJson<RubricMarker[]>(selected.markers).length)} markers</li> : <li>Not published yet.</li>}
              {history.map((h) => <li key={h.version}>Version {h.version}, {h.publishedAt ? `published ${fullDate(new Date(h.publishedAt))}` : 'published before the prototype’s records'}: {count(h.markers.length)} markers</li>)}
              {selected.status === 'published' && history.length === 0 ? <li>No earlier versions in the prototype.</li> : null}
            </ul>
          </div>
        ) : null}
      </section>
      <SampleNote />
    </NavPage>
  );
}
