# ADR 4: Vertical TDD slices

## Status

Accepted

## Context

The project follows a test-driven development workflow. The question is how to structure the RED-GREEN cycle:

- **Horizontal** — write all tests first, then implement all code. Tests are written against imagined behavior before understanding the implementation
- **Vertical** — write one test, make it pass, then write the next test. Each cycle reveals what the next test should be

## Decision

Use vertical (tracer bullet) TDD slices. One test → one implementation → repeat. The first passing test is a tracer bullet that proves the stack works end-to-end.

## Consequences

- **Tests describe actual behavior** — because you just wrote the code, you know what matters to verify
- **Refactor-safe** — tests exercise public interfaces, not implementation details. Renaming an internal function doesn't break tests
- **No speculative features** — only code needed to pass the current test is written
- **Planning still happens upfront** — the list of behaviors to test is confirmed before slicing, but the tests themselves are written one at a time