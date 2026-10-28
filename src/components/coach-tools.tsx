'use client';

// Forms for the coach tools (milestone 4). Server actions in src/lib/coach-actions.ts do the work.

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useFormState } from 'react-dom';
import { StatusBadge } from '@/ds/components';
import { askAboutPractice, askAboutSession, draftPlanFor, savePlan, saveGrowthArea, scheduleNextSession, shareManagerNote } from '@/lib/coach-actions';
import type { FormState } from '@/lib/session-actions';
import { ConfirmPanel } from './client';
import { Feedback, Submit } from './review-forms';

const EMPTY: FormState = {};

/** Clears a form after a successful submit. */
function useResetOnSuccess(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.message) ref.current?.reset(); }, [state]);
  return ref;
}

// ── Ask the AI ──────────────────────────────────────────────────────────────────────

export interface AnswerView {
  id: string;
  question: string;
  answer: string;
  from: string; // "from sessions 2, 3 and 4"
  when: string;
  sample: boolean;
  citations: Array<{ label: string; quote: string }>;
}

export function AnswerList({ answers }: { answers: AnswerView[] }) {
  if (!answers.length) return null;
  return (
    <div className="stack" aria-live="polite">
      {answers.map((a) => (
        <article key={a.id} className="subtle-panel stack stack--tight" aria-label={`AI answer to: ${a.question}`}>
          <div className="row row--wrap">
            <span className="overline grow">AI answer{a.from ? ` · ${a.from}` : ''} · {a.when}</span>
            {a.sample ? <StatusBadge tone="neutral" label="Sample output" /> : null}
          </div>
          <p className="strong">{a.question}</p>
          <p>{a.answer}</p>
          {a.citations.length ? (
            <ul className="citations">
              {a.citations.map((c, k) => <li key={k}><span className="text-subtle">{c.label}:</span> "{c.quote}"</li>)}
            </ul>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function AskSessionForm({ sessionId, who, sessionNumber, placeholder }: { sessionId: string; who: string; sessionNumber: number; placeholder: string }) {
  const [state, action] = useFormState(askAboutSession.bind(null, sessionId), EMPTY);
  const ref = useResetOnSuccess(state);
  const id = useId();
  return (
    <form ref={ref} action={action} className="stack">
      <div className="field">
        <label className="ecb-form-label" htmlFor={`${id}-q`}>Ask about this session</label>
        <div className="input-row">
          <input id={`${id}-q`} name="question" className="ecb-form-input" placeholder={placeholder} maxLength={300} required />
          <Submit label="Ask" pendingLabel="Asking…" />
        </div>
      </div>
      <fieldset className="fieldset fieldset--inline">
        <legend className="visually-hidden">What to search</legend>
        <label className="check"><input type="radio" name="scope" value="session" defaultChecked /> Session {sessionNumber} only</label>
        <label className="check"><input type="radio" name="scope" value="engagement" /> All sessions with {who}</label>
      </fieldset>
      <Feedback state={state.error ? state : EMPTY} />
    </form>
  );
}

export function AskPracticeForm() {
  const [state, action] = useFormState(askAboutPractice, EMPTY);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="stack">
      <div className="field">
        <label className="ecb-form-label" htmlFor="pq">Your question</label>
        <div className="input-row">
          <input id="pq" name="question" className="ecb-form-input" placeholder="Where do I tend to skip exploring options?" maxLength={300} required />
          <Submit label="Ask" pendingLabel="Asking…" />
        </div>
      </div>
      <Feedback state={state.error ? state : EMPTY} />
    </form>
  );
}

// ── Next-session plan ───────────────────────────────────────────────────────────────

export function DraftPlanButton({ sessionId, redraft, edited, className = 'ecb-btn-primary', label, ariaLabel }: { sessionId: string; redraft?: boolean; edited?: boolean; className?: string; label?: string; ariaLabel?: string }) {
  const [state, action] = useFormState(draftPlanFor.bind(null, sessionId), EMPTY);
  const form = useRef<HTMLFormElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); d.querySelector<HTMLButtonElement>('.dialog__foot .ecb-btn-secondary')?.focus(); }
    if (!open && d.open) d.close();
  }, [open]);
  const text = label ?? (redraft ? 'Redraft plan' : 'Draft plan');
  return (
    <form ref={form} action={action} className="stack stack--tight">
      {edited ? (
        <>
          <button className={className} type="button" aria-label={ariaLabel} onClick={() => setOpen(true)}>{text}</button>
          <dialog ref={dialog} className="dialog" aria-labelledby={titleId} onClose={() => setOpen(false)}>
            {open ? (
              <ConfirmPanel
                titleId={titleId}
                copy={{
                  title: 'Redraft this plan?',
                  body: <p className="text-body">A new draft replaces the focus and questions, including the changes you saved. Open actions and what the coachee wants to bring stay as they are.</p>,
                  undo: 'Your edits can’t be recovered after redrafting.',
                  confirmLabel: 'Replace with a new draft',
                }}
                onCancel={() => setOpen(false)}
                onConfirm={() => { setOpen(false); form.current?.requestSubmit(); }}
              />
            ) : null}
          </dialog>
        </>
      ) : <Submit className={className} label={text} pendingLabel="Drafting…" ariaLabel={ariaLabel} />}
      <Feedback state={state} />
    </form>
  );
}

export function PlanEditor({ sessionId, focus, evidence, questions, between, sample }: {
  sessionId: string;
  focus: string;
  evidence: Array<{ label: string; quote: string }>;
  questions: string[];
  between: ReactNode;
  sample: boolean;
}) {
  const [state, action] = useFormState(savePlan.bind(null, sessionId), EMPTY);
  const [editing, setEditing] = useState(false);
  const keyed = (qs: string[]) => qs.map((text, k) => ({ key: `q${k}-${Date.now()}`, text }));
  const [list, setList] = useState(() => keyed(questions));
  const focusAdded = useRef(false);
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => { if (state.message) setEditing(false); }, [state]);
  useEffect(() => { setList(keyed(questions)); }, [questions]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (focusAdded.current) {
      focusAdded.current = false;
      listRef.current?.querySelector<HTMLInputElement>('li:last-child input')?.focus();
    }
  }, [list]);
  const addQuestion = () => { focusAdded.current = true; setEditing(true); setList((l) => [...l, { key: `new-${Date.now()}`, text: '' }]); };
  const cancel = () => { setList(keyed(questions)); setEditing(false); };

  return (
    <form action={action} className="stack stack--200">
      <section aria-labelledby="f-head" className="card card--pad card--stack">
        <div className="row row--wrap">
          <h2 id="f-head" className="heading-xsmall heading-reset grow">Suggested focus</h2>
          {sample ? <StatusBadge tone="neutral" label="Sample draft" /> : <StatusBadge tone="info" label="AI draft" />}
        </div>
        {editing ? (
          <div className="field">
            <label className="ecb-form-label" htmlFor="focus">Focus for the session</label>
            <textarea id="focus" name="focus" className="ecb-form-input" rows={3} defaultValue={focus} maxLength={600} />
          </div>
        ) : <p className="text-body">{focus}</p>}
        {evidence.length && !editing ? (
          <ul className="citations">
            {evidence.map((c, k) => <li key={k}><span className="text-subtle">{c.label}:</span> "{c.quote}"</li>)}
          </ul>
        ) : null}
      </section>
      {between}
      <section aria-labelledby="q-head" className="card card--pad card--stack">
        <h2 id="q-head" className="heading-xsmall heading-reset">Questions to consider</h2>
        {editing ? (
          <ol ref={listRef} className="list list--edit">
            {list.map((q, k) => (
              <li key={q.key}>
                <div className="input-row">
                  <label className="visually-hidden" htmlFor={`q-${k}`}>Question {k + 1}</label>
                  <input id={`q-${k}`} name="question" className="ecb-form-input" value={q.text} maxLength={240} onChange={(e) => setList((l) => l.map((x) => (x.key === q.key ? { ...x, text: e.target.value } : x)))} />
                  <button className="ecb-btn-ghost" type="button" onClick={() => setList((l) => l.filter((x) => x.key !== q.key))} aria-label={`Remove question ${k + 1}`}>Remove</button>
                </div>
              </li>
            ))}
          </ol>
        ) : <ol className="list">{questions.map((q, k) => <li key={k}>{q}</li>)}</ol>}
        <div className="btn-row">
          {list.length < 7 ? <button className="ecb-btn-ghost" type="button" onClick={addQuestion}>Add a question</button> : null}
          {!editing ? <button className="ecb-btn-secondary" type="button" onClick={() => setEditing(true)}>Edit plan</button> : null}
        </div>
      </section>
      {editing ? (
        <div className="btn-row">
          <Submit label="Save plan" pendingLabel="Saving…" />
          <button className="ecb-btn-secondary" type="button" onClick={cancel}>Cancel</button>
        </div>
      ) : null}
      <Feedback state={state} />
    </form>
  );
}

