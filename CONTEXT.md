# Kalima — Project Context

> A personal word bank tool that captures words and phrases from reading and watching, enriches them with AI, and builds a connected, searchable vocabulary.

## Problem

Building a personal word bank is painful. The biggest pain is **Enrichment** — manually adding definitions, translations, nuances, examples, and connections to captured words. Current tools (Notion, Anki) require a tedious second pass where the user looks up each word and fills in context by hand. This manual loop is where the project dies.

Secondary pains are **Capture** friction (breaking reading momentum to record a word) and the lack of **Review** workflows that make approval of enriched entries fast and trustworthy.

## Core insight

The enrichment step is perfectly suited for an LLM agent. The system should capture raw input quickly, enrich in the background, and present results for fast approval. All enriched entries go through human **Review** before entering the Word Bank — the user retains final say on every entry.

## User & domain

- **Single user** — personal tool, no auth, no multi-tenancy
- **Mixed language** — both foreign language learning and native/technical vocabulary
- **Arabic translation** is required for all entries
- **Items** (words and phrases) are equally important — the system handles both from day one

## Design decisions

### 1. Capture flow: Quick dump → batch enrich → review

The user maintains reading/watching momentum by capturing **Items** fast during a **Session**, with enrichment happening afterward. They do NOT stop to enrich during reading.

Capture input is a **text field** (typed or OS-level dictation) that feeds into an LLM parser on the server. The parser extracts the **Item**, any **Locator**, and any source hints from natural language input like:

- "serendipity chapter 12 page 45"
- "add serendipity, I'm on page forty five of chapter twelve"
- "the phrase is call me Ishmael, page 1"
- "serendipity — I heard it in a conversation"

No special audio pipeline needed — OS dictation produces text, the LLM parser handles the rest.

**Decision: Use OS-level dictation into a text input, not Web Speech API.** Simpler, more reliable, works on every device, zero browser compatibility issues.

The parsed result (Item + Locator) is displayed immediately in a running capture list, giving the user confirmation and parse verification without interrupting flow.

### 2. Session model: Explicit open/close, one Source per Session

A **Session** is opened with a **Source** (book title, show/episode, article URL). The user can only have one active **Session** at a time — they can't read two books simultaneously. A **Session** is closed explicitly by the user.

Session metrics (duration, count of captures) are **nice-to-have** — trivially stored (open/close timestamps) but not a design driver. Add whenever.

**One-offs** are captured without a **Session** — no **Source** association. A loose source hint (e.g., "conversation", "Twitter") is optional but not mandatory. Even a loose hint gives the agent a register signal that improves enrichment.

### 3. Source Context: Optional, progressive, re-enrichable

**Source Context** (chapter text, subtitle file, fetched article) is optional and can be attached later. The system supports **progressive source attachment**:

1. Start a **Session** with just the **Source** title → enrich at ~70% quality using title, genre, and the agent's training knowledge
2. Optionally attach **Source Context** later → trigger **Re-enrichment** → upgrade to ~95% quality with exact contextual meaning

**Re-enrichment is triggered from within an entry detail** in the Word Bank — the user encounters a shallow entry, attaches Source Context, and the re-enriched entries flow through Review. The old enrichment is preserved as a safety net: rejecting a re-enriched entry reverts to the previous approved state. No diff view.

For **books**: the user may paste chapter text when starting a session, or skip it entirely. For **videos**: the user may upload .srt files, or rely on show title + episode only. For **web articles**: paste a URL, the agent fetches content. For **physical books without digital copies**: title-only enrichment, which is still a massive upgrade over manual effort.

**Decision: Source Context is optional, not required.** 70% quality without it is acceptable as a starting point. The re-enrichment path is a first-class feature.

### 4. Enrichment pipeline: LLM-powered, with optional premium tier

The enrichment agent receives: **Item** + **Locator** + **Source** metadata + **Source Context** (if available) + **existing Word Bank entries** (for connections).

It produces: **Definition**, **Translation** (Arabic), **Nuance** note, **Example** sentences, related **Entries**, and tags.

**Model strategy:** All enrichments use a fast/cheap model by default (e.g., Claude Haiku, GPT-4o-mini). A premium tier (e.g., Claude Sonnet, GPT-4o) is available in the codebase for future use (e.g., user-triggered re-enrichment), but is not auto-triggered in the current flow.

