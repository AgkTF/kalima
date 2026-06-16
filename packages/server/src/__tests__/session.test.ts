import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";
import { appRouter } from "../router.js";
import type { LLMClient } from "../services/llm-client.js";

describe("session.open mutation", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const mockLLM: LLMClient = {
    complete: vi.fn().mockResolvedValue(
      JSON.stringify({
        item: "serendipity",
        locator: null,
        sourceHint: null,
        definition: "A test definition",
        translationArabic: "اختبار",
        nuance: "Test nuance",
        examples: ["Example"],
        tags: ["test"],
        relatedEntries: [],
      }),
    ),
  } as unknown as LLMClient;

  it("creates a session with source name and type, leaves it open (closedAt null)", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    const result = await caller.session.open({
      name: "Moby Dick",
      type: "book",
    });

    expect(result).toMatchObject({
      source: { name: "Moby Dick", type: "book" },
      closedAt: null,
    });
    expect(result.sourceId).toBeTypeOf("number");

    // Verify persisted
    const found = await prisma.session.findUnique({
      where: { id: result.id },
      include: { source: true },
    });
    expect(found).toMatchObject({
      source: { name: "Moby Dick", type: "book" },
      closedAt: null,
    });

    // Verify a Source record was created
    const sources = await prisma.source.findMany({
      where: { name: "Moby Dick", type: "book" },
    });
    expect(sources).toHaveLength(1);
    expect(sources[0].id).toBe(result.sourceId);

    // Cleanup
    await prisma.session.delete({ where: { id: result.id } });
    await prisma.source.deleteMany({ where: { name: "Moby Dick" } });
  });

  it("throws when another session is already active", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    // Open first session
    const first = await caller.session.open({
      name: "Moby Dick",
      type: "book",
    });

    // Second open should throw
    await expect(
      caller.session.open({ name: "Another Book", type: "book" }),
    ).rejects.toThrow();

    // Cleanup
    await prisma.session.delete({ where: { id: first.id } });
    await prisma.source.deleteMany({ where: { name: "Moby Dick" } });
  });
});

describe("session.close mutation", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const mockLLM: LLMClient = {
    complete: vi.fn().mockResolvedValue(
      JSON.stringify({
        item: "test",
        locator: null,
        sourceHint: null,
        definition: "Test",
        translationArabic: "اختبار",
        nuance: "Test",
        examples: ["Test"],
        tags: ["test"],
        relatedEntries: [],
      }),
    ),
  } as unknown as LLMClient;

  it("sets closedAt on the active session, allowing a new one to be opened", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    // Open a session
    const session = await caller.session.open({
      name: "Closing Time",
      type: "article",
    });

    // Close it
    const closed = await caller.session.close();
    expect(closed.closedAt).not.toBeNull();
    expect(closed.id).toBe(session.id);

    // Now we should be able to open a new session
    const second = await caller.session.open({
      name: "Second Session",
      type: "video",
    });
    expect(second.closedAt).toBeNull();

    // Cleanup
    await prisma.session.deleteMany();
    await prisma.source.deleteMany();
  });
});

describe("session.getActive query", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const mockLLM: LLMClient = {
    complete: vi.fn().mockResolvedValue(
      JSON.stringify({
        item: "test",
        locator: null,
        sourceHint: null,
        definition: "Test",
        translationArabic: "اختبار",
        nuance: "Test",
        examples: ["Test"],
        tags: ["test"],
        relatedEntries: [],
      }),
    ),
  } as unknown as LLMClient;

  it("returns null when no session is active", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });
    const result = await caller.session.getActive();
    expect(result).toBeNull();
  });

  it("returns the active session with source data when one is open", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    const session = await caller.session.open({
      name: "Active Test",
      type: "book",
    });

    const result = await caller.session.getActive();
    expect(result).toMatchObject({
      id: session.id,
      source: { name: "Active Test", type: "book" },
      closedAt: null,
    });

    // Cleanup
    await prisma.session.delete({ where: { id: session.id } });
    await prisma.source.deleteMany({ where: { name: "Active Test" } });
  });
});