export function ScheduleForm({ coacheeId, who, nextNumber, slots, noCapture }: { coacheeId: string; who: string; nextNumber: number; slots: Array<{ value: string; label: string }>; noCapture: string | null }) {
  const [state, action] = useFormState(scheduleNextSession.bind(null, coacheeId), EMPTY);
  return (
    <form action={action} className="card card--pad card--stack" aria-labelledby="sch-head">
      <h2 id="sch-head" className="heading-xsmall heading-reset">Schedule session {nextNumber}</h2>
      <p className="fine-print">Times that are free in both calendars.</p>
      <fieldset className="fieldset fieldset--tight">
        <legend className="visually-hidden">Proposed times</legend>
        {slots.map((slot, k) => (
          <label key={slot.value} className="check"><input type="radio" name="slot" value={slot.value} defaultChecked={k === 0} /> {slot.label}</label>
        ))}
      </fieldset>
      <div className="field">
        <label className="ecb-form-label" htmlFor="cap">Capture for this session</label>
        {noCapture ? (
          <>
            <select id="cap" name="capture" className="ecb-form-select" disabled><option value="none">{noCapture}</option></select>
            <input type="hidden" name="capture" value="none" />
          </>
        ) : (
          <select id="cap" name="capture" className="ecb-form-select" defaultValue="ask">
            <option value="ask">Ask {who} for consent</option>
            <option value="none">Run without capture</option>
          </select>
        )}
      </div>
      <Submit label={`Send invite to ${who}`} pendingLabel="Sending…" />
      <Feedback state={state} />
    </form>
  );
}

