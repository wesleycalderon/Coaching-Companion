# Coaching Session Companion: build brief for Claude Code

Build a clickable, working prototype of the Coaching Session Companion. It turns a human coaching session into coach-approved recaps and behavioral commitments, nudges the coachee in Slack between sessions, and gives the coach prep and practice feedback. It runs on **synthetic data only**.

## Sources (read these first)

| What | Link |
| --- | --- |
| Prototype spec (scope, roles, data model, AI tasks, metrics) | https://claude.ai/artifact/YHeZryCNa56mtTvnZmgK7L |
| Research doc (competitors, platform feasibility, consent, decisions) | https://claude.ai/artifact/3pa5wTpRYfZHWMbmAtvVY1 |
| Design canvas (24 screens) | https://claude.ai/artifact/WjysyQMA8Gj7Gj6K1Wy8sE |
| BTS Studio design system | https://claude.ai/code/artifact/28552d89-5652-45fb-b2cd-63af7f95b742 |

These are private claude.ai artifacts. If you can't open them, ask Wesley to export them (the doc exports to Markdown; the design system's files are under `project/`).

## Decisions already made

- Session companion for formal coaching sessions, not a bot in every work meeting.
- v1 capture: post-session transcripts from a BTS-controlled Zoom account. For the prototype, **manual transcript upload** plus seeded transcripts.
- Analysis model: BTS mindset > behaviour > impact > results, plus GROW. ICF markers for coach practice feedback only.
- Coach approves every summary and commitment before the coachee sees it.
- Manager views of coach feedback are developmental and never used for work assignment.
- No emotion inference from voice, tone or video. Patterns come only from coach observations and coachee self-reports.
- Nudges: Slack first, then Teams, then email. Twice a day, about 12:00 and 17:00 in the coachee's time zone.
- Renewal metrics: commitment follow-up rate, commitment movement, coaching-language adoption.

## Suggested stack

- Next.js (App Router) and TypeScript.
- SQLite with Prisma for the prototype. Keep the schema portable to Postgres.
- Anthropic API for the AI tasks, with structured JSON outputs validated by Zod. Use a current Claude model; keep the model name in one config value.
- Slack app with Bolt for JavaScript, socket mode, for recaps, commitment cards and nudges. Make it optional behind an env flag; the web app must work without it.
- A simple scheduler (node-cron or a route triggered by cron) for the two daily nudge slots.
- No real auth for the prototype: a role switcher (coachee, coach, coach manager, client admin, BTS admin) in the header.

## Design system

Use the BTS Studio system exactly, no look of our own.

- Load `tokens.css`, then `components/bundle.css`, then React 18, then `components/bundle.js`. Components mount from `window.BTSStudio` (for example `BTSStudio.StatusBadge`, `BTSStudio.Tabs`, `BTSStudio.ChoiceChips`, `BTSStudio.RoleBadge`, `BTSStudio.EventBadge`). In a Next.js app, copy these files into `public/ds/` and wrap the globals in thin typed components (types are in `components/index.d.ts`).
- Buttons and form fields are the `.ecb-*` classes (`ecb-btn-primary`, `ecb-btn-secondary`, `ecb-btn-ghost`, `ecb-btn-danger`, `ecb-form-label`, `ecb-form-input`, `ecb-form-select`, `ecb-pagination`, `ecb-modal-dismiss`, `ecb-app-shell-header`).
- Read each component's `components/<Name>/README.md` before using it. Known prop shapes: StatusBadge `label` + `tone` (neutral, info, success, warning, danger, live); ChoiceChips `choices`, `value`, `onValueChange`, `ariaLabel`; Tabs `tabs`, `value`, `onValueChange`, `ariaLabel`; EventBadge `action` (create, update, delete, publish, assign, unassign) + optional `label`.
- Non-negotiables from the system: tokens only (no hardcoded colours, spacing or radii), sentence case everywhere, charcoal for primary actions, magenta as a single accent, every status has a visible label, WCAG 2.2 AA, mobile first (works at 375 px), positive framing on controls, buttons name the outcome.
- Admin and coach screens sit on `hsl(var(--page-background))` with white cards. Coachee web pages use `--participant-page`.
- Known gaps in the system (build from tokens, and leave a TODO): chat message card, toggle, data table, metric tile, dialog backdrop token, meeting side panel, logo.

