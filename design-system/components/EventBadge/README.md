# EventBadge

EventBadge names what happened in an audit log, deriving its tone from the action so every log stays consistent.

**Consumer provides:** `action` (`create` · `update` · `delete` · `publish` · `assign` · `unassign`), optional `label` to override the text, `size`, `className`.

```tsx
<EventBadge action="publish" />
<EventBadge action="delete" label="Removed" />
```

**Rules**
- Delegates to StatusBadge and owns no CSS. Never pick a tone per call site.
- Use only for audit verbs. For object state use StatusBadge.
