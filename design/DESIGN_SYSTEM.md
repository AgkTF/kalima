# Kalima — Design System

## Color palette — Moss

| Role | Hex | Tailwind token | Usage |
|---|---|---|---|
| Background | `#F6F4EF` | `bg-page` | Page background |
| Surface | `#FDFCF7` | `bg-surface` | Cards, panels, input fields |
| Border | `#E2E3DA` | `border-default` | Dividers, input borders |
| Text primary | `#1C1E1C` | `text-primary` | Headings, body text |
| Text secondary | `#7E847A` | `text-secondary` | Labels, helper text, definitions |
| Accent | `#456859` | `accent` | Buttons, active states, links |
| Accent subtle | `#E8EDE4` | `accent-subtle` | Active tab background, hover states |
| Chip background | `#E9ECE4` | `chip-bg` | Tag/chip fills |
| Chip text | `#5C6A58` | `chip-text` | Tag/chip labels |

Theme: light-mode first. Never stark white (`#FFF`), never pure black (`#000`). Warm creams with deep sage accent.

## Typography

| Role | Typeface | CSS font-family | Weight | Usage |
|---|---|---|---|---|
| UI / body | Manrope | `'Manrope', system-ui, sans-serif` | 400–600 | Buttons, tabs, chips, labels, inputs, body text, metadata |
| Latin display | Newsreader | `'Newsreader', serif` | 400–700 | Item names, section headings |
| Arabic body | Noto Sans Arabic | `'Noto Sans Arabic', sans-serif` | 400, 700 | Translations, Arabic content |

Loaded from Google Fonts CDN.

## Border radius

| Element | Value |
|---|---|
| Buttons, inputs, chips, tabs | 10px |
| Cards, panels | 14px |
| Sheets, modals | 20px (top corners for bottom sheets) |

## Shadows

Minimal approach — depth comes from warm color separation, not heavy shadows.

| Context | Value |
|---|---|
| Cards (grounded) | `0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)` |
| Floating (dropdowns, sheets) | `0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)` |

## Component architecture

- **Styling**: Tailwind CSS v4
- **Complex components**: Radix UI primitives (`@radix-ui/react-dialog` for Sheet, `@radix-ui/react-tabs`, `@radix-ui/react-popover`)
- **Routing**: react-router v7 declarative mode with layout routes
- **Simple components**: Built directly with Tailwind (chips, buttons, inputs)
- **Icons**: Heroicons — outline (24px) for general UI, solid (20px) for active states, mini (16px) for chip-level

## Motion

CSS transitions and animations only. Tailwind `transition-*` and `animate-*` utilities. Key animations driven by Radix primitives' `data-state` attributes for enter/exit. No JS animation library. Timing: 150–200ms ease-outs.

## Feedback system

Inline feedback only — no toasts. Every server interaction provides feedback contextually, near the action that triggered it. Success is self-evident (the UI updates); errors are shown inline where the user is looking.

### Capture

```
IDLE ───submit──▶ LOADING ───parse ok──▶ SUCCESS ───confirms──▶ IDLE
               LOADING ───parse fail──▶ ERROR ────refills──▶ IDLE
```

- **IDLE**: input ready, focused, placeholder visible
- **LOADING**: button shows "…", input disabled
- **SUCCESS**: parsed result confirmed inline below input, animates into list; input clears
- **ERROR**: input refills with original text, inline error shown below: "Couldn't parse. Try again?"

### Review: approve

```
PENDING ───approve──▶ RESOLVED
PENDING ◀───server rejects──── RESOLVED
```

- **PENDING**: entry card visible in review list
- **RESOLVED**: card animates out immediately (optimistic); entry moves to Word Bank
- If server rejects: card reappears in list with inline error: "Failed. Tap to retry."

### Review: reject

```
PENDING ───reject──▶ FLAGGED ───reenrich──▶ PENDING
PENDING ◀───server rejects────────────────── FLAGGED
```

- **PENDING**: entry card visible in review list
- **FLAGGED**: entry stays in review list with per-field flag indicators; re-enrichment triggered
- If server rejects: flagged fields unflag, inline error: "Failed to submit. Try again."

### Word Bank: edit

