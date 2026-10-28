# StatusBadge

StatusBadge shows what state an object is in, with a required visible label and one of six semantic tones.

**Consumer provides:** `label` (required, always rendered), `tone` (`neutral` · `info` · `success` · `warning` · `danger` · `live`, default `neutral`), optional `icon` or `dot`, `size` (`sm` table density, default; `md` standalone), `title` for a hover reason, `aria-label` (falls back to `label`).

```tsx
<StatusBadge tone="success" label="Published" />
<StatusBadge tone="live" label="In session" dot />
<StatusBadge tone="danger" label="Failed" title="Build exited with code 1" />
```

**Rules**
- StatusBadge and ProgressBadge own the semantic hues (`status-*`). No other badge may use them to convey meaning.
- Meaning is never carried by colour alone (WCAG 1.4.1): `label` is required, so never work around it.
- A new status is a tone-mapping decision, not a new component. Map your own enum to a `StatusBadgeTone` (that is all the excluded ReviewStatusPill and PublishJobStatusPill were).
- The badge is 2px-radius, the "micro-anchor": it reads as an anchor, not a pill. Background is the tone at 18 percent over `surface-default`; the glyph and dot take the tone accent.
