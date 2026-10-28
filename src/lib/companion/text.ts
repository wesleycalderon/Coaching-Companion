import type { Client } from '@prisma/client';

/** "Transcripts are deleted after 7 days." in the client's own policy terms. */
export function retentionSentence(client: Pick<Client, 'capturePolicy' | 'retentionDays'>) {
  if (client.capturePolicy === 'companion_mode') return "Sessions aren't recorded. Recaps come from your coach's notes and your check-ins.";
  if (client.retentionDays === 0) return 'Transcripts are deleted right after analysis.';
  return `Transcripts are deleted after ${client.retentionDays} days.`;
}
