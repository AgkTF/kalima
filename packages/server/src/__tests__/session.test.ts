import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";
import { appRouter } from "../router.js";
import type { LLMClient } from "../services/llm-client.js";

describe("session.open mutation", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/dev.db",
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
      }),
    ),
  } as unknown as LLMClient;

  it("creates a session with source name and type, leaves it open (closedAt null)", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    const result = await caller.session.open({
      sourceName: "Moby Dick",
      type: "book",
    });

    expect(result).toMatchObject({
      sourceName: "Moby Dick",
      type: "book",
      closedAt: null,
    });

    // Verify persisted
    const found = await prisma.session.findUnique({
      where: { id: result.id },
    });
    expect(found).toMatchObject({
      sourceName: "Moby Dick",
      type: "book",
      closedAt: null,
    });

    // Cleanup
    await prisma.session.delete({ where: { id: result.id } });
  });

  it("throws when another session is already active", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    // Open first session
    const first = await caller.session.open({
      sourceName: "Moby Dick",
      type: "book",
    });

    // Second open should throw
    await expect(
      caller.session.open({ sourceName: "Another Book", type: "book" }),
    ).rejects.toThrow();

    // Cleanup
    await prisma.session.delete({ where: { id: first.id } });
  });
});

describe("session.close mutation", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/dev.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const mockLLM: LLMClient = {
    complete: vi
      .fn()
      .mockResolvedValue(
        JSON.stringify({ item: "test", locator: null, sourceHint: null }),
      ),
  } as unknown as LLMClient;

  it("sets closedAt on the active session, allowing a new one to be opened", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    // Open a session
    const session = await caller.session.open({
      sourceName: "Closing Time",
      type: "article",
    });

    // Close it
    const closed = await caller.session.close();
    expect(closed.closedAt).not.toBeNull();
    expect(closed.id).toBe(session.id);

    // Now we should be able to open a new session
    const second = await caller.session.open({
      sourceName: "Second Session",
      type: "video",
    });
    expect(second.closedAt).toBeNull();

    // Cleanup
    await prisma.session.deleteMany();
  });
});

describe("session.getActive query", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/dev.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const mockLLM: LLMClient = {
    complete: vi
      .fn()
      .mockResolvedValue(
        JSON.stringify({ item: "test", locator: null, sourceHint: null }),
      ),
  } as unknown as LLMClient;

  it("returns null when no session is active", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });
    const result = await caller.session.getActive();
    expect(result).toBeNull();
  });

  it("returns the active session when one is open", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    const session = await caller.session.open({
      sourceName: "Active Test",
      type: "book",
    });

    const result = await caller.session.getActive();
    expect(result).toMatchObject({
      id: session.id,
      sourceName: "Active Test",
      type: "book",
      closedAt: null,
    });

    // Cleanup
    await prisma.session.delete({ where: { id: session.id } });
  });
});

describe("captures scoped to a session", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/dev.db",
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
      }),
    ),
  } as unknown as LLMClient;

  it("associates a capture with the session when sessionId is provided", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    const session = await caller.session.open({
      sourceName: "Capture Book",
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
  });

  it("lists captures belonging to a session", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    const session = await caller.session.open({
      sourceName: "List Book",
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
  });
});
