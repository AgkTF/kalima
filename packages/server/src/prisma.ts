import Database from "better-sqlite3";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client.js";

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const dbPath = databaseUrl.replace(/^file:/, "");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

const adapter = new PrismaBetterSqlite3(sqlite);
export const prisma = new PrismaClient({ adapter });