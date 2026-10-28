The design system behind BTS Studio — the authoring and delivery platform BTS Digital uses to build and run client learning experiences. It covers the admin portal that BTS staff and client admins author in, and the participant-facing Journey app those experiences are delivered through.

BTS is a people-change consultancy: "the global leader in turning strategy into action." The product carries that work — journeys, simulations, coaching companions, get-togethers — to global enterprise audiences in 150+ scripts. That constraint shapes the system more than any aesthetic choice: Noto is the typeface because it covers the scripts, and every component ships with its ARIA wiring because WCAG 2.2 AA is the floor, not an aspiration.

The style is **Confident Minimalism**: polished, purposeful, direct. Charcoal `brand-interactive-default` (#24282B) dominates structurally — navigation, headers, body text, primary actions. Magenta `brand-secondary-default` (#CA1C68) punctuates: one accent per section, one highlighted word per headline. When magenta appears, it matters.

## Using this system

- Load `tokens.css`, then `components/bundle.css`, then React 18 and `components/bundle.js`. Every component mounts from `window.BTSStudio` (`BTSStudio.StatusBadge`, `BTSStudio.useToast` …).
- Buttons and form fields are deliberately not components: they are the `.ecb-*` classes in `bundle.css`, because BTS Studio consumes them from both React and authored HTML. See the Primitives card.
- Icons are Lucide (`lucide-react`). The bundle carries the few the components use, plus `BTSStudio.Icons` for previews; a production consumer installs `lucide-react`.
- The further sections — principles (design principles, visual identity, accessibility, content style, UX/UI copy) and patterns (navigation, drawer, modal, full page, lists, selection controls, blocking interruptions, interstitials, data visualisation) — are the source docs, unedited. Read the relevant one before building that kind of UI.

## Non-negotiables

Nine rules. Each exists because breaking it produced a real problem.

1. **Never hardcode a colour, spacing, radius or duration.** Use the tokens (`var(--text-subtle)`, `var(--space-200)`, `var(--radius-default)`, `var(--duration-fast)`). The only exceptions: 1px hairline borders, SVG geometry, and media-query breakpoints.
2. **Semantics over primitives.** Build from `text-*`, `surface-*`, `border-*`, `brand-*`, `status-*`. `palette-*` is for data visualisation, charts and category tags only — a primitive baked into a component is a hardcoded colour wearing a token's clothes.
3. **Charcoal is the default, not navy or black.** Magenta is never a large fill or a background.
4. **Reuse the governed components before writing a new one.** A hand-rolled status pill or search-and-pick popover is a bug, not a shortcut.
5. **Sentence case everywhere.** `text-transform: uppercase` is banned — in labels, headings, buttons and table headers alike.
6. **Semantic colour never carries meaning alone.** Every status needs a visible label. StatusBadge enforces this by making `label` required; do not work around it.
7. **WCAG 2.2 AA is the floor.** Every `<label>` paired via `htmlFor`/`id`; native `<button>` over clickable `<div>`; `alt` on every image. Never `autoFocus` — use `useEffect` + `ref.current?.focus()`.
8. **Mobile first.** Breakpoints `breakpoint-mobile` 375 · `breakpoint-tablet` 769 · `breakpoint-desktop` 1025 · `breakpoint-xlarge` 1441. Renders correctly at 375px wide.
9. **Positive framing on every control.** A label names what becomes true: "Show welcome screen", not "Don't show welcome screen". "Linear / Open" radios, not a "Non-linear flow" checkbox.

## Reach for the right thing

**Drawer, modal or page?** The user's position in the system must stay stable.

| Situation | Use |
| --- | --- |
| Editing an existing entity across several fields, list behind is context | Drawer |
| One focused decision — confirm, rename, destructive action | Modal |
| Creating an entity from scratch, or multi-section configuration | Full page |
| URL needs to be shareable or bookmarkable | Full page |

A drawer never opens a drawer; a modal never opens a modal; a drawer may open a modal (that is how unsaved-changes confirmation works). Unsaved changes always prompt — never a silent discard.

**Choice control**

| The user needs to… | Use |
| --- | --- |
| Pick one from a short fixed list (≈2–7), plain | native `<select class="ecb-form-select">` |
| …with icons, descriptions, or groups | Select |
| Pick one from a long list, needs search | Combobox |
| Pick several, shown as removable chips | MultiCombobox |
| Switch between views of the same collection | Tabs |
| Filter a list down | ChoiceChips |
| Two-plus mutually exclusive named states | radio group |
| One feature genuinely on or off | toggle |
| Additive selections in a list | checkboxes |

A toggle is never the right control for two named states, and a checkbox is never the right control for a binary feature state.

**Cards or a table?** Layout follows task and schema, not volume. Uniform fields plus compare-and-manage means a table (user management, cohort management). Heterogeneous fields plus browse-and-open means cards (content editor, experience manager). Growing item count is answered with pagination and filtering, never by switching layout.

**Badges — pick by what the label means.** StatusBadge: what state is this object in? ProgressBadge: how far through is this participant? EventBadge: what happened? TagBadge: what type is this? RoleBadge: who is this person to us? CountBadge: how many? Only StatusBadge and ProgressBadge own the semantic hues; `CountBadge tone="alert"` is the single exception.

**AI-driven changes need human confirmation.** If an AI action writes to a record that survives the session, a human confirms first. Ephemeral things — chat replies, suggestions, unapplied drafts — need none. Proposals state what changes, who it affects, and whether it is reversible; the confirmation UI never defaults to confirm.

## Content fundamentals

**Voice: personal, helpful, together.** We talk with people, not at them — BTS is in the people-change business, and the copy sounds like a practitioner rather than a researcher. Tone: conversational, respectful, empathetic, wildly curious, fun. Fun only where it enhances; never at the expense of clarity, and never "too cute".

- **Person.** Second person for the user's own things ("Your assignments", "your notes"); first-person plural for what the product did on their behalf ("We couldn't save your changes"). Never "the system", never "the user".
- **Casing.** Sentence case, everywhere, without exception. *Requires attention*, not *REQUIRES ATTENTION*; *Your assignments*, not *Your Assignments*. An overline is a `<span>` set in `caption-strong`, not a heading with `text-transform`.
- **Contractions and voice.** Use contractions. Active voice: "All managers use this process", not "This process is used by all managers". Short sentences. Lead with the action the user can take.
- **Buttons name the outcome.** *Create cohort*, not *Submit*. *Save changes*, not *OK*. *Publish journey*, not *Confirm*. *Remove participant*, not *Delete*.
- **Microcopy explains, never blames.** *Please enter a valid email address.* not *Invalid*. *Add at least one participant before publishing.* not *Required*. *We couldn't save your changes. Try again in a few minutes.* not *Save failed*.
- **Empty states are not errors.** *No cohorts yet. Create a cohort to start assigning participants.* not *No data*. *No actions match this filter.* not *Nothing found*.
- **Confirmations answer four questions:** what will happen, who is affected, can it be undone, what action confirms it. *Remove 14 participants?* with *Cancel* / *Remove participants* — never *Are you sure?* with *Yes* / *No*, and never a dialog that defaults to confirm.
- **Links describe the destination.** *View notification logs*, *Open facilitator app*, *Review version history* — never *Click here*, *Read more* or *Learn more*.
- **Terminology is fixed.** Participant (not end user, not learner). Experience (not object). Content item (not node). Version history (not audit payload). Never expose *node*, *payload*, *schema* or *record* to a non-technical user.
- **Global writing.** Written to translate: no idioms, slang, puns, sports or war metaphors, Americanisms, or long noun strings. *use* not *utilize*; *affected* not *impacted*; *okay* not *OK*; *toward* not *towards*; *versus* not *vs.*; *and* or *or*, never *and/or*. Avoid *&* unless space is genuinely constrained. Spell out one through nine, numerals for 10 and above, *50 percent* in prose.
- **Emoji: no.** None in product surfaces or the brand. The ⏱ in DurationBadge is muted to 50 percent opacity so it behaves like an icon.

## Visual foundations

**Colour.** `brand-interactive-default` (charcoal #24282B) is the dominant structural colour and the default interactive colour: primary buttons, nav, dark surfaces, body text. `brand-interactive-hover` (#4A4F53) is its hover. `brand-secondary-default` (magenta #CA1C68) is the accent, with `brand-secondary-hover` (#8C1047) for pressed and selected, and `brand-secondary-subtle` (#F7D0E3) for highlight backgrounds. Magenta is never a large fill, a background or body text. Set body copy in `text-default` on `surface-default`; secondary copy in `text-subtle`. `text-placeholder` (3.22:1 on white) is for placeholders and receding icons only, never for reading copy.

- **Client branding.** The `brand-interactive-*` tokens are overridden at runtime for client branding, so anything using them must still look right when a client changes them. `status-*` tokens are fixed for every client theme.
- **Data visualisation.** Six accents — teal, purple, red, blue, sky, pink — `palette-accent-1` to `palette-accent-6`, in that order, each with a fixed pattern fill for the colour-blind-friendly preference. Charts, categories and tags only.
- **Status.** `status-info`, `-success`, `-warning`, `-danger` and `-live` (teal, distinct from success green), each with a `-subtle` tint. `status-warning-default` (#FFA500) is 1.97:1 on white: never text, only a dot, border or tint beside a `text-default` label.

**Two canvases.** The admin shell sits on the warm page background (`--page-background`, `hsl(36 16% 93%)`, declared in `bundle.css` as a shadcn-style HSL triple) with white `surface-default` content above it and an `.ecb-app-shell-header` hairline at 40 percent opacity. The participant app sits on the cool `participant-page` (#F7FAFC) with a lighter `participant-nav` (#FAFAFA) rail and pure-white cards.

**Type.** Noto Sans (`--font-sans`) for all UI, at 400, 500, 600 and 700. Noto Serif (`--font-narrative`) for Journey narrative content only — never a serif heading in product UI. Source Code Pro (`--font-mono`) for code and system labels. Eleven semantic styles (`heading-xlarge` … `caption-strong`) each carry size, line-height and weight, so one class is the whole decision. Headings are heavy, confident, left-aligned and anchor the page; body copy is compact and direct. No ornamental treatments, no letter-spacing above 0.05em on headings. The participant surface runs larger than the scale (46px h1, 16–19px body) because it is read, not scanned.

**Layout.** Two-column grids are the dominant pattern. Ruled horizontal lines (`border-default`, 1px) separate sections — not card borders, not whitespace alone. Wide margins: order comes from space, not density. Spacing is an 8px grid with 2px micro-steps: `space-200` (16px) is the standard unit; `space-025`–`space-075` for optical alignment, `space-100`–`space-300` for component internals, `space-400` and up for page sections. Fixed elements are few and deliberate: the admin header, the participant left rail, the drawer's bottom action bar, the toast container top right, and `LanguageDropdown placement="fixed-top-right"`.

**Backgrounds and imagery.** Flat colour. No gradient hero backgrounds — charcoal is flat. No textures, repeating patterns or photography. The one decorative element is a two-tone grey wave (#C5C8CA over #ACAFB0) anchored to the bottom of the participant content area; admin and marketing surfaces have none. The only gradients are the journey-stage accents (`journey-stage-accent-gradient`), used as a thin directional rule.

**Where magenta acts.** In admin chrome the primary action is a charcoal fill and magenta only accents. On participant surfaces magenta carries the primary CTA directly: an outline pill in `brand-secondary-default` with a →, and a `brand-secondary-tint` (#FBE9F0) wash behind icon tiles and the user avatar. The rule is one magenta moment per section, not one magenta treatment per system.

**Cards.** Admin cards: 1px `border-default`, `radius-default` (8px), `space-200` padding, white, no shadow. Participant cards: white, 8px, 24–26px padding, borderless with a `shadow-xsmall-neutral` lift. Never a drop-shadowed card stack.

**Elevation.** Shadow-averse. Five neutral steps (`shadow-xsmall-neutral` … `shadow-xlarge-neutral`) plus brand and surface variants exist for things that genuinely float — menus, drawers, toasts, modals — and nothing else. Separate content with a ruled line first.

**Radii.** `radius-none` 0 · 2px (the badge "micro-anchor") · `radius-tight` 4px · `radius-default` 8px · `radius-loose` 12px · `radius-full` pill. Brand, marketing and participant surfaces use pill buttons; dense admin chrome uses 8px.

**Borders.** `border-width-default` 1px, `border-width-strong` 2px. Six semantic border tokens carry the system; `border-focus` (info blue #3685F3) is reserved for focus rings.

**Motion.** `duration-instant` 80 · `duration-fast` 150 · `duration-default` 250 · `duration-gentle` 350 · `duration-slow` 500ms, with `ease-enter` for arriving, `ease-exit` for leaving, `ease-transform` for moving in place. Fades and slides only — no bounces, springs or scale-in flourishes. Drawers slide from the edge over 250ms and dim the background to 40 percent. Reduced motion is honoured globally.

**States.**
- *Hover:* filled buttons go `brand-interactive-default` → `brand-interactive-hover`; outline and ghost buttons, menu items and options pick up `surface-subtle`. Never an opacity change.
- *Press:* ChoiceChips translate down 1px — the one press animation. Selected chips flip to `brand-secondary-hover` with white text.
- *Disabled:* `opacity: 0.6` plus `cursor: not-allowed` on buttons and controls; 0.45 on menu items; 0.4 on pagination buttons. Text-level disablement uses `text-disabled`.
- *Focus:* `2px solid var(--border-focus)` with a 2px offset, globally (3.62:1 on white). Form inputs instead take a charcoal border plus a 4px `brand-interactive-ring` halo. ChoiceChips draw a 3px inset ring. Never remove a focus ring.

**Transparency.** Sparingly and functionally: the 40 percent drawer and modal backdrop, 18 percent tints for status badge backgrounds, 10 percent hairlines on tints, the header rule at 40 percent. No backdrop blur. Alpha never mutes text.

**Stacking.** `z-base` → `z-dropdown` (100) → `z-sticky` (200) → `z-modal-backdrop` (300) → `z-modal` (400) → `z-tooltip` (500). Never an ad-hoc number.

## Iconography

- **Lucide line icons**, outline style, 1.5px stroke, 16px in dense chrome and 22px standalone. No icon font, sprite or PNG icons.
- **Icon lanes are enforced by component.** TagBadge takes object and type glyphs (document, route, box, sim, quiz); RoleBadge takes person and relationship glyphs (user, shield, star). Crossing lanes makes the two families indistinguishable.
- **Icon colour follows the component.** In StatusBadge and ProgressBadge the glyph takes the tone accent. In TagBadge, RoleBadge, DurationBadge and menu items it takes `text-placeholder`, so it recedes behind the label.
- **Unicode as iconography.** ↗ marks navigation out to another place on admin and marketing surfaces. Chevrons are for in-place progression and disclosure (*Continue ›*, *Show activities ⌄*), select triggers and accordions — never a chevron standing in for a navigation link. → in the participant CTA pill. ✕ closes; × at 300 weight in `.ecb-modal-dismiss`. ✓ marks a selected option. ⏱ is the duration glyph, muted to 50 percent.

## Logo

The bts Studio mark is a six-node cluster radiating from a centre point, a lowercase *bts*, a hairline rule, and *STUDIO* letterspaced, in a horizontal primary lockup and a stacked lockup, each in charcoal, colour and reverse. Charcoal on white and light surfaces; colour (magenta cluster and *STUDIO*, charcoal *bts*) where a brand moment is intended; reverse (all white) on charcoal only. Clear space at least the height of the node cluster on every side; never recolour, rotate, outline, add effects or reset it in another typeface. The lockup's casing is lockup typography, not a licence to break sentence case elsewhere.

The logo files are not in this system yet: until they are added, set the name in Noto Sans and never redraw the mark.
