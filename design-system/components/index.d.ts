/**
 * BTS Studio component types — documentation, emitted from bundle/src/components/bts with tsc.
 * Every component and hook is on window.BTSStudio (e.g. window.BTSStudio.StatusBadge).
 */
type ReactNode = import('react').ReactNode
type ReactElement = import('react').ReactElement
type KeyboardEvent<T = Element> = import('react').KeyboardEvent<T>
type FocusEvent<T = Element> = import('react').FocusEvent<T>
type RefObject<T> = import('react').RefObject<T>
type CSSProperties = import('react').CSSProperties

// ── StatusBadge/StatusBadge.d.ts ──
export type StatusBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'live';
export interface StatusBadgeProps {
    /** Semantic tone. Defaults to `neutral`. */
    tone?: StatusBadgeTone;
    /** Visible label text. Always required — meaning is never carried by colour alone. */
    label: string;
    /** Optional leading icon (e.g. a lucide-react element). Ignored when `dot` is true. */
    icon?: ReactNode;
    /** Render a small leading dot instead of an icon. The label remains visible. */
    dot?: boolean;
    /** Badge size. `sm` matches table-density; `md` for standalone use. Defaults to `sm`. */
    size?: 'sm' | 'md';
    /** Native hover tooltip (e.g. a specific failure reason). */
    title?: string;
    /** Accessible name. Falls back to the visible label when omitted. */
    'aria-label'?: string;
    className?: string;
}
/**
 * Governed status indicator. Semantic colour (info/success/warning/danger) is
 * owned exclusively by this component and ProgressBadge — no other badge family
 * may use these hues to convey meaning.
 *
 * tone is the fixed axis; label is free text. New statuses are a tone-mapping
 * decision, not a new component.
 */
export declare function StatusBadge({ tone, label, icon, dot, size, title, 'aria-label': ariaLabel, className, }: StatusBadgeProps): import("react/jsx-runtime").JSX.Element;

// ── ProgressBadge/ProgressBadge.d.ts ──
export type ProgressBadgeState = 'not_started' | 'in_progress' | 'completed' | 'locked';
export type ProgressBadgeEmphasis = 'subtle' | 'prominent';
export interface ProgressBadgeProps {
    /** Canonical four-state progress model. */
    state: ProgressBadgeState;
    /**
     * `subtle` (default) — tinted background, matches StatusBadge density. For admin tables.
     * `prominent` — filled background for in_progress/completed; larger feel. For participant app.
     * `not_started` and `locked` are always subtle regardless of emphasis.
     */
    emphasis?: ProgressBadgeEmphasis;
    /** Badge size. `sm` matches table-density; `md` for standalone use. Defaults to `sm`. */
    size?: 'sm' | 'md';
    /** Optional leading icon (e.g. a Lock icon for `locked` state). */
    icon?: ReactNode;
    /** Accessible name. Falls back to the default state label when omitted. */
    'aria-label'?: string;
    className?: string;
}
/**
 * Canonical four-state progress badge for journey/activity progress.
 *
 * Consumes the same status-tone tokens as StatusBadge — no duplicate values.
 * `idle` and `open` are retired; map them to `not_started` and `in_progress`.
 *
 * `prominent` emphasis uses a filled treatment for participant-app surfaces
 * where stronger visual feedback is appropriate.
 */
export declare function ProgressBadge({ state, emphasis, size, icon, 'aria-label': ariaLabel, className, }: ProgressBadgeProps): import("react/jsx-runtime").JSX.Element;

// ── EventBadge/EventBadge.d.ts ──
export type EventAction = 'create' | 'update' | 'delete' | 'publish' | 'assign' | 'unassign';
export interface EventBadgeProps {
    /** Audit-log event action verb. Drives tone automatically. */
    action: EventAction;
    /** Override the displayed label. Defaults to the capitalised action name. */
    label?: string;
    size?: StatusBadgeProps['size'];
    className?: string;
}
/**
 * Thin wrapper over StatusBadge for audit-log / event-action labels.
 *
 * Keeps "semantic hues render only through StatusBadge" literally true while
 * separating event verbs from the object-status enum. Does not own any CSS —
 * all rendering is delegated to StatusBadge.
 */
export declare function EventBadge({ action, label, size, className }: EventBadgeProps): import("react/jsx-runtime").JSX.Element;

