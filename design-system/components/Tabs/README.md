# Tabs

Tabs switch between views of the same collection.

**Consumer provides:** `tabs` (`{ value, label, count?, disabled?, icon? }[]`), `value`, `onValueChange`, `ariaLabel` (required: the group needs an accessible name), `automationId`, `className`.

```tsx
<Tabs tabs={[{ value: 'all', label: 'All', count: 42 }, { value: 'draft', label: 'Drafts', count: 3 }]}
  value={tab} onValueChange={setTab} ariaLabel="Experience filters" />
```

**Rules**
- Not for navigation between pages, and never for a wizard's steps.
- If the options refine a list rather than switch its view, use ChoiceChips.
