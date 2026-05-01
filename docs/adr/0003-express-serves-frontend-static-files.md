# ADR 3: Express serves frontend static files

## Status

Accepted

## Context

In development, Vite serves the frontend on its own dev server (port 5173) and proxies `/trpc` requests to the Express backend (port 3001). In production, there's no Vite dev server — the frontend is pre-built into static files and needs to be served somehow.

Options:

1. **Express serves everything** — Express serves the built frontend from `web/dist/` plus the `/trpc` API, all on one port
2. **Reverse proxy (nginx/Caddy)** — a separate process serves static files and reverse-proxies `/trpc` to Express

## Decision

Express serves everything. Configurable via `STATIC_DIR` env var; defaults to the monorepo-relative `web/dist` path for convenience.

## Consequences

- **Single process** — one thing to run, one port to expose. No nginx config to manage
- **Same origin** — no CORS, no proxy config. The frontend calls `/trpc` and it works
- **SPA fallback** — Express serves `index.html` for any non-API route, supporting client-side routing
- **Express isn't optimized for static files** — but for a single-user home server app, this is irrelevant
- **If traffic ever scales** — we'd add nginx in front, but that's a future concern, not a current problem