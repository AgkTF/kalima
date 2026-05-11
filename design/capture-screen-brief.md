# Capture Screen Design Exploration — Handoff

> Copy this into a new conversation for visual design iteration on the Capture screen.

## Where we are

The design system infrastructure is built (issue #16, branch `feat/design-system`). This includes:

- **Tailwind CSS v4** configured with Moss palette (9 colors), spatial tokens, and typeface trio
- **react-router v7** declarative routing with 3 routes: `/capture`, `/review`, `/wordbank`
- **BottomTabBar** component with Heroicons (BookOpenIcon, ClipboardDocumentListIcon, BookmarkIcon)
- **Review** and **Word Bank** screens: empty states only ("All caught up" / "Your word bank is empty")

### Capture screen (current state)

The capture screen has **functional logic** from issue #3 (one-off capture with LLM parsing) but **minimal visual styling**. It works — you can type text, submit captures, and see them in a list. But it looks plain.

**Current layout:**
```
┌─────────────────────────────┐
│ [Empty state or capture list]│  ← scrollable, fills available space
│                             │
├─────────────────────────────┤
│ [Inline feedback]           │  ← success/error messages
├─────────────────────────────┤
│ [Input bar]                 │  ← text input + "Capture" button
├─────────────────────────────┤
│ [Tab bar]                   │  ← fixed bottom nav
└─────────────────────────────┘
```

**Current styling:**
- List: `divide-y divide-divider` rows with `font-display text-ink` item names
- Input: `bg-surface border-divider rounded-button` with `focus:ring-accent`
- Button: `bg-accent text-page rounded-button`
- Success feedback: `bg-accent-subtle text-accent` badge, auto-dismisses
- Empty state: "Capture your first word" centered in `text-dim`

## What we're trying to solve

The capture list looks like an Excel spreadsheet — rows with dividers, no visual personality. The goal is to make it **fun to use, aesthetically pleasing, and professional**. This is a personal word bank tool; the UI should feel warm and inviting.

### Specific design problems

1. **List entries look like a table**, not like cherished words being collected
2. **List feels unanchored** — no visual framing, especially when there's no top bar
3. **Could the list grow upward?** (chat-style: newest at bottom, older items scroll up) — open question
4. **Visual hierarchy is flat** — everything is the same weight

### Constraints

- **Mobile-first** (phone is the primary target)
- **Light mode only**
- **Moss palette**: warm creams (#F6F4EF page, #FDFCF7 surface), deep sage accent (#456859)
- **No stark white, no pure black**
- **Typographic hierarchy**: Manrope (UI), Newsreader (item names), Noto Sans Arabic (translations)
- **Minimal shadows** — depth comes from warm color separation
- **CSS transitions only** — no JS animation library
- **Design tokens are fixed** — the palette, radii, shadows, and fonts are settled

### Design tokens (for quick reference)

| Token | Value | Tailwind class |
|-------|-------|----------------|
| Page background | `#F6F4EF` | `bg-page` |
| Surface (cards, inputs) | `#FDFCF7` | `bg-surface` |
| Borders/dividers | `#E2E3DA` | `border-divider` |
| Primary text | `#1C1E1C` | `text-ink` |
| Secondary text | `#7E847A` | `text-dim` |
| Accent | `#456859` | `text-accent`, `bg-accent` |
| Accent subtle | `#E8EDE4` | `bg-accent-subtle` |
| Chip background | `#E9ECE4` | `bg-chip` |
| Chip text | `#5C6A58` | `text-chip-text` |
| Button/input radius | `10px` | `rounded-button` |
| Card radius | `14px` | `rounded-card` |
| Sheet radius | `20px` | `rounded-sheet` |
| Card shadow | `0 1px 3px rgba(0,0,0,0.04), ...` | `shadow-card` |
| Floating shadow | `0 2px 8px rgba(0,0,0,0.06), ...` | `shadow-floating` |
| UI font | Manrope 400-600 | `font-ui` |
| Display font | Newsreader 400-700 | `font-display` |
| Arabic font | Noto Sans Arabic 400, 700 | `font-arabic` |

## Approach

Iterate through **static HTML explorations** (similar to `design/spatial-exploration.html` and `design/palette-exploration.html` in the project). These are standalone HTML files that use Tailwind CDN and the Moss tokens to prototype layouts without touching the React codebase.

Once the visual design is settled, implement it in `packages/web/src/screens/CaptureScreen.tsx`.

### What a capture entry contains

Each capture has these fields (from the data model):
- **item**: The word or phrase (e.g., "serendipity", "call me Ishmael")
- **locator**: Page/chapter reference (e.g., "p.45", "chapter 12")
- **sourceHint**: Where it came from (e.g., "conversation", "Twitter")
- **createdAt**: Timestamp

### Ideas to explore

- Card-style entries with subtle backgrounds and shadows
- Left accent border on each entry
- Timestamp displayed as relative time ("2 min ago")
- Alternating or staggered entry styles
- Chat-bubble or timeline aesthetic
- Entry animation on appear (CSS transitions via data attributes)
- Whether a top bar is needed and what goes in it
- List growing upward vs. downward

## Project files to reference

- `design/DESIGN_SYSTEM.md` — full visual spec
- `design/spatial-exploration.html` — example of HTML prototyping approach
- `design/palette-exploration.html` — color exploration
- `packages/web/src/app.css` — Tailwind theme tokens
- `packages/web/src/screens/CaptureScreen.tsx` — current React implementation
- `packages/web/src/components/BottomTabBar.tsx` — tab bar component

## Outcome

A finalized visual design for the capture list that can be implemented as a React component. The design should feel warm, polished, and inviting — a home for someone's growing word collection.
