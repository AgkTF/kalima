# ADR 1: Biome for linting and formatting

## Status

Accepted

## Context

We need a tool to enforce consistent code style and catch common errors across both server and web packages. The JavaScript ecosystem standard is ESLint + Prettier — two separate tools with separate configs, plugin ecosystems, and runtimes.

## Decision

Use Biome as the single tool for both linting and formatting.

## Consequences

- **Single config** — one `biome.json` instead of `.eslintrc` + `.prettierrc` + plugin configs
- **Fast** — Biome is a Rust binary, orders of magnitude faster than ESLint + Prettier on the same codebase
- **No plugin ecosystem** — we get Biome's built-in rules only. If we need a rule Biome doesn't cover, we'd need a separate tool
- **Editor setup** — contributors need the Biome editor extension instead of ESLint/Prettier extensions