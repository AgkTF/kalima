# Kalima

A personal word bank that captures words and phrases from reading and watching, enriches them with AI, and builds a connected, searchable vocabulary.

## Setup

```bash
pnpm install
cd packages/server && npx prisma generate && npx prisma migrate dev
```

## Development

```bash
pnpm dev          # starts both server (localhost:3001) and web (localhost:5173)
pnpm lint          # check formatting and lint rules
pnpm test          # run server tests
```

## Production

Build the frontend, then run the server with production env vars:

```bash
cd packages/web && pnpm build
DATABASE_URL=file:/data/kalima.db STATIC_DIR=packages/web/dist node packages/server/dist/index.js
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