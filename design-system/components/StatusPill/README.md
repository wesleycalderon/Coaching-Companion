# StatusPill

StatusPill is the rounder legacy status shape, kept so ported screens render identically.

**Consumer provides:** `children` (required), `tone` (`neutral` · `success` · `successSolid` · `warning` · `warningSolid` · `danger`), `title`, `aria-label`, `className`.

```tsx
<StatusPill tone="successSolid">Live</StatusPill>
```

**Rules**
- For new status work prefer StatusBadge: it owns the semantic hues, requires a visible label, and has the `live` and `info` tones StatusPill lacks.
- `warningSolid` puts white text on `status-warning-default` (#ffa500), which is below 4.5:1; avoid it for new work.