## Screen map

The canvas artboards are the source of truth for layout and copy. Match them.

| # | Artboard | Route or surface |
| --- | --- | --- |
| 1 | Main (coachee in Slack) | Slack DM: consent card, recap, nudges, reflection |
| 10 | CoacheeOnboarding | Slack DM welcome flow |
| 11 | CoacheeRecap | `/me/recap/[sessionId]`, `/me/data` |
| 12 | SetAsideFlow | Slack DM: set aside, reason, reschedule or swap |
| 20 | MeetingPanel | `/session/[id]/panel` (mock of the in-meeting side panel) |
| 21 | CompanionModeRecap | Slack or Teams DM for no-transcript clients |
| 2 | CoachSessions | `/coach/sessions` |
| 3 | SessionReview | `/coach/sessions/[id]/review` |
| 4 | CoacheeProfile | `/coach/coachees/[id]` |
| 5 | NextSessionPlan | `/coach/coachees/[id]/plan` |
| 6 | MyPractice | `/coach/practice` |
| 13 | SessionConsent | `/coach/sessions/[id]/live` |
| 14 | CoachManager | `/manager/coaches` |
| 22 | CoachOnboarding | `/coach/welcome` |
| 23 | ConfirmDialogs | Modals: remove companion, delete my data, remove participant |
| 7 | AdminClients | `/admin/clients` |
| 8 | ClientPolicies | `/admin/clients/[id]/policies` |
| 15 | CreateClient | `/admin/clients/new` |
| 16 | PeopleAssignments | `/admin/people` |
| 17 | CoachingModels | `/admin/models` |
| 18 | Integrations | `/admin/integrations` |
| 19 | AuditLog | `/admin/audit` |
| 9 | ClientMetrics | `/client/results` |
| 24 | ClientAdminSettings | `/client/settings` |

## Data model

Every content record carries an owner, a consent scope and an expiry.

- **Client:** id, name, region, capturePolicy (sessions, allowlist, companion_mode), retention (raw transcript days, 0 to 7), redactionTerms[], nudgeDefaults, featureFlags, minGroupSize (default 15).
- **User:** id, clientId, role (coachee, coach, coach_manager, client_admin, bts_admin), name, email, timeZone, nudgeChannelOrder, quietHours.
- **Engagement:** id, clientId, coacheeId, coachId, start, end, activeRubrics[].
- **Goal:** id, engagementId, fromMindset, toMindset, behaviours[], impact, results, status.
- **Session:** id, engagementId, scheduledAt, platform, captureStatus (scheduled, consented, captured, paused, removed, no_capture).
- **Consent:** id, sessionId, userId, grantedAt, revokedAt, scope.
- **Transcript:** id, sessionId, segments[] (speakerRole, text, start, end), redacted, deleteAfter.
- **Summary:** id, sessionId, insights[] (dimension, text, evidenceQuote, evidenceTime), status (draft, approved, suppressed), approvedBy, sensitiveSpans[].
- **Commitment:** id, sessionId, goalId, ifThenText, cueMoment, dueBy, status (not_started, tried, practiced, habit, set_aside), setAsideReason, needsCoachConfirmation.
- **CheckIn:** id, commitmentId, channel, sentAt, response (tried, not_yet, set_aside, swapped), reflectionText.
- **CoachNote:** id, sessionId, coachId, observations.
- **LanguageMarker:** id, sessionId, userId, marker (open_question, curiosity_question, feedback_framing), count, per1kWords.
- **PracticeFeedback:** id, sessionId, coachId, rubric, markerResults[] (marker, observed, evidence).
- **NextSessionPlan:** id, engagementId, forSessionId, openCommitments[], suggestedFocus, questions[].
- **Rubric:** id, name, usedFor, version, status, markers[] (name, check, kappa, shown).
- **AuditEvent:** id, actorId, action, object, clientId, at.