describe("captures scoped to a session", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const mockLLM: LLMClient = {
    complete: vi.fn().mockResolvedValue(
      JSON.stringify({
        item: "session-word",
        locator: "p.10",
        sourceHint: null,
        definition: "Test definition",
        translationArabic: "اختبار",
        nuance: "Test",
        examples: ["Example"],
        tags: ["test"],
        relatedEntries: [],
      }),
    ),
  } as unknown as LLMClient;

  it("associates a capture with the session when sessionId is provided", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    const session = await caller.session.open({
      name: "Capture Book",
      type: "book",
    });

    const capture = await caller.capture.create({
      rawText: "session-word p.10",
      sessionId: session.id,
    });

    expect(capture.sessionId).toBe(session.id);

    // Verify persisted
    const found = await prisma.capture.findUnique({
      where: { id: capture.id },
    });
    expect(found?.sessionId).toBe(session.id);

    // Cleanup
    await prisma.capture.delete({ where: { id: capture.id } });
    await prisma.session.delete({ where: { id: session.id } });
    await prisma.source.deleteMany({ where: { name: "Capture Book" } });
  });

  it("lists captures belonging to a session", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    const session = await caller.session.open({
      name: "List Book",
      type: "book",
    });

    await caller.capture.create({
      rawText: "word-one p.5",
      sessionId: session.id,
    });
    await caller.capture.create({
      rawText: "word-two p.10",
      sessionId: session.id,
    });

    const captures = await caller.capture.listSession({
      sessionId: session.id,
    });
    expect(captures).toHaveLength(2);
    expect(captures.map((c) => c.item)).toEqual(
      expect.arrayContaining(["session-word", "session-word"]),
    );

    // Cleanup
    await prisma.capture.deleteMany({ where: { sessionId: session.id } });
    await prisma.session.delete({ where: { id: session.id } });
    await prisma.source.deleteMany({ where: { name: "List Book" } });
  });

  it("captures from different sessions of the same source are queryable together", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    // Session 1: Moby Dick
    const session1 = await caller.session.open({
      name: "Moby Dick",
      type: "book",
    });
    await caller.capture.create({
      rawText: "whale p.5",
      sessionId: session1.id,
    });
    await caller.capture.create({
      rawText: "harpoon p.10",
      sessionId: session1.id,
    });
    await caller.session.close();

    // Session 2: Same source (Moby Dick), reopened
    const session2 = await caller.session.open({
      name: "Moby Dick",
      type: "book",
    });
    await caller.capture.create({
      rawText: "ahab p.20",
      sessionId: session2.id,
    });

    // Both sessions share the same source
    expect(session2.sourceId).toBe(session1.sourceId);

    // Query captures for that source via session.source relation
    const sourceCaptures = await prisma.capture.findMany({
      where: { session: { sourceId: session1.sourceId } },
      orderBy: { createdAt: "asc" },
    });
    expect(sourceCaptures).toHaveLength(3);
    expect(sourceCaptures.map((c) => c.item)).toEqual([
      "session-word",
      "session-word",
      "session-word",
    ]);

    // Cleanup
    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({ where: { name: "Moby Dick" } });
  });
});

describe("session.open with enrichmentPromptTemplate", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Clean up any leftover sessions between tests
  beforeEach(async () => {
    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany();
    await prisma.appMeta.deleteMany();
  });

  const mockLLM: LLMClient = {
    complete: vi.fn().mockResolvedValue(
      JSON.stringify({
        item: "test",
        locator: null,
        sourceHint: null,
        definition: "Test",
        translationArabic: "اختبار",
        nuance: "Test",
        examples: ["Test"],
        tags: ["test"],
        relatedEntries: [],
      }),
    ),
  } as unknown as LLMClient;

  it("stores the enrichmentPromptTemplate on the session when provided", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    const template = "Define {item} from {source} at {locator}.";

    const result = await caller.session.open({
      name: "Template Book",
      type: "book",
      enrichmentPromptTemplate: template,
    });

    expect(result.enrichmentPromptTemplate).toBe(template);

    // Verify persisted
    const found = await prisma.session.findUnique({
      where: { id: result.id },
    });
    expect(found?.enrichmentPromptTemplate).toBe(template);
  });

  it("stores null when no enrichmentPromptTemplate is provided", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    const result = await caller.session.open({
      name: "No Template Book",
      type: "book",
    });

    expect(result.enrichmentPromptTemplate).toBeNull();

    // Verify persisted
    const found = await prisma.session.findUnique({
      where: { id: result.id },
    });
    expect(found?.enrichmentPromptTemplate).toBeNull();
  });

  it("changing the global default does not affect a session with its own override", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    // Set a global default
    await prisma.appMeta.create({
      data: {
        key: "enrichment_prompt_template",
        value: "Global: {item}",
      },
    });

    // Open session with its own override
    const session = await caller.session.open({
      name: "Override Book",
      type: "book",
      enrichmentPromptTemplate: "Session: {item}",
    });

    // Change the global default
    await prisma.appMeta.update({
      where: { key: "enrichment_prompt_template" },
      data: { value: "New Global: {item}" },
    });

    // Session should still have its original override
    const found = await prisma.session.findUnique({
      where: { id: session.id },
    });
    expect(found?.enrichmentPromptTemplate).toBe("Session: {item}");
  });
});
