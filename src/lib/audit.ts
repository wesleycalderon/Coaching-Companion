import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { db } from './db';
import type { AuditCategory, EventAction } from './domain';
import { eventTime } from './format';

/** Writes one audit event. Never put session content (quotes, questions, notes) in `object`. */
export function audit(e: { actorId: string; action: EventAction; category: AuditCategory; label: string; object: string; clientId?: string | null }, tx: Prisma.TransactionClient = db) {
  return tx.auditEvent.create({ data: { id: `audit-${randomUUID()}`, ...e, clientId: e.clientId ?? null, at: eventTime() } });
}
