// The Microsoft Teams app (Teams SDK). Optional: the web app works without it. Enabled with
// TEAMS_ENABLED=true (see teams/README.md). Teams posts to /api/messages on this server, which
// needs a public URL (a dev tunnel) for real Teams, or none for Microsoft 365 Agents Playground.
// Messages render from the same view model as Slack and the web simulator, and every button calls
// the same respond() handler.
//
// Prototype routing: Teams-first coachees' messages go to whoever last installed or messaged the
// bot (you), because the seeded coachees are synthetic people with no Teams accounts.
// STUB: BTS Studio engineering (per-coachee Teams accounts, tenant-wide install, token storage).

import { App, type HttpRouteHandler, type IHttpServerAdapter } from '@microsoft/teams.apps';
import type { IAdaptiveCard } from '@microsoft/teams.cards';
import { db } from '../db';
import { respond, type CompanionInput } from './respond';
import { teamsConversationFor, teamsCredentials } from './send';
import { buildView, type Choice, type MessageView } from './view';

type CardElement = Record<string, unknown>;

/** No app credentials: talking to Agents Playground on this machine, never real Teams. */
const playgroundMode = () => !teamsCredentials().clientId;

// ── Hosting inside Next.js ───────────────────────────────────────────────────────────
// The SDK registers its routes on this adapter; src/app/api/messages/route.ts passes requests in.

class NextRouteAdapter implements IHttpServerAdapter {
  readonly routes = new Map<string, HttpRouteHandler>();
  registerRoute(_method: 'POST', path: string, handler: HttpRouteHandler) {
    this.routes.set(path, handler);
  }
}

const g = globalThis as unknown as { __companionTeams?: Promise<{ app: App; adapter: NextRouteAdapter }> };

export function teamsApp() {
  if (!g.__companionTeams) {
    g.__companionTeams = (async () => {
      const adapter = new NextRouteAdapter();
      const app = new App({
        ...teamsCredentials(),
        httpServerAdapter: adapter,
        // Agents Playground sends no sign-in token. Only allowed without credentials and never in production.
        dangerouslyAllowUnauthenticatedRequests: playgroundMode() && process.env.NODE_ENV !== 'production',
      });
      registerHandlers(app);
      await app.initialize();
      return { app, adapter };
    })();
    g.__companionTeams.catch(() => { g.__companionTeams = undefined; });
  }
  return g.__companionTeams;
}

export async function startTeams() {
  await teamsApp();
  console.log(`[teams] listening on /api/messages${playgroundMode() ? ' (Agents Playground mode: no credentials, local only)' : ''}`);
}

/** Called by the Next.js route for POST /api/messages. */
export async function handleTeamsRequest(body: unknown, headers: Record<string, string>) {
  const { adapter } = await teamsApp();
  const handler = adapter.routes.get('/api/messages');
  if (!handler) return { status: 503, body: { error: 'Teams app not ready' } };
  return handler({ body, headers });
}

// ── Rendering ────────────────────────────────────────────────────────────────────────

const appUrl = () => process.env.APP_URL || 'http://localhost:3000';

const FORM_BUTTON: Record<string, string> = {
  reflection: 'Add what you noticed',
  reply: 'Reply',
  reason: 'Choose a reason',
  plan: 'Choose what to do',
  welcome: 'Set my check-in times',
};

const text = (t: string, extra: CardElement = {}): CardElement => ({ type: 'TextBlock', text: t, wrap: true, ...extra });
const small = (t: string) => text(t, { size: 'Small', isSubtle: true, spacing: 'Small' });
const choices = (list: Choice[]) => list.map((c) => ({ title: c.label, value: c.value }));

export function renderCard(v: MessageView): IAdaptiveCard {
  const body: CardElement[] = [
    // Every message is labelled as AI (EU AI Act Article 50 transparency).
    small(`**Coaching companion** · AI assistant · ${v.meta}`),
  ];
  if (v.title) body.push(text(v.title, { weight: 'Bolder', size: 'Medium' }));
  for (const p of v.paragraphs) body.push(text(p));
  for (const f of v.facts) body.push(small(f));
  for (const i of v.items) body.push(text(`**${i.label}**`, { spacing: 'Medium' }), text(i.text, { spacing: 'None' }));
  if (v.actions.length) {
    body.push(text(`**${v.actionsLabel ?? 'Your actions'}**`, { separator: true, spacing: 'Medium' }));
    for (const a of v.actions) body.push(text(`• ${a.text} _(${a.badge.label})_`, { spacing: 'Small' }));
  }
  if (v.badge) body.push(small(`Status: **${v.badge.label}**`));

  const actions: CardElement[] = v.choices.map((c) => ({
    type: 'Action.Execute',
    title: c.chosen ? `✓ ${c.label}` : c.label,
    verb: 'cc_choice',
    data: { action: 'cc_choice', m: v.id, c: c.value },
    ...(c.primary && !v.answered ? { style: 'positive' } : {}),
  }));
  if (v.form) {
    const answered = (v.form.type === 'reflection' || v.form.type === 'reply') && v.form.value ? v.form.value : null;
    if (answered) body.push(small(`You wrote: ${answered}`));
    if (v.form.type !== 'reflection' || v.choices.find((c) => c.chosen)?.value === 'tried' || v.kind === 'reflection_prompt') {
      actions.push({ type: 'Action.ShowCard', title: answered ? 'Change my answer' : FORM_BUTTON[v.form.type], card: formCard(v) });
    }
  }
  if (v.link) actions.push({ type: 'Action.OpenUrl', title: v.link.label, url: `${appUrl()}${v.link.href}` });
  if (v.note) body.push(small(v.note));

  return { type: 'AdaptiveCard', version: '1.5', body, actions } as unknown as IAdaptiveCard;
}

