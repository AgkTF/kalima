import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";
import { appRouter } from "../router.js";

describe("capture.create mutation", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("persists structured capture fields directly to the database", async () => {
    const caller = appRouter.createCaller({ prisma, llm: null as never });

    const result = await caller.capture.create({
      item: "serendipity",
      locator: "p.45",
      sourceHint: null,
    });

    expect(result).toMatchObject({
      item: "serendipity",
      locator: "p.45",
      sourceHint: null,
    });

    // Verify persisted
    const found = await prisma.capture.findUnique({
      where: { id: result.id },
    });
    expect(found).toMatchObject({
      item: "serendipity",
      locator: "p.45",
      sourceHint: null,
    });

    // Cleanup
    await prisma.capture.delete({ where: { id: result.id } });
  });

  it("stores one-off capture with source hint", async () => {
    const caller = appRouter.createCaller({ prisma, llm: null as never });

    const result = await caller.capture.create({
      item: "cardinal",
      sourceHint: "conversation with a friend",
    });

    expect(result).toMatchObject({
      item: "cardinal",
      sourceHint: "conversation with a friend",
    });

    // Cleanup
    await prisma.capture.delete({ where: { id: result.id } });
  });
});

describe("capture.update mutation", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("updates a capture's locator", async () => {
    const created = await prisma.capture.create({
      data: { item: "serendipity", locator: null, sourceHint: null },
    });

    const caller = appRouter.createCaller({ prisma, llm: null as never });
    const result = await caller.capture.update({
      captureId: created.id,
      locator: "p.45",
    });

    expect(result).toMatchObject({
      id: created.id,
      item: "serendipity",
      locator: "p.45",
      sourceHint: null,
    });

    // Verify persisted
    const found = await prisma.capture.findUnique({
      where: { id: created.id },
    });
    expect(found?.locator).toBe("p.45");

    // Cleanup
    await prisma.capture.delete({ where: { id: created.id } });
  });

  it("updates a capture's sourceHint", async () => {
    const created = await prisma.capture.create({
      data: { item: "cardinal", locator: null, sourceHint: null },
    });

    const caller = appRouter.createCaller({ prisma, llm: null as never });
    const result = await caller.capture.update({
      captureId: created.id,
      sourceHint: "conversation with a friend",
    });

    expect(result).toMatchObject({
      id: created.id,
      item: "cardinal",
      sourceHint: "conversation with a friend",
    });

    // Verify persisted
    const found = await prisma.capture.findUnique({
      where: { id: created.id },
    });
    expect(found?.sourceHint).toBe("conversation with a friend");

    // Cleanup
    await prisma.capture.delete({ where: { id: created.id } });
  });
});

describe("capture.list query", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns one-off captures ordered by creation time", async () => {
    // Seed a one-off capture
    const created = await prisma.capture.create({
      data: {
        item: "test-item",
      },
    });

    const caller = appRouter.createCaller({ prisma, llm: null as never });
    const result = await caller.capture.list();

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.id,
          item: "test-item",
        }),
      ]),
    );

    // Cleanup
    await prisma.capture.delete({ where: { id: created.id } });
  });
});
