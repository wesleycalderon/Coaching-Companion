// Companion setup sections shared by the coach and coachee settings screens (and the coach
// welcome). Not on the design canvas yet: built from the settings patterns, for design review.

import { ActionButton, ActionForm } from '@/components/admin-forms';
import { ConfirmButton } from '@/components/client';
import { StatusBadge } from '@/ds/components';
import {
  linked, linkRecord, PROVIDER_LABEL, providerPurpose, providersFor,
  type PersonState, type Provider, type SeriesRow, type UpcomingRow,
} from '@/lib/companion-setup';
import { day, dayTime } from '@/lib/format';
import { agreeAction, linkAccountAction, saveModeAction, saveSeriesAction, stopUsingAction, toggleOneAction, unlinkAccountAction } from '@/lib/setup-actions';

type Variant = 'coach' | 'coachee';

const LIVE_PURPOSE: Record<Provider, string> = {
  slack: 'Your Slack test workspace. Feedback arrives here, and you can talk it through with an AI coach in the thread.',
  calendar: 'Your Google Calendar, read-only. Lists your meetings so you can choose which the companion joins.',
  zoom: 'Your own Zoom account. After a meeting that’s on, the companion fetches the meeting’s transcript from Zoom (no recording needed) and keeps only your own words.',
  teams: '',
};
const card = (v: Variant) => (v === 'coach' ? 'card card--pad card--stack' : 'p-card stack');

/** What agreeing means, and the agreement's state. */
export function AgreementSection({ st, variant, coachName, heading = 'Your agreement' }: { st: PersonState; variant: Variant; coachName?: string; heading?: string }) {
  const short = st.user.client?.name.split(' ')[0];
  return (
    <section aria-labelledby="ag-head" className={card(variant)}>
      <div className="row row--tight">
        <h2 id="ag-head" className="heading-small heading-reset grow">{heading}</h2>
        {st.agreement ? <StatusBadge tone="success" label={`Agreed ${day(st.agreement.agreedAt)}`} /> : <StatusBadge tone="warning" label="Not agreed yet" />}
      </div>
      <ul className="list list--tight text-body">
        <li>After you agree, the companion joins all your meetings by default. You can turn any meeting or series off, or switch to choosing them yourself.</li>
        {variant === 'coach'
          ? <li>A coaching session is captured only when you and your coachee both have it on, and your client allows it.</li>
          : <li>A coaching session is captured only when you and {coachName ?? 'your coach'} both have it on.</li>}
        <li>In every meeting, everyone sees a notice, capture pauses for anyone who hasn&apos;t agreed, and meetings with someone from outside {variant === 'coach' ? 'BTS' : short ?? 'your organization'} are skipped.</li>
        <li>Only your own words from other meetings are analyzed. Everyone else&apos;s are discarded and never stored.</li>
        {variant === 'coach'
          ? <li>Feedback from your own meetings is for you and your coach manager, for your development. It&apos;s never used to assign or rank work.</li>
          : <li>Feedback from your work meetings is for you. {coachName ?? 'Your coach'} sees it only if you share it.</li>}
        <li>Nothing you say is used to train AI models.</li>
      </ul>
      {st.agreement ? (
        <div className="btn-row">
          <ConfirmButton label="Stop using the companion" className="ecb-btn-ghost" action={stopUsingAction} copy={{
            title: 'Stop using the companion?',
            body: <p>The companion stops joining all your upcoming sessions and meetings, whatever your settings below say. {variant === 'coach' ? 'Your coachees’ sessions run without capture.' : 'Your coaching continues without capture.'} What it already saved stays until you delete it.</p>,
            undo: 'You can agree again at any time.',
            confirmLabel: 'Stop using it',
          }} />
        </div>
      ) : (
        <ActionButton action={agreeAction} label="I agree to use the companion" pendingLabel="Saving…" className="ecb-btn-primary" />
      )}
      <p className="fine-print">Agreement version {st.agreement?.version ?? '2025-10'}. Prototype wording, waiting for legal review.</p>
    </section>
  );
}

