import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { beforeAll } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";

const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/test.db" });
const prisma = new PrismaClient({ adapter });

beforeAll(async () => {
  await prisma.$connect();
  // Delete in reverse FK dependency order
  await prisma.entry.deleteMany();
  await prisma.capture.deleteMany();
  await prisma.session.deleteMany();
  await prisma.source.deleteMany();
  await prisma.appMeta.deleteMany();
  await prisma.$disconnect();
});
