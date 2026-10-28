# Drawer

Drawer edits an existing entity across several fields while the list behind it stays as context.

**Consumer provides:** `open`, `onClose`, `title`, `children` (all required), plus `side` (`right` default, `left`), `eyebrow`, `subtitle`, `headerMeta`, `footer`, `closeLabel`, `topOffset`, `width`, `closeOnBackdrop`, `closeOnEscape`, `id`, and `className` / `panelClassName` / `bodyClassName` / `footerClassName`.

```tsx
<Drawer open={open} onClose={close} title="Edit cohort" subtitle="Acme Q3 intake"
  footer={<><button className="ecb-btn-secondary" onClick={close}>Cancel</button><button className="ecb-btn-primary" onClick={save}>Save changes</button></>}>
  {/* fields */}
</Drawer>
```

**Rules**
- Put save and close in `footer`: it renders as the fixed action bar at the bottom.
- A drawer never opens a drawer. It may open a modal; that is how unsaved-changes confirmation works. Unsaved changes always prompt.
- Slides from the edge over `duration-default` (250ms) and dims the background to 40 percent.
- Creating from scratch or multi-section configuration is a full page, not a drawer.
