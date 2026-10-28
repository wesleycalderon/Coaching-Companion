# ToastProvider

ToastProvider and useToast show transient success, error and info messages, top right.

**Consumer provides:** one `<ToastProvider>` above the routes; then `const toast = useToast()` and `toast.success(msg)`, `toast.error(msg)`, `toast.info(msg)`.

```tsx
toast.success('Cohort saved')
toast.error("We couldn't save your changes. Try again in a few minutes.")
```

**Rules**
- Durations are fixed per variant (success 4s, error 7s, info 8s), so urgency is encoded once.
- `useToast()` throws outside the provider, surfacing a missing provider immediately.
- Microcopy explains, never blames: "We couldn't save your changes", not "Save failed".
