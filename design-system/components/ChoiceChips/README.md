# ChoiceChips

ChoiceChips are single-select filter chips that refine a list.

**Consumer provides:** `choices` (`{ value, label, count? }[]`), `value`, `onValueChange`, `ariaLabel` (required), `automationId`, `className`.

```tsx
<ChoiceChips choices={[{ value: 'week', label: 'This week' }, { value: 'month', label: 'This month', count: 8 }]}
  value={range} onValueChange={setRange} ariaLabel="Date range" />
```

**Rules**
- Selected chips flip to `brand-secondary-hover` (dark magenta) with white text; the count sits in a translucent white pill.
- The one press animation in the system: chips translate down 1px. Focus is a 3px inset ring so the pill shape stays intact.
- On participant surfaces these are the progress filters.
