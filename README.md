# Kalima

A personal word bank that captures words and phrases from reading and watching, enriches them with AI, and builds a connected, searchable vocabulary.

## Setup

```bash
# Install dependencies
pnpm install

# Create the server env file (gitignored) — fill in LLM_API_KEY for AI enrichment
cp packages/server/.env.example packages/server/.env

# Apply migrations, generate the Prisma client, and create the dev database
pnpm --filter server exec prisma migrate dev
```

## Development

```bash
pnpm dev        # starts server (localhost:3001) + web (localhost:5173)
pnpm lint       # check formatting and lint rules
pnpm typecheck  # typecheck all packages
pnpm test       # run server tests
```

## Production

Kalima runs as a single PM2-managed process that serves the tRPC API and the
built frontend (with SPA fallback) from one Express server, backed by a single
SQLite file. Full deploy runbook (PM2, auto-start on boot, log rotation, LAN +
Tailscale access): **[docs/deployment.md](./docs/deployment.md)**.

Quick start on an Ubuntu home server:

```bash
./scripts/deploy.sh   # install -> migrate deploy -> generate -> build server/web -> pm2 start
```

## Project structure

```
packages/
  server/    Express + tRPC + Prisma + SQLite
    src/
      services/    business logic (transport-agnostic)
      __tests__/   Vitest tests
  web/        React + Vite
```

See [CONTEXT.md](./CONTEXT.md) for the full project vision and [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md) for domain terminology.