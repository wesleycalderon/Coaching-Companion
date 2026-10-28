'use client';

// Forms for the session loop. Server actions do the work; these handle pending and error states.

import Link from 'next/link';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { StatusBadge } from '@/ds/components';
import { count } from '@/lib/format';
import { saveReview, simulateZoomTranscript, uploadTranscript, type FormState } from '@/lib/session-actions';

export function Submit({ label, pendingLabel, className = 'ecb-btn-primary', name, value, ariaLabel }: { label: string; pendingLabel: string; className?: string; name?: string; value?: string; ariaLabel?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" name={name} value={value} disabled={pending} aria-disabled={pending} aria-label={ariaLabel && !pending ? ariaLabel : undefined}>{pending ? pendingLabel : label}</button>;
}

export function Feedback({ state }: { state: FormState }) {
  if (state.error) return <div role="alert" className="row row--top text-body"><StatusBadge tone="danger" label="Not saved" /><span className="grow">{state.error}</span></div>;
  if (state.message) return <div role="status" className="row row--top text-body"><StatusBadge tone="success" label="Saved" /><span className="grow">{state.message}</span></div>;
  return null;
}

export function ZoomSimulator({ sessionId }: { sessionId: string }) {
  const [state, action] = useFormState(simulateZoomTranscript.bind(null, sessionId), {} as FormState);
  return (
    <form action={action} className="stack">
      <p className="fine-print">Local development: act as Zoom and send this session's synthetic transcript to the webhook.</p>
      <Feedback state={state} />
      <div><Submit className="ecb-btn-secondary" label="Simulate Zoom sending the transcript" pendingLabel="Waiting for the transcript…" /></div>
    </form>
  );
}

export function UploadForm({ sessionId, sampleMode, hasDraft }: { sessionId: string; sampleMode: boolean; hasDraft: boolean }) {
  const [state, action] = useFormState(uploadTranscript.bind(null, sessionId), {} as FormState);
  return (
    <form action={action} className="card card--pad card--stack">
      <h2 className="heading-xsmall heading-reset">Upload it yourself</h2>
      <div className="field">
        <label className="ecb-form-label" htmlFor="transcript">Transcript (.txt, .vtt, .json or .pdf)</label>
        <input id="transcript" name="transcript" type="file" accept=".txt,.vtt,.json,.pdf,text/plain,text/vtt,application/json,application/pdf" className="ecb-form-input" required />
      </div>
      <p className="fine-print">Text and PDF transcripts need a timestamp and speaker for each turn, like "[00:05] Daniel Okafor: How did it go?" or a "Daniel Okafor 00:05" heading above the words. Scanned PDFs without a text layer can't be read. Synthetic transcripts only in this prototype.</p>
      {sampleMode ? <p className="fine-print">No Anthropic API key is set, so only the seeded sample transcript (prisma/seed-data/transcripts/amara-session-2.txt) can be analyzed, using pre-written sample output.</p> : null}
      {hasDraft ? <p className="fine-print">Uploading again replaces the current draft.</p> : null}
      <Feedback state={state} />
      <div className="btn-row">
        <Submit label="Analyze transcript" pendingLabel="Analyzing transcript…" />
        <Link className="ecb-btn-secondary" href="/coach/sessions">Cancel</Link>
      </div>
    </form>
  );
}

export interface ReviewItem { label: string; text: string; evidence: string | null }
export interface ReviewAction { id: string; ifThenText: string; note: string; needsConfirmation: boolean; dueIso: string | null; approved: boolean }
export interface ReviewFollowUp { id: string; title: string; from: string; to: string; evidence: string | null; note: string }

export function ReviewForm(props: {
  sessionId: string;
  status: 'draft' | 'approved' | 'suppressed' | 'none';
  title: string;
  caption: string | null;
  sampleNote: string | null;
  items: ReviewItem[];
  actions: ReviewAction[];
  followUps: ReviewFollowUp[];
  observations: string;
  who: string;
  hasGoal: boolean;
  hasSuggestions: boolean;
  approvedNote: string | null;
  channel: string;
}) {
  const [state, action] = useFormState(saveReview.bind(null, props.sessionId), {} as FormState);
  const [editing, setEditing] = useState(false);
  const draft = props.status === 'draft';
  const kept = props.actions.filter((a) => draft || a.approved);
  return (
    <form action={action} className="col stack stack--200" aria-labelledby="s-head">
      <div className="card card--pad card--stack">
        <div className="row row--tight row--wrap"><h2 id="s-head" className="heading-xsmall heading-reset grow">{props.title}</h2>{props.caption ? <span className="timestamp">{props.caption}</span> : null}</div>
        {props.sampleNote ? <StatusBadge tone="info" label={props.sampleNote} /> : null}
        <div className="stack ruled">
          {props.items.length === 0 ? <p className="text-body">No summary for this session.</p> : null}
          {props.items.map((i, k) => (
            <div key={k} className="insight">
              {editing ? (
                <div className="field">
                  <label className="overline" htmlFor={`item-${k}`}>{i.label}</label>
                  <textarea id={`item-${k}`} name={`item-${k}`} className="ecb-form-input" rows={2} defaultValue={i.text} />
                </div>
              ) : (
                <>
                  <span className="overline">{i.label}</span><br />
                  {i.text}<br />
                  <input type="hidden" name={`item-${k}`} value={i.text} />
                </>
              )}
              <span className="evidence">{i.evidence ?? 'Added by you'}</span>
            </div>
          ))}
        </div>
        {props.items.length ? (
          <button className="ecb-btn-ghost self-start" type="button" onClick={() => setEditing((e) => !e)} aria-pressed={editing}>{editing ? 'Done editing' : 'Edit summary'}</button>
        ) : null}
        {editing ? <p className="fine-print">Clear an item's text to remove it.</p> : null}
      </div>

      <div className="card card--pad card--stack">
        <h2 className="heading-xsmall heading-reset">Actions</h2>
        <div className="stack ruled">
          {kept.length === 0 ? <p className="text-body">No actions from this session.</p> : null}
          {kept.map((c) => (
            <div key={c.id} className="stack">
              <div className="row row--top">
                <input type="checkbox" id={`c-${c.id}`} name="keepAction" value={c.id} defaultChecked disabled={!draft} className="mt-050" />
                <label htmlFor={`c-${c.id}`} className="grow text-body">
                  {c.ifThenText}<br />
                  <span className="evidence">{c.note}</span>
                </label>
                {draft && c.needsConfirmation ? <StatusBadge tone="warning" label="Confirm with the coachee" /> : null}
              </div>
              {draft && c.needsConfirmation ? (
                <div className="field">
                  <label className="ecb-form-label" htmlFor={`due-${c.id}`}>Due date for this action</label>
                  <input id={`due-${c.id}`} name={`due-${c.id}`} type="date" className="ecb-form-input ecb-form-input-narrow" defaultValue={c.dueIso ?? ''} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {draft && props.followUps.length > 0 ? (
          <fieldset className="fieldset fieldset--tight section-rule">
            <legend className="text-body strong">Updates to earlier actions</legend>
            {props.followUps.map((f) => (
              <label key={f.id} className="check check--top">
                <input type="checkbox" name="applyFollowUp" value={f.id} defaultChecked />
                <span>{f.title}: {f.from} to <span className="strong">{f.to}</span><br /><span className="evidence">{f.note}{f.evidence ? ` · ${f.evidence}` : ''}</span></span>
              </label>
            ))}
          </fieldset>
        ) : null}
        <div className="field">
          <label className="ecb-form-label" htmlFor="obs">Your observations</label>
          <textarea id="obs" name="observations" className="ecb-form-input" rows={3} defaultValue={props.observations} />
        </div>
      </div>

      <Feedback state={state} />
      {draft ? (
        <>
          <div className="btn-row">
            <Submit name="intent" value="approve" label={props.hasGoal ? `Approve and add to ${props.who}'s Roadmap` : `Approve and send to ${props.who}`} pendingLabel="Saving…" />
            <Submit name="intent" value="draft" className="ecb-btn-secondary" label="Save draft" pendingLabel="Saving…" />
            <Submit name="intent" value="private" className="ecb-btn-ghost" label="Keep this summary private" pendingLabel="Saving…" />
          </div>
          <p className="fine-print">{props.who} will get the recap and {kept.length === 1 ? 'one action' : `${count(kept.length)} actions`} in {props.channel}{props.hasGoal ? `, and the insight and actions are added to ${props.who}'s Roadmap` : ''}.{props.hasSuggestions ? ' Suggested updates to ways of thinking and behaving wait for their okay.' : ''} You can edit them later; check-ins will follow the new version.</p>
        </>
      ) : props.status === 'approved' ? (
        <>
          <div className="btn-row"><Submit name="intent" value="update" label="Save changes" pendingLabel="Saving…" /></div>
          {props.approvedNote ? <p className="fine-print">{props.approvedNote}</p> : null}
        </>
      ) : null}
    </form>
  );
}
