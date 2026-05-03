import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client.js";

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

const adapter = new PrismaBetterSqlite3({
  url: databaseUrl.replace(/^file:/, ""),
});
export const prisma = new PrismaClient({ adapter });

// WAL mode allows concurrent reads during writes — worth having for SQLite
await prisma.$executeRaw`PRAGMA journal_mode = WAL`;