**Decision: No auto-approve based on LLM self-assessment.** The agent's self-assessed confidence was found to add friction rather than value — the user reviews every entry anyway, and the LLM's judgment doesn't reliably predict whether the user will agree. All enriched entries enter Review as `pending_review` with full expandable detail.

**Capture parsing vs. enrichment — two distinct LLM calls per Capture:**

1. **Parse** (at capture time, fast/cheap model) — extracts Item, Locator, source hints from raw input. Lightweight, near-real-time. Displayed immediately in the capture list for user verification.
2. **Enrich** (after session close) — produces Definition, Translation, Nuance, Examples, Related Entries, Tags. Heavier, runs in background.

The parse call is cheap and high-value: the user sees "serendipity · p.45" instead of the raw "serendipity chapter 12 page 45", enabling scan-verification at capture time.

**Enrichment trigger:** After a **Session** is closed, enrichment runs automatically for all pending **Captures**.

**One enrichment call per Item** to start (not batched). Simpler to build, debug, and retry. Optimize later if needed.

### 5. Enrichment system prompt: Editable base with source-level context

The enrichment system prompt is the heart of the system. It has two configurable layers:

1. **Base system prompt** — the foundational instructions to the enrichment agent (agent role, output format, quality constraints). Editable from the Capture screen, stored globally in AppMeta. A factory default is defined in code; a reset button restores it. Applies to all captures: one-offs and session-related.

2. **Enrichment Context** — optional source-scoped guidance appended to the base system prompt (e.g., "Focus on technical terminology and political concepts. Formal register."). Mapped to a **Source**, persists across **Sessions**. Set when starting a session, editable mid-session. When present, appended with a hardcoded "Additional context:" label.

**Resolution chain:** `source.enrichmentContext → null` (base system prompt only). No per-session override.

The per-item user prompt (what to enrich: item, source, locator, existing entries) remains hardcoded — it is not customizable. Configurability is in the system prompt (how to enrich), not the user prompt.

### 6. Review flow: Every entry gets full attention

**Review is an inbox** — it only shows pending decisions. Approved entries move to the Word Bank and leave Review.

Entries appear **grouped by Session** with Source headers. **One-offs** have their own group. Per-session "Approve all" batch button available. No global auto-approve — the user decides on every entry.

- **Default view**: Each entry shows Item, Definition, Translation, and Tags. The user can approve at a glance (~5 seconds) if the definition and translation feel right.
- **Expand for detail**: If the definition or translation raises doubt, the user expands the card to inspect Nuance, Examples, and Related Entries before deciding.
- **Rejection**: On rejection, each enrichment field can be individually flagged as wrong, with an optional free-form note. The rejected entry returns to pending for re-enrichment, with the flagged fields and note as additional context for the agent.

A badge on the Review tab shows the count of pending entries, so the user always knows when Review needs attention.

## Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Backend | tRPC + Express | End-to-end type safety, familiar DX, transport-agnostic service layer |
| Frontend | React + Vite (PWA) + react-router v7 | Declarative routing with layout routes; single codebase for capture + review + browse; installable on mobile |
| Database | SQLite + Prisma + FTS5 | Zero-ops deployment, Prisma for type-safe queries, FTS5 for full-text search |
| Voice | OS-level dictation into text input | No audio pipeline needed — works everywhere, zero browser compatibility issues |
| Capture parsing | LLM on server | Handles natural variations in how users describe items and locators |
| Enrichment | LLM API calls | Fast/cheap model for all enrichment; premium tier available for future use |
| Hosting | Linux home server | Personal tool, always accessible |

### Key architecture principle: Transport-agnostic service layer

The enrichment pipeline, voice parsing, and re-enrichment logic live in a **service layer** independent of the tRPC routes. This means:

- Testable in isolation (mock LLM responses)
- Callable from any trigger (API route, background job, CLI)
- Transport layer (tRPC) can be swapped without touching the intelligence

```
┌──────────────────────┐
│ Transport (tRPC)      │  ← Thin wiring
├──────────────────────┤
│ Service layer         │  ← enrichItem(), parseCapture(),
│ (the brain)           │     reEnrich()
├──────────────────────┤
│ External APIs         │  ← LLM calls
├──────────────────────┤
│ Data layer (Prisma)   │  ← SQLite + FTS5
└──────────────────────┘
```

### FTS5 note

FTS5 is a built-in SQLite extension for full-text search. It requires ~10 lines of raw SQL for virtual table creation and search queries, wrapped in helper functions. All other database operations go through Prisma — no raw SQL needed.

