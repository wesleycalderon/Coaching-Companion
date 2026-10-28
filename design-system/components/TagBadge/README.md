# TagBadge

TagBadge labels what type or category an object is, in neutral styling only.

**Consumer provides:** `label` (required), optional `icon`, `size` (`sm` · `md`), `className`.

```tsx
<TagBadge label="Journey" icon={<Route />} />
```

**Rules**
- Icons are object and type glyphs only: document, journey (route), content item (box), simulation, quiz. Never person glyphs; those belong to RoleBadge.
- Neutral only. The icon takes `text-placeholder` so it recedes behind the label.
- Never use semantic status colours here.