Status tone mapping for StatusBadge: not started = neutral, tried = info, practiced = live, habit = success, set aside = warning.

## AI tasks

Each returns JSON with transcript evidence. Put prompts in `/prompts/*.md` so they can be edited without code changes.

1. Speaker roles: label coach and coachee segments; flag uncertainty.
2. Session summary: 3 to 5 insights mapped to mindset, behaviour, impact or results, each with an evidence quote and timestamp.
3. Commitment extraction: at most 3 if-then commitments the coachee explicitly stated, with cue moment and due date; set `needsCoachConfirmation` when ambiguous.
4. Follow-up on prior commitments: status update per commitment, with evidence.
5. Nudge writer: one short, specific nudge per slot, tied to the next calendar moment.
6. Language markers: counts per 1,000 words of the coachee's own speech.
7. Ask the AI: coach questions over one session or all sessions with a coachee, with citations.
8. Next-session plan: open commitments, suggested focus, 3 to 5 questions.
9. Practice feedback: ICF and GROW markers as observed or not observed, with evidence; talk ratio and question rate.

Rules for every prompt: use only what was said or written; never infer emotion, attitude from tone, or personality; quote evidence for every claim; never invent a commitment; flag sensitive topics (wellbeing, legal, HR) to the coach and leave them out of summaries; apply client redaction terms before storing anything.

## Guardrails

- Synthetic data only. Seed it with the canvas's sample people: Priya Raman, Marcus Lee, Elena Duarte, Tom Becker and Jun Park; coaches Daniel Okafor, Aiko Tanaka and Luis Ortega; manager Grace Mwangi; clients Northwind Logistics, Halden Financial, Brightline Health and Orrin Retail Group. Seed 2 to 3 synthetic transcripts.
- Never send real client data or real transcripts through the prototype.
- Do not build production auth, consent storage or retention jobs; stub them and mark them for BTS Studio engineering.
- No voiceprints, no emotion inference, no training on session data.
- Label every AI-generated message as AI (EU AI Act Article 50 transparency).
- Client admins only ever see aggregates above the client's minimum group size.
- Every destructive action uses a confirmation dialog that says what happens, who's affected and whether it can be undone, and never defaults to confirm.
- Log consent, policy changes, data access and deletions to the audit log.

## Milestones

1. **Skeleton:** Next.js app, design system wired in, role switcher, seeded database, all routes rendering seeded data to match the canvas.
2. **Session loop:** transcript upload, AI tasks 1 to 4, coach review and approval, coachee recap page.
3. **Coachee channel:** Slack app with consent card, recap, commitment card, set-aside flow, and the 12:00 and 17:00 scheduler.
4. **Coach tools:** Ask the AI, next-session plan, practice feedback, coach manager view.
5. **Admin console:** clients, policies, people, models, integrations (stubbed), audit log, client admin settings.
6. **Metrics:** the three renewal metrics computed from data, with the minimum-group-size rule.

Each milestone ends with the app running locally, the matching canvas screens reproduced, and a short note of what was stubbed.

## Acceptance checks

- A seeded transcript goes from upload to an approved recap and commitments visible to the coachee.
- A coachee can mark a commitment tried, set it aside with a reason, or swap it, and the coach sees the change.
- Removing the companion from a session stops capture and records an audit event.
- Halden Financial (companion mode) never stores a transcript.
- Client metrics hide any group under 15.
- Every screen renders at 375 px wide and passes an automated accessibility check (for example axe).

## Open questions (don't block on these; stub and note)

- Zoom RTMS commercial terms; for now, use cloud transcripts or upload.
- Exact Teams permission for calendar-triggered app install.
- Whether Sounding Board's v70 companion can accept session insights into the Leadership Roadmap.
- Legal review of Annex III classification and consent flows.
