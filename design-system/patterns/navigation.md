# BTS Studio — Navigation Patterns

This guide defines which overlay component to reach for in BTS Studio admin — drawer, modal, or full page. It exists to keep navigation patterns consistent as the platform grows. Component-level specs (dimensions, animations, behaviour rules, accessibility) live in the individual pattern entries.

The core goal of the admin navigation model is to keep the user's position in the system stable. Admins working through lists of cohorts, users, or experiences should always know where they are and be able to return there instantly.

---

## The three overlay components

### Drawer

A panel that slides in from the right. The background remains visible.

**Job:** Entity-level editing — multiple fields or sections that need sustained attention but don't justify leaving the current context.

### Modal

A dialogue that overlays the screen with a dimmed, non-interactive background.

**Job:** Focused single-decision moments — confirmations, destructive actions, quick single-field edits that require full attention before proceeding.

### Full page

A complete page navigation that replaces the current view.

**Job:** Complex creation workflows, deeply nested configuration, or any context where the user's undivided attention is required for an extended period.

---

## Decision framework

Before choosing a component, answer these four questions:

**1. Does the background list provide meaningful context while editing?**
If yes → drawer. If no → modal or full page.

**2. How many fields and sections does the task require?**

- One decision or one field → modal
- Multiple fields, one logical section → drawer
- Multiple distinct sections or sub-tasks → full page

**3. Is this a creation or editing workflow?**
Creating a new entity from scratch → full page. Editing an existing entity → drawer.

**4. Does the URL need to change?**
If the user needs to share a link, bookmark it, or use browser back reliably → full page. Drawers and modals do not change the URL.

---

## When to use each

### Use a drawer when

- The entity can be fully configured within a single panel without sub-navigation
- The task is editing an existing entity, not creating one from scratch
- The background list is genuinely useful context during editing
- Tabs within the drawer are acceptable for organising facets of the same entity

**BTS Studio examples:** Editing a cohort, editing a user, editing an experience.

### Use a modal when

- The task is a single focused decision that must be resolved before anything else proceeds
- The action is destructive or irreversible
- The input required is minimal — one field, one toggle, one confirmation

**Never use a modal for:** multi-field forms, tasks requiring scrolling, or anything that would open another modal.

**BTS Studio examples:** "Delete this cohort?", "Rename this experience", unsaved-changes warning.

### Use a full page when

- Configuration involves multiple distinct sections
- The user is building something from scratch
- Deep linking matters — the URL should represent this state
- The task takes longer than a few minutes and benefits from full commitment

**BTS Studio examples:** Creating a new experience, Journey builder, reporting views.

---

## Nesting — the hard limits

- A drawer never opens another drawer
- A modal never opens another modal
- A drawer may open a modal (e.g. unsaved-changes confirmation)
- A modal never opens a drawer
- A full page may contain drawers and modals

For nested content within a drawer (e.g. sessions within an experience), use in-place accordion expansion — not additional overlays.

---

## Related patterns

See the individual pattern entries for full specs — anatomy, dimensions, animation, accessibility:

- **Pattern: Drawer**
- **Pattern: Modal**
- **Pattern: Full page**

For full-screen transitional states (loading, waiting, denied), see **Guideline: Blocking interruptions** and **Pattern: Interstitials**.

---

_Owner: Toby (UX lead) · Applies to: BTS Studio admin application · Last updated: July 2026_
