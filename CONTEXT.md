# Kalima — Project Context

> A personal word bank tool that captures words and phrases from reading and watching, enriches them with AI, and builds a connected, searchable vocabulary.

## Problem

Building a personal word bank is painful. The biggest pain is **Enrichment** — manually adding definitions, translations, nuances, examples, and connections to captured words. Current tools (Notion, Anki) require a tedious second pass where the user looks up each word and fills in context by hand. This manual loop is where the project dies.

Secondary pains are **Capture** friction (breaking reading momentum to record a word) and the lack of **Review** workflows that make approval of enriched entries fast and trustworthy.

## Core insight

The enrichment step is perfectly suited for an LLM agent. The system should capture raw input quickly, enrich in the background, and present results for fast approval. The agent should **flag uncertainty instead of guessing** — high-confidence enrichments auto-approve; low-confidence ones surface for human review.

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

### 2. Session model: Explicit open/close, one Source per Session

A **Session** is opened with a **Source** (book title, show/episode, article URL). The user can only have one active **Session** at a time — they can't read two books simultaneously. A **Session** is closed explicitly by the user.

Session metrics (duration, count of captures) are **nice-to-have** — trivially stored (open/close timestamps) but not a design driver. Add whenever.

**One-offs** are captured without a **Session** — no **Source** association. A loose source hint (e.g., "conversation", "Twitter") is optional but not mandatory. Even a loose hint gives the agent a register signal that improves enrichment.

### 3. Source Context: Optional, progressive, re-enrichable

**Source Context** (chapter text, subtitle file, fetched article) is optional and can be attached later. The system supports **progressive source attachment**:

1. Start a **Session** with just the **Source** title → enrich at ~70% quality using title, genre, and the agent's training knowledge
2. Optionally attach **Source Context** later → trigger **Re-enrichment** → upgrade to ~95% quality with exact contextual meaning

For **books**: the user may paste chapter text when starting a session, or skip it entirely. For **videos**: the user may upload .srt files, or rely on show title + episode only. For **web articles**: paste a URL, the agent fetches content. For **physical books without digital copies**: title-only enrichment, which is still a massive upgrade over manual effort.

**Decision: Source Context is optional, not required.** 70% quality without it is acceptable as a starting point. The re-enrichment path is a first-class feature.

### 4. Enrichment pipeline: LLM-powered, tiered, confidence-flagged

The enrichment agent receives: **Item** + **Locator** + **Source** metadata + **Source Context** (if available) + **existing Word Bank entries** (for connections).

It produces: **Definition**, **Translation** (Arabic), **Nuance** note, **Example** sentences, related **Entries**, and tags.

**Tiered model strategy:**

| Tier | Model class | When used | Cost |
|---|---|---|---|
| First pass | Fast/cheap (e.g., Claude Haiku, GPT-4o-mini) | All **Captures** | Negligible |
| Second pass | Premium (e.g., Claude Sonnet, GPT-4o) | **Flagged** enrichments only | Modest |

**Self-assessment mechanism:** The agent evaluates its own **Confidence** in each enrichment. High confidence → **Auto-approve**. Low confidence → **Flag** for human **Review** or premium-tier upgrade.

**Enrichment trigger:** After a **Session** is closed, enrichment runs for all pending **Captures**. Exact timing (automatic on close, manual trigger, or scheduled) is undecided — cost may influence this.

**One enrichment call per Item** to start (not batched). Simpler to build, debug, and retry. Optimize later if needed.

### 5. Enrichment prompt: Configurable from day one

The enrichment prompt is the heart of the system. It must be **configurable/template-based** so the user can tweak enrichment behavior (more examples, different translation register, etc.) without changing code.

### 6. Review flow: Light for most, deep for flagged

- **Light review**: Skim a list of newly enriched entries, quick-approve most (~5 seconds each)
- **Deeper review**: Only for **Flagged** items where the agent was uncertain or ambiguous

The agent surfaces uncertainty rather than silently guessing wrong.

## Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Backend | tRPC + Express | End-to-end type safety, familiar DX, transport-agnostic service layer |
| Frontend | React + Vite (PWA) | Single codebase for capture + review + browse; installable on mobile |
| Database | SQLite + Prisma + FTS5 | Zero-ops deployment, Prisma for type-safe queries, FTS5 for full-text search |
| Voice | OS-level dictation into text input | No audio pipeline needed — works everywhere, zero browser compatibility issues |
| Capture parsing | LLM on server | Handles natural variations in how users describe items and locators |
| Enrichment | LLM API calls (tiered) | Cheap model for first pass, premium for flagged items |
| Hosting | Linux home server | Personal tool, always accessible |

### Key architecture principle: Transport-agnostic service layer

The enrichment pipeline, voice parsing, confidence assessment, and re-enrichment logic live in a **service layer** independent of the tRPC routes. This means:

- Testable in isolation (mock LLM responses)
- Callable from any trigger (API route, background job, CLI)
- Transport layer (tRPC) can be swapped without touching the intelligence

```
┌──────────────────────┐
│ Transport (tRPC)      │  ← Thin wiring
├──────────────────────┤
│ Service layer         │  ← enrichItem(), parseCapture(),
│ (the brain)           │     assessConfidence(), reEnrich()
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

## Open questions (to resolve during development)

- **Enrichment timing**: Automatic on session close, manual trigger, or scheduled? Cost may drive this.
- **Best value LLM models**: Which specific models for cheap tier and premium tier? Needs benchmarking with real enrichment tasks.
- **Re-enrichment diffing**: When Source Context is attached and re-enrichment runs, should the system show the user what changed? Or silently update?

## See also

- [`UBIQUITOUS_LANGUAGE.md`](./UBIQUITOUS_LANGUAGE.md) — domain terminology, relationships, and flagged ambiguities