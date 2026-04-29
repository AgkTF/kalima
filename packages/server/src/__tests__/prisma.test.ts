import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client.js";
import { describe, it, expect, afterAll } from "vitest";

describe("Prisma + SQLite connectivity", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/dev.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("connects to the database and schema is migrated", async () => {
    await prisma.$connect();
    const tables = await prisma.$queryRaw<
      { name: string }[]
    >`SELECT name FROM sqlite_master WHERE type='table'`;
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain("AppMeta");
  });

  it("can perform a basic CRUD operation", async () => {
    const created = await prisma.appMeta.create({
      data: { key: "test-key", value: "test-value" },
    });
    expect(created.key).toBe("test-key");

    const found = await prisma.appMeta.findUnique({
      where: { id: created.id },
    });
    expect(found?.value).toBe("test-value");

    await prisma.appMeta.delete({ where: { id: created.id } });
  });
});