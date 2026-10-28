// CSV export of the audit log, with the page's filters. The export itself is audited.
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { AUDIT_CATEGORY_LABEL } from '@/lib/domain';
import { currentPersona } from '@/lib/persona';

export const dynamic = 'force-dynamic';

const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export async function GET(req: Request) {
  const persona = currentPersona();
  if (persona.role !== 'bts_admin') return new Response('Only BTS admins can export the audit log.', { status: 403 });
  const url = new URL(req.url);
  const clients = await db.client.findMany();
  const client = clients.find((c) => c.id === url.searchParams.get('client'));
  const type = url.searchParams.get('type') ?? '';
  const category = type in AUDIT_CATEGORY_LABEL ? type : null;
  const events = await db.auditEvent.findMany({
    where: { ...(client ? { clientId: client.id } : {}), ...(category ? { category } : {}) },
    include: { actor: true, client: true },
    orderBy: { at: 'desc' },
  });
  const by = (e: (typeof events)[number]) => (e.actor.role === 'bts_admin' ? 'BTS admin' : e.actor.role === 'system' ? 'Companion' : e.actor.name);
  const rows = [
    ['When (UTC)', 'Event', 'Type', 'What', 'By', 'Client'],
    ...events.map((e) => [e.at.toISOString().replace('T', ' ').slice(0, 16), e.label, AUDIT_CATEGORY_LABEL[e.category as keyof typeof AUDIT_CATEGORY_LABEL] ?? e.category, e.object, by(e), e.client?.name ?? 'All clients']),
  ];
  await audit({
    actorId: persona.userId, action: 'create', category: 'access', label: 'Audit log exported',
    object: `${events.length} events${category ? `, ${AUDIT_CATEGORY_LABEL[category as keyof typeof AUDIT_CATEGORY_LABEL].toLowerCase()} only` : ''}`, clientId: client?.id,
  });
  const name = `audit-log${client ? `-${client.id}` : ''}${category ? `-${category}` : ''}.csv`;
  return new Response(rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"` },
  });
}