// ── TagBadge/TagBadge.d.ts ──
export interface TagBadgeProps {
    /** Category or type label text. */
    label: string;
    /**
     * Object/type glyph — use document, journey, node, or sim icons.
     * Icon lane rule: tag icons must be object/type glyphs only.
     * Use RoleBadge for person/relationship glyphs.
     */
    icon?: ReactNode;
    size?: 'sm' | 'md';
    className?: string;
}
/**
 * Non-semantic category/type label. Neutral fill only — no semantic hues.
 *
 * Distinguishable from RoleBadge purely by icon lane:
 * - TagBadge icons are object/type glyphs (file, journey, node, simulation).
 * - RoleBadge icons are person/relationship glyphs (person, shield, star).
 *
 * Scales to unlimited types via icon + label; no variant prop needed.
 */
export declare function TagBadge({ label, icon, size, className }: TagBadgeProps): import("react/jsx-runtime").JSX.Element;

// ── RoleBadge/RoleBadge.d.ts ──
export interface RoleBadgeProps {
    /** Role or relationship label text. */
    label: string;
    /**
     * Person/relationship glyph — use person, shield, star, or "you" icons.
     * Icon lane rule: role icons must be person/relationship glyphs only.
     * Use TagBadge for object/type glyphs.
     */
    icon?: ReactNode;
    size?: 'sm' | 'md';
    /** Accessible name override. Falls back to the visible label when omitted. */
    'aria-label'?: string;
    className?: string;
}
/**
 * Non-semantic person/relationship label. Neutral only — no semantic hues,
 * no colour palette variations.
 *
 * Covers admin roles (Global Admin, Facilitator, etc.), cohort membership kind
 * (registered, generic), relational labels (You, Leader), and entity context
 * (Current client, Participant).
 *
 * Distinguishable from TagBadge purely by icon lane — keep icon choice
 * disciplined: person/relationship glyphs here, object/type glyphs in TagBadge.
 */
export declare function RoleBadge({ label, icon, size, 'aria-label': ariaLabel, className, }: RoleBadgeProps): import("react/jsx-runtime").JSX.Element;

// ── CountBadge/CountBadge.d.ts ──
export type CountBadgeTone = 'neutral' | 'alert';
export type CountBadgeSize = 'md' | 'sm';
export interface CountBadgeProps {
    /** The numeric count to display. */
    count: number;
    /**
     * When `count` exceeds `max`, renders `+{max}` instead of the raw number.
     * Useful for overflow indicators (e.g. "+3 more").
     */
    max?: number;
    /**
     * `neutral` — default. Count indicator in grey.
     * `alert` — uses the danger/red token. Reserved for unread or attention-required
     * counts only. This is the only CountBadge exception to the "no semantic hues
     * outside StatusBadge/ProgressBadge" rule.
     */
    tone?: CountBadgeTone;
    /**
     * `md` — default 20px pill.
     * `sm` — compact 16px pill for overlaying on top of icons (e.g. a bell
     * notification indicator) where the larger pill would obscure the icon.
     */
    size?: CountBadgeSize;
    /**
     * Render as a dot with no visible number. For unread notification indicators
     * where the count is not the primary information.
     */
    dot?: boolean;
    /** Accessible label. Defaults to "{count} items" or "{count} notifications" for dots. */
    'aria-label'?: string;
    className?: string;
}
/**
 * Numeric count indicator. Supports overflow truncation and a dot-only mode.
 *
 * The `alert` tone is the single permitted exception to the colour ownership rule:
 * it may use the danger/red token for unread/attention counts only.
 */
export declare function CountBadge({ count, max, tone, size, dot, 'aria-label': ariaLabel, className, }: Readonly<CountBadgeProps>): import("react/jsx-runtime").JSX.Element;

// ── DurationBadge/DurationBadge.d.ts ──
export interface DurationBadgeProps {
    /** Duration in minutes. Renders nothing for null/undefined/<= 0. */
    minutes: number | null | undefined;
    /** Hide the leading "~" for cases where the time is exact, not estimated. */
    exact?: boolean;
    className?: string;
}
/** Pill-style "~10m" badge. Returns null for empty/zero durations. */
export declare function DurationBadge({ minutes, exact, className }: DurationBadgeProps): import("react/jsx-runtime").JSX.Element;

// ── DurationBadge/formatDuration.d.ts ──
/**
 * Format minutes as `Xm`, `Xh`, or `Xh Ym`. Returns null when no useful value
 * is available so callers can simply do `{formatDurationMinutes(n) && ...}`.
 */
export declare function formatDurationMinutes(minutes: number | null | undefined): string | null;

