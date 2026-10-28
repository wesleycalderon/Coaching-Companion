'use client';

import { useId } from 'react';
import { ConfirmPanel, type ConfirmCopy } from '@/components/client';

// Artboard 23: the three destructive confirmations, shown open side by side. In the app
// they open from "Remove companion", "Delete all my coaching data" and "Remove".
const DIALOGS: ConfirmCopy[] = [
  {
    title: 'Remove the companion from this session?',
    body: <><p>Capture stops now and the 10 minutes captured so far are deleted.</p><p>Priya and Daniel both see that the companion left. No recap is made for this session.</p></>,
    undo: "You can't undo this for this session. Future sessions aren't affected.",
    cancelLabel: 'Keep companion',
    confirmLabel: 'Remove companion',
  },
  {
    title: 'Delete all your coaching data?',
    body: <><p>We'll delete one transcript, four recaps, five commitments and your reflections.</p><p>Daniel will no longer see your history. Your coaching continues, and new sessions start fresh.</p></>,
    undo: "This can't be undone. You can download a copy first.",
    confirmLabel: 'Delete my data',
    typeToConfirm: 'delete',
    extraAction: <button className="ecb-btn-ghost" type="button">Download a copy</button>,
  },
  {
    title: 'Remove Jun Park from Northwind?',
    body: <><p>Jun loses access to the companion and their upcoming session is cancelled.</p><p>Their data is kept for 30 days in case they return, then deleted.</p></>,
    undo: 'You can restore Jun within 30 days.',
    confirmLabel: 'Remove participant',
  },
];

export default function DialogsPreview() {
  const base = useId();
  return (
    <div className="dialog-gallery">
      {DIALOGS.map((d, i) => (
        <section key={i} role="dialog" aria-modal="false" aria-labelledby={`${base}-${i}`}>
          <ConfirmPanel copy={d} titleId={`${base}-${i}`} />
        </section>
      ))}
    </div>
  );
}
