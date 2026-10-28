'use client';

// Client-side pieces: design-system controls that drive the URL, and the confirmation dialog.

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useFormState } from 'react-dom';
import { ChoiceChips, Tabs } from '@/ds/components';
import type { ChoiceChipItem, TabItem } from '@/ds/types';
import type { FormState } from '@/lib/session-actions';
import { Feedback } from './review-forms';

/** BTSStudio.Tabs whose selection is a link (?view=…), so views are shareable. */
export function LinkTabs({ tabs, value, ariaLabel, hrefs }: { tabs: TabItem[]; value: string; ariaLabel: string; hrefs: Record<string, string> }) {
  const router = useRouter();
  // The system's Tabs don't wrap; on a phone the row scrolls in its own box.
  return <div className="tabs-scroll"><Tabs tabs={tabs} value={value} ariaLabel={ariaLabel} onValueChange={(v) => router.push(hrefs[v])} /></div>;
}

/** BTSStudio.ChoiceChips that filter a list through the URL. */
export function LinkChips({ choices, value, ariaLabel, hrefs }: { choices: ChoiceChipItem[]; value: string; ariaLabel: string; hrefs: Record<string, string> }) {
  const router = useRouter();
  return <ChoiceChips choices={choices} value={value} ariaLabel={ariaLabel} onValueChange={(v) => router.push(hrefs[v])} />;
}

/** Native select that filters a list through the URL. */
export function FilterSelect({ id, label, value, options, hrefs, hideLabel }: { id: string; label: string; value: string; options: { value: string; label: string }[]; hrefs: Record<string, string>; hideLabel?: boolean }) {
  const router = useRouter();
  return (
    <div className="field">
      <label className={hideLabel ? 'visually-hidden' : 'ecb-form-label'} htmlFor={id}>{label}</label>
      <select id={id} className="ecb-form-select" value={value} onChange={(e) => router.push(hrefs[e.target.value])}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export interface ConfirmCopy {
  title: string;
  /** What will happen, who is affected. */
  body: ReactNode;
  /** Whether it can be undone. */
  undo: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Text the person must type before the confirm button enables, e.g. "delete". */
  typeToConfirm?: string;
  /** Confirm button style: danger for destructive actions (the default), primary otherwise. */
  confirmTone?: 'danger' | 'primary';
  extraAction?: ReactNode;
}

/** The dialog's inner panel. Also rendered statically on /preview/dialogs. */
export function ConfirmPanel({ copy, titleId, onCancel, onConfirm }: { copy: ConfirmCopy; titleId: string; onCancel?: () => void; onConfirm?: () => void }) {
  const [typed, setTyped] = useState('');
  const inputId = useId();
  const blocked = copy.typeToConfirm ? typed.trim().toLowerCase() !== copy.typeToConfirm : false;
  return (
    <div className="dialog-panel">
      <div className="dialog__head">
        <h2 id={titleId} className="heading-small heading-reset grow">{copy.title}</h2>
        <button className="ecb-modal-dismiss" type="button" aria-label="Close" onClick={onCancel}><span className="ecb-modal-dismiss-char" aria-hidden="true">×</span></button>
      </div>
      <div className="dialog__body">
        {copy.body}
        <p className="text-subtle">{copy.undo}</p>
        {copy.typeToConfirm ? (
          <div className="field">
            <label className="ecb-form-label" htmlFor={inputId}>Type {copy.typeToConfirm} to confirm</label>
            <input id={inputId} className="ecb-form-input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </div>
        ) : null}
      </div>
      <div className="dialog__foot">
        {copy.extraAction}
        <button className="ecb-btn-secondary" type="button" onClick={onCancel}>{copy.cancelLabel ?? 'Cancel'}</button>
        <button className={copy.confirmTone === 'primary' ? 'ecb-btn-primary' : 'ecb-btn-danger'} type="button" disabled={blocked} onClick={onConfirm}>{copy.confirmLabel}</button>
      </div>
    </div>
  );
}

/**
 * Trigger button plus a modal confirmation (native <dialog>: focus trap, Escape, backdrop).
 * Focus starts on the cancel button, so the dialog never defaults to confirm. With an
 * `action`, confirming runs it; without one, confirming is still a stub for that screen.
 */
export function ConfirmButton({ label, className = 'ecb-btn-ghost', copy, action, ariaLabel }: {
  label: string;
  className?: string;
  copy: ConfirmCopy;
  action?: (prev: FormState, fd: FormData) => Promise<FormState>;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [state, formAction] = useFormState(action ?? stubAction, {} as FormState);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      d.querySelector<HTMLButtonElement>('.dialog__foot .ecb-btn-secondary')?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return (
    <form ref={form} action={formAction} className="action-form">
      <button ref={trigger} className={className} type="button" aria-label={ariaLabel} onClick={() => setOpen(true)}>{label}</button>
      <dialog ref={ref} className="dialog" aria-labelledby={titleId} onClose={() => setOpen(false)}>
        {open ? <ConfirmPanel copy={copy} titleId={titleId} onCancel={close} onConfirm={() => { close(); if (action) form.current?.requestSubmit(); else setDone(true); }} /> : null}
      </dialog>
      {action ? <Feedback state={state} /> : done ? <span role="status" className="fine-print">Not saved: this action arrives in a later milestone.</span> : null}
    </form>
  );
}

async function stubAction(prev: FormState): Promise<FormState> {
  return prev;
}
