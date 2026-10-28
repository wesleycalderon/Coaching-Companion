// AI task 5: one short, specific nudge per slot, tied to the next calendar moment. With an API
// key Claude writes it (prompts/nudge-writer.md); without one, a plain template is used.
import type { Commitment } from '@prisma/client';
import { aiProvider, runTask } from '../ai/client';
import { NudgeSchema } from '../ai/schemas';

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function template(c: Commitment, slot: 'midday' | 'end_of_day') {
  if (slot === 'midday') return c.cueMoment ? `${c.cueMoment} is a good moment to ${lower(c.title)}.` : `Is there a moment today to ${lower(c.title)}?`;
  return `How did it go: ${lower(c.title)}?`;
}

export async function nudgeText(c: Commitment, slot: 'midday' | 'end_of_day'): Promise<string> {
  if (aiProvider() !== 'anthropic') return template(c, slot);
  try {
    const out = await runTask('nudge-writer', {
      slot: slot === 'midday' ? 'midday (around 12:00): point to an upcoming moment to try it' : 'end of day (around 17:00): ask how it went',
      action: c.ifThenText,
      cue: c.cueMoment ?? 'none given',
      status: c.status,
      calendar: '- Monday stand-up (weekly)\n- Team planning (Tuesdays)', // STUB: calendar integration
    }, NudgeSchema, { effort: 'low', transcriptHash: '' });
    return out.output.text.trim() || template(c, slot);
  } catch (e) {
    console.error('[nudge] AI nudge failed, using the template', e);
    return template(c, slot);
  }
}
