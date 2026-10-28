# BTS Studio — Accessibility Guide for Consuming Teams

**Standard:** WCAG 2.2 Level AA
**Version:** See CHANGELOG.md

This document explains what accessibility standards are built into the BTS Studio design system export and what is expected of teams consuming it.

---

## What you get by default

When you use the BTS Studio token export and follow the system instructions for your tool (Lovable, Bolt, v0, or Cursor), your output inherits:

- **WCAG 2.2 AA compliance** as the enforced baseline — including newer 2.2 criteria on focus appearance and touch targets
- **Colour tokens** that have been audited for contrast — all approved token pairings meet 4.5:1 for normal text, 3:1 for large text and UI components
- **Focus ring token** meeting WCAG 2.2 SC 2.4.11 (3:1 contrast against adjacent colours)
- **Touch target standards** of 44×44 CSS pixels minimum — stricter than WCAG 2.2's 24×24px floor
- **Error message templates** that are specific, screen reader-friendly, and clear of blocked generic strings
- **Motion safety** via `prefers-reduced-motion` in all animated components
- **Fluid layout** that works at 400% zoom (≈320px width) without horizontal scroll or lost content

---

## What you are responsible for

The token export gives you a compliant foundation, but accessible output depends on how you build on it.

**You must:**

- Use semantic HTML — `<button>` for actions, `<a href>` for navigation, never `<div>` for interactive elements
- Provide meaningful alt text for all non-decorative images
- Write descriptive link and button text — no "click here", "read more", "learn more"
- Associate form labels with inputs via `for`/`id` or `aria-labelledby`
- Use approved error message patterns — see the Error messages section below
- Manage focus correctly when opening and closing modals or overlays
- Test keyboard navigation on all interactive components
- Respect `prefers-reduced-motion` for any animations you add

**You must not:**

- Hardcode colour values that bypass the BTS Studio token system — untested pairings may fail contrast
- Remove focus indicators (`outline: none` without a visible replacement)
- Introduce custom colour combinations without checking contrast against the 4.5:1 / 3:1 requirements
- Modify token values in this export — tokens are a read-only snapshot

---

## Approved error message patterns

Use these templates for all form validation errors. Do not use generic strings.

| Scenario          | Pattern                                                                              |
| ----------------- | ------------------------------------------------------------------------------------ |
| Required field    | `Please enter your [field name].`                                                    |
| Format validation | `Please enter a valid [field name] in the format [example].`                         |
| Character limit   | `[Field name] must be [N] characters or fewer. You've entered [X] characters.`       |
| Numeric range     | `Please enter a number between [min] and [max].`                                     |
| File upload       | `The file must be [format] and under [size]. Please choose a different file.`        |
| Server error      | `We couldn't process your request. Please try again in a few minutes.`               |
| Mismatch          | `The [field names] you entered don't match. Please check both fields and try again.` |

**Blocked strings** (do not use as complete error messages): "Invalid", "Error", "Required", "Please try again", "Something went wrong", "Field required", "This field is required", "Incorrect", "Not valid", "Failed", "Oops".

---

## Supported assistive technology

The BTS Studio design system is tested and supported against these combinations:

| Screen reader | Browser | OS      |
| ------------- | ------- | ------- |
| NVDA          | Chrome  | Windows |
| JAWS          | Chrome  | Windows |
| VoiceOver     | Safari  | macOS   |
| VoiceOver     | Safari  | iOS     |

Build and test against these combinations. Do not add or remove combinations without sign-off from the BTS Studio accessibility designer (Ninad).

---

## Colour contrast requirements

| Text type                            | Minimum ratio |
| ------------------------------------ | ------------- |
| Normal text (under 18pt / 14pt bold) | 4.5:1         |
| Large text (18pt+ / 14pt+ bold)      | 3:1           |
| UI component boundaries              | 3:1           |
| Focus indicators                     | 3:1           |

All BTS Studio token colour pairings have been audited. If you introduce custom colours, check contrast before use. Dark mode pairings must also pass.

---

## Layout and zoom requirements

All layouts must:

- Reflow vertically at 320px width (400% browser zoom)
- Avoid horizontal scroll on main content
- Use fluid units (`rem`, `%`, `fr`, `clamp()`) — no fixed pixel values for type or spacing
- Maintain readable line length (45–75 characters)

---

## Requesting changes to the system

This export is a versioned snapshot. Token values and accessibility rules are read-only.

To request a change to the design system:

1. Raise a GitHub issue against the BTS Studio design system repository, or
2. Contact the BTS Studio design system team via the nominated Slack channel

Changes are reviewed by the accessibility designer (Ninad) and frontend lead (Chirag) before entering the standard PR process.

---

## Questions

For questions about a specific rule, check the rule specifications in `a11y/rule-specs/` before escalating.

| Role                   | Responsible for                                    |
| ---------------------- | -------------------------------------------------- |
| Ninad (A11y designer)  | Rule definitions, AT matrix, sign-off on overrides |
| Chirag (Frontend lead) | Linting config, CI integration, PR template        |
| Toby (Program lead)    | RACI, release gates, export versioning             |
