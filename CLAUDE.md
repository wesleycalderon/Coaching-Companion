# Coaching Session Companion prototype

Read `HANDOFF.md` before starting any work. It has the scope, sources, screen map, data model, AI tasks, guardrails and milestones.

## Rules

- Synthetic data only. Never add real client data, real transcripts or real credentials.
- Use the BTS Studio design system: tokens only, `.ecb-*` buttons and fields, `window.BTSStudio` components. Read a component's README before using it. No hardcoded colours, spacing or radii.
- Sentence case for all UI copy. Buttons name the outcome. Every status shows a visible label.
- Match the design canvas artboards for layout and copy.
- WCAG 2.2 AA: labels paired with inputs, native buttons, visible focus, works at 375 px.
- AI prompts live in `/prompts/*.md`. Every AI output carries transcript evidence and is labeled as AI.
- Never infer emotion, tone or personality. Never invent commitments.
- The coach approves summaries and commitments before the coachee sees them.
- Client admins see aggregates only, never below the minimum group size.
- Production auth, consent storage and retention jobs are stubs. Mark them `// STUB: BTS Studio engineering`.
- Log consent, policy, data access and deletion events to the audit log.

## Working style

- Work milestone by milestone. At the end of each, run the app, check the matching screens, and list what was stubbed.
- Keep the model name for the Anthropic API in one config value.
- Ask before adding a new dependency that isn't in the suggested stack.
