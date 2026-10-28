// The Slack app (Bolt for JavaScript, Socket Mode, so no public URL is needed). Optional: the
// web app works without it. Enabled with SLACK_ENABLED=true plus SLACK_BOT_TOKEN and
// SLACK_APP_TOKEN (see slack/README.md). Messages render from the same view model as the web
// simulator, and every button calls the same respond() handler.
//
// Prototype routing: SLACK_TEST_USER_ID sends every coachee's messages to one Slack user (you),
// because the seeded coachees are synthetic people with no Slack accounts.

import { App, LogLevel } from '@slack/bolt';
import { db } from '../db';
import { respond, type CompanionInput } from './respond';
import { buildView, type MessageView } from './view';

type Block = Record<string, unknown>;

const g = globalThis as unknown as { __companionSlack?: App };

export function slackApp(): App {
  if (!g.__companionSlack) {
    const app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      appToken: process.env.SLACK_APP_TOKEN,
      socketMode: true,
      logLevel: LogLevel.WARN,
    });
    registerHandlers(app);
    g.__companionSlack = app;
  }
  return g.__companionSlack;
}

export async function startSlack() {
  await slackApp().start();
  console.log('[slack] connected in Socket Mode');
}

// ── Rendering ────────────────────────────────────────────────────────────────────────

const plain = (text: string) => ({ type: 'plain_text', text: text.slice(0, 75), emoji: false });
const md = (text: string) => ({ type: 'mrkdwn', text });
const appUrl = () => process.env.APP_URL || 'http://localhost:3000';

const FORM_BUTTON: Record<string, string> = {
  reflection: 'Add what you noticed',
  reply: 'Reply',
  reason: 'Choose a reason',
  plan: 'Choose what to do',
  welcome: 'Set my check-in times',
};

export function renderBlocks(v: MessageView): Block[] {
  const blocks: Block[] = [
    // Every message is labelled as AI (EU AI Act Article 50 transparency).
    { type: 'context', elements: [md(`*Coaching companion* · AI assistant · ${v.meta}`)] },
  ];
  if (v.title) blocks.push({ type: 'section', text: md(`*${v.title}*`) });
  for (const p of v.paragraphs) blocks.push({ type: 'section', text: md(p) });
  if (v.facts.length) blocks.push({ type: 'context', elements: v.facts.map((f) => md(f)) });
  if (v.items.length) blocks.push({ type: 'section', text: md(v.items.map((i) => `*${i.label}*\n${i.text}`).join('\n\n')) });
  if (v.actions.length) {
    blocks.push({ type: 'divider' });
    blocks.push({ type: 'section', text: md(`*${v.actionsLabel ?? 'Your actions'}*\n${v.actions.map((a) => `• ${a.text} _(${a.badge.label})_`).join('\n')}`) });
  }
  if (v.badge) blocks.push({ type: 'context', elements: [md(`Status: *${v.badge.label}*`)] });
  const buttons: Block[] = v.choices.map((c, i) => ({
    type: 'button',
    action_id: `cc:choice:${i}`,
    text: plain(c.chosen ? `✓ ${c.label}` : c.label),
    value: JSON.stringify({ m: v.id, c: c.value }),
    ...(c.primary && !v.answered ? { style: 'primary' } : {}),
  }));
  if (v.form) {
    const answered = formAnswer(v);
    if (answered) blocks.push({ type: 'context', elements: [md(`You wrote: ${answered}`)] });
    if (v.form.type !== 'reflection' || v.choices.find((c) => c.chosen)?.value === 'tried' || v.kind === 'reflection_prompt') {
      buttons.push({ type: 'button', action_id: 'cc:form', text: plain(answered ? 'Change my answer' : FORM_BUTTON[v.form.type]), value: JSON.stringify({ m: v.id, f: v.form.type }) });
    }
  }
  if (v.link) buttons.push({ type: 'button', action_id: 'cc:link', text: plain(v.link.label), url: `${appUrl()}${v.link.href}` });
  if (buttons.length) blocks.push({ type: 'actions', elements: buttons });
  if (v.note) blocks.push({ type: 'context', elements: [md(v.note)] });
  return blocks;
}

function formAnswer(v: MessageView): string | null {
  const f = v.form!;
  if ((f.type === 'reflection' || f.type === 'reply') && f.value) return f.value;
  return null;
}

function modalFor(v: MessageView): Block {
  const f = v.form!;
  const base = { type: 'modal', callback_id: 'cc_form', private_metadata: JSON.stringify({ m: v.id, f: f.type }), title: plain('Coaching companion'), close: plain('Cancel'), submit: plain(f.submitLabel) };
  const textInput = (blockId: string, label: string, value: string, optional = false) => ({
    type: 'input', block_id: blockId, optional, label: plain(label),
    element: { type: 'plain_text_input', action_id: 'value', multiline: true, ...(value ? { initial_value: value } : {}) },
  });
  const radios = (blockId: string, label: string, options: Array<{ value: string; label: string; chosen?: boolean }>) => {
    const opts = options.map((o) => ({ text: plain(o.label), value: o.value }));
    const initial = opts[Math.max(0, options.findIndex((o) => o.chosen))];
    return { type: 'input', block_id: blockId, label: plain(label), element: { type: 'radio_buttons', action_id: 'value', options: opts, initial_option: initial } };
  };
  switch (f.type) {
    case 'reflection':
    case 'reply':
      return { ...base, blocks: [textInput('text', f.label, f.value)] };
    case 'reason':
      return { ...base, blocks: [radios('reason', "What's getting in the way?", f.reasons), textInput('note', f.noteLabel, f.note, true)] };
    case 'plan':
      return { ...base, blocks: [radios('choice', 'What would you like to do?', f.options), textInput('swap', `${f.swapLabel} (if you swap)`, f.swapText, true), { type: 'context', elements: [md(f.note)] }] };
    case 'welcome': {
      const times = (list: string[], chosen: string) => {
        const options = list.map((t) => ({ text: plain(t), value: t }));
        return { type: 'static_select', action_id: 'value', options, initial_option: options.find((o) => o.value === chosen) ?? options[0] };
      };
      return {
        ...base,
        blocks: [
          { type: 'input', block_id: 'midday', label: plain('Midday check-in'), element: times(['12:00', '12:30', '13:00'], f.midday) },
          { type: 'input', block_id: 'endOfDay', label: plain('End-of-day check-in'), element: times(['17:00', '17:30', '18:00'], f.endOfDay) },
          { type: 'input', block_id: 'calendar', optional: true, label: plain('Calendar'), element: { type: 'checkboxes', action_id: 'value', options: [{ text: plain('Use my calendar to time check-ins'), value: 'yes' }], ...(f.useCalendar ? { initial_options: [{ text: plain('Use my calendar to time check-ins'), value: 'yes' }] } : {}) } },
        ],
      };
    }
  }
}

