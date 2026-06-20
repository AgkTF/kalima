import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";
import { appRouter } from "../router.js";

describe("source.create mutation", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a source with name and type, persists correctly", async () => {
    const caller = appRouter.createCaller({
      prisma,
      llm: { complete: async () => "{}" } as never,
    });

    const result = await caller.source.create({
      name: "Moby Dick",
      type: "book",
    });

    expect(result).toMatchObject({
      name: "Moby Dick",
      type: "book",
    });
    expect(result.id).toBeTypeOf("number");

    // Verify persisted
    const found = await prisma.source.findUnique({
      where: { id: result.id },
    });
    expect(found).toMatchObject({
      name: "Moby Dick",
      type: "book",
    });

    // Cleanup
    await prisma.source.delete({ where: { id: result.id } });
  });

  it("returns existing source when same (name, type) is created again", async () => {
    const caller = appRouter.createCaller({
      prisma,
      llm: { complete: async () => "{}" } as never,
    });

    const first = await caller.source.create({
      name: "Moby Dick",
      type: "book",
    });

    // Creating again with same name+type should return the existing source
    const second = await caller.source.create({
      name: "Moby Dick",
      type: "book",
    });

    expect(second.id).toBe(first.id);
    expect(second.name).toBe("Moby Dick");
    expect(second.type).toBe("book");

    // Verify only one source exists with that name+type
    const count = await prisma.source.count({
      where: { name: "Moby Dick", type: "book" },
    });
    expect(count).toBe(1);

    // Cleanup
    await prisma.source.delete({ where: { id: first.id } });
  });
});

describe("source.create with enrichmentContext", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a source with enrichmentContext and persists it", async () => {
    const caller = appRouter.createCaller({
      prisma,
      llm: { complete: async () => "{}" } as never,
    });

    const result = await caller.source.create({
      name: "Enrichment Book",
      type: "book",
      enrichmentContext: "Focus on technical terminology. Formal register.",
    });

    expect(result.enrichmentContext).toBe(
      "Focus on technical terminology. Formal register.",
    );

    // Verify persisted
    const found = await prisma.source.findUnique({
      where: { id: result.id },
    });
    expect(found?.enrichmentContext).toBe(
      "Focus on technical terminology. Formal register.",
    );

    // Cleanup
    await prisma.source.delete({ where: { id: result.id } });
  });

  it("creates a source with null enrichmentContext when omitted", async () => {
    const caller = appRouter.createCaller({
      prisma,
      llm: { complete: async () => "{}" } as never,
    });

    const result = await caller.source.create({
      name: "No Context Book",
      type: "book",
    });

    expect(result.enrichmentContext).toBeNull();

    // Cleanup
    await prisma.source.delete({ where: { id: result.id } });
  });

  it("updates enrichmentContext on an existing source when re-created", async () => {
    const caller = appRouter.createCaller({
      prisma,
      llm: { complete: async () => "{}" } as never,
    });

    // Create without enrichmentContext
    const first = await caller.source.create({
      name: "Recreate Book",
      type: "book",
    });
    expect(first.enrichmentContext).toBeNull();

    // Re-create same (name, type) with enrichmentContext — should update
    const second = await caller.source.create({
      name: "Recreate Book",
      type: "book",
      enrichmentContext: "New context for this source.",
    });

    expect(second.id).toBe(first.id);
    expect(second.enrichmentContext).toBe("New context for this source.");

    // Verify persisted
    const found = await prisma.source.findUnique({
      where: { id: first.id },
    });
    expect(found?.enrichmentContext).toBe("New context for this source.");

    // Cleanup
    await prisma.source.delete({ where: { id: first.id } });
  });
});

describe("source.list query", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns all sources ordered by name", async () => {
    const caller = appRouter.createCaller({
      prisma,
      llm: { complete: async () => "{}" } as never,
    });

    await caller.source.create({ name: "Zebra Book", type: "book" });
    await caller.source.create({ name: "Alpha Article", type: "article" });
    await caller.source.create({ name: "Middle Video", type: "video" });

    const results = await caller.source.list();

    expect(results).toHaveLength(3);
    expect(results.map((s) => s.name)).toEqual([
      "Alpha Article",
      "Middle Video",
      "Zebra Book",
    ]);

    // Verify all three columns are present
    for (const s of results) {
      expect(s.id).toBeTypeOf("number");
      expect(s.name).toBeTypeOf("string");
      expect(s.type).toBeTypeOf("string");
    }

    // Cleanup
    await prisma.source.deleteMany();
  });

  it("returns empty array when no sources exist", async () => {
    const caller = appRouter.createCaller({
      prisma,
      llm: { complete: async () => "{}" } as never,
    });

    const results = await caller.source.list();
    expect(results).toHaveLength(0);
  });
});