## Entry schema

A fully enriched **Entry** contains:

```
Item: "serendipity"
Source: { title: "The Art of Innovation", type: "book", detail: "chapter 2" }
Locator: "page 47"
Source Context: <surrounding sentence, if available>
Language: English
Register: Formal/Literary/etc.

Definition: The occurrence of events by chance in a happy way
Translation (Arabic): مصادفة سعيدة
Nuance: More literary than 'luck'; implies pleasant surprise, not just random chance
Examples: [2-3 sentences matching the register/domain]
Related Entries: ["providence", "happenstance"]
Tags: ["literary", "positive-connotation", "chance"]
```

**Etymology** is explicitly excluded — noise, not value.
**Connections to other Entries** in the Word Bank are included — they turn isolated entries into a network.

## UI design

### Visual direction: Warm precision

A clean, warm, restrained aesthetic — never stark white, never pure black. Light-mode first, with a botanical-inspired palette (Moss) that pairs warm creams with deep sage accents. Typography uses Manrope for UI, Newsreader for item names and headings, and Noto Sans Arabic for translations. Icons from Heroicons, components built with Tailwind CSS v4 and Radix UI primitives (`@radix-ui/react-dialog` for Sheet, `@radix-ui/react-tabs`, `@radix-ui/react-popover`), motion handled by CSS transitions only. Routing via react-router v7 declarative mode. Full design tokens defined in [`design/DESIGN_SYSTEM.md`](./design/DESIGN_SYSTEM.md).

### Screen architecture

Three primary tabs: **Capture**, **Review**, **Word Bank**. No separate Settings screen — the base system prompt editor and enrichment context both live contextually on the Capture screen.

**Capture** — the landing screen. Two states:

- **No session**: the capture input is always available for **One-offs**; a clear prompt offers starting a **Session**
- **Session active**: session info (Source title, Source Context indicator) above a running capture list; input always available at the bottom

The capture input is never gated behind session setup. **Session management** (open/close, attach Source Context) is an inline expansion on the Capture screen — never a separate page.

**Review** — enriched entries awaiting approval, grouped by **Session** with Source headers. **One-offs** have their own group. Per-session "Approve all" batch button. A badge on the tab shows pending entry count.

**Word Bank** — search-first with recent entries shown by default. Full-text search across Items, Sources, and Tags (FTS5). No separate browse or filter screens. Entry detail is full-screen navigation with a back button.

### Key interaction patterns

**First-class navigable concepts**: Sources, Tags, and Related Entries are tappable links within entry details. Tapping navigates to filtered views or related entries. The entire Word Bank is explorable through a web of tappable connections.

**Content fields vs. navigation elements**: In entry details, content fields (Definition, Translation, Nuance, Examples) are plain text — tap to edit inline. Navigation elements (Source, Tags, Related Entries) are displayed as chips/pills — tap to navigate, × to remove, + to add. The visual distinction makes the tap behavior obvious.

**Related Entries must exist** in the Word Bank (autocomplete from existing entries, no creation). **Tags are freestyle** (autocomplete from existing tags, with creation on-the-fly).

**Flagged entries** open in a bottom sheet in Review (mobile) or a side panel (desktop) — the user never leaves the Review list. Field-level flagging on rejection with an optional free-form note.

**Re-enrichment**: triggered from within an entry detail by attaching Source Context. Re-enriched entries go through Review. Old enrichment preserved as a safety net — reverting on rejection.

**Responsive principle**: mobile is the constraint; larger screens are a progressive enhancement. All flows work on a phone. On tablet/desktop, the same structure adapts geometry (sidebar instead of bottom tabs, side panels instead of bottom sheets, master-detail layouts where width allows).

## Open questions (to resolve during development)

- **Enrichment timing**: ~~Automatic on session close, manual trigger, or scheduled?~~ **Resolved: automatic on session close.**
- **Best value LLM models**: Which specific models for cheap tier and premium tier? Needs benchmarking with real enrichment tasks.
- **Re-enrichment diffing**: ~~Should the system show what changed? Or silently update?~~ **Resolved: safety-net-only — old version preserved for revert on rejection, no diff view.**

## See also

- [`UBIQUITOUS_LANGUAGE.md`](./docs/UBIQUITOUS_LANGUAGE.md) — domain terminology, relationships, and flagged ambiguities