/** Linked accounts, with what each is used for. */
export function AccountsSection({ st, variant, heading = 'Linked accounts' }: { st: PersonState; variant: Variant; heading?: string }) {
  const role = st.user.role;
  const short = st.user.client?.name.split(' ')[0] ?? 'Your organization';
  // Live test: the signed-in person links their real Google Calendar and their own Zoom.
  const live = st.user.liveClock;
  const providers: Provider[] = live ? ['slack', 'calendar', 'zoom'] : providersFor(role);
  // Coachees need one chat app (Slack or Teams) and their calendar.
  const needed = role === 'coach' || live ? providers.length : 2;
  const done = role === 'coach' || live ? providers.filter((p) => linked(st, p)).length
    : (linked(st, 'slack') || linked(st, 'teams') ? 1 : 0) + (linked(st, 'calendar') ? 1 : 0);
  return (
    <section aria-labelledby="ac-head" className={card(variant)}>
      <div className="row row--tight">
        <h2 id="ac-head" className="heading-small heading-reset grow">{heading}</h2>
        <StatusBadge tone={done === needed ? 'success' : 'warning'} label={done === needed ? 'All set' : `${done} of ${needed} linked`} />
      </div>
      {role !== 'coach' && !live ? <p className="text-body">Link the chat app you use at work, Slack or Teams, and your calendar. {short}&apos;s admin installs them first.</p> : null}
      <div className="stack ruled">
        {providers.map((p) => {
          const available = role === 'coach' || st.installed.includes(p);
          const record = linkRecord(st, p);
          const works = linked(st, p);
          return (
            <div key={p} className="row row--wrap text-body">
              <span className="basis-320">
                <span className="strong">{PROVIDER_LABEL[p]}</span><br />
                <span className="text-subtle">{live ? LIVE_PURPOSE[p] : providerPurpose(role, p, short)}</span>
                {record ? <><br /><span className="fine-print">{record.displayName}</span></> : null}
              </span>
              {works ? <StatusBadge tone="success" label="Linked" />
                : record && !available ? <StatusBadge tone="warning" label={`${short} removed it`} />
                : !available ? <StatusBadge tone="neutral" label={`Not installed by ${short}`} /> : <StatusBadge tone="neutral" label="Not linked" />}
              {record ? (
                <ActionButton action={unlinkAccountAction.bind(null, p)} label="Unlink" ariaLabel={`Unlink ${PROVIDER_LABEL[p]}`} pendingLabel="Unlinking…" className="ecb-btn-ghost" />
              ) : available && live && (p === 'zoom' || p === 'calendar') ? (
                <a className="ecb-btn-secondary" href={p === 'zoom' ? '/api/auth/zoom/start' : '/api/auth/google/start'}>{p === 'zoom' ? 'Link Zoom' : 'Sign in with Google again'}</a>
              ) : available ? (
                <ActionButton action={linkAccountAction.bind(null, p)} label={`Link ${PROVIDER_LABEL[p]}`} pendingLabel="Linking…" className="ecb-btn-secondary" />
              ) : null}
            </div>
          );
        })}
      </div>
      {role !== 'coach' && !live && providers.some((p) => !st.installed.includes(p)) ? <p className="fine-print">Something missing? Ask {short}&apos;s admin to install it.</p> : null}
      <p className="fine-print">{live ? 'Live test: Google Calendar and Zoom are your real accounts. Slack messages go to your Slack test workspace.' : 'Linking is simulated in the prototype. No accounts are contacted.'}</p>
    </section>
  );
}

/** Automatic or manual. */
export function ModeFields({ st }: { st: PersonState }) {
  return (
    <fieldset className="fieldset">
      <legend className="ecb-form-label">Which meetings the companion joins</legend>
      <label className="check check--top"><input type="radio" name="mode" value="automatic" defaultChecked={st.mode === 'automatic'} /><span><span className="strong">Automatic</span><br /><span className="text-subtle">Every meeting is on. Turn off any meeting or series below.</span></span></label>
      <label className="check check--top"><input type="radio" name="mode" value="manual" defaultChecked={st.mode === 'manual'} /><span><span className="strong">Manual</span><br /><span className="text-subtle">Nothing is on until you pick it. Turn on a series to always include it.</span></span></label>
    </fieldset>
  );
}

