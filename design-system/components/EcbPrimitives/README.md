# EcbPrimitives

The `.ecb-*` classes are BTS Studio's buttons, form fields, pagination and dismiss control: plain CSS in `bundle.css`, usable on `<button>` and `<a>` from React or authored HTML.

| Class | What it is |
| --- | --- |
| `.ecb-btn-primary` | Charcoal fill, white text — the main action |
| `.ecb-btn-secondary` | Outline button — supporting actions |
| `.ecb-btn-secondary-active` | Secondary in a selected or active state |
| `.ecb-btn-ghost` | Text button — tertiary and inline actions |
| `.ecb-btn-danger` | Destructive action |
| `.ecb-form-label` | Field label, paired to its control by `for`/`id` |
| `.ecb-form-input` | `input` / `textarea`; focus is a charcoal border plus a 4px `brand-interactive-ring` halo |
| `.ecb-form-input-narrow` | Width modifier for short values |
| `.ecb-form-select` | Native `select` with the chevron affordance |
| `.ecb-pagination` + `-info` / `-controls`, `.ecb-page-btn`, `.ecb-page-indicator` | Table footer pagination |
| `.ecb-modal-dismiss` + `.ecb-modal-dismiss-char` | The × close button |
| `.ecb-app-shell-header` | App-shell top bar with the 40 percent hairline rule |

**Rules**
- One primary action per view; name the outcome (*Create cohort*, not *Submit*).
- Disabled buttons sit at 0.6 opacity; pagination buttons at 0.4.
- shadcn's own `<Button>` is themed by the variable bridge in `bundle.css`; use `.ecb-btn-*` for the exact BTS Studio button.
