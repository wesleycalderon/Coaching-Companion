import { ResultsView } from '@/components/results';
import { allow, BackLink, NotFoundCard, WrongRole } from '@/components/ui';
import { db } from '@/lib/db';
import { clientMetrics, type Period } from '@/lib/metrics';

// BTS admins see a client's renewal metrics with the same minimum-group rule as the client.
export default async function AdminClientResultsPage({ params, searchParams }: { params: { id: string }; searchParams: { period?: string } }) {
  const path = `/admin/clients/${params.id}/results`;
  const persona = allow(['bts_admin']);
  if (!persona) return <WrongRole roles={['bts_admin']} path={path} />;
  const client = await db.client.findUnique({ where: { id: params.id } });
  if (!client) return <NotFoundCard what="client" />;
  const period: Period = searchParams.period === '30d' ? '30d' : 'all';
  const m = await clientMetrics(client.id, period);
  return (
    <div className="page">
      <ResultsView m={m} title={`${client.name} results`} periodHref={(p) => (p === 'all' ? path : `${path}?period=${p}`)}
        back={<BackLink href="/admin/clients">Back to clients</BackLink>} />
    </div>
  );
}
