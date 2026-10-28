// A small client for BiTSy's REST API (bitsy-google-adk). BiTSy runs the coaching agents; their
// prompts and BTS coaching IP stay on the BiTSy server, and this app only sends messages.
// Configured with BITSY_API_URL, BITSY_EMAIL and BITSY_PASSWORD (and BITSY_CLIENT_ID if the account
// belongs to more than one BiTSy client). Without them, coaching uses sample mode.
//
// Prototype: every coachee's conversations run under one BiTSy test account.
// STUB: BTS Studio engineering (a BiTSy account per coachee, service-to-service auth, data
// processing terms for what is sent to BiTSy and its memory service).

const REQUEST_TIMEOUT_MS = 150_000; // BiTSy can take a minute or two to reply.

/** COACHING_SAMPLE=true forces sample mode, for demos without a connection. */
export const bitsyConfigured = () => process.env.COACHING_SAMPLE !== 'true' && Boolean(process.env.BITSY_API_URL && process.env.BITSY_EMAIL && process.env.BITSY_PASSWORD);

interface Tokens { userId: string; access: string; refresh: string; expiresAt: number }

const g = globalThis as unknown as { __bitsyTokens?: Tokens; __bitsyLogin?: Promise<Tokens> };

const base = () => (process.env.BITSY_API_URL ?? '').replace(/\/+$/, '');

export class BitsyError extends Error {}

async function call(path: string, init: RequestInit & { token?: string } = {}) {
  const { token, ...rest } = init;
  try {
    return await fetch(`${base()}${path}`, {
      ...rest,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(rest.headers ?? {}) },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === 'TimeoutError';
    throw new BitsyError(timedOut ? 'The AI coach took too long to reply. Try sending your message again.' : "We couldn't reach the AI coach. Check your connection and try again.");
  }
}

async function readTokens(res: Response): Promise<Tokens> {
  const d = await res.json() as { user: { id: string }; access_token: string; refresh_token: string; expires_in?: number };
  return { userId: String(d.user.id), access: d.access_token, refresh: d.refresh_token, expiresAt: Date.now() + (d.expires_in ?? 1800) * 1000 };
}

async function login(): Promise<Tokens> {
  const body: Record<string, string> = { email: process.env.BITSY_EMAIL!, password: process.env.BITSY_PASSWORD! };
  if (process.env.BITSY_CLIENT_ID) body.client_id = process.env.BITSY_CLIENT_ID;
  const res = await call('/auth/login', { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) {
    console.error(`[bitsy] sign-in failed: ${res.status}`);
    throw new BitsyError(res.status === 401 ? "The coaching service didn't accept the test account. Check BITSY_EMAIL and BITSY_PASSWORD." : `The coaching service couldn't sign in (${res.status}).`);
  }
  return readTokens(res);
}

async function tokens(force = false): Promise<Tokens> {
  const t = g.__bitsyTokens;
  if (!force && t && t.expiresAt > Date.now() + 60_000) return t;
  if (!g.__bitsyLogin) {
    g.__bitsyLogin = (async () => {
      // Refresh when we can; sign in again when the refresh token has expired.
      if (t) {
        const res = await call('/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh_token: t.refresh }) });
        if (res.ok) {
          const d = await res.json() as { access_token: string; refresh_token: string; expires_in?: number };
          return { ...t, access: d.access_token, refresh: d.refresh_token, expiresAt: Date.now() + (d.expires_in ?? 1800) * 1000 };
        }
      }
      return login();
    })().finally(() => { g.__bitsyLogin = undefined; });
  }
  g.__bitsyTokens = await g.__bitsyLogin;
  return g.__bitsyTokens;
}

async function api<T>(method: string, path: (userId: string) => string, body?: unknown): Promise<T> {
  let t = await tokens();
  let res = await call(path(t.userId), { method, token: t.access, body: body === undefined ? undefined : JSON.stringify(body) });
  if (res.status === 401) {
    t = await tokens(true);
    res = await call(path(t.userId), { method, token: t.access, body: body === undefined ? undefined : JSON.stringify(body) });
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error(`[bitsy] ${method} ${path('{user}')} → ${res.status} ${detail.slice(0, 200)}`);
    throw new BitsyError(`The coaching service returned an error (${res.status}). Try again in a moment.`);
  }
  return (res.status === 204 ? {} : await res.json()) as T;
}

export async function startConversation(agentName: string, metadata: Record<string, unknown>) {
  const t = await tokens();
  const d = await api<{ id: string; agent_name?: string }>('POST', () => '/conversations', { user_id: t.userId, agent_name: agentName, metadata });
  return { id: String(d.id), agentName: d.agent_name ?? agentName };
}

export async function sendMessage(conversationId: string, content: string) {
  const d = await api<{ assistant_message?: { content?: string } }>('POST', () => `/conversations/${conversationId}/messages`, { content });
  return d.assistant_message?.content?.trim() ?? '';
}

/** BiTSy's own wrap-up: key topics and insights from the conversation. */
export async function wrapUpSummary(conversationId: string) {
  const d = await api<{ keyTopics?: string[]; key_topics?: string[]; insights?: string[] }>('POST', () => `/conversations/${conversationId}/wrapup-summary`, {});
  return { keyTopics: d.keyTopics ?? d.key_topics ?? [], insights: d.insights ?? [] };
}

/** Ends the conversation; BiTSy then summarizes it into the account's coaching memory. */
export async function endConversation(conversationId: string) {
  await api('DELETE', () => `/conversations/${conversationId}`);
}
