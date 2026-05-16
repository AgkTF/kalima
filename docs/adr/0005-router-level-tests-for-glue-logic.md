# ADR 5: Router-level tests for non-trivial procedure glue

## Status

Accepted

## Context

The project has two server-side test layers:

1. **Service-level** — tests business logic by calling service functions directly against SQLite. Example: `review-service.test.ts` calls `ReviewService.approve(...)`.
2. **Router-level** — tests the full tRPC procedure through `appRouter.createCaller()`. Example: `capture.test.ts` calls `caller.capture.create(...)` with a mocked LLM.

Many tRPC procedures are simple pass-throughs — they call one service function and return. Others have additional "glue" logic: multiple service calls, DB fetches, fire-and-forget side effects, conditional branching.

The question is: when is a service-level test sufficient, and when does a procedure need a router-level test?

## Decision

**Add a router-level test when a procedure does more than call a single service and return.**

Rationale:

- **Pass-through procedures** (`call Service.method(args)` → return) are adequately covered by the service test. TypeScript guarantees the wiring — wrong argument shapes are caught at compile time.
- **Glue-heavy procedures** perform extra steps outside any service boundary (e.g., `prisma.entry.findUnique` followed by `EnrichmentService.enrichCapture`). These steps are invisible to service tests and bypass TypeScript's reach if dynamic imports or loose types are involved.

### Decision rule

| Procedure shape | Test needed |
|---|---|
| Call one service, return | Service-level test ✅ |
| Call service + extra DB fetches / side effects / fire-and-forget | Service-level + router-level test ✅✅ |

### Examples from this codebase

- `review.reEnrich` — calls `ReviewService.reEnrich()`, then fetches the entry, then fires `enrichCapture`. **Needs both.**
- `session.close` — calls `SessionService.close()`, then creates placeholders, then fires `enrichSessionCaptures`. **Needs both.**
- `capture.create` (one-off path) — calls `CaptureService.create()`, then creates placeholder, then fires `enrichCapture`. **Needs both.**
- `review.approve` — calls `ReviewService.approve()`. **Service test only.**

## Consequences

- **One router test per ~2–3 features**, not per procedure. The bar is gated on complexity, not coverage.
- **Catches wiring bugs** like broken dynamic imports, wrong argument shapes in glue code, and missing context dependencies that service tests can't see.
- **No change to service tests** — they remain the primary layer. Router tests are an extra safety net for the procedures that justify it.
