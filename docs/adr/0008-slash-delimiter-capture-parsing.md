# Slash delimiter replaces LLM capture parser

Real-world usage revealed that the LLM capture parser was an expensive and unreliable detour. Users type just the word and hit capture — they rarely add locators inline, and when they do, the LLM sometimes misinterprets them (requiring a quotes workaround). We replaced the LLM parse call with a deterministic slash delimiter: everything before the first `/` is the Item, everything after is the optional Locator (in a session) or Source Hint (for a one-off). The split happens client-side with zero latency, a live visual split provides pre-submit verification, and the `rawText` field was dropped from the Capture model since the structured fields now contain all the information.

## Considered Options

- **LLM parser (original design)** — natural language input parsed by a server-side LLM call. Rejected: unreliable parsing, API latency on every capture, users had to wrap words in quotes as a workaround.
- **Two structured fields** — separate input fields for item and locator. Rejected: adds visual weight to the input bar; the optional field is empty most of the time, making a persistent second field feel like a gap.
- **Slash delimiter (chosen)** — single field, `/` as delimiter, client-side split, live visual feedback. Deterministic, instant, optional by nature (no slash = no locator).

## Consequences

- `CaptureParser` class and `capture-parser.ts` are deleted; the `capture-parser` tests and integration test are deleted.
- `rawText` column is removed from the Capture table (Prisma migration required).
- The tRPC `capture.create` mutation input changes from `{ rawText, sessionId? }` to `{ item, locator?, sourceHint?, sessionId? }`.
- The capture feedback state machine simplifies from `IDLE → LOADING → SUCCESS/ERROR → IDLE` to `IDLE → IDLE` — no loading state, no confirmation banner.
- The enrichment prompt is updated to include the Source Hint for one-offs, labeled as "Encounter context:".
- The slash delimiter requires a live visual split in the input (overlay technique) to provide pre-submit parse verification — this was the LLM parser's job, now done client-side.