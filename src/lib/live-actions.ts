'use server';

// Live test: server actions for the start page and the Live test page.

import { revalidatePath } from 'next/cache';
import { refreshLiveNow, runLiveMeetings } from './live-meetings';
import { setLiveActions } from './live-user';
import { currentPersona } from './persona';
import type { FormState } from './session-actions';

const liveUser = () => {
  const p = currentPersona();
  return p.userId.startsWith('live-') ? p.userId : null;
};

export async function saveLiveActionsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const userId = liveUser();
  if (!userId) return { error: 'Sign in with Google first.' };
  const result = await setLiveActions(userId, [fd.get('action1'), fd.get('action2')].map((v) => String(v ?? '')));
  if ('error' in result) return { error: result.error };
  for (const path of ['/me/start', '/me', '/me/settings', '/me/meetings']) revalidatePath(path);
  return { message: 'Saved. Your meetings are checked against these actions.' };
}

/** Reads the calendar again and checks Zoom now, instead of waiting for the next minute. */
export async function checkNowAction(_prev: FormState, _fd: FormData): Promise<FormState> {
  const userId = liveUser();
  if (!userId) return { error: 'Sign in with Google first.' };
  await refreshLiveNow(userId);
  const log = await runLiveMeetings(true);
  for (const path of ['/live', '/me/start', '/me/settings', '/me/meetings']) revalidatePath(path);
  return { message: log.length ? `Checked: ${log.join('; ')}` : 'Checked. Nothing is due yet.' };
}