// ── StatusPill/StatusPill.d.ts ──
export type StatusPillTone = 'neutral' | 'success' | 'successSolid' | 'warning' | 'warningSolid' | 'danger';
export interface StatusPillProps {
    /** Visual tone. Defaults to `neutral`. */
    tone?: StatusPillTone;
    children: ReactNode;
    /** Native hover tooltip (e.g. a specific failure reason). */
    title?: string;
    /** Accessible name. Falls back to the visible text when omitted. */
    'aria-label'?: string;
    className?: string;
}
/**
 * Presentational status pill shared across apps. Domain-specific labels and tone
 * mapping live in thin wrappers (e.g. ReviewStatusPill, PublishJobStatusPill).
 *
 * Uses a CSS module with design tokens (not Tailwind utilities) so it renders
 * correctly regardless of each app's Tailwind `content` globs.
 */
export declare function StatusPill({ tone, children, title, 'aria-label': ariaLabel, className, }: StatusPillProps): import("react/jsx-runtime").JSX.Element;

// ── Tabs/Tabs.d.ts ──
export interface TabItem {
    value: string;
    label: string;
    count?: number;
    disabled?: boolean;
    /** Optional leading icon (e.g. a lucide icon). Rendered decoratively before the label. */
    icon?: ReactNode;
}
export interface TabsProps {
    readonly tabs: readonly TabItem[];
    readonly value: string;
    readonly onValueChange: (value: string) => void;
    readonly ariaLabel: string;
    readonly className?: string;
    /**
     * When provided, each tab button gets `data-automation-id="${automationId}-tab-${tab.value}"`.
     * Required for stable E2E selectors because a generic default could collide when multiple
     * tab groups render on the same page. Omit when the tab group is not targeted by automation.
     */
    readonly automationId?: string;
}
export declare function Tabs({ tabs, value, onValueChange, ariaLabel, className, automationId, }: Readonly<TabsProps>): import("react/jsx-runtime").JSX.Element;

// ── ChoiceChips/ChoiceChips.d.ts ──
export interface ChoiceChipItem {
    value: string;
    label: string;
    count?: number;
    disabled?: boolean;
}
export interface ChoiceChipsProps {
    readonly choices: readonly ChoiceChipItem[];
    readonly value: string;
    readonly onValueChange: (value: string) => void;
    readonly ariaLabel: string;
    readonly className?: string;
    /**
     * When provided, each chip gets `data-automation-id="${automationId}-chip-${choice.value}"`.
     * Required for stable E2E selectors because a generic default could collide when multiple
     * choice groups render on the same page. Omit when the group is not targeted by automation.
     */
    readonly automationId?: string;
}
export declare function ChoiceChips({ choices, value, onValueChange, ariaLabel, className, automationId, }: Readonly<ChoiceChipsProps>): import("react/jsx-runtime").JSX.Element;

// ── Select/Select.d.ts ──
export interface SelectOption {
    value: string;
    label: string;
    /** Optional secondary line rendered under the label. */
    description?: string;
    /** Optional leading icon (decorative). */
    icon?: ReactNode;
    /** Options sharing a group render under a group heading. */
    group?: string;
    disabled?: boolean;
}
export interface SelectProps {
    readonly options: readonly SelectOption[];
    readonly value: string | null;
    readonly onChange: (value: string) => void;
    /** Accessible label. Rendered visibly unless `hideLabel`. */
    readonly label: string;
    readonly placeholder?: string;
    readonly disabled?: boolean;
    readonly error?: string | null;
    readonly hideLabel?: boolean;
    /** trigger → `${automationId}-trigger`, options → `${automationId}-option-${value}`. */
    readonly automationId?: string;
    readonly className?: string;
}
/**
 * Governed styled single-select **without** search. A richer, consistent alternative to a
 * native `<select>` for short, static option sets that benefit from icons, descriptions, or
 * grouping. For long or dynamic sets that need filtering, use `Combobox` instead; for a plain
 * short list with no styling needs, a native `<select>` is still fine.
 *
 * Listbox uses roving focus: opening focuses the selected (or first) option; Arrow keys move,
 * Home/End jump, Enter/Space select (native button), Escape closes, printable keys type-ahead.
 */
export declare function Select({ options, value, onChange, label, placeholder, disabled, error, hideLabel, automationId, className, }: SelectProps): ReactNode;