const CHOICE_LABEL = { default: 'Follow my default', on: 'Always on', off: 'Always off' };

/** Mode, recurring series and the next two weeks. */
export function MeetingsSection({ st, variant, series, upcoming, meetingsNote }: { st: PersonState; variant: Variant; series: SeriesRow[]; upcoming: UpcomingRow[]; meetingsNote?: string }) {
  const off = !st.optedIn;
  return (
    <>
      <section aria-labelledby="mo-head" className={card(variant)}>
        <h2 id="mo-head" className="heading-small heading-reset">Meetings</h2>
        {off ? <p className="text-body">Nothing is on until you agree to use the companion. You can set these now.</p> : null}
        {meetingsNote ? <p className="text-body">{meetingsNote}</p> : null}
        <ActionForm action={saveModeAction} submitLabel="Save" pendingLabel="Saving…" className="stack">
          <ModeFields st={st} />
        </ActionForm>
      </section>

      <section aria-labelledby="se-head" className={card(variant)}>
        <h2 id="se-head" className="heading-small heading-reset">Recurring meetings</h2>
        <p className="text-body">Your default is <span className="strong">{st.mode === 'automatic' ? 'on' : 'off'}</span>. Set a series to always on or always off to override it.</p>
        <ActionForm action={saveSeriesAction} submitLabel="Save choices" pendingLabel="Saving…" resetLabel="Discard changes" className="stack">
          <div className="stack ruled">
            {series.map((r) => (
              <div key={r.key} className="row row--wrap text-body">
                <span className="basis-320">
                  <span className="strong">{r.title}</span><br /><span className="text-subtle">{r.detail}</span>
                  {r.note ? <><br /><span className="fine-print">{r.note}</span></> : null}
                </span>
                <StatusBadge tone={r.on && !r.note ? 'success' : 'neutral'} label={r.on && !r.note ? 'On' : 'Off'} />
                <div className="field">
                  <label className="visually-hidden" htmlFor={`se-${r.key}`}>Companion for {r.title}</label>
                  <select id={`se-${r.key}`} name={`series:${r.key}`} className="ecb-form-select" defaultValue={r.choice}>
                    {(['default', 'on', 'off'] as const).map((c) => <option key={c} value={c}>{CHOICE_LABEL[c]}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </ActionForm>
      </section>

      <section aria-labelledby="up-head" className={card(variant)}>
        <h2 id="up-head" className="heading-small heading-reset">Next two weeks</h2>
        {upcoming.length === 0 ? <p className="text-body">Nothing in the next two weeks.</p> : (
          <ul className="list ruled">
            {upcoming.map((r) => {
              const label = `${r.title}, ${day(r.displayAt ?? r.at)}`;
              const choice = r.myOn ? 'off' : 'on';
              return (
                <li key={r.key} className="row row--wrap text-body">
                  <span className="basis-320">
                    {r.href ? <a className="strong" href={r.href}>{r.title}</a> : <span className="strong">{r.title}</span>}<br />
                    <span className="text-subtle">{dayTime(r.displayAt ?? r.at)}{r.kind === 'session' ? ' · Coaching session' : ''}</span>
                    {!r.on && r.reason ? <><br /><span className="fine-print">{r.reason}</span></> : null}
                  </span>
                  <StatusBadge tone={r.on ? 'success' : 'neutral'} label={r.on ? 'On' : 'Off'} />
                  {r.canToggle ? (
                    <ActionButton action={toggleOneAction.bind(null, JSON.stringify(r.target), label, choice)} label={choice === 'off' ? 'Turn off for this one' : 'Turn on for this one'}
                      ariaLabel={`${choice === 'off' ? 'Turn off' : 'Turn on'} the companion for ${label}`} pendingLabel="Saving…" className="ecb-btn-ghost" />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <p className="fine-print">A coaching session needs both people on. Meetings with someone from outside are never captured.</p>
      </section>
    </>
  );
}
