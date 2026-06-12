import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client.js";
import { FTSSearchHelper } from "./services/fts-search-helper.js";

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

const adapter = new PrismaBetterSqlite3({
  url: databaseUrl.replace(/^file:/, ""),
});
export const prisma = new PrismaClient({ adapter });

export const fts = new FTSSearchHelper(prisma);

// WAL mode allows concurrent reads during writes — worth having for SQLite
await prisma.$executeRaw`PRAGMA journal_mode = WAL`;
await fts.initialize();