// ── Delivery ─────────────────────────────────────────────────────────────────────────

async function slackUserFor(userId: string): Promise<string> {
  if (process.env.SLACK_TEST_USER_ID) return process.env.SLACK_TEST_USER_ID;
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.slackUserId) return user.slackUserId;
  const found = await slackApp().client.users.lookupByEmail({ email: user.email });
  if (!found.user?.id) throw new Error(`No Slack user for ${user.email}`);
  await db.user.update({ where: { id: userId }, data: { slackUserId: found.user.id } });
  return found.user.id;
}

export async function deliverToSlack(messageId: string) {
  const m = await db.companionMessage.findUniqueOrThrow({ where: { id: messageId } });
  const client = slackApp().client;
  const im = await client.conversations.open({ users: await slackUserFor(m.recipientId) });
  const channel = im.channel?.id;
  if (!channel) throw new Error('Could not open a direct message');
  const view = await buildView(m);
  const res = await client.chat.postMessage({ channel, text: m.text, blocks: renderBlocks(view) as never });
  await db.companionMessage.update({ where: { id: m.id }, data: { slackChannel: channel, slackTs: res.ts ?? null } });
}

/** Redraw a delivered message after the coachee answered it (shows the chosen button). */
async function refresh(messageId: string) {
  const m = await db.companionMessage.findUnique({ where: { id: messageId } });
  if (!m?.slackChannel || !m.slackTs) return;
  const view = await buildView(m);
  await slackApp().client.chat.update({ channel: m.slackChannel, ts: m.slackTs, text: m.text, blocks: renderBlocks(view) as never });
}

// ── Interactions ─────────────────────────────────────────────────────────────────────

async function postError(messageId: string, error: string) {
  const m = await db.companionMessage.findUnique({ where: { id: messageId } });
  if (m?.slackChannel) await slackApp().client.chat.postMessage({ channel: m.slackChannel, text: error });
}

function registerHandlers(app: App) {
  app.action('cc:link', async ({ ack }) => { await ack(); });

  app.action(/^cc:choice:\d+$/, async ({ ack, action, body, client }) => {
    await ack();
    if (action.type !== 'button' || !action.value) return;
    const { m, c } = JSON.parse(action.value) as { m: string; c: string };
    const result = await respond(m, { choice: c });
    if ('error' in result) return postError(m, result.error);
    await refresh(m);
    // "Tried it" asks for a reflection straight away.
    if (c === 'tried' && 'trigger_id' in body) {
      const msg = await db.companionMessage.findUniqueOrThrow({ where: { id: m } });
      const view = await buildView(msg);
      if (view.form) await client.views.open({ trigger_id: body.trigger_id, view: modalFor(view) as never });
    }
  });

  app.action('cc:form', async ({ ack, action, body, client }) => {
    await ack();
    if (action.type !== 'button' || !action.value || !('trigger_id' in body)) return;
    const { m } = JSON.parse(action.value) as { m: string };
    const msg = await db.companionMessage.findUniqueOrThrow({ where: { id: m } });
    const view = await buildView(msg);
    if (view.form) await client.views.open({ trigger_id: body.trigger_id, view: modalFor(view) as never });
  });

  app.view('cc_form', async ({ ack, view }) => {
    const { m, f } = JSON.parse(view.private_metadata) as { m: string; f: string };
    const v = view.state.values as Record<string, Record<string, { value?: string | null; selected_option?: { value: string } | null; selected_options?: Array<{ value: string }> }>>;
    const get = (block: string) => v[block]?.value;
    const input: CompanionInput =
      f === 'reason' ? { reason: get('reason')?.selected_option?.value, note: get('note')?.value ?? '' }
      : f === 'plan' ? { choice: get('choice')?.selected_option?.value, swapText: get('swap')?.value ?? '' }
      : f === 'welcome' ? { midday: get('midday')?.selected_option?.value, endOfDay: get('endOfDay')?.selected_option?.value, useCalendar: (get('calendar')?.selected_options?.length ?? 0) > 0 }
      : { text: get('text')?.value ?? '' };
    const result = await respond(m, input);
    if ('error' in result) {
      const block = f === 'plan' ? 'swap' : f === 'reason' ? 'reason' : f === 'welcome' ? 'midday' : 'text';
      await ack({ response_action: 'errors', errors: { [block]: result.error } });
      return;
    }
    await ack();
    await refresh(m);
  });
}
