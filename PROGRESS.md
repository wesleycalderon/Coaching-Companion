# Milestone progress

## Run it

```bash
cp .env.example .env
npm install          # also syncs the design system and generates the Prisma client
npm run db:setup     # creates the SQLite schema and seeds synthetic data
npm run dev          # http://localhost:3000
```

Open `/` for the screen index: every canvas artboard, its route, and which view to pick in the header's role switcher.

## Milestone 1: skeleton (done)

- Next.js 14 (App Router, React 18, which the BTS Studio bundle needs) and TypeScript. Prisma 6 on SQLite; enums are strings and lists are Json, so the schema ports to Postgres.
- BTS Studio vendored unchanged in `design-system/`. `scripts/sync-ds.mjs` copies the CSS to `public/ds/` and wraps `bundle.js` so the real `BTSStudio` components render on the server and in the browser (`src/ds/components.tsx`). Buttons and fields are the `.ecb-*` classes. Layout CSS (`src/app/app.css`) uses tokens only.
- Role switcher in the header with seven views: coachee (Priya), coachee in companion mode (Elena), coach (Daniel), new coach (Luis), coach manager (Grace), client admin (Northwind), BTS admin.
- Deterministic synthetic seed (`prisma/seed.mts`). Generated volume makes the computed aggregates land on the canvas figures: 42 coachees, 214 commitments, 88 percent follow-up, 64 percent tried or further, +32 percent coaching language, Daniel's 34 and 71 percent practice trends. Three synthetic transcripts in `prisma/seed-data/transcripts/` (two attached, one for the milestone 2 upload).
- All 24 artboards render from seeded data. Checked: every route returns 200 for its role, the wrong role gets a "switch view" notice, every page fits 375 px with no page-level sideways scroll, no console or server errors.

### Stubbed in milestone 1

- Auth: the role switcher is a cookie. `// STUB: BTS Studio engineering` in `src/lib/persona.ts`, `src/lib/actions.ts`, `src/components/ui.tsx`.
- Every form button that would save (approve summary, save policies, create client, invite, connect integration, send invite) does nothing yet. Confirmation dialogs open and behave correctly, but confirming shows "Not saved: this action arrives in a later milestone."
- Ask the AI shows a seeded answer; no AI calls yet (milestone 2). Model name lives in `src/config.ts`.
- Slack, Teams and the meeting side panel are web previews under `/preview/*` and `/session/[id]/panel` (milestone 3 builds the Slack app).
- Free calendar slots on the next-session plan are a stub (`proposedSlots`).
- Integrations are display only. Consent storage and retention jobs are not built.

## Leadership Roadmap update (canvas version 1793072966-11b8, opportunity brief)

- Goals are Leadership Roadmap goals: ways of thinking and behaving (current and future), personal impact and organizational outcomes chosen by the coachee, and capabilities.
- Recaps hold an insight plus suggested updates to ways of thinking and behaving, which wait for the coachee's okay ("Add to my Roadmap", a stub).
- "Commitments" read as "actions" and reflections as "results" on the 10 updated artboards. The database table keeps the name `Commitment`.
- The Leadership Roadmap rubric replaces the BTS model, with renamed markers.
- The recap nav's "Leadership Roadmap ↗" opens `/me/roadmap`, a read-only stand-in for Sounding Board. STUB: Sounding Board integration.
- Artboards the update didn't touch keep their wording: client results ("Commitment follow-up rate"), practice ("Sessions ending with a commitment"), the welcome screens and the dialogs.
- Not built: work-meeting check-ins from the brief. No artboards exist for them yet.

## Milestone 2: session loop (done)

**Try it:** view as Coach · Daniel Okafor, open **Sessions**, then **Upload transcript** on Amara Okoro's session 2. Upload `prisma/seed-data/transcripts/amara-session-2.txt`, review the draft, add a due date for the rota action, and approve. Then view as Coachee · Amara Okoro to see the recap and use **Add to my Roadmap**. `npm run db:seed` resets the demo.

