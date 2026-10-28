# Select

Select picks one option when options need icons, descriptions or groups.

**Consumer provides:** `options` (`{ value, label, description?, icon?, group?, disabled? }[]`), `value: string | null`, `onChange(value)`, `label` (required), `placeholder`, `disabled`, `error`, `hideLabel`, `automationId`, `className`.

**Rules**
- For a plain short list (about 2 to 7 options) use a native `<select class="ecb-form-select">`. For a long list that needs search, use Combobox.
- Always pass `label`; use `hideLabel` when it is visually redundant but still needed by assistive tech. Never omit it.
- Shares the keyboard model and ARIA wiring with Combobox and MultiCombobox.