/** The form a message asks for, shown inside the card (Teams' equivalent of Slack's modal). */
function formCard(v: MessageView): CardElement {
  const f = v.form!;
  const submit = (body: CardElement[]) => ({
    type: 'AdaptiveCard',
    body,
    actions: [{ type: 'Action.Execute', title: f.submitLabel, verb: 'cc_form', data: { action: 'cc_form', m: v.id, f: f.type }, associatedInputs: 'auto', style: 'positive' }],
  });
  const textInput = (id: string, label: string, value: string, required = false) =>
    ({ type: 'Input.Text', id, label, value, isMultiline: true, isRequired: required, ...(required ? { errorMessage: 'Write a few words first.' } : {}) });
  switch (f.type) {
    case 'reflection':
    case 'reply':
      return submit([textInput('text', f.label, f.value, true)]);
    case 'reason':
      return submit([
        { type: 'Input.ChoiceSet', id: 'reason', label: "What's getting in the way?", style: 'expanded', isRequired: true, errorMessage: 'Choose a reason.', value: f.reasons.find((r) => r.chosen)?.value ?? '', choices: choices(f.reasons) },
        textInput('note', f.noteLabel, f.note),
      ]);
    case 'plan':
      return submit([
        { type: 'Input.ChoiceSet', id: 'choice', label: 'What would you like to do?', style: 'expanded', isRequired: true, errorMessage: 'Choose what to do.', value: f.options.find((o) => o.chosen)?.value ?? '', choices: choices(f.options) },
        textInput('swap', `${f.swapLabel} (if you swap)`, f.swapText),
        small(f.note),
      ]);
    case 'welcome': {
      const times = (id: string, label: string, list: string[], chosen: string) =>
        ({ type: 'Input.ChoiceSet', id, label, style: 'compact', value: list.includes(chosen) ? chosen : list[0], choices: list.map((t) => ({ title: t, value: t })) });
      return submit([
        times('midday', 'Midday check-in', ['12:00', '12:30', '13:00'], f.midday),
        times('endOfDay', 'End-of-day check-in', ['17:00', '17:30', '18:00'], f.endOfDay),
        { type: 'Input.Toggle', id: 'calendar', title: 'Use my calendar to time check-ins', valueOn: 'yes', valueOff: 'no', value: f.useCalendar ? 'yes' : 'no' },
      ]);
    }
  }
}

const asMessage = (card: IAdaptiveCard, fallback: string) => ({
  type: 'message' as const,
  text: fallback,
  attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: card }],
});

// ── Delivery ─────────────────────────────────────────────────────────────────────────

export async function deliverToTeams(messageId: string) {
  const m = await db.companionMessage.findUniqueOrThrow({ where: { id: messageId } });
  const conv = await teamsConversationFor(m.recipientId);
  if (!conv) throw new Error('Nobody has installed the Teams app yet');
  const { app } = await teamsApp();
  const card = renderCard(await buildView(m));
  const api = app.api.clone({ serviceUrl: conv.serviceUrl });
  const res = await api.conversations.activities(conv.conversationId).create(asMessage(card, m.text) as never);
  await db.companionMessage.update({ where: { id: m.id }, data: { teamsConversationId: conv.conversationId, teamsActivityId: res.id ?? null } });
}

// ── Interactions ─────────────────────────────────────────────────────────────────────

async function remember(activity: { from: { id: string; name?: string }; conversation: { id: string; conversationType?: string }; serviceUrl?: string }) {
  if (activity.conversation.conversationType && activity.conversation.conversationType !== 'personal') return;
  if (!activity.serviceUrl) return;
  const data = { name: activity.from.name ?? 'Teams user', conversationId: activity.conversation.id, serviceUrl: activity.serviceUrl.replace(/\/+$/, '') };
  await db.teamsConversation.upsert({ where: { id: activity.from.id }, create: { id: activity.from.id, ...data }, update: data });
}

const HELLO = "Hi, I'm the coaching companion (prototype, synthetic data). Messages for Teams-first coachees, such as Elena Duarte at Halden, will arrive in this chat. Send one from the prototype's companion chat page.";

function registerHandlers(app: App) {
  app.on('install.add', async ({ activity, send }) => {
    await remember(activity);
    await send(HELLO);
  });

  app.on('message', async ({ activity, send }) => {
    await remember(activity);
    await send(HELLO);
  });

  app.on('card.action', async ({ activity }) => {
    const data = (activity.value?.action?.data ?? {}) as Record<string, string>;
    const m = data.m;
    if (!m) return { statusCode: 200 as const, type: 'application/vnd.microsoft.activity.message' as const, value: 'This message is no longer available.' };

    let input: CompanionInput;
    if (data.action === 'cc_choice') input = { choice: data.c };
    else if (data.f === 'reason') input = { reason: data.reason, note: data.note ?? '' };
    else if (data.f === 'plan') input = { choice: data.choice, swapText: data.swap ?? '' };
    else if (data.f === 'welcome') input = { midday: data.midday, endOfDay: data.endOfDay, useCalendar: data.calendar === 'yes' };
    else input = { text: data.text ?? '' };

    const result = await respond(m, input);
    if ('error' in result) return { statusCode: 200 as const, type: 'application/vnd.microsoft.activity.message' as const, value: result.error };
    // Redraw the card in place so it shows the chosen button and any answer.
    const msg = await db.companionMessage.findUniqueOrThrow({ where: { id: m } });
    return { statusCode: 200 as const, type: 'application/vnd.microsoft.card.adaptive' as const, value: renderCard(await buildView(msg)) };
  });
}