- **Upload** (`/coach/sessions/[id]/upload`): .txt ("[00:05] Name: words"), WebVTT or JSON. No canvas artboard; built from the review screen's patterns.
- **Guardrails in code:** refuses without this session's consent from coach and coachee, or with a guest who didn't consent; refuses companion-mode clients (Halden never stores a transcript); applies client redaction terms before storing or sending anything; drops any AI claim whose quote isn't in the transcript; keeps sensitive passages out of the draft; stores the raw transcript only for the client's retention period (0 means it's deleted right after analysis, with an audit event).
- **AI tasks 1 to 4** with prompts in `/prompts/*.md`, structured outputs validated by Zod (`src/lib/ai/`), model from `src/config.ts` (`claude-opus-5-5`). Refusal fallback is on (`fallbacks: "default"`). Effort: low for speaker roles, high for insights and actions, medium for follow-up.
- **No API key:** only the seeded demo transcript can be analyzed, using hand-written sample output (`prisma/seed-data/ai-samples/`) matched by content hash. The review screen labels it "Sample AI output: no API key set". Add `ANTHROPIC_API_KEY` to `.env` for real analysis.
- **Coach review:** edit items, keep or drop actions, confirm due dates (approval is refused until unclear actions have one), apply or skip follow-up updates to earlier actions, save draft, keep private, or approve. Approval and "kept private" are audit-logged; the AI's untouched draft is stored for a later edit-rate signal.
- **Coachee:** approved recaps appear on the recap page; "Add to my Roadmap" applies a suggested ways-of-thinking or behaving update to the goal. Personal impact and outcomes are never touched.

### Checked
- Upload → draft → approve → coachee recap, end to end in the browser (sample mode). The follow-up update and both audit events land in the database.
- Approval is refused without a due date for an unclear action; upload is refused without consent; Halden's upload page has no form and the database holds no Halden transcripts.
- Every route still returns 200 for its role; typecheck passes.

### Stubbed or not yet built in milestone 2
- Not run against the real API here: no key was available. The Anthropic path is written to the SDK's documented `beta.messages.parse` interface and typechecks, but hasn't made a live call.
- Calendar moments for action timing are a fixed stub list.
- Slack delivery of the approved recap is milestone 3; the copy says "in Slack" as the canvas does.
- Ask the AI, language markers and practice feedback (tasks 6, 7, 9) are milestone 4.

## Milestone 3: coachee channel (done, Slack untested against a live workspace)

**Try it:** open `/preview/slack-dm` (Priya Raman's chat). Press buttons on any message, or use **Prototype controls** to send a check-in now. Try **Set aside for now** → reason → **Move it to next week**, then view as the coach: Priya's profile shows the new latest result. `npm run db:seed` resets everything.

- **One outbox, two deliveries.** Every companion message is stored (`CompanionMessage`) and rendered from one view model (`src/lib/companion/view.ts`). Without Slack it appears in the simulated chat in the web app, where the buttons work; with the Slack app connected it is also posted to Slack as Block Kit. Buttons in either place call the same handlers (`src/lib/companion/respond.ts`).
- **Flows from artboards 1, 10, 12 and 21:** welcome and check-in times; consent card (writes the consent record and an audit event, and sets the session's capture status); "what do you want to bring" (lands on the coach's next-session plan); recap, sent automatically when the coach approves; midday nudge; end-of-day check-in with Tried it → reflection (a Roadmap result), Not yet, Set aside (reason, note, then move a week, swap for a smaller step in the coachee's words, or keep set aside), Swap; companion-mode recap with "That's right" or "Suggest a change"; reflection prompt with client redaction applied.
- **Scheduler** (`node-cron`, every five minutes) sends a midday nudge and an end-of-day check-in at each coachee's 12:00 and 17:00 local time, one per slot per day, within the client's quiet hours and daily maximum. Off by default (`COMPANION_SCHEDULER`); the prototype controls run a slot on demand.
- **Slack app** (`@slack/bolt`, Socket Mode, so no public URL): manifest and setup steps in `slack/`. `SLACK_TEST_USER_ID` routes every Slack-first coachee's messages to one person, since the seeded coachees have no Slack accounts. Every message carries an "AI assistant" label.
- **Nudge text** (AI task 5, `prompts/nudge-writer.md`) is written by Claude when a key is set; otherwise a plain template is used.

**Also in this milestone (requested):**
- **PDF transcripts** upload alongside .txt, .vtt and .json. Text is extracted locally with pdfjs-dist, so redaction still happens before anything is stored or sent. Wrapped lines and hyphen splits are joined, curly quotes normalised, and scanned PDFs without text get a clear message. A PDF of the demo transcript is in `prisma/seed-data/transcripts/`.
- **Automatic capture from Zoom** is now the expected path, with manual upload as the fallback. Sessions carry a Zoom meeting ID; `/api/integrations/zoom/webhook` verifies Zoom's signature (and rejects stale requests), answers Zoom's URL validation, and on `recording.transcript_completed` downloads the transcript (Zoom hosts only) and runs the same pipeline, attributed to the "Companion" system user in the audit log. A local simulator (`ZOOM_SIMULATOR`) sends a correctly signed event so the whole path can be exercised.

### Checked
- In the browser: set-aside → reason → move (due date, check-in reason and note, coach's profile all updated); consent from the chat (consent record, audit event, session status); Tried it → reflection; companion-mode recap confirmation; scheduler slot (41 coachees sent, Priya skipped at her daily limit, a second run sends nothing).
- Zoom: unsigned and stale webhooks rejected (401), URL validation token matches HMAC, simulated event → download → draft → audit "Transcript received… from Zoom" by Companion.
- PDF: parses to exactly the same transcript as the text file; uploaded through the real form to a draft.
- Every message renders as Block Kit within Slack's limits (`/api/dev/slack-blocks`), with the AI label.
- Every route returns 200 for its role; typecheck passes.

### Stubbed or not yet built in milestone 3
- **Not run against a real Slack workspace or Zoom account** (no tokens yet). The Bolt code follows the installed SDK's types; the Zoom webhook follows Zoom's documented signature scheme; both need a live check.
- Consent requests and pre-session prompts go out from the prototype controls; production sends them the evening before each session from the calendar.
- Teams and email delivery: Teams-first coachees (Halden) use the simulated chat.
- Production needs a job queue for Zoom events (Zoom wants a reply within three seconds), retries, Zoom OAuth for the BTS account and replay protection. `// STUB: BTS Studio engineering` in `src/lib/integrations/zoom.ts`.
- New dependencies this milestone: `pdfjs-dist` (you chose it), `@slack/bolt` and `node-cron` (both in the suggested stack).

## Milestone 4: coach tools (done)

**Try it as Daniel (coach):** on `/coach/sessions/eng-priya-s4/review`, ask a question under the transcript ("This session" or "All sessions with Priya"). On `/coach/plans`, press **Draft plan** for any coachee, then open Priya's plan to edit, add or remove questions, save, or redraft. Upload or simulate Amara's session 2 transcript, then open **My practice**: her session has new feedback. As Grace (coach manager), open `/manager/coaches` and share a note; Daniel sees it on My practice.

- **Ask the AI** (task 7, `prompts/ask-the-ai.md`): over one session or every session with a coachee, from the coach's review page; and over the coach's own practice feedback and manager notes, from My practice. Sources are labelled lines (transcript lines, insights, the coach's notes, actions and the coachee's results). Every citation's quote is checked against the line it names; an answer left with no valid citation is replaced by "couldn't find support". Sensitive passages are never searched. The client's redaction terms apply to the question. Each question writes an "AI question asked" audit event (without the question text). Respects the client's `askAi` flag.
- **Next-session plan** (task 8, `prompts/next-session-plan.md`): open actions are chosen in code (approved, not yet a habit, newest four); the AI writes the focus, with cited evidence, and three to five open questions. The coach edits the focus and questions, adds or removes questions, and saves; redrafting an edited plan asks for confirmation first. The scheduler drafts plans for sessions in the next 36 hours (hourly, with `COMPANION_SCHEDULER`). **Send invite** books or moves the next session to one of three weekday proposals; choosing "Run without capture" sets the session to no capture and writes a consent audit event.
- **Practice feedback** (task 9, `prompts/practice-feedback.md`): runs after each transcript is analyzed (upload or Zoom), when the client's `practiceFeedback` flag is on, and never blocks the draft. Talk share and the share of open questions are counted in code from the transcript; the AI marks the five ICF and GROW markers as observed (with a quote that must be in the transcript, or the marker is left out) or not observed (with a one-line note). Only markers at or above the agreement bar (kappa 0.6) are used.
- **Coach manager view:** trends over the last six sessions against the ones before, per marker; notes to the coach (new `ManagerNote` table), shown on the coach's My practice. Coaches choose their own growth area on My practice; the manager sees it. The manager still never sees coachee transcripts, summaries or actions.
- **Without an API key** (sample mode): Ask the AI shows the passages that best match the question's words; plans are drafted from a template built from action statuses and the coachee's latest results; practice markers come from pre-written sample output for the demo transcript. All are labelled "Sample output" or "Sample draft".

### Checked
- In the browser: session and all-sessions questions with citations and the audit event; a practice question; Amara's transcript through the Zoom simulator produced practice feedback (36 percent talk, 6 of 6 open questions, markers with checked quotes); draft from the plans list; edit, remove, add and save; redraft confirmation (focus starts on Cancel); reschedule without capture (session updated, consent audit event); manager note shared and shown to the coach.
- At 375 px: review, plan, plans, practice and manager pages have no horizontal overflow.
- Every route returns 200 for every role (section index pages redirect); typecheck passes. `npm run db:seed` restores the demo state.

### Stubbed or not yet built in milestone 4
- Calendar: the three proposed times are fixed weekday slots, and no calendar invite is sent. `STUB: calendar integration` in the plan page and `scheduleNextSession`.
- No new dependencies.

## Milestone 5: admin console (done)

**Try it as BTS admin:** create a client on `/admin/clients/new`, then edit its policies; on `/admin/people` assign Jun Park a coach, change someone's coach, remove and restore a coachee, invite or import people (CSV with `name,email,role`); on Brightline Health, add or take coachees off the capture allowlist; on `/admin/models`, add a marker to ICF and publish the new version; connect or disconnect integrations; export the audit log. **As client admin (Northwind):** tighten settings on `/client/settings` and invite a coachee on `/client/coachees`. Every change shows up in the audit log.

- **Policies in two layers** (`src/lib/policy.ts`): BTS admins set the policy; client admins can only tighten it (capture, transcript retention, extra redaction terms, nudges per day, longer quiet hours, holiday pause). Both are stored (`Client.btsPolicy`, `Client.clientRestrictions`) and the combination is written to the client's existing fields, so the rest of the app reads one place. If BTS later changes a setting, the stricter of the two still applies. The policies page shows what the client tightened.
- **Policy side effects:** switching to companion mode stops capture of every upcoming session. Moving from all sessions to an allowlist starts with an empty list. Transcript upload and Zoom capture refuse sessions that aren't on the allowlist, and booking a session for them runs without capture.
- **Validation:** nudge times can't fall in quiet hours; the fallback channel must differ from the first; only published models can be turned on; the smallest report group can't go under 15.
- **People:** invite (with or without a coach), CSV import (bad rows are skipped with the reason), assign and change coach, remove (cancels upcoming sessions with no session data; restorable from "Removed" for 30 days), resend invite, remove client admin access (at least one admin must remain), and the capture allowlist for allowlist clients. Removed coachees drop out of the coach's lists, nudges and the client's coachee count.
- **Coaching models:** add a model as a draft; add or remove markers in a draft; publish (with confirmation) bumps the version and keeps the earlier one in version history; discard unpublished changes. Markers under kappa 0.6 stay hidden, as before.
- **Integrations:** connect, disconnect (with confirmation saying what stops) and "Send approval request" are simulated and audited; agent access over MCP saves.
- **Audit log:** filters as before; **Export as CSV** downloads the filtered log and is itself audited. New events: client created, person invited or imported, coach assigned or changed, person removed or restored, allowlist changes, policy changes (one event per change), model added or published, integration changes, agent access changes, log exported.
- **Client admin:** settings save with stricter-only choices; the Coachees page has totals, an invite form and a roster of names, emails and invite status only, with nothing about anyone's coaching.
- The confirmation dialog (`ConfirmButton`) can now run a server action. Confirm buttons are red for destructive actions and primary for publishing.

### Checked
- In the browser: every flow above, including validation errors (quiet hours covering a nudge; client quiet hours shorter than BTS's), the dialogs (focus starts on Cancel), and the audit events each action writes. CSV export returns the filtered rows and refuses non-admins (403).
- Every route returns 200 for every role (section index pages redirect as before); no nested forms; typecheck passes; no server errors.
- At 375 px: create client, policies, people, models, integrations, audit, client settings and client coachees have no page-level sideways scroll. No automated axe run: axe isn't installed, and adding it needs your OK.
- `npm run db:seed` restores the demo state. The schema changed, so run `npm run db:setup` once on a fresh checkout.

### Stubbed or not yet built in milestone 5
- No email is sent for invites or resent invites; client logos aren't stored. `STUB: BTS Studio engineering` in `src/lib/admin-actions.ts`.
- Integrations don't contact Slack, Teams, Zoom, calendars or Sounding Board. Connecting just flips the status.
- Deleting removed people's data after 30 days, and shortening existing transcripts' deletion dates when retention is lowered, need the retention job (not built).
- Still stubs elsewhere: the coach's "Remove companion from this session" button and the coachee's "Delete my data" buttons (they confirm but don't save).
- No new dependencies.

## Milestone 6: metrics (done)

**Try it:** as client admin (Northwind), open **Program results** and switch the period between "Since program start" and "Last 30 days". As BTS admin, **View results** on any client in `/admin/clients` shows the same page, with the same rules.

- **The three renewal metrics** (`src/lib/metrics.ts`), computed from data. Northwind shows the canvas figures: 88 percent follow-up, 64 percent tried or further, +32 percent coaching language.
  - **Follow-up rate:** actions revisited within seven days of being set, either by a check-in the coachee answered or by the next session. Only actions at least seven days old are counted. A session counts as revisiting an action when the follow-up task (AI task 4) cites a quote, checked against the transcript, showing it discussed; the action is marked when the coach approves that session (`Commitment.discussedAt`).
  - **Movement:** the share of actions tried, practiced or now a habit, with where all actions are now and the average days to a first try.
  - **Coaching-language adoption:** open and curiosity questions per 1,000 of the coachee's own words, comparing their latest measured session with their first two, for coachees with three or more measured sessions.
- **Language markers (AI task 6) are now produced for every analyzed transcript.** They're counted in code from the coachee's own words (open questions, curiosity questions, feedback framing), like talk share in milestone 4, so every count traces to a sentence and no tone is inferred. Sessions with under 150 coachee words aren't measured; the short demo transcript is one of them.
- **Minimum group size, per figure:** each figure shows only when the coachees behind it number at least the client's minimum (15). Otherwise it reads "Hidden" with the reason. That covers follow-up, movement, set-aside reasons, coaching language and each theme, not just the client's head count. Example: Halden has 18 coachees, but its action figures come from one person, so they're hidden. In the last 30 days at Northwind, 15 coachees had a session but only 14 are behind the follow-up figure, so it's hidden.
- **Themes are now Leadership Roadmap capabilities** on coachees' goals (per the updated brief), each listed only when 15 or more coachees share it. Northwind lists Communication and Developing others. The seed now uses only the Roadmap's option lists for capabilities, outcomes and personal impact, and refuses anything else.
- **Period:** "Last 30 days" counts coachees with a session in the window and actions set in it. Clients whose contract hasn't started say so (Orrin: "Program starts 1 Dec 2025").
- **BTS admin results page** at `/admin/clients/[id]/results`, linked from the clients list.
- Language turned off for a client (Halden) shows "Off". The language metric respects the client's `languageMetric` flag.

### Checked
- Every client and both periods: figures, hidden states and reasons. All three canvas figures match for Northwind.
- End to end with the live API: Amara's session 2 through the Zoom simulator, then approval, marked both earlier actions as discussed on the session date. They were set eight weeks earlier, so they correctly don't count as followed up within seven days.
- The language counter on sample text: open, curiosity and feedback counts per 1,000 words; the short demo transcript is left unmeasured.
- Every route returns 200 for every role; results pages have no sideways scroll at 375 px; typecheck passes; no server errors.
- Note: after a schema change, restart `npm run dev` so the running server picks up the new database client.

### Stubbed or not yet built in milestone 6
- Org-outcome aggregates ("buyers see aggregates only" in the updated brief) aren't on the results page yet; the canvas has no place for them.
- No automated accessibility check (axe needs your OK as a new dependency).
- No new dependencies.

## Milestone 7: work meetings (done; screens not on the canvas yet, flagged for design review)

**Try it as Priya (coachee):** open **Linked meetings** (`/me/meetings`). Link a meeting or a whole series to one of your actions. On the Weekly team meeting series, press **Start the meeting and show the notice**, answer for each colleague on the notice page, then **Simulate the meeting transcript**. Try it once with someone declining. Link the carrier review (an external participant is invited) and start it. As Daniel, open Priya's profile to see the series she shared.

- **Linking** (`src/lib/work-meetings.ts`, `/me/meetings`): the coachee picks one of their open actions and a meeting from their calendar (a synthetic stub, `src/lib/calendar.ts`), either just the next one or "this and all future meetings". Each link is audit-logged as a consent event. Nudges in the chat and Slack get a "Link a meeting to this action" link when the client allows work meetings.
- **Every occurrence needs everyone's agreement:** starting a meeting shows the notice (`/meeting/[id]/notice`, a mock of the meeting app like the in-meeting panel). Capture stays paused until every colleague agrees; a decline, or a speaker in the transcript who wasn't invited (a late joiner), keeps it paused and nothing is kept. Any external participant means the occurrence isn't captured at all. Each notice and answer is audit-logged.
- **Only the coachee's words:** the transcript is parsed in memory, everyone else's lines are dropped before redaction, counting or the AI call, and no transcript is stored, only the check. AI task 10 (`prompts/work-meeting-check.md`) sees only the coachee's lines and returns attempted (yes, partly, no or unclear), a two-sentence summary and quotes. Every quote is checked against the coachee's words; a claimed attempt with no checked quote is downgraded to "unclear". Coaching-language counts come from code.
- **Feedback to the coachee:** per meeting, with quotes and question counts, a trend across the series, and a message in the chat or Slack. The coachee can share a series with their coach (audit-logged); the coach's profile then shows the shared feedback, never anyone else's words.
- **Stopping:** the coachee can stop a link (with confirmation). Links also stop when the action becomes a habit or is set aside (from the chat, Slack, or the coach applying a follow-up), when the engagement ends, or when the client turns work meetings off. Upcoming occurrences then show "Not captured, link stopped".
- **Monthly keep-or-stop:** an active series not confirmed for 30 days gets a chat or Slack message with "Keep it linked" or "Stop linking it" (hourly with `COMPANION_SCHEDULER`; the series page has a "Send the monthly check now" control). The series page also offers "Keep it linked" when due.
- **Admin setting:** BTS admins set work-meeting capture to Off or "Meetings coachees pick" on client policies; client admins can only turn it off. New clients get it on for the standard template and off for regulated and financial services. Seeded: Northwind and Orrin on, Halden and Brightline off.

### Checked
- In the browser: linking (including the "doesn't repeat" error), the notice with agree and decline, capture staying paused until everyone agreed, a live AI check on the synthetic team meeting (three quotes, all verified), the external-participant skip, the monthly check answered in the chat, setting the action aside in the chat stopping all three of its links, and turning work meetings off for Northwind stopping the rest. Every step wrote its audit event.
- Another coachee gets "not found" for Priya's meetings and notices; the coach sees only shared series.
- Every route returns 200 for every role; the new pages fit at 375 px; typecheck passes; no server errors. `npm run db:seed` restores the demo state.

### Stubbed or not yet built in milestone 7
- The calendar is a synthetic stub, and the notice is a web mock: no meeting-app install, and colleagues' consent isn't really collected from them (the prototype answers for each). `STUB: BTS Studio engineering` in `src/lib/calendar.ts`, `src/lib/work-meetings.ts` and the notice page.
- Linking from Slack itself (rather than a link to the web page) isn't built.
- Deleting work-meeting feedback from "My data" isn't built yet (deletion is a stub there for everything).
- The Roadmap schema alignment (an Insight table, a private flag on goals, capabilities on actions) is still to do; see HANDOFF.md.
- No new dependencies.

## Microsoft Teams delivery (after milestone 7)

- Teams-first coachees (Halden) get companion messages as Adaptive Cards in Teams when `TEAMS_ENABLED=true`, rendered from the same view model as Slack (`src/lib/companion/teams.ts`). Buttons use `Action.Execute`; answers go through `respond()` and the card redraws in place. Forms (reflection, set-aside reason, plan, check-in times) open inside the card instead of Slack's modals.
- The bot is hosted inside Next.js at `POST /api/messages` (a small adapter for the Teams SDK), so Teams and the web app share port 3000 and one tunnel.
- New dependencies, approved: `@microsoft/teams.apps`, `@microsoft/teams.api` and `@microsoft/teams.cards`, pinned at 2.1.0. They pull in `@azure/msal-node`, which `npm audit` flags as high severity; it matters only for a public deployment.
- New table `TeamsConversation` (who installed or messaged the bot) and `teamsConversationId`/`teamsActivityId` on companion messages; `deliveredVia` can now be `teams`, and consent given from a Teams card is recorded with channel `teams`.
- Without app credentials (Agents Playground mode) the endpoint accepts unsigned requests, but only from this computer; requests through a tunnel are refused.
- Setup: `teams/README.md`. `teams/make-package.mjs` builds the app package for a Developer Portal registration.

### Checked

- Against a mock of the Teams message service: the bot's hello reply, the proactive check-in card for Elena, "Tried it" redrawing the card with the reflection form, an empty reflection rejected with a message, a saved reflection plus the "Nice work" reply delivered to Teams, and a tunnelled request refused.
- Not yet checked in Agents Playground or real Teams: running the Playground needs your OK, and real Teams needs a tenant.

## Coaching guidance with BiTSy (after milestone 7)

- Coachees can talk an action through with one of BiTSy's AI coaches (the `bitsy-google-adk` agents) from **Coaching guidance** (`/me/coaching`), a "Get coaching" link next to each action in the recap, and the linked-meeting page. The app suggests a coach from the action's wording (for example, Listening for "ask curiosity questions", Delegating for a handover, Prioritising for an action set aside for lack of time); the coachee can pick another.
- BiTSy runs the coaching on its own server through its REST API (`src/lib/coaching/bitsy.ts`): its prompts and BTS coaching IP never come into this app, matching how BiTSy's MCP server works. The app sends a short brief with the first message (name, role, the action, its status, the latest reflection and work-meeting feedback). The coachee sees exactly what the coach will be told before starting.
- Conversations are private to the coachee unless shared. When one ends, BiTSy's wrap-up summary (topics and insights) is shown, labelled as AI.
- New actions follow the coach-approval rule: the coachee writes a proposal in their own words, and the coach approves or declines it on the coachee's profile. Approval adds it to the latest session that has taken place, and check-ins start.
- Sample mode: without BiTSy settings, or with `COACHING_SAMPLE=true`, coaches reply with pre-written, generic sample answers, labelled "Sample output". Nothing is sent.
- Audit events: conversation started (and what was sent), conversation shared or unshared, action proposed, approved or declined.
- New tables: `CoachingConversation` and `CoachingTurn`. No new dependencies.

### Checked

- Live against BiTSy staging (test account in `.env`): Priya with the Listening coach (start, reply, end with wrap-up summary, propose, share, Daniel approves); Elena with the Delegating coach. Sample mode with the Prioritising coach. New pages fit at 375 px; no server errors.

### Stubbed or not yet built

- Every coachee's conversations run under one BiTSy account (the one in `.env`), so BiTSy's long-term memory for that account mixes the demo coachees. Production needs a BiTSy account per coachee and service-to-service auth. STUB: BTS Studio engineering.
- No client setting yet to turn coaching guidance off, and no data-processing terms for what's sent to BiTSy and its memory service (Mem0).
- Not in Slack or Teams yet: links from nudges and meeting feedback to coaching are a next step.
- Replies aren't streamed; the coachee waits for the whole reply (BiTSy took 2 to 10 seconds in testing).

### For the BiTSy team

- With a shared account, the coach greeted Priya with the account holder's name; the brief now says "Please call me Priya", which fixed it.
- The Delegating coach opened with its standard first question and didn't use the situation in the first message. Coaches could use the context they're given when a conversation starts with one.
- BiTSy's wrap-up insights can describe the person ("Your awareness of this pattern is a leadership strength"). The prototype's rule is never to infer personality, so this needs a decision.

## Live API check (Sonnet 5.5, `ANTHROPIC_MODEL` in `.env`)

- Amara's session 2 through the Zoom simulator: all five tasks (speaker roles, summary, actions, follow-up, practice feedback) returned valid output; no quote failed the transcript check, nothing was dropped, one client term was redacted. The uncertain "hand Kai the rota" action came back flagged for coach confirmation.
- Ask the AI across Priya's sessions: a four-sentence answer with five citations from sessions 2 to 4, all verified.
- Next-session plan for Marcus: focus with three verified quotes and five open questions in Marcus's own terms.
- Token use: about 9,300 input and 3,100 output tokens for a full transcript analysis (five calls); about 2,000 in and 400 out for each question or plan. Each call logs its usage as `[ai] task · model · tokens` in the server output.
- Fixed: the AI used "she" and "he" for coachees, which the transcripts never establish. `prompts/_rules.md` now says not to assume pronouns. A redraft still produced one "himself", so the rule helps but isn't absolute; the coach reviews every output.

## Decisions to review

- **Calendar year.** The canvas weekdays (Tue 21 Oct, Thu 23 Oct, Fri 17 Oct, Tue 4 Nov) only exist in 2025, and the copy depends on them ("Thursday's team meeting"). The seed uses the 2025 calendar, with the prototype clock fixed at Sat 25 Oct 2025 17:00 (`src/config.ts`). The one visible year, on client results, reads 2025 where the canvas says 2026.
- **Priya's session 4** appears as both "needs review" and "approved" on the canvas. Seeded as approved, to match the Slack recap, recap page, profile and audit log. Its review page shows the approved state; Marcus's session 2 is the draft to review (screen index links both). The sessions list therefore shows one summary waiting, not two.
- **Teams companion-mode recap** is Elena Duarte's, with her actual coach Daniel (the canvas names Aiko).
- **Pronouns:** copy that said "her" uses the person's name or "their" instead.
- **Side nav** added to My practice and client results, which have none on the canvas, so every page in a workspace can be reached. Simple list pages back the nav items the canvas leaves unlinked: `/coach/coachees`, `/coach/plans`, `/me/sessions`, `/client/coachees`.
- **People page** gets a "Remove" action per coachee so the remove-participant dialog is reachable; `/preview/dialogs` shows all three dialogs as on the canvas.
- **Audit log** keeps the canvas's "Aiko Tanaka assigned to Jun Park", although the People page shows Jun still needing a coach (both from the canvas).
- **Database scripts:** `db:setup` uses `prisma db push` without `--force-reset`; the seed clears its own tables.
- **Practice markers:** feedback reports the five markers the canvas shows (ICF partners on the goal, evokes new thinking, invites next steps, agrees measures; GROW options), not all eight ICF and GROW markers.
- **Manager notes** are not audit-logged: they are the manager's own developmental notes, not access to coachee data.
- **Policy floor for reports:** BTS admins can raise the smallest report group but not set it under 15, the brief's default.
- **Changing a coach** moves the whole engagement, so the new coach sees the coachee's approved recaps, actions and results (the inline form says so). An alternative is a fresh engagement that leaves history with the old coach.
- **Client admins see a roster** (names, emails, invite status) on their Coachees page, so they can manage invites. They see nothing about anyone's coaching.
- **"Manage connection" became "Disconnect"** on Integrations, since that's the only thing the button does in the prototype.
- **New practice markers** added to the ICF model show on the models page but aren't used by practice feedback, which still reports the fixed five markers.
- **Follow-up seed tweak:** under the stricter seven-day rule, Northwind's follow-up came out at 87 percent. One check-in was added (Priya answers "I'll try it" six days after setting her second action) to keep the canvas's 88 percent.
- **Themes from capabilities** (your choice): Northwind shows two themes, not the canvas's three, because no third capability is shared by 15 or more coachees.
- **Docs merged** from the design file's updated CLAUDE.md and HANDOFF.md, keeping the repo's Done markers, the Zoom capture decision, the opportunity brief link and `/me/roadmap`, and the rule that only the coachee chooses organizational outcomes. Work meetings became milestone 7. HANDOFF.md lists where the schema still differs from the new Roadmap data model.
- **Work meetings in their own tables** (`MeetingLink`, `MeetingOccurrence`) rather than as sessions with `kind: work_meeting`, as HANDOFF suggests: every coach screen, metric and AI search reads sessions, so separate tables mean work-meeting data can't reach a coach unless the coachee shares it.
- **Pausing is all or nothing** per occurrence: if anyone present hasn't agreed (or joins without seeing the notice), nothing from that meeting is analyzed, rather than cutting out the minutes they were present.
- **A work-meeting check doesn't change the action's status.** The coachee still marks it tried in their check-in.
- **Open questions for coaching language** now also count a question that follows a lead-in ("Before I jump in, what's hard?"). The coach's practice stats keep their earlier rule.
- **Dev server after the move:** the app's preview button still starts the copy in the old session folder. Run `npm run dev` in `Concept Companion/repo` instead.