```
VIEWING ───tap field──▶ EDITING ───save──▶ SAVING ───confirm──▶ VIEWING
                                           SAVING ───reject──▶ EDITING
```

- **VIEWING**: entry detail displayed, content fields shown as text
- **EDITING**: field becomes editable inline
- **SAVING**: subtle spinner on the field
- On success: brief checkmark animation on the field, returns to VIEWING
- On error: field reverts to previous value, inline error below field: "Changes not saved."

### Session management

```
NO_SESSION ───start──▶ OPENING ───created──▶ ACTIVE
             ◀───server rejects── OPENING
ACTIVE ────close──▶ CLOSING ────closed──▶ NO_SESSION
          ◀───server rejects── CLOSING
```

- **NO_SESSION**: persistent bar shows "No active session" with a Start button
- **OPENING**: button shows spinner; server creates session
- **ACTIVE**: session bar shows "Reading: Moby Dick" with Manage/Close buttons
- **CLOSING**: button shows spinner; triggers enrichment on success
- On error: inline error shown in the session bar area

### Background enrichment failures

Enrichment runs server-side after session close. Failures are surfaced when the user opens Review.

```
ENRICHING ───all succeed──▶ READY
ENRICHING ───some fail───▶ PARTIAL_FAIL ───open Review──▶ BANNER_SHOWN
                                                  BANNER_SHOWN ───tap retry──▶ ENRICHING
```

- **ENRICHING**: server-side processing after session close
- **READY**: all entries appear in Review, no banner
- **BANNER_SHOWN**: persistent banner at top of Review: "2 enrichments failed — tap to retry."

## Layout

- **Mobile** (primary constraint): Bottom tab bar — Capture, Review, Word Bank
- **Desktop** (deferred): Responsive enhancements decided later. Mobile components built first; Tailwind responsive prefixes added when needed.
- Review detail: Bottom sheet on mobile, side panel on desktop (deferred)

## Screen architecture

### Capture
- Always-available text input at the bottom of the screen (thumb-height), above the tab bar
- Two states: no session active / session active, shown in a persistent bar between list and input with a "Manage" button that opens a bottom sheet for session setup
- Session setup: bottom sheet (Radix Sheet) with source title and enrichment prompt override
- Source context is attached progressively via a separate "Add context" bottom sheet (text paste / URL paste / file upload). Supports .srt, .md, .pdf, and .txt files. Attaching context to an active session triggers re-enrichment of existing captures.
- Closing a session triggers automatic enrichment
- Running capture list scrolls above the session bar
- Input clears on submit for rapid-fire capture; parsed result confirmed inline below input before animating into the list
- Enrichment prompt template accessible from a "Prompt" button in the session bar. Opens a dedicated sheet.
  - No session active: edits the global default prompt
  - Session active: edits that session's override, pre-filled with the global default
- Empty state: "Capture your first word" centered; input always focused and ready

### Review
- Flat list with sticky session headers (collapsible sections deferred)
- Entries displayed as cards: item (Newsreader), definition, translation, tags
- Flagged entries visually distinct with a warning indicator
- "Approve all auto-approved" button at top of list; per-session approve in each sticky header
- Flagged entries open in bottom sheet detail view with all enrichment fields visible in a scrollable list
- Each field has a per-field flag toggle; rejected fields provide precise feedback to the re-enrichment agent
- Rejection note: conditional auto-growing textarea (capped ~3 lines), appears only after at least one field is flagged, sits between scrollable fields and the bottom action bar
- Bottom action bar: [Reject] (outline, destructive) and [Approve] (accent, primary), always visible
- Badge on tab showing pending count
- Empty state: "All caught up" centered

### Word Bank
- Search bar at top (traditional placement), recent entries shown by default before search
- Entry cards: item (Newsreader), definition, translation, tags
- Entry detail as full-screen push navigation with back button
- Content fields (definition, translation, nuance, examples) tap-to-edit inline
- Navigation elements (source, tags, related entries) displayed as chips/pills — tap to navigate, × to remove, + to add
- Related entries autocomplete from existing entries, no on-the-fly creation
- Tags autocomplete from existing tags, creation on-the-fly
- Empty state: "Your word bank is empty" centered; becomes "No results" after search