// ── Practice ────────────────────────────────────────────────────────────────────────

export function GrowthAreaForm({ value }: { value: string }) {
  const [state, action] = useFormState(saveGrowthArea, EMPTY);
  return (
    <form action={action} className="stack">
      <div className="field">
        <label className="ecb-form-label" htmlFor="ga">Your growth area</label>
        <div className="input-row input-row--stack-sm">
          <input id="ga" name="growthArea" className="ecb-form-input" defaultValue={value} maxLength={80} placeholder="For example, exploring options before the way forward" />
          <Submit className="ecb-btn-secondary" label="Save growth area" pendingLabel="Saving…" />
        </div>
      </div>
      <p className="fine-print">You choose this. Your coach manager sees it next to your trends.</p>
      <Feedback state={state} />
    </form>
  );
}

export function ManagerNoteForm({ coachId, coachFirst }: { coachId: string; coachFirst: string }) {
  const [state, action] = useFormState(shareManagerNote.bind(null, coachId), EMPTY);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="stack">
      <div className="field">
        <label className="ecb-form-label" htmlFor="mnote">Note for your next conversation with {coachFirst}</label>
        <textarea id="mnote" name="note" className="ecb-form-input" rows={2} maxLength={600} placeholder={`Visible to ${coachFirst}`} required />
      </div>
      <div><Submit label={`Share note with ${coachFirst}`} pendingLabel="Sharing…" /></div>
      <Feedback state={state} />
    </form>
  );
}
