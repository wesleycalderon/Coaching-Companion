import { ResultsView } from '@/components/results';
import { allow, CLIENT_NAV, NavPage, WrongRole } from '@/components/ui';
import { db } from '@/lib/db';
import { clientMetrics, type Period } from '@/lib/metrics';

export default async function ClientResultsPage({ searchParams }: { searchParams: { period?: string } }) {
  const persona = allow(['client_admin']);
  if (!persona) return <WrongRole roles={['client_admin']} path="/client/results" />;
  const admin = await db.user.findUniqueOrThrow({ where: { id: persona.userId } });
  const period: Period = searchParams.period === '30d' ? '30d' : 'all';
  const m = await clientMetrics(admin.clientId!, period);
  return (
    <NavPage nav={CLIENT_NAV} navLabel="Client admin" current="/client/results">
      <ResultsView m={m} periodHref={(p) => (p === 'all' ? '/client/results' : `/client/results?period=${p}`)} />
    </NavPage>
  );
}