// ── Combobox/Combobox.d.ts ──
export interface ComboboxOption {
    /** Stable value returned to `onChange` and used as the React key. */
    value: string;
    /** Human-readable label shown in the trigger and list, and matched by the filter. */
    label: string;
    /** Optional secondary line rendered under the label. */
    description?: string;
    /** Optional group name — options sharing a group render under a group heading. */
    group?: string;
    disabled?: boolean;
}
export interface ComboboxProps {
    /** Options to choose from. */
    readonly options: readonly ComboboxOption[];
    /** Currently selected value, or `null` when nothing is chosen. */
    readonly value: string | null;
    /** Called with the chosen option's value when a selection is made. */
    readonly onChange: (value: string) => void;
    /** Accessible label for the field. Rendered visibly unless `hideLabel`. */
    readonly label: string;
    /** Trigger text shown when no value is selected. */
    readonly placeholder?: string;
    /** Placeholder inside the search input. */
    readonly searchPlaceholder?: string;
    /** Accessible name for the search input. Defaults to `searchPlaceholder`. */
    readonly searchAriaLabel?: string;
    /** Message shown when the filter matches nothing. */
    readonly emptyMessage?: string;
    /** Message shown when `options` is empty (before filtering). */
    readonly noOptionsMessage?: string;
    readonly disabled?: boolean;
    readonly loading?: boolean;
    /** Field-level error; renders an alert and error styling on the trigger. */
    readonly error?: string | null;
    /** Visually hide the label while keeping it accessible. */
    readonly hideLabel?: boolean;
    /**
     * Custom filter predicate. Defaults to a case-insensitive match on `label`.
     * Return true to keep the option for the given query.
     */
    readonly filterOption?: (option: ComboboxOption, query: string) => boolean;
    /**
     * Called each time the panel opens. Useful for lazily loading — or retrying a previously
     * failed load of — an async option set, mirroring a native `<select>`'s focus-to-load behaviour.
     */
    readonly onOpen?: () => void;
    /**
     * Base for stable E2E selectors: the trigger gets `${automationId}-trigger`, the search
     * input `${automationId}-search`, and each option `${automationId}-option-${value}`.
     */
    readonly automationId?: string;
    readonly className?: string;
}
/**
 * Governed searchable/filterable dropdown (combobox).
 *
 * A button trigger shows the current selection; opening it reveals a typeahead search input
 * (ARIA `role="combobox"`, `aria-activedescendant` navigation) over a `role="listbox"`.
 * Prefer this over a hand-rolled search-then-pick popover; prefer a native `<select>` for
 * short (≲7) static option sets that don't need search.
 *
 * Keyboard: ArrowDown/Up move the active option, Home/End jump to first/last, Enter selects,
 * Escape closes and returns focus to the trigger. Closes on outside click.
 */
export declare function Combobox({ options, value, onChange, label, placeholder, searchPlaceholder, searchAriaLabel, emptyMessage, noOptionsMessage, disabled, loading, error, hideLabel, filterOption, onOpen, automationId, className, }: ComboboxProps): ReactNode;

// ── MultiCombobox/MultiCombobox.d.ts ──
export interface MultiComboboxOption {
    value: string;
    label: string;
    description?: string;
    group?: string;
    disabled?: boolean;
}
export interface MultiComboboxProps {
    readonly options: readonly MultiComboboxOption[];
    /** Selected values (controlled). */
    readonly values: readonly string[];
    readonly onChange: (values: string[]) => void;
    readonly label: string;
    readonly placeholder?: string;
    readonly searchPlaceholder?: string;
    readonly searchAriaLabel?: string;
    readonly emptyMessage?: string;
    readonly noOptionsMessage?: string;
    readonly disabled?: boolean;
    readonly error?: string | null;
    readonly hideLabel?: boolean;
    /** Show a "Clear all" control when at least one value is selected. Default true. */
    readonly clearable?: boolean;
    readonly filterOption?: (option: MultiComboboxOption, query: string) => boolean;
    /**
     * toggle → `${automationId}-trigger`, search → `${automationId}-search`,
     * option → `${automationId}-option-${value}`, chip remove → `${automationId}-remove-${value}`.
     */
    readonly automationId?: string;
    readonly className?: string;
}
/**
 * Governed searchable multi-select. Selected values render as removable token chips; opening
 * reveals a typeahead search over a multi-selectable listbox where each option toggles on click
 * (the panel stays open). Use for choosing several items from a long set (tags, cohorts, filters).
 *
 * Keyboard: ArrowDown/Up move the active option, Home/End jump, Enter toggles, Backspace on an
 * empty query removes the last chip, Escape closes. Closes on outside click.
 */
export declare function MultiCombobox({ options, values, onChange, label, placeholder, searchPlaceholder, searchAriaLabel, emptyMessage, noOptionsMessage, disabled, error, hideLabel, clearable, filterOption, automationId, className, }: MultiComboboxProps): ReactNode;

