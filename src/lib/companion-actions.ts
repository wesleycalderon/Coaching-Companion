'use server';

// Server actions for the simulated chat in the web app. They call the same handlers as Slack.
import { revalidatePath } from 'next/cache';
import { db } from './db';
import { currentPersona } from './persona';
import { respond, type CompanionInput } from './companion/respond';
import { sendConsentRequest, sendNudge, sendPreSessionPrompt, sendRecap, sendWelcome } from './companion/send';
import { runNudges } from './companion/scheduler';
import { now } from './format';

export interface ChatState { error?: string }

const CHAT_PATHS = ['/preview/slack-dm', '/preview/teams-companion-recap', '/coach/sessions'];
const refresh = () => CHAT_PATHS.forEach((p) => revalidatePath(p));

/** A coachee answers a message in the simulated chat. */
export async function answerMessage(messageId: string, _prev: ChatState, formData: FormData): Promise<ChatState> {
  const persona = currentPersona();
  const msg = await db.companionMessage.findUnique({ where: { id: messageId } });
  if (!msg) return { error: "We couldn't find that message." };
  // Prototype: anyone viewing the simulated chat answers as its coachee. STUB: BTS Studio engineering (auth).
  const actor = persona.role === 'coachee' ? persona.userId : msg.recipientId;
  const str = (k: string) => (formData.has(k) ? String(formData.get(k)) : undefined);
  const input: CompanionInput = {
    choice: str('choice'), text: str('text'), reason: str('reason'), note: str('note'), swapText: str('swapText'),
    midday: str('midday'), endOfDay: str('endOfDay'), useCalendar: formData.has('midday') ? formData.get('useCalendar') === 'on' : undefined,
  };
  const result = await respond(messageId, input, actor);
  refresh();
  return 'error' in result ? { error: result.error } : {};
}

export type TestSend = 'welcome' | 'consent' | 'prompt' | 'recap' | 'midday' | 'end_of_day' | 'scheduler_midday' | 'scheduler_end_of_day';

/** Prototype controls: send a message now instead of waiting for its moment. */
export async function sendTest(coacheeId: string, _prev: ChatState & { done?: string }, formData: FormData): Promise<ChatState & { done?: string }> {
  const what = String(formData.get('what')) as TestSend;
  const sessions = await db.session.findMany({ where: { engagement: { coacheeId } }, include: { summary: true }, orderBy: { scheduledAt: 'asc' } });
  const next = sessions.find((s) => s.scheduledAt > now() && s.captureStatus !== 'no_capture');
  const lastRecap = [...sessions].reverse().find((s) => s.summary?.status === 'approved');
  const action = await db.commitment.findFirst({ where: { approved: true, status: { in: ['not_started', 'tried', 'practiced'] }, session: { engagement: { coacheeId } } }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] });
  let done = 'Sent.';
  switch (what) {
    case 'welcome': await sendWelcome(coacheeId); break;
    case 'consent': if (!next) return { error: 'No upcoming session that can be captured.' }; await sendConsentRequest(next.id); break;
    case 'prompt': if (!next) return { error: 'No upcoming session.' }; await sendPreSessionPrompt(next.id); break;
    case 'recap': if (!lastRecap) return { error: 'No approved recap yet.' }; await sendRecap(lastRecap.id); break;
    case 'midday':
    case 'end_of_day': if (!action) return { error: 'No open action to nudge about.' }; await sendNudge(action.id, what); break;
    case 'scheduler_midday':
    case 'scheduler_end_of_day': {
      const log = await runNudges(new Date(), what === 'scheduler_midday' ? 'midday' : 'end_of_day');
      done = log.length ? `Scheduler sent ${log.length} messages (everyone with an open action, within each client's daily limit).` : 'Scheduler sent nothing: daily limits reached or no open actions.';
      break;
    }
  }
  refresh();
  return { done };
}
