# Prompts

One file per AI task. Each has a `## System` section and a `## User` section. `{{name}}`
placeholders are filled by `src/lib/ai/prompts.ts`; `{{rules}}` inserts `_rules.md`.
Output shapes are enforced by the Zod schemas in `src/lib/ai/schemas.ts` (structured outputs),
so a prompt describes what to write, not the JSON syntax.

| File | AI task | Used in |
| --- | --- | --- |
| `speaker-roles.md` | 1. Speaker roles | Transcript upload |
| `session-summary.md` | 2. Insights and suggested Roadmap updates | Transcript upload |
| `action-extraction.md` | 3. Actions (formerly commitments) | Transcript upload |
| `action-follow-up.md` | 4. Follow-up on earlier actions | Transcript upload, when earlier actions exist |
| `nudge-writer.md` | 5. Nudge writer | Slack and Teams nudges (template text without an API key) |
| `ask-the-ai.md` | 7. Ask the AI | Session review ("Ask about this session") and My practice ("Ask about your practice") |
| `next-session-plan.md` | 8. Next-session plan | Plan page and plans list ("Draft plan"), and the day-before scheduler |
| `practice-feedback.md` | 9. Practice feedback | Transcript upload and Zoom capture, after the draft is saved |
| `work-meeting-check.md` | 10. Work-meeting check | A coachee's work meeting is processed (focused on one action, or checked against all their active actions); sees only the coachee's own words |
| `coach-meeting-practice.md` | 11. Coach meeting practice | A coach's own meeting (not a coaching session) is processed; checks the coach's own words against their growth area for My practice |

Without an API key, tasks 7 and 8 fall back to code: Ask the AI shows the passages that best match
the question, and the plan is drafted from a template. Both are labelled as sample output.
Task 9's talk share and question rate are always computed in code, not by the AI.

Edit freely; changes apply on the next upload. Keep the rules in `_rules.md` intact.
