'use client';

import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { StatusBadge } from '@/ds/components';
import { answerMessage, sendTest, type ChatState } from '@/lib/companion-actions';
import type { MessageView } from '@/lib/companion/view';

function Pending({ label, className = 'ecb-btn-primary', name, value, disabled, pressed }: { label: string; className?: string; name?: string; value?: string; disabled?: boolean; pressed?: boolean }) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" name={name} value={value} disabled={disabled || pending} aria-pressed={pressed}>{label}</button>;
}

function ErrorLine({ state }: { state: ChatState }) {
  return state.error ? <div role="alert" className="row row--top text-body"><StatusBadge tone="danger" label="Not sent" /><span className="grow">{state.error}</span></div> : null;
}

export function ChatMessageBody({ view: v }: { view: MessageView }) {
  const [state, action] = useFormState(answerMessage.bind(null, v.id), {} as ChatState);
  const chosen = v.choices.find((c) => c.chosen)?.value;
  const plainKinds = v.kind === 'ack' || v.kind === 'pre_session_prompt';
  const choiceButtons = v.choices.length ? (
    <form action={action} className="btn-row">
      {v.choices.map((c) => (
        <Pending key={c.value} name="choice" value={c.value} label={c.label} pressed={c.chosen}
          className={c.primary && !v.answered ? 'ecb-btn-primary' : `ecb-btn-secondary${c.chosen ? ' ecb-btn-secondary-active' : ''}`}
          disabled={v.answered && v.kind !== 'check_in' ? true : v.kind === 'check_in' && Boolean(chosen)} />
      ))}
    </form>
  ) : null;

  const body = (
    <>
      {v.title ? (
        <div className="row row--tight">
          <span className={`grow ${v.kind === 'check_in' || v.kind === 'set_aside_reason' || v.kind === 'set_aside_plan' || v.kind === 'reflection_prompt' ? 'dm-card__question' : 'dm-card__title'}`}>{v.title}</span>
          {v.badge && v.kind === 'recap' ? <StatusBadge tone={v.badge.tone} label={v.badge.label} /> : null}
        </div>
      ) : null}
      {v.paragraphs.map((p, i) => <p key={i} className={v.kind === 'recap' ? 'fine-print' : 'text-body'}>{p}</p>)}
      {v.facts.length ? <div className="stack stack--tight fine-print">{v.facts.map((f) => <span key={f}>{f}</span>)}</div> : null}
      {v.items.length ? <div className="stack stack--100 text-body">{v.items.map((i, k) => <div key={k}><span className="overline">{i.label}</span><br />{i.text}</div>)}</div> : null}
      {v.actions.length ? (
        <div className="dm-card__split">
          <span className="overline">{v.actionsLabel}</span>
          {v.actions.map((a, k) => <div key={k} className="row row--top row--tight text-body"><span className="grow">{a.text}</span><StatusBadge tone={a.badge.tone} label={a.badge.label} /></div>)}
        </div>
      ) : null}
      {v.link ? <Link className="text-small" href={v.link.href}>{v.link.label}</Link> : null}
      {choiceButtons}
      {v.form ? <MessageFormFields view={v} action={action} /> : null}
      {v.note ? <p className="fine-print">{v.note}</p> : null}
      <ErrorLine state={state} />
    </>
  );

  if (v.kind === 'ack') {
    return <div className="row row--tight text-body"><span className="grow">{v.paragraphs[0]}</span>{v.badge ? <StatusBadge tone={v.badge.tone} label={v.badge.label} /> : null}</div>;
  }
  return plainKinds ? <div className="stack">{body}</div> : <div className="dm-card">{body}</div>;
}

