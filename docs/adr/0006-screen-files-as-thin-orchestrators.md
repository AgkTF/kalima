# ADR 6: Screen files as thin orchestrators

## Status

Accepted

## Context

Screen files in `packages/web/src/screens/` have bloated into god files twice:

1. **CaptureScreen** — mixed screen orchestration, input handling, capture list rendering, and session forms into one file. Since refactored into `screens/CaptureScreen/` with a directory of sub-files.
2. **ReviewScreen** — mixed screen orchestration, entry cards, rejected entry cards, a reject form, shared utilities, and types into one file (~330 lines).

In both cases, the root cause was the same: no structural convention preventing a screen file from accumulating sub-components, utilities, and types. Without a barrier, screens grow until they collapse under their own weight.

The question is: what rule prevents this from happening a third time?

## Decision

**Screen files are thin orchestrators only.** They own:

- Screen layout structure (header, scrollable body, sections)
- tRPC queries and mutations
- State that spans multiple sections (e.g., `rejectingId`, `showRejected`)
- Inline markup that is used exactly once and is trivial (< 15 lines)

Everything else lives in sibling files within the screen's directory:

- **Sub-components** (cards, forms, lists) → `ComponentName.tsx` in the screen directory
- **Shared utilities** (constants, parsers, helpers) → `reviewUtils.ts` or similar
- **Domain types** (interfaces specific to the screen) → co-located in `reviewUtils.ts` or a dedicated `types.ts`

### Screen directory structure

```
screens/SomeScreen/
  SomeScreen.tsx          ← thin orchestrator: layout, queries, mutations
  ComponentA.tsx          ← sub-component
  ComponentB.tsx          ← sub-component
  someScreenUtils.ts      ← constants, helpers, types shared by sub-components
```

### File-count threshold for sub-directories

Start flat. When a screen directory reaches **8+ files**, introduce a `components/` sub-directory for JSX-rendering files:

```
screens/SomeScreen/
  components/             ← JSX-rendering sub-components
    ComponentA.tsx
    ComponentB.tsx
    ComponentC.tsx
    ...
  SomeScreen.tsx          ← orchestrator stays at top level
  someScreenUtils.ts      ← utilities stay at top level
```

The grouping rule: if it renders JSX, it goes in `components/`. The orchestrator and utilities stay at the top level because they form the "interface" of the screen — a developer opens the directory and immediately sees the entry point.

### Inline-by-design marker

For inline sections that are deliberately not extracted (single-use, trivial), annotate with a signal comment:

```tsx
{/* Inline by design (1 use). Extract at 3+ uses. See ADR 0006. */}
```

This signals to developers and AI agents that the inlining was intentional, not neglect, and provides a clear trigger for when to revisit.

## Consequences

- **No more god files** — screen files enforced as thin orchestrators by convention
- **Discoverability preserved** — flat directories stay scannable until 8 files, then sub-directories take over
- **Deliberate inlining** — inline-by-design markers prevent both premature abstraction and rotting inlines
- **Consistent with CaptureScreen** — the existing refactored pattern becomes the mandated pattern
