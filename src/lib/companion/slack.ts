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

// ── AI coaching in a thread ──────────────────────────────────────────────────────────

/** Slack mrkdwn from the AI coach's Markdown, split to fit Slack's 3,000-character sections. */
function coachSections(text: string): Block[] {
  const mrkdwn = text.replace(/\*\*(.+?)\*\*/g, '*$1*').replace(/^#{1,6}\s+(.+)$/gm, '*$1*').replace(/^\s*[-*]\s+/gm, '• ');
  const out: Block[] = [];
  for (let rest = mrkdwn || 'The AI coach sent an empty reply.'; rest.length; ) {
    let cut = rest.length <= 2900 ? rest.length : rest.lastIndexOf('\n', 2900);
    if (cut < 1000) cut = 2900;
    out.push({ type: 'section', text: md(rest.slice(0, cut)) });
    rest = rest.slice(cut).trimStart();
  }
  return out;
}

async function coachBlocks(conversationId: string, text: string): Promise<Block[]> {
  const conv = await db.coachingConversation.findUniqueOrThrow({ where: { id: conversationId } });
  const { coachById } = await import('../coaching/coaches');
  const label = `*BiTSy AI coach* · ${coachById(conv.agentName).name} · AI, not a person${conv.provider === 'sample' ? ' · sample replies' : ''}`;
  const value = JSON.stringify({ v: conv.id });
  return [
    { type: 'context', elements: [md(label)] },
    ...coachSections(text),
    { type: 'context', elements: [md('Reply in this thread to keep talking.')] },
    { type: 'actions', elements: [
      { type: 'button', action_id: 'cc:conv:propose', text: plain('Suggest this as an action'), value },
      { type: 'button', action_id: 'cc:conv:end', text: plain('End conversation'), value },
    ] },
  ];
}

async function postCoachReply(conversationId: string, channel: string, threadTs: string, text: string, replaceTs?: string) {
  const client = slackApp().client;
  const blocks = (await coachBlocks(conversationId, text)) as never;
  const fallback = text.slice(0, 2900) || 'AI coach reply';
  if (replaceTs) await client.chat.update({ channel, ts: replaceTs, text: fallback, blocks });
  else await client.chat.postMessage({ channel, thread_ts: threadTs, text: fallback, blocks });
}

/** After "Talk it through": the conversation lives in the feedback message's thread. */
export async function openCoachingThread(messageId: string) {
  const m = await db.companionMessage.findUniqueOrThrow({ where: { id: messageId } });
  const conversationId = (m.response as { conversationId?: string } | null)?.conversationId;
  if (!conversationId || !m.slackChannel || !m.slackTs) return;
  const conv = await db.coachingConversation.findUniqueOrThrow({ where: { id: conversationId } });
  if (conv.slackThreadTs) return; // already open in this thread
  await db.coachingConversation.update({ where: { id: conv.id }, data: { slackChannel: m.slackChannel, slackThreadTs: m.slackTs } });
  const { latestCoachReply } = await import('../coaching/conversations');
  await postCoachReply(conv.id, m.slackChannel, m.slackTs, await latestCoachReply(conv.id));
}

/** Who a Slack user is in the prototype. With SLACK_TEST_USER_ID every coachee is you; prefer the live-test person. */
async function coacheeForSlackUser(slackUserId: string) {
  if (process.env.SLACK_TEST_USER_ID) {
    if (slackUserId !== process.env.SLACK_TEST_USER_ID) return null;
    return db.user.findFirst({ where: { role: 'coachee', liveClock: true, status: 'active' }, orderBy: { createdAt: 'desc' } });
  }
  return db.user.findFirst({ where: { role: 'coachee', slackUserId } });
}

export async function handleDirectMessage(evt: { user?: string; text?: string; ts: string; thread_ts?: string; channel: string }) {
  const client = slackApp().client;
  const text = (evt.text ?? '').trim();
  if (!evt.user || !text) return;
  const { sendTurn, startGeneral } = await import('../coaching/conversations');
  if (evt.thread_ts && evt.thread_ts !== evt.ts) {
    const conv = await db.coachingConversation.findFirst({ where: { slackChannel: evt.channel, slackThreadTs: evt.thread_ts } });
    if (!conv) return; // a reply to a message that isn't a conversation: nothing to do
    const owner = await coacheeForSlackUser(evt.user);
    if (owner && owner.id !== conv.coacheeId && !process.env.SLACK_TEST_USER_ID) return;
    if (conv.status !== 'active') {
      await client.chat.postMessage({ channel: evt.channel, thread_ts: evt.thread_ts, text: 'This conversation has ended. Send me a new message to start another one.' });
      return;
    }
    const placeholder = await client.chat.postMessage({ channel: evt.channel, thread_ts: evt.thread_ts, text: 'The AI coach is thinking…', blocks: [{ type: 'context', elements: [md('_The BiTSy AI coach is thinking…_')] }] as never });
    const result = await sendTurn(conv.id, conv.coacheeId, text);
    if ('error' in result) {
      await client.chat.update({ channel: evt.channel, ts: placeholder.ts!, text: result.error ?? 'Something went wrong.', blocks: [] as never });
      return;
    }
    const { latestCoachReply } = await import('../coaching/conversations');
    await postCoachReply(conv.id, evt.channel, evt.thread_ts, await latestCoachReply(conv.id), placeholder.ts);
    return;
  }
  // A new message: a general conversation in its own thread.
  const owner = await coacheeForSlackUser(evt.user);
  if (!owner) {
    await client.chat.postMessage({ channel: evt.channel, thread_ts: evt.ts, text: 'Sign in to the prototype with Google first (Live test page), then message me here.' });
    return;
  }
  const placeholder = await client.chat.postMessage({ channel: evt.channel, thread_ts: evt.ts, text: 'Starting a conversation with an AI coach…', blocks: [{ type: 'context', elements: [md('_Starting a conversation with a BiTSy AI coach…_')] }] as never });
  const started = await startGeneral(owner.id, text, { channel: evt.channel, threadTs: evt.ts });
  if ('error' in started) {
    await client.chat.update({ channel: evt.channel, ts: placeholder.ts!, text: started.error ?? 'Something went wrong.', blocks: [] as never });
    return;
  }
  const { latestCoachReply } = await import('../coaching/conversations');
  await postCoachReply(started.id!, evt.channel, evt.ts, await latestCoachReply(started.id!), placeholder.ts);
}

function registerHandlers(app: App) {
  // Direct messages to the companion (needs the im:history scope and the message.im event).
  app.message(async ({ message }) => {
    const msg = message as { subtype?: string; bot_id?: string; channel_type?: string; user?: string; text?: string; ts: string; thread_ts?: string; channel: string };
    if (msg.subtype || msg.bot_id || msg.channel_type !== 'im') return;
    try {
      await handleDirectMessage(msg);
    } catch (e) {
      console.error('[slack] coaching message failed', e);
      await slackApp().client.chat.postMessage({ channel: msg.channel, thread_ts: msg.thread_ts ?? msg.ts, text: 'Something went wrong talking to the AI coach. Try again in a moment.' });
    }
  });

  app.action('cc:conv:end', async ({ ack, action, client }) => {
    await ack();
    if (action.type !== 'button' || !action.value) return;
    const { v } = JSON.parse(action.value) as { v: string };
    const conv = await db.coachingConversation.findUnique({ where: { id: v } });
    if (!conv?.slackChannel || !conv.slackThreadTs) return;
    const { endCoaching } = await import('../coaching/conversations');
    await endCoaching(conv.id, conv.coacheeId);
    const ended = await db.coachingConversation.findUniqueOrThrow({ where: { id: conv.id } });
    const ins = (ended.insights ?? { keyTopics: [], insights: [] }) as { keyTopics?: string[]; insights?: string[] };
    const lines = [...(ins.insights ?? []).map((i) => `• ${i}`)];
    await client.chat.postMessage({
      channel: conv.slackChannel, thread_ts: conv.slackThreadTs, text: 'Conversation ended',
      blocks: [
        { type: 'context', elements: [md('*BiTSy AI coach* · AI, not a person')] },
        { type: 'section', text: md(`*Conversation ended.*${lines.length ? `\nWhat came out of it (AI summary):\n${lines.join('\n')}` : ''}`) },
        { type: 'context', elements: [md('Private to you unless you share it from the app.')] },
      ] as never,
    });
  });

  app.action('cc:conv:propose', async ({ ack, action, body, client }) => {
    await ack();
    if (action.type !== 'button' || !action.value || !('trigger_id' in body)) return;
    const { v } = JSON.parse(action.value) as { v: string };
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal', callback_id: 'cc_propose', private_metadata: JSON.stringify({ v }), title: plain('Suggest an action'), submit: plain('Send to my coach'), close: plain('Cancel'),
        blocks: [
          { type: 'section', text: md('Write the action in your own words. Your coach approves it before it becomes one of your actions. The AI never adds actions itself.') },
          { type: 'input', block_id: 'text', label: plain('Your action'), element: { type: 'plain_text_input', action_id: 'value', multiline: true, placeholder: plain("e.g. In Monday's team meeting, I'll ask a question first") } },
        ],
      } as never,
    });
  });

  app.view('cc_propose', async ({ ack, view, client }) => {
    const { v } = JSON.parse(view.private_metadata) as { v: string };
    const text = (view.state.values as Record<string, Record<string, { value?: string | null }>>).text?.value?.value?.trim() ?? '';
    const conv = await db.coachingConversation.findUnique({ where: { id: v }, include: { coachee: true } });
    if (!conv) return ack({ response_action: 'errors', errors: { text: "We couldn't find this conversation." } });
    const { proposeAction } = await import('../coaching/conversations');
    const result = await proposeAction(conv.id, conv.coacheeId, text);
    if ('error' in result) return ack({ response_action: 'errors', errors: { text: result.error ?? 'Something went wrong.' } });
    await ack();
    const engagement = await db.engagement.findFirst({ where: { coacheeId: conv.coacheeId }, include: { coach: true } });
    if (conv.slackChannel && conv.slackThreadTs) {
      await client.chat.postMessage({ channel: conv.slackChannel, thread_ts: conv.slackThreadTs, text: `Sent to ${engagement?.coach.name ?? 'your coach'} for approval: "${text}"` });
    }
  });

  app.action('cc:link', async ({ ack }) => { await ack(); });

  app.action(/^cc:choice:\d+$/, async ({ ack, action, body, client }) => {
    await ack();
    if (action.type !== 'button' || !action.value) return;
    const { m, c } = JSON.parse(action.value) as { m: string; c: string };
    const result = await respond(m, { choice: c });
    if ('error' in result) return postError(m, result.error);
    await refresh(m);
    if (c === 'coach') await openCoachingThread(m);
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