// ── LanguageDropdown/LanguageDropdown.d.ts ──
export type LanguageOption = {
    code: string;
    name: string;
};
export type LanguageDropdownPlacement = 'inline' | 'fixed-top-right';
export interface LanguageDropdownProps {
    /** Languages available for selection. Renders nothing when empty. */
    languages: LanguageOption[];
    /** Code of the currently selected language (e.g. `en`, `pt-BR`). */
    currentLanguage: string;
    /** Called with the selected language code. The consumer owns the switching logic. */
    onSelectLanguage: (code: string) => void;
    /**
     * When provided, only languages whose code appears in this array are shown in the
     * dropdown (e.g. scope the picker to a journey's enabled languages).
     */
    restrictToLanguages?: string[];
    placement?: LanguageDropdownPlacement;
    /** Base for stable E2E selectors on the trigger and each language option. */
    automationId?: string;
}
/**
 * Vendor-agnostic language switcher. Dormant until a localisation vendor is
 * integrated — feed it languages via props; it holds no translation logic itself.
 * Matches BiTSy auth design: ghost trigger (translate icon + code); panel with
 * "Language" header and two-line rows (native + English). Render inside the app header
 * (e.g. beside notifications). Use `placement="fixed-top-right"` on login pages.
 */
export declare function LanguageDropdown({ languages, currentLanguage, onSelectLanguage, restrictToLanguages, placement, automationId, }: LanguageDropdownProps): import("react/jsx-runtime").JSX.Element;

// ── LanguageDropdown/LanguageTranslateIcon.d.ts ──
/**
 * BiTSy language / translate mark (from bitsy.btscoach.com LanguageSelector).
 * Filled icon — use with `currentColor` on the trigger.
 */
export declare function LanguageTranslateIcon({ className }: {
    className?: string;
}): import("react/jsx-runtime").JSX.Element;

// ── LanguageDropdown/languageLabels.d.ts ──
/**
 * Native-language display names for the language picker (primary line in each row).
 * English names come from the consumer-provided `lang.name` (subtitle line).
 */
/** Native-script (or locale-appropriate) label for the primary row line. */
export declare function nativeNameFor(code: string, fallback: string): string;
/** Uppercase 2-letter code shown on the trigger (e.g. EN, PT). */
export declare function codeBadge(code: string): string;

// ── RowActions/RowActions.d.ts ──
interface MenuPosition {
    top: number;
    left: number;
}
export declare function computeRowActionsMenuPosition(triggerRect: DOMRect, menuHeight: number, viewportHeight?: number): MenuPosition;
export interface RowAction {
    /** Unused when `isDivider` is true */
    label?: string;
    onClick?: () => void;
    href?: string;
    danger?: boolean;
    disabled?: boolean;
    /** Optional leading icon. Decorative — rendered with `aria-hidden`. */
    icon?: ReactNode;
    /** Visual separator (ignores other fields). */
    isDivider?: boolean;
    /** Native tooltip (e.g. explain a bulk action). */
    title?: string;
    /** Stable E2E selector for this menu item. Falls back to `${automationId}-item-${index}`. */
    automationId?: string;
}
export interface RowActionsProps {
    items: RowAction[];
    /** Optional visible trigger label. When omitted, the trigger renders as a 3-dot icon button. */
    triggerLabel?: string;
    /** Override the trigger's accessible name. Defaults to `"More actions"` when no label is provided. */
    triggerAriaLabel?: string;
    /**
     * Override the trigger's CSS class. Use when the trigger should look like a
     * full button instead of the default in-row icon-trigger.
     */
    triggerClassName?: string;
    /** Optional leading icon rendered before the trigger label (decorative). */
    triggerLeadingIcon?: ReactNode;
    /**
     * Base for stable E2E selectors. When provided, the trigger gets
     * `data-automation-id="${automationId}-trigger"` and each menu item gets
     * `${automationId}-item-${index}` (unless the item supplies its own `automationId`).
     * Make it unique per row when many RowActions render on one page (e.g. include the row id).
     */
    automationId?: string;
}
export declare function RowActions({ items, triggerLabel, triggerAriaLabel, triggerClassName, triggerLeadingIcon, automationId, }: Readonly<RowActionsProps>): import("react/jsx-runtime").JSX.Element;

