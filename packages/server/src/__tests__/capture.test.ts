import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";
import { appRouter } from "../router.js";
import { CaptureService } from "../services/capture.js";

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

  it("creates a one-off capture with no entry (enrichment deferred)", async () => {
    const caller = appRouter.createCaller({ prisma, llm: null as never });

    const result = await caller.capture.create({
      item: "deferred-word",
    });

    // No entry should exist for this capture — enrichment is deferred to
    // the explicit enrichOneOffs trigger.
    const entry = await prisma.entry.findUnique({
      where: { captureId: result.id },
    });
    expect(entry).toBeNull();

    await prisma.capture.delete({ where: { id: result.id } });
  });

  it("session capture create does not create an entry (enrichment deferred to session close)", async () => {
    const source = await prisma.source.create({
      data: { name: "Session Create Test", type: "book" },
    });
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });

    const caller = appRouter.createCaller({ prisma, llm: null as never });
    const result = await caller.capture.create({
      item: "session-word",
      sessionId: session.id,
    });

    expect(result.sessionId).toBe(session.id);

    const entry = await prisma.entry.findUnique({
      where: { captureId: result.id },
    });
    expect(entry).toBeNull();

    await prisma.capture.delete({ where: { id: result.id } });
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({ where: { name: "Session Create Test" } });
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
    const source = await prisma.source.create({
      data: { name: "Router Update Locator", type: "book" },
    });
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    const created = await prisma.capture.create({
      data: {
        item: "serendipity",
        locator: null,
        sourceHint: null,
        sessionId: session.id,
      },
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
    await prisma.session.delete({ where: { id: session.id } });
    await prisma.source.delete({ where: { id: source.id } });
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

describe("CaptureService pending state transitions", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("updates a Pending Session Capture's Item and existing Locator", async () => {
    const source = await prisma.source.create({
      data: { name: "Pending Capture Edit", type: "book" },
    });
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    const capture = await prisma.capture.create({
      data: {
        item: "serendipty",
        locator: "p.44",
        sessionId: session.id,
      },
    });

    const updated = await CaptureService.update(
      capture.id,
      { item: "serendipity", locator: "p.45" },
      prisma,
    );

    expect(updated).toMatchObject({
      id: capture.id,
      item: "serendipity",
      locator: "p.45",
    });

    await prisma.capture.delete({ where: { id: capture.id } });
    await prisma.session.delete({ where: { id: session.id } });
    await prisma.source.delete({ where: { id: source.id } });
  });

  it("rejects a Locator change on a One-off without partially updating its Item", async () => {
    const capture = await prisma.capture.create({
      data: { item: "original", sourceHint: "in a conversation" },
    });

    await expect(
      CaptureService.update(
        capture.id,
        { item: "changed", locator: "p.45" },
        prisma,
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const unchanged = await prisma.capture.findUniqueOrThrow({
      where: { id: capture.id },
    });
    expect(unchanged).toMatchObject({
      item: "original",
      locator: null,
      sourceHint: "in a conversation",
    });

    await prisma.capture.delete({ where: { id: capture.id } });
  });

  it("trims a Pending One-off's Item and existing Source Hint", async () => {
    const capture = await prisma.capture.create({
      data: { item: "cardnal", sourceHint: "in a conversation" },
    });

    const updated = await CaptureService.update(
      capture.id,
      { item: "  cardinal  ", sourceHint: "  in an ad  " },
      prisma,
    );

    expect(updated).toMatchObject({
      item: "cardinal",
      sourceHint: "in an ad",
    });

    const cleared = await CaptureService.update(
      capture.id,
      { sourceHint: "   " },
      prisma,
    );
    expect(cleared.sourceHint).toBeNull();

    await expect(
      CaptureService.update(capture.id, { item: "   " }, prisma),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      prisma.capture.findUniqueOrThrow({ where: { id: capture.id } }),
    ).resolves.toMatchObject({ item: "cardinal", sourceHint: null });

    await prisma.capture.delete({ where: { id: capture.id } });
  });

  it("rejects a Source Hint change on a Session Capture", async () => {
    const source = await prisma.source.create({
      data: { name: "Wrong Metadata Context", type: "book" },
    });
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    const capture = await prisma.capture.create({
      data: { item: "unchanged", locator: "p.12", sessionId: session.id },
    });

    await expect(
      CaptureService.update(
        capture.id,
        { item: "changed", sourceHint: "not allowed" },
        prisma,
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      prisma.capture.findUniqueOrThrow({ where: { id: capture.id } }),
    ).resolves.toMatchObject({ item: "unchanged", locator: "p.12" });

    await prisma.capture.delete({ where: { id: capture.id } });
    await prisma.session.delete({ where: { id: session.id } });
    await prisma.source.delete({ where: { id: source.id } });
  });

  it("rejects an update once Enrichment work exists", async () => {
    const capture = await prisma.capture.create({
      data: { item: "original", sourceHint: "in a conversation" },
    });
    await prisma.entry.create({
      data: {
        captureId: capture.id,
        status: "processing",
        definition: "",
        translationArabic: "",
        nuance: "",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
      },
    });

    await expect(
      CaptureService.update(capture.id, { item: "changed" }, prisma),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const unchanged = await prisma.capture.findUniqueOrThrow({
      where: { id: capture.id },
    });
    expect(unchanged.item).toBe("original");

    await prisma.entry.delete({ where: { captureId: capture.id } });
    await prisma.capture.delete({ where: { id: capture.id } });
  });

  it("deletes a Pending Capture", async () => {
    const capture = await prisma.capture.create({
      data: { item: "accidental capture" },
    });

    await CaptureService.deletePending(capture.id, prisma);

    await expect(
      prisma.capture.findUnique({ where: { id: capture.id } }),
    ).resolves.toBeNull();
  });

  it("rejects deletion once Enrichment work exists without changing the Capture", async () => {
    const capture = await prisma.capture.create({
      data: { item: "already processing" },
    });
    await prisma.entry.create({
      data: {
        captureId: capture.id,
        status: "processing",
        definition: "",
        translationArabic: "",
        nuance: "",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
      },
    });

    await expect(
      CaptureService.deletePending(capture.id, prisma),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    await expect(
      prisma.capture.findUnique({ where: { id: capture.id } }),
    ).resolves.toMatchObject({ id: capture.id, item: "already processing" });

    await prisma.entry.delete({ where: { captureId: capture.id } });
    await prisma.capture.delete({ where: { id: capture.id } });
  });

  it("rejects edits and deletion for a missing Capture", async () => {
    const missingId = 2_147_483_647;

    await expect(
      CaptureService.update(missingId, { item: "missing" }, prisma),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      CaptureService.deletePending(missingId, prisma),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
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
