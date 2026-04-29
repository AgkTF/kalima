# ADR 2: Prisma v7 with Better-SQLite3 driver adapter

## Status

Accepted

## Context

Prisma v7 introduced breaking changes from v6: thedatasource URL moves out of `schema.prisma` into `prisma.config.ts`, `prisma-client-js` is replaced by `prisma-client`, generated output is no longer in `node_modules`, and — critically — `new PrismaClient()` no longer auto-connects. A driver adapter is now **required** for every database.

For SQLite specifically, the adapter is `@prisma/adapter-better-sqlite3`. This means we must instantiate `better-sqlite3` directly and pass it to Prisma, rather than letting Prisma manage the connection.

## Decision

Adopt Prisma v7 with the Better-SQLite3 driver adapter. Use the direct `Database` instance to enable WAL mode (`sqlite.pragma("journal_mode = WAL")`) before handing it to Prisma.

Database path comes from `DATABASE_URL` env var, defaulting to `file:./prisma/dev.db`. For Prisma CLI operations (migrations, generate), the URL is loaded via `dotenv/config` in `prisma.config.ts`.

## Consequences

- **WAL mode is set before Prisma connects** — this wouldn't be possible with the old auto-connection model. WAL allows concurrent reads during writes, which matters even for a single user (LLM enrichment writes while browsing reads)
- **One more dependency** — `better-sqlite3` is a native addon (requires build tools). This is unavoidable with Prisma v7 + SQLite
- **Generated client lives in `src/generated/prisma/`** — imports come from a local path, not `@prisma/client`. This is the v7 default and keeps generated code inside the package
- **`prisma generate` must be run explicitly** — v7 removed the post-install auto-generate hook. Added to setup instructions in README