// ── DropdownButton/DropdownButton.d.ts ──
export type DropdownButtonItem = RowAction;
export interface DropdownButtonProps {
    /** Visible trigger label. */
    readonly label: string;
    /** Menu items — actions (`onClick`), links (`href`), dividers (`isDivider`). */
    readonly items: RowAction[];
    /** Optional leading icon on the trigger (decorative). */
    readonly leadingIcon?: ReactNode;
    /** Visual weight of the trigger. Defaults to `secondary`. */
    readonly variant?: 'primary' | 'secondary';
    /**
     * Base for stable E2E selectors: trigger → `${automationId}-trigger`,
     * items → `${automationId}-item-${index}` (unless an item supplies its own).
     */
    readonly automationId?: string;
}
/**
 * Governed action-menu button: a labelled button that opens a menu of actions or links.
 * Use for "create new", "add", or grouped-action triggers. Built on `RowActions`, so it
 * inherits the portaled positioning, outside-click/Escape handling, and menu-item contract.
 *
 * This is for **actions/navigation**, not value selection — for choosing a value use
 * `Select`/`Combobox`; for a compact in-row overflow menu use `RowActions` directly.
 */
export declare function DropdownButton({ label, items, leadingIcon, variant, automationId, }: Readonly<DropdownButtonProps>): import("react/jsx-runtime").JSX.Element;

// ── Drawer/Drawer.d.ts ──
export type DrawerSide = 'left' | 'right';
export interface DrawerProps {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    children: ReactNode;
    side?: DrawerSide;
    eyebrow?: ReactNode;
    subtitle?: ReactNode;
    headerMeta?: ReactNode;
    footer?: ReactNode;
    closeLabel?: string;
    topOffset?: string;
    width?: string;
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
    id?: string;
    className?: string;
    panelClassName?: string;
    bodyClassName?: string;
    footerClassName?: string;
}
export declare function Drawer({ open, onClose, title, children, side, eyebrow, subtitle, headerMeta, footer, closeLabel, topOffset, width, closeOnBackdrop, closeOnEscape, id, className, panelClassName, bodyClassName, footerClassName, }: DrawerProps): import("react").ReactPortal;

// ── AnimatedDrawer/AnimatedDrawer.d.ts ──
export type AnimatedDrawerProps = UseAnimatedDrawerOptions & {
    children: ReactNode;
    /** `aria-labelledby` on the dialog panel */
    ariaLabelledBy?: string;
    /** `aria-label` when there is no visible title id */
    ariaLabel?: string;
};
/**
 * Right-edge drawer portaled to `document.body` with shared open/close animations.
 * Prefer this (or `useAnimatedDrawer` directly) over reimplementing overlay state.
 */
export declare function AnimatedDrawer({ children, ariaLabelledBy, ariaLabel, ...drawerOptions }: AnimatedDrawerProps): import("react").ReactPortal;

// ── AnimatedDrawer/useAnimatedDrawer.d.ts ──
export declare function prefersReducedMotion(): boolean;
export type UseAnimatedDrawerOptions = {
    /** Parent-controlled open flag */
    open: boolean;
    /** Called with `false` once the drawer has finished closing (after exit animation when motion is enabled). */
    onOpenChange: (open: boolean) => void;
    /**
     * Extra guard — when false, `requestClose` is a no-op (e.g. only close while `modal === 'edit'`).
     * Defaults to `open`.
     */
    canClose?: boolean;
    /** Runs after close completes (same timing as `onOpenChange(false)`). Use for reset/cleanup. */
    onAfterClose?: () => void;
    /** Listen for Escape while visible. Default true. */
    closeOnEscape?: boolean;
};
export type UseAnimatedDrawerResult = {
    /** Render the portal while `open || closing` */
    visible: boolean;
    /** Exit animation in progress */
    closing: boolean;
    /** True while closing (state) — use for disabled UI */
    isInteractionLocked: boolean;
    /** Synchronous — true immediately after `requestClose()` (for async `finally` blocks) */
    isInteractionLockedSync: () => boolean;
    /** Start animated close (backdrop, ×, Cancel, Escape) */
    requestClose: () => void;
    /** Abort an in-progress close (e.g. user picked another row while the drawer was sliding out) */
    cancelClose: () => void;
    overlayClassName: string;
    panelClassName: string;
    overlayProps: {
        className: string;
        role: 'presentation';
        tabIndex: -1;
        onClick: (e: MouseEvent<HTMLDivElement>) => void;
        onAnimationEnd: (e: AnimationEvent<HTMLDivElement>) => void;
    };
    styles: typeof drawerStyles;
};
export declare function useAnimatedDrawer({ open, onOpenChange, canClose, onAfterClose, closeOnEscape, }: UseAnimatedDrawerOptions): UseAnimatedDrawerResult;

