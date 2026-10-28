'use client';

// Forms for the admin console. The fields are rendered on the server and passed in as
// children; these wrappers add the server action, pending state and the result message.

import { useFormState } from 'react-dom';
import { useEffect, useRef, type ReactNode } from 'react';
import type { FormState } from '@/lib/session-actions';
import { Feedback, Submit } from './review-forms';

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;
const EMPTY: FormState = {};

/** A form whose buttons sit below its fields: submit, and optionally reset ("Discard changes"). */
export function ActionForm({ action, children, submitLabel, pendingLabel, resetLabel, secondary, className = 'stack stack--200', buttonsClassName = 'btn-row', ariaLabelledBy, clearOnSuccess }: {
  action: Action;
  children: ReactNode;
  submitLabel: string;
  pendingLabel: string;
  resetLabel?: string;
  /** Extra controls after the buttons, such as a Cancel link. */
  secondary?: ReactNode;
  className?: string;
  buttonsClassName?: string;
  ariaLabelledBy?: string;
  /** Empty the fields after a successful save, for forms that add something. */
  clearOnSuccess?: boolean;
}) {
  const [state, formAction] = useFormState(action, EMPTY);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (clearOnSuccess && state.message) form.current?.reset();
  }, [state, clearOnSuccess]);
  return (
    <form ref={form} action={formAction} className={className} aria-labelledby={ariaLabelledBy}>
      {children}
      <Feedback state={state} />
      <div className={buttonsClassName}>
        <Submit label={submitLabel} pendingLabel={pendingLabel} />
        {resetLabel ? <button className="ecb-btn-secondary" type="reset">{resetLabel}</button> : null}
        {secondary}
      </div>
    </form>
  );
}

/** One button that runs an action, with its result shown next to it. */
export function ActionButton({ action, label, pendingLabel, className = 'ecb-btn-ghost', ariaLabel, children, srOnlyResult }: {
  action: Action;
  label: string;
  pendingLabel: string;
  className?: string;
  ariaLabel?: string;
  children?: ReactNode;
  /** Announce the result to screen readers only, when the page already shows the change. */
  srOnlyResult?: boolean;
}) {
  const [state, formAction] = useFormState(action, EMPTY);
  return (
    <form action={formAction} className="action-form">
      {children}
      <Submit className={className} label={label} pendingLabel={pendingLabel} ariaLabel={ariaLabel} />
      {srOnlyResult && !state.error ? <div className="visually-hidden"><Feedback state={state} /></div> : <Feedback state={state} />}
    </form>
  );
}
