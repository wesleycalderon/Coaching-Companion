# CountBadge

CountBadge answers "how many?" as a compact number or dot.

**Consumer provides:** `count` (required), optional `max` (renders `+{max}` past it), `tone` (`neutral` default; `alert`), `size` (`md` default; `sm` 16px for overlaying icons), `dot` (no visible number), `aria-label` (derived if omitted; give one with `dot`).

```tsx
<CountBadge count={12} />
<CountBadge count={3} tone="alert" size="sm" />
<CountBadge count={1} dot aria-label="Unread notifications" />
```

**Rules**
- `tone="alert"` is the single documented exception to the semantic-hue rule, reserved for unread and attention-required counts.
- Overlay `sm` on a bell or icon button; the container positions it.