// ── PublishDialog/PublishDialog.d.ts ──
export interface PublishDialogProps {
    open: boolean;
    onClose: () => void;
    onPublish: () => void;
    publishing: boolean;
    error: string | null;
    title?: string;
    description?: string;
    publishLabel?: string;
    /** Override label above the change-note textarea. */
    noteLabel?: string;
    /** Override `data-testid` on the backdrop. Useful for tests that select by container. */
    backdropTestId?: string;
    /** Base for stable E2E selectors on the dialog's controls. Defaults to `publish-dialog`. */
    automationId?: string;
    changeNote: string;
    onChangeNote: (value: string) => void;
    /** Categories are optional; omit `categories`/`onRemoveCategory` to hide the chip editor. */
    categories?: string[];
    categoryInput?: string;
    onChangeCategoryInput?: (value: string) => void;
    onCategoryKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
    onCategoryBlur?: () => void;
    onRemoveCategory?: (category: string) => void;
}
export declare function PublishDialog(props: PublishDialogProps): import("react/jsx-runtime").JSX.Element;

// ── Toast/ToastContext.d.ts ──
export interface ToastApi {
    error: (message: string) => void;
    success: (message: string) => void;
    info: (message: string) => void;
}
export declare function useToast(): ToastApi;
export declare function ToastProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;

// ── internal/ListboxOptionText.d.ts ──
export interface ListboxOptionTextProps {
    /** The consuming component's CSS module (must define `optionText`, `optionLabel`, `optionDescription`). */
    readonly styles: Record<string, string>;
    readonly label: string;
    readonly description?: string;
}
/**
 * The label + optional secondary description shown inside a dropdown option row. Shared by the
 * whole dropdown family (`Select`, `Combobox`, `MultiCombobox`) so option typography stays
 * identical; each component passes its own CSS module so styling remains component-scoped.
 */
export declare function ListboxOptionText({ styles, label, description, }: ListboxOptionTextProps): ReactNode;

// ── internal/ListboxTrigger.d.ts ──
export interface ListboxTriggerProps {
    /** The consuming component's CSS module (must define `trigger`, `triggerOpen`, `triggerError`, `triggerText`, `placeholder`, `chevron`). */
    readonly styles: Record<string, string>;
    readonly triggerRef: RefObject<HTMLButtonElement>;
    readonly open: boolean;
    readonly disabled?: boolean;
    readonly error?: string | null;
    /** Whether a value is selected — toggles the placeholder styling on the text span. */
    readonly hasValue: boolean;
    readonly labelId: string;
    readonly listboxId: string;
    readonly errorId: string;
    readonly automationId: string;
    readonly onClick: () => void;
    readonly onKeyDown?: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
    /** Trigger contents — the selected label (optionally with a leading icon) or placeholder text. */
    readonly children: ReactNode;
}
/**
 * The button trigger for the non-searchable / searchable single-select dropdowns (`Select`,
 * `Combobox`): current-selection text + chevron, with shared ARIA wiring (`aria-haspopup`,
 * `aria-expanded`, `aria-controls`, `aria-labelledby`, `aria-describedby`) and error styling.
 * Each component passes its own CSS module and click/keyboard behaviour.
 */
export declare function ListboxTrigger({ styles, triggerRef, open, disabled, error, hasValue, labelId, listboxId, errorId, automationId, onClick, onKeyDown, children, }: ListboxTriggerProps): ReactNode;

// ── internal/SearchableListboxPanel.d.ts ──
/** Per-option render result: the shared panel owns the row scaffolding, the component owns these. */
export interface RenderedListboxOption {
    readonly selected: boolean;
    /** className applied to the option `<button>`. */
    readonly className: string;
    /** Invoked on click / activation of the option. */
    readonly onSelect: () => void;
    /** Inner content of the option button (e.g. checkbox + text, or text + check). */
    readonly content: ReactNode;
}
export interface SearchableListboxPanelProps<T extends ListboxOptionBase> {
    /** The consuming component's CSS module (must define the panel/search/list/option classes). */
    readonly styles: Record<string, string>;
    readonly inputRef: RefObject<HTMLInputElement>;
    readonly query: string;
    readonly setQuery: (query: string) => void;
    readonly onInputKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
    readonly searchPlaceholder: string;
    readonly searchAriaLabel?: string;
    readonly listboxId: string;
    readonly labelId: string;
    readonly activeDescendant: string | undefined;
    readonly automationId: string;
    /** Sets the listbox to a multi-selectable ARIA role. */
    readonly multiselectable?: boolean;
    /** Optional trailing control inside the search row (e.g. a "Clear all" button). */
    readonly searchTrailing?: ReactNode;
    readonly filtered: readonly T[];
    readonly groups: ReadonlyArray<ListboxGroup<T>>;
    readonly activeIndex: number;
    readonly setActiveIndex: (index: number) => void;
    readonly optionId: (index: number) => string;
    /** Length of the unfiltered option set — distinguishes "no matches" from "no options". */
    readonly optionsLength: number;
    readonly emptyMessage: string;
    readonly noOptionsMessage: string;
    readonly renderOption: (args: {
        option: T;
        index: number;
        active: boolean;
    }) => RenderedListboxOption;
}
/**
 * Shared search-input + option-list panel for the searchable dropdown family (`Combobox`,
 * `MultiCombobox`). Owns the typeahead input, the empty/group-header scaffolding, and the option
 * `<button>` row (ids, roles, `aria-selected`, disabled, automation ids, mouse-enter activation).
 * Each component supplies its selection semantics and per-option content via `renderOption`.
 */
