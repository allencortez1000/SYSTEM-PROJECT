# UI Style Guide

This guide documents the shared frontend design patterns used across the system so future pages stay visually consistent without changing application behavior.

## Design direction

Use a **clean executive HR dashboard** style:
- professional and readable
- modern but not flashy
- dense enough for operations teams
- consistent spacing, card hierarchy, and action treatment

## Core principles

1. **Prefer shared patterns over one-off styling**
2. **Keep hierarchy obvious**: eyebrow → title → support text → content
3. **Use color by meaning**, not decoration
4. **Preserve function**: styling changes must not alter routes, validation, or workflows
5. **Optimize scanning** for HR, payroll, attendance, and admin users

## Layout standards

### Page shell
Use `page-shell` for page-level spacing.

### Page header
Use `page-header` for the main page intro area.

Recommended structure:

```tsx
<div className="page-header">
  <div>
    <p className="eyebrow">Section label</p>
    <h1 className="page-title mt-1">Page Title</h1>
    <p className="page-subtitle">Clear supporting description.</p>
  </div>
</div>
```

### Section spacing
Recommended rhythm:
- `gap-4` between related cards
- `mb-4` or `mb-6` between major sections
- keep internal panel spacing consistent with `card-header` and `card-body`

## Cards

### KPI cards
Prefer `stat-card` for summary metrics.

Recommended structure:

```tsx
<div className="stat-card accent-blue min-h-[128px]">
  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
    Metric Label
  </p>
  <p className="mt-2 text-3xl font-black text-slate-950">123</p>
  <p className="mt-1 text-sm text-slate-600">Supporting context</p>
</div>
```

### Section containers
Prefer `section-card` for major panels and `card-header` / `card-body` for internal layout.

```tsx
<div className="section-card p-0 overflow-hidden">
  <div className="card-header">
    <div>
      <p className="eyebrow">Section</p>
      <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">Panel title</h3>
      <p className="mt-1 text-sm text-slate-600">Panel description</p>
    </div>
  </div>
  <div className="card-body">
    ...
  </div>
</div>
```

## Color system

Use accents consistently:
- `accent-blue` → people, primary actions, navigation
- `accent-emerald` → payroll success, healthy state, approved
- `accent-cyan` → live activity, attendance, analytics
- `accent-amber` → pending, warning, upcoming
- `accent-red` → overdue, rejected, destructive state
- `accent-slate` → neutral system information, admin metadata

Avoid using red for non-critical information.

## Typography

### Eyebrow labels
Use `eyebrow` for section labels.

### Titles
- page titles: `page-title`
- section titles: `text-lg font-black tracking-tight text-slate-900`

### KPI labels and values
- labels: `text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500`
- values: `text-3xl font-black text-slate-950`
- support text: `text-sm text-slate-600`

## Buttons

### Shared button hierarchy
Use these classes when available:
- `primary-button` or `btn btn-primary` for main actions
- `secondary-button` or `btn btn-secondary` for supporting actions
- `btn btn-danger` for destructive actions

### Sizing
Primary actions should generally use a fixed height feel like `h-11` when built inline.

Recommended inline pattern:

```tsx
<Link
  href="/example"
  className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white"
>
  Primary Action
</Link>
```

## Filters and forms

Use shared filter styles from `frontend/app/components/filter-config.ts`:
- `filterInputClassName`
- `filterSearchInputClassName`
- `filterActionButtonClassName`
- `filterSelectCompactClassName`

### Guidance
- keep labels above controls
- prefer rounded-xl surfaces
- avoid introducing many custom input styles on individual pages
- use `FilterBar` when a page has search/filter controls

## Tables

Prefer `soft-table` inside a scroll wrapper.

```tsx
<div className="table-scroll">
  <table className="soft-table">
    ...
  </table>
</div>
```

### Table rules
- keep headers uppercase and compact
- use descriptive column names
- avoid excessive row height
- preserve hover state and clickability where relevant

## Status badges

Use pill-like badges for concise state communication.

Suggested tones:
- success: `bg-emerald-100 text-emerald-700`
- neutral: `bg-slate-100 text-slate-700`
- info: `bg-blue-50 text-blue-700`
- live activity: `bg-cyan-50 text-cyan-700`
- warning: `bg-amber-100 text-amber-700`
- critical: `bg-red-100 text-red-700`

For “active employees only” callouts, prefer `badge-active-only`.

## Modals

Use the shared record details modal style in `frontend/app/components/record-details-modal.tsx` as the reference.

Modal guidelines:
- strong title hierarchy
- clear grouped fields
- consistent close action placement
- readable spacing for mobile and desktop

## Empty states

Good empty states should:
- explain what is missing
- suggest the next step
- avoid sounding like an error unless it is one

Examples:
- `No recent employees found`
- `Add employee records with assigned departments to populate this summary.`
- `Try changing the status filter or add a new employee record to get started.`

## Safe design changes

These are generally safe and should not affect behavior:
- spacing
- shadows
- border radius
- typography
- hover states
- accent colors
- card layout
- section labels
- empty-state wording

## Changes that require extra care

Be more careful with:
- form restructuring
- moving controls into hidden areas
- route changes
- modal behavior changes
- table interaction patterns
- validation-related markup changes

## Recommended workflow for future UI updates

1. Reuse an existing page pattern first
2. Prefer shared utility classes and shared components
3. Keep visual changes scoped and minimal
4. Run diagnostics after UI edits
5. Avoid changing business logic unless required by the task

## Reference files

Shared UI foundations currently live in:
- `frontend/app/globals.css`
- `frontend/app/components/dashboard-shell.tsx`
- `frontend/app/components/filter-bar.tsx`
- `frontend/app/components/filter-config.ts`
- `frontend/app/components/record-details-modal.tsx`

Use these files as the source of truth before inventing new patterns.
