# One-off enrichment is deferred to an explicit trigger, not fired at capture time

One-off captures (`sessionId: null`) used to enrich immediately: `capture.create` awaited `createPlaceholderEntry` (creating a `processing` Entry) and fire-and-forget `enrichCapture`. The capture entered `"processing"` the instant it was created and rendered `ProcessingCaptureEntry` — which has no inline editor. The user never saw the `+ add source` tap target that #47 added to `NormalCaptureEntry`, because the capture skipped the normal state entirely. This immediate-enrichment predates #47; #47 exposed the gap, it didn't introduce it.

Session captures don't have this problem. `capture.create` only enriches when `!sessionId`, so session captures sit with `entry: null` (normal state, `+ add locator` visible) until `session.close` runs `createPlaceholderEntries` + `enrichSessionCaptures`. One-offs were missing that "close session" trigger.

## Decision

**Decouple capture from enrichment for one-offs.** `capture.create` for one-offs creates the `Capture` with `entry: null` and nothing else. It renders `NormalCaptureEntry` with the `+ add source` tap target — the user adds a Source Hint retroactively, exactly as session captures get `+ add locator` during an open session.

**Add an explicit enrichment trigger — `enrichment.enrichOneOffs` mutation — the analog of "close session".** The router orchestrates two phases, mirroring the `session.close` pattern: Phase 1 (awaited) calls `EnrichmentService.createOneOffPlaceholderEntries` which selects pending one-off captures (`sessionId: null`, `entry: null`, oldest-first), creates `processing` placeholder entries, and returns the capture IDs; Phase 2 (fire-and-forget, via `.catch()` at the router) calls `EnrichmentService.enrichOneOffCaptures` which enriches each via the existing `enrichCapture` (reused unchanged), concurrency 3, flipping entries to `pending_review`. The router returns `{ queuedCount }`.

**"Pending enrichment" is durable DB state** — a `Capture` with `entry: null` — not an in-memory timer. It survives server restarts, needs no arbitrary delay window, and lets the user trigger enrichment whenever ready, matching the session flow's explicit "close".

**The UI is an "Enrich all (N)" batch button** on the one-off capture list, shown only when no session is active and there are pending one-offs. It deliberately mirrors the Review screen's "Approve all (N)" batch button for the One-offs group (same concept, same styling). Re-runnable: one-offs captured after a trigger sit pending again until the next one.

## Rejected: `setTimeout` delay (Option A)

A timer-based approach would enrich one-offs after a fixed delay following capture. This is fragile: the delay is arbitrary, in-memory timers don't survive restarts, and the user can't control when enrichment happens. Durable pending state (`entry: null`) is simpler and more robust.

## Why not extract the shared two-phase primitive yet

The two-phase trigger pattern (await placeholders → fire-and-forget enrich) now appears in exactly two places: `session.close` (`createPlaceholderEntries` + `enrichSessionCaptures`) and `enrichOneOffs` (`createOneOffPlaceholderEntries` + `enrichOneOffCaptures`). Both follow the same convention: the router owns the detach. Per ADR 0006, we extract at 3+ uses, not 2. The enrichment logic itself (`enrichCapture`) is already shared — only the thin trigger orchestration is duplicated, and that's the correct state to leave it in.