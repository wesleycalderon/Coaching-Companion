# Pattern: Modal

**Version:** v1
**Last updated:** July 2026
**Owner:** Design System (Toby Peters)

---

## Purpose

A focused dialogue that blocks the background for a single decision moment. The interruption is intentional — when a modal appears, the user must deal with it before anything else. Reserve for confirmations, destructive actions, and minimal single-field edits.

For guidance on _when_ to use a modal vs drawer vs full page, see **Navigation**.

---

## Anatomy

1. **Overlay** — full-screen dimmed background; non-interactive.
2. **Container** — centred card; narrow (480px) for confirmations, standard (560px) for single-field forms.
3. **Header** — title; close button (X) top-right.
4. **Content area** — description, input, or confirmation text. Never requires scrolling.
5. **Action bar** — primary action right-aligned; Cancel always available left of primary or as a text link.
6. **Danger variant** — destructive primary actions use `status-danger` colour.

---

## Behaviour

| Property       | Specification                                                 |
| -------------- | ------------------------------------------------------------- |
| Width          | 480px (confirmation) / 560px (single-field form)              |
| Background     | Full overlay, 60% dark, non-interactive                       |
| Nesting        | Single-level only — a modal never opens another modal         |
| Trigger        | Explicit user action only — never auto-triggered on page load |
| Primary action | Right-aligned; destructive actions use danger colour          |
| Cancel         | Always available                                              |
| Close          | X button top-right; pressing Escape closes                    |
| Animation      | Fades in with subtle scale (0.95 → 1.0) over 150ms            |
| URL            | Does not change                                               |

---

## States

| State       | Behaviour                                                                       |
| ----------- | ------------------------------------------------------------------------------- |
| Default     | Awaiting user decision                                                          |
| Loading     | Primary action in progress — button shows spinner, inputs disabled              |
| Error       | Inline error message below the relevant field or at the top of the content area |
| Destructive | Primary button in danger colour with explicit consequence language              |

---

## What not to use a modal for

- Multi-field forms — use a drawer
- Tasks that require scrolling — use a drawer or full page
- Content that benefits from background context — use a drawer
- Anything that would open another modal — restructure the flow

---

## Accessibility

- Focus moves to the modal container on open; returns to the trigger element on close.
- Focus is trapped within the modal while open.
- Modal is `role="dialog"` with `aria-modal="true"` and `aria-labelledby` pointing to the title.
- Pressing Escape closes the modal.
- Destructive actions must include visible consequence language — never rely on colour alone.
- Background content is `aria-hidden` while the modal is open.

---

## Change history

| Version | Date      | Changes                                       | Author      |
| ------- | --------- | --------------------------------------------- | ----------- |
| v1      | July 2026 | Initial pattern. Split from Navigation guide. | Toby Peters |