function MessageFormFields({ view: v, action }: { view: MessageView; action: (formData: FormData) => void }) {
  const f = v.form!;
  const id = (k: string) => `${v.id}-${k}`;
  switch (f.type) {
    case 'reflection':
    case 'reply':
      return (
        <form action={action} className="stack">
          <div className="field">
            <label className="ecb-form-label" htmlFor={id('text')}>{f.label}</label>
            <textarea id={id('text')} name="text" className="ecb-form-input" rows={3} defaultValue={f.value} />
          </div>
          <div><Pending label={f.submitLabel} /></div>
        </form>
      );
    case 'reason':
      return (
        <form action={action} className="stack">
          <fieldset className="fieldset fieldset--tight" disabled={v.answered}>
            <legend className="visually-hidden">Reason for setting aside</legend>
            {f.reasons.map((r) => <label key={r.value} className="check"><input type="radio" name="reason" value={r.value} defaultChecked={r.chosen} /> {r.label}</label>)}
          </fieldset>
          <div className="field">
            <label className="ecb-form-label" htmlFor={id('note')}>{f.noteLabel}</label>
            <textarea id={id('note')} name="note" className="ecb-form-input" rows={2} defaultValue={f.note} disabled={v.answered} />
          </div>
          <div><Pending label={f.submitLabel} disabled={v.answered} /></div>
        </form>
      );
    case 'plan':
      return (
        <form action={action} className="stack">
          <fieldset className="fieldset fieldset--tight" disabled={v.answered}>
            <legend className="visually-hidden">What to do with this action</legend>
            {f.options.map((o) => <label key={o.value} className="check check--top"><input type="radio" name="choice" value={o.value} defaultChecked={o.chosen} /> {o.label}</label>)}
          </fieldset>
          <div className="field">
            <label className="ecb-form-label" htmlFor={id('swap')}>{f.swapLabel} (if you swap)</label>
            <input id={id('swap')} name="swapText" className="ecb-form-input" defaultValue={f.swapText} disabled={v.answered} placeholder="Ask Sam for 15 minutes on Monday" />
          </div>
          <p className="fine-print">{f.note}</p>
          <div><Pending label={f.submitLabel} disabled={v.answered} /></div>
        </form>
      );
    case 'welcome':
      return (
        <form action={action} className="stack">
          <div className="grid grid--2">
            <div className="field"><label className="ecb-form-label" htmlFor={id('mid')}>Midday</label><select id={id('mid')} name="midday" className="ecb-form-select" defaultValue={f.midday}><option>12:00</option><option>12:30</option><option>13:00</option></select></div>
            <div className="field"><label className="ecb-form-label" htmlFor={id('eod')}>End of day</label><select id={id('eod')} name="endOfDay" className="ecb-form-select" defaultValue={f.endOfDay}><option>17:00</option><option>17:30</option><option>18:00</option></select></div>
          </div>
          <label className="check"><input type="checkbox" name="useCalendar" defaultChecked={f.useCalendar} /> Use my calendar to time check-ins before meetings</label>
          <p className="fine-print">I'll only read meeting titles and times, never their content.</p>
          <div><Pending label={f.submitLabel} /></div>
        </form>
      );
  }
}

const TEST_OPTIONS: Array<[string, string]> = [
  ['welcome', 'Welcome and check-in times'],
  ['consent', 'Consent request for the next session'],
  ['prompt', 'What to bring to the next session'],
  ['recap', 'Latest approved recap'],
  ['midday', 'Midday nudge for the newest open action'],
  ['end_of_day', 'End-of-day check-in for the newest open action'],
  ['scheduler_midday', 'Run the 12:00 scheduler slot for everyone'],
  ['scheduler_end_of_day', 'Run the 17:00 scheduler slot for everyone'],
];

export function TestControls({ coacheeId, sentToSlack }: { coacheeId: string; sentToSlack: number }) {
  const [state, action] = useFormState(sendTest.bind(null, coacheeId), {} as ChatState & { done?: string });
  return (
    <form action={action} className="card card--pad card--stack preview-stage__note">
      <h2 className="heading-xsmall heading-reset">Prototype controls</h2>
      <p className="fine-print">Send a message now instead of waiting for its moment. The scheduler normally runs at 12:00 and 17:00 in each coachee's time zone.{sentToSlack ? ` ${sentToSlack} messages in this chat were also delivered to Slack.` : ''}</p>
      <div className="field">
        <label className="ecb-form-label" htmlFor="what">Message to send</label>
        <select id="what" name="what" className="ecb-form-select">{TEST_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </div>
      <ErrorLine state={state} />
      {state.done ? <p role="status" className="fine-print">{state.done}</p> : null}
      <div><Pending label="Send now" className="ecb-btn-secondary" /></div>
    </form>
  );
}
