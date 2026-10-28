// Chat-surface previews (Slack, Teams). Gap: the system has no chat message card yet;
// these are built from tokens in app.css (.dm-*). TODO: swap for the system component.

import type { ReactNode } from 'react';
import { RoleBadge } from '@/ds/components';

export function DmFrame({ app, note, children, after }: { app: 'Slack' | 'Teams'; note: string; children: ReactNode; after?: ReactNode }) {
  return (
    <div className="preview-stage">
      <p className="fine-print preview-stage__note">{note}</p>
      <section className="dm" aria-label={`Coaching companion, direct message in ${app}`}>
        <div className="dm__head">
          <div className="dm__logo" aria-hidden="true">C</div>
          <div className="dm__title">
            <span className="dm__name">Coaching companion</span>
            <span className="dm__where">Direct message in {app} · AI assistant</span>
          </div>
          <RoleBadge label="AI" />
        </div>
        <div className="dm__body">{children}</div>
      </section>
      {after}
    </div>
  );
}

export function DayDivider({ children }: { children: ReactNode }) {
  return <div className="dm-day" role="separator">{children}</div>;
}

/** A message from the companion. Every message is labelled as AI by the frame and the sender line. */
export function BotMessage({ meta, children }: { meta: string; children: ReactNode }) {
  return (
    <div className="dm-msg">
      <span className="dm-msg__meta"><strong>Coaching companion</strong> · {meta}</span>
      {children}
    </div>
  );
}

export { retentionSentence } from '@/lib/companion/text';
