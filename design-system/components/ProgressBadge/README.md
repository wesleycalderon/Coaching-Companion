# ProgressBadge

ProgressBadge shows how far through a participant is, using the fixed four-state progress model.

**Consumer provides:** `state` (required: `not_started` · `in_progress` · `completed` · `locked`), `emphasis` (`subtle` default, `prominent`), `size` (`sm` · `md`), optional `icon` (a lock for `locked`), `aria-label` (falls back to the state label).

```tsx
<ProgressBadge state="in_progress" />
<ProgressBadge state="completed" emphasis="prominent" size="md" />
```

**Rules**
- Four states, fixed. Do not add a fifth.
- `subtle` for admin tables; `prominent` for participant-facing surfaces. `not_started` and `locked` stay subtle regardless of `emphasis`.
- Labels are built in; never replace them with colour-only markers.
