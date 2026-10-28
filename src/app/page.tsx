import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { personaById } from '@/lib/persona';

// Screen index: every artboard on the design canvas and where it lives in the app.
// The role column says which view to switch to (header) before opening it.
const GROUPS: Array<{ title: string; screens: Array<[string, string, string, string?]> }> = [
  {
    title: 'Coachee',
    screens: [
      ['1', 'Coachee in Slack (live simulated chat: buttons work)', '/preview/slack-dm'],
      ['10', 'Onboarding in Slack', '/preview/slack-welcome'],
      ['11', 'Full recap and my data', '/me', 'coachee'],
      ['11', 'My data', '/me/data', 'coachee'],
      ['11', 'Leadership Roadmap (stands in for Sounding Board)', '/me/roadmap', 'coachee'],
      ['12', 'Set aside and swap (static design; the live flow is in the chat)', '/preview/slack-set-aside'],
      ['20', 'In-meeting side panel and late-joiner notice', '/session/eng-priya-s5/panel'],
      ['21', 'Recap in companion mode (Teams, live simulated chat)', '/preview/teams-companion-recap'],
    ],
  },
  {
    title: 'Coach workspace',
    screens: [
      ['2', 'Sessions', '/coach/sessions', 'coach'],
      ['3', 'Session review (approved)', '/coach/sessions/eng-priya-s4/review', 'coach'],
      ['3', 'Session review (draft to approve)', '/coach/sessions/eng-marcus-s2/review', 'coach'],
      ['M2', 'Transcript: automatic from Zoom, or upload (demo: Amara Okoro, session 2)', '/coach/sessions/eng-amara-s2/upload', 'coach'],
      ['4', 'Coachee profile', '/coach/coachees/priya', 'coach'],
      ['5', 'Next-session plan', '/coach/coachees/priya/plan', 'coach'],
      ['6', 'My practice', '/coach/practice', 'coach'],
      ['13', 'Consent and session controls', '/coach/sessions/eng-priya-s5/live', 'coach'],
      ['14', 'Coach manager: practice trends', '/manager/coaches', 'coach-manager'],
      ['22', 'First sign-in', '/coach/welcome', 'coach-new'],
      ['23', 'Confirmation dialogs', '/preview/dialogs'],
    ],
  },
  {
    title: 'Admin console',
    screens: [
      ['7', 'Clients', '/admin/clients', 'bts-admin'],
      ['8', 'Client policies', '/admin/clients/halden/policies', 'bts-admin'],
      ['15', 'Create client', '/admin/clients/new', 'bts-admin'],
      ['16', 'People and assignments', '/admin/people', 'bts-admin'],
      ['17', 'Coaching models', '/admin/models', 'bts-admin'],
      ['18', 'Integrations', '/admin/integrations', 'bts-admin'],
      ['19', 'Audit log', '/admin/audit', 'bts-admin'],
      ['9', 'Client admin: metrics', '/client/results', 'client-admin'],
      ['24', 'Client admin: settings', '/client/settings', 'client-admin'],
    ],
  },
];

export default function ScreenIndex() {
  return (
    <div className="page">
      <PageHead title="Coaching companion prototype" lede="Every screen from the design canvas, with synthetic data only. Pick a view in the header to see each role's pages." />
      {GROUPS.map((g) => (
        <section key={g.title} className="screen-group" aria-labelledby={`g-${g.title}`}>
          <h2 id={`g-${g.title}`} className="heading-small heading-reset">{g.title}</h2>
          <div className="card card--scroll">
            <table className="table table--w-560">
              <thead><tr><th className="num">Artboard</th><th>Screen</th><th>Route</th><th>View as</th></tr></thead>
              <tbody>
                {g.screens.map(([n, name, href, persona]) => (
                  <tr key={href}>
                    <td className="num">{n}</td>
                    <td><Link href={href}>{name}</Link></td>
                    <td className="text-subtle">{href}</td>
                    <td>{persona ? personaById(persona).label : 'Preview, any view'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
