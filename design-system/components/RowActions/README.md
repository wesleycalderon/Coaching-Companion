# RowActions

RowActions is the overflow menu at the end of a table row.

**Consumer provides:** `items` (required: `{ label?, onClick?, href?, danger?, disabled?, icon?, isDivider?, title?, automationId? }[]`), optional `triggerLabel` (omit for the 3-dot trigger), `triggerAriaLabel` (default "More actions"), `triggerClassName`, `triggerLeadingIcon`, `automationId` (unique per row).

```tsx
<RowActions items={[{ label: 'Edit', onClick: openEdit }, { isDivider: true }, { label: 'Remove participant', onClick: confirmRemove, danger: true }]}
  automationId={`cohort-${id}`} />
```

**Rules**
- Portals to `document.body` and flips above the trigger near the viewport edge, so it never clips in a scrolling table.
- Name the outcome: "Remove participant", not "Delete". A destructive item opens a confirmation modal; it never deletes silently.
- Menu items pick up `surface-subtle` on hover; disabled items sit at 0.45 opacity.
