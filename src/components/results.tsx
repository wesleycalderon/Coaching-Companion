// The client results view (artboard 9), shared by the client admin's page and the BTS admin's
// per-client view. Aggregates only; any figure from fewer coachees than the minimum is hidden.

import { FilterSelect } from '@/components/client';
import { PageHead, SampleNote } from '@/components/ui';
import { SET_ASIDE_REASON_LABEL } from '@/lib/domain';
import { count, Count, dayMonth, fullDate, percent, signedPercent } from '@/lib/format';
import { FOLLOW_UP_DAYS, PERIOD_LABEL, type ClientMetrics, type Gated, type Period } from '@/lib/metrics';

type StatusKey = 'not_started' | 'tried' | 'practiced' | 'habit' | 'set_aside';
const BAR: Array<[StatusKey, string, string]> = [
  ['not_started', 'Not started', 'fill-not-started'],
  ['tried', 'Tried', 'fill-tried'],
  ['practiced', 'Practiced', 'fill-practiced'],
  ['habit', 'Habit', 'fill-habit'],
  ['set_aside', 'Set aside', 'fill-set-aside'],
];

function withheld(g: Gated<unknown>, min: number, what: string) {
  if (g.shown) return null;
  if (g.reason === 'off') return 'Turned off for this client.';
  if (g.reason === 'no_data') return 'Not enough measured sessions yet.';
  return `Hidden: ${g.coachees === 0 ? 'no coachees' : `only ${count(g.coachees)} ${g.coachees === 1 ? 'coachee' : 'coachees'}`} behind ${what}, fewer than ${min}.`;
}

export function ResultsView({ m, title = 'Coaching program results', periodHref, back }: { m: ClientMetrics; title?: string; periodHref: (p: Period) => string; back?: React.ReactNode }) {
  const contractStart = m.client.contractStart;
  const notStarted = !m.from && contractStart !== null && contractStart > m.end;
  const start = m.from ?? (contractStart && !notStarted ? contractStart : m.end);
  const range = notStarted ? `Program starts ${fullDate(contractStart!)}` : `${dayMonth(start)} to ${fullDate(m.end)}`;
  const picker = (
    <FilterSelect id="period" label="Period" value={m.period}
      options={(Object.keys(PERIOD_LABEL) as Period[]).map((p) => ({ value: p, label: PERIOD_LABEL[p] }))}
      hrefs={Object.fromEntries((Object.keys(PERIOD_LABEL) as Period[]).map((p) => [p, periodHref(p)]))} />
  );
  const who = m.period === '30d' ? 'coachees with a session in this period' : 'coachees';

  if (m.hidden) {
    return (
      <>
        {back}
        <PageHead title={title} lede={`${range} · Aggregates only.`}>{picker}</PageHead>
        <div className="card card--pad">
          <p className="text-body">Results appear once {m.min} or more {who} are in the program, so no one can be identified. There {m.coachees === 1 ? 'is' : 'are'} {count(m.coachees)} so far.</p>
        </div>
      </>
    );
  }

  const r = (n: number) => Math.round(n);
  const mv = m.movement;
  const aria = mv.shown ? `Commitment status: ${BAR.map(([k, label]) => `${r(mv.value.status[k])} percent ${label.toLowerCase()}`).join(', ')}` : '';

  return (
    <>
      {back}
      <PageHead title={title} lede={`${m.coachees} ${who} · ${range} · Aggregates only. Groups under ${m.min} are hidden.`}>{picker}</PageHead>

      <div className="grid grid--3">
        <div className="card card--pad metric-tile">
          <span className="overline">Commitment follow-up rate</span>
          <span className="heading-medium-strong">{m.followUp.shown ? percent(m.followUp.value.rate) : 'Hidden'}</span>
          <span className="fine-print">{m.followUp.shown
            ? `Commitments revisited by a check-in or the next session within ${count(FOLLOW_UP_DAYS)} days. Of ${count(m.followUp.value.judged)} at least ${count(FOLLOW_UP_DAYS)} days old.`
            : withheld(m.followUp, m.min, 'this figure')}</span>
        </div>
        <div className="card card--pad metric-tile">
          <span className="overline">Commitments tried or further</span>
          <span className="heading-medium-strong">{mv.shown ? percent(mv.value.triedOrFurther) : 'Hidden'}</span>
          <span className="fine-print">{mv.shown
            ? `Of ${mv.value.total} commitments.${mv.value.daysToTry !== null ? ` Average ${count(mv.value.daysToTry)} days to first try.` : ''}`
            : withheld(mv, m.min, 'this figure')}</span>
        </div>
        <div className="card card--pad metric-tile">
          <span className="overline">Coaching-language adoption</span>
          <span className="heading-medium-strong">{m.language.shown ? signedPercent(m.language.value.change) : m.language.reason === 'off' ? 'Off' : m.language.reason === 'no_data' ? 'Not enough data' : 'Hidden'}</span>
          <span className="fine-print">{m.language.shown
            ? `Open and curiosity questions per 1,000 words, versus each coachee's first two sessions. ${count(m.language.coachees)} coachees with three or more measured sessions.`
            : withheld(m.language, m.min, 'this figure')}</span>
        </div>
      </div>

      <section aria-labelledby="mv-head" className="card card--pad card--stack">
        <h2 id="mv-head" className="heading-xsmall heading-reset">Where commitments are now</h2>
        {mv.shown ? (
          <>
            <div className="stacked-bar" role="img" aria-label={aria}>
              {BAR.map(([k, , cls]) => <div key={k} className={cls} style={{ flex: mv.value.status[k] }} />)}
            </div>
            <div className="legend">
              {BAR.map(([k, label, cls]) => <span key={k} className="legend__item"><span className={`swatch ${cls}`} aria-hidden="true" />{label} {percent(mv.value.status[k])}</span>)}
            </div>
          </>
        ) : <p className="text-body">{withheld(mv, m.min, 'these commitments')}</p>}
      </section>

      <div className="split split--stretch">
        <section aria-labelledby="dr-head" className="col card card--pad card--stack">
          <h2 id="dr-head" className="heading-xsmall heading-reset">Why commitments are set aside</h2>
          {m.reasons.shown ? m.reasons.value.map((x) => (
            <div key={x.reason} className="stack stack--tight text-small">
              <span>{SET_ASIDE_REASON_LABEL[x.reason]} · {percent(x.pct)}</span>
              <div className="bar-track" aria-hidden="true"><div className="bar-fill" style={{ width: `${r(x.pct)}%` }} /></div>
            </div>
          )) : <p className="text-body">{withheld(m.reasons, m.min, 'set-aside reasons')}</p>}
        </section>
        <section aria-labelledby="th-head" className="col card card--pad card--stack">
          <h2 id="th-head" className="heading-xsmall heading-reset">Most common development themes</h2>
          {m.themes.listed.length ? <ol className="list list--tight">{m.themes.listed.map((t) => <li key={t}>{t}</li>)}</ol> : <p className="text-body">No theme is shared by {m.min} or more coachees yet.</p>}
          <p className="fine-print">
            Themes are the Leadership Roadmap capabilities on coachees' goals. Individual content is never shown.
            {m.themes.withheld ? ` ${Count(m.themes.withheld)} more ${m.themes.withheld === 1 ? 'is' : 'are'} shared by fewer than ${m.min} coachees and not listed.` : ''}
          </p>
        </section>
      </div>
      <SampleNote />
    </>
  );
}