export declare function SearchableListboxPanel<T extends ListboxOptionBase>({ styles, inputRef, query, setQuery, onInputKeyDown, searchPlaceholder, searchAriaLabel, listboxId, labelId, activeDescendant, automationId, multiselectable, searchTrailing, filtered, groups, activeIndex, setActiveIndex, optionId, optionsLength, emptyMessage, noOptionsMessage, renderOption, }: SearchableListboxPanelProps<T>): ReactNode;

// ── internal/useSearchableListbox.d.ts ──
/**
 * Minimal option shape shared by the searchable dropdown family (`Combobox`, `MultiCombobox`).
 * Individual components extend this with component-specific fields (e.g. `icon`).
 */
export interface ListboxOptionBase {
    value: string;
    label: string;
    description?: string;
    group?: string;
    disabled?: boolean;
}
export interface ListboxGroup<T> {
    group: string;
    items: Array<{
        option: T;
        index: number;
    }>;
}
/**
 * Group options under their `group` key while preserving each option's flat index (needed for
 * option ids and keyboard navigation). Options without a group fall under the `''` key. Shared by
 * every dropdown in the family so grouping/ordering stays identical across `Select`, `Combobox`,
 * and `MultiCombobox`.
 */
export declare function groupOptions<T extends {
    group?: string;
}>(options: readonly T[]): Array<ListboxGroup<T>>;
export interface UseSearchableListboxParams<T extends ListboxOptionBase> {
    readonly options: readonly T[];
    /** Predicate deciding whether an option survives the (already lower-cased, trimmed) query. */
    readonly filterOption: (option: T, query: string) => boolean;
    readonly disabled?: boolean;
    readonly loading?: boolean;
    /** Called each time the panel opens (lazy-load / retry hook). */
    readonly onOpen?: () => void;
}
export interface UseSearchableListbox<T extends ListboxOptionBase> {
    readonly open: boolean;
    readonly query: string;
    readonly activeIndex: number;
    readonly rootRef: RefObject<HTMLDivElement>;
    readonly triggerRef: RefObject<HTMLButtonElement>;
    readonly inputRef: RefObject<HTMLInputElement>;
    readonly labelId: string;
    readonly listboxId: string;
    readonly errorId: string;
    readonly optionId: (index: number) => string;
    readonly filtered: T[];
    readonly enabledIndexes: Array<{
        option: T;
        index: number;
    }>;
    readonly groups: Array<ListboxGroup<T>>;
    readonly activeDescendant: string | undefined;
    readonly setQuery: (query: string) => void;
    readonly setActiveIndex: (index: number) => void;
    readonly setOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
    readonly openPanel: () => void;
    readonly closePanel: (returnFocus?: boolean) => void;
    readonly moveActive: (direction: 1 | -1) => void;
    /** Handles ArrowUp/Down + Home/End. Returns true when it consumed the event. */
    readonly handleNavigationKey: (event: {
        key: string;
        preventDefault: () => void;
    }) => boolean;
}
/**
 * Shared controller for the searchable dropdown family (`Combobox`, `MultiCombobox`). Owns the
 * open/query/active-option state, the search-input + trigger refs and ARIA ids, the filtered /
 * grouped option derivations, and the common keyboard-navigation + open/close/outside-click
 * behaviour. Components render their own trigger and option rows and layer on their selection
 * semantics (single commit vs. multi toggle) on top of this.
 */
export declare function useSearchableListbox<T extends ListboxOptionBase>({ options, filterOption, disabled, loading, onOpen, }: UseSearchableListboxParams<T>): UseSearchableListbox<T>;
