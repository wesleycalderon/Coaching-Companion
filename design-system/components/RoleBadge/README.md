# RoleBadge

RoleBadge says who a person is to us, in neutral styling only.

**Consumer provides:** `label` (required), optional `icon`, `size` (`sm` · `md`), `aria-label`, `className`.

```tsx
<RoleBadge label="Facilitator" icon={<Shield />} />
```

**Rules**
- Icons are person and relationship glyphs only: person, shield, star. Crossing lanes with TagBadge makes the two families indistinguishable at a glance.
- Neutral only; the icon takes `text-placeholder`.
