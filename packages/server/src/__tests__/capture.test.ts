import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";
import { appRouter } from "../router.js";
import type { LLMClient } from "../services/llm-client.js";

describe("capture.create mutation", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/dev.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Mock LLMClient for CaptureParser
  const mockLLM: LLMClient = {
    complete: vi.fn().mockResolvedValue(
      JSON.stringify({
        item: "serendipity",
        locator: "chapter 12, page 45",
        sourceHint: null,
      }),
    ),
  } as unknown as LLMClient;

  it("parses raw text and persists the capture to the database", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    const result = await caller.capture.create({
      rawText: "serendipity chapter 12 page 45",
    });

    expect(result).toMatchObject({
      item: "serendipity",
      locator: "chapter 12, page 45",
      sourceHint: null,
      rawText: "serendipity chapter 12 page 45",
    });

    // Verify persisted
    const found = await prisma.capture.findUnique({
      where: { id: result.id },
    });
    expect(found).toMatchObject({
      item: "serendipity",
      locator: "chapter 12, page 45",
      sourceHint: null,
      rawText: "serendipity chapter 12 page 45",
    });

    // Cleanup
    await prisma.capture.delete({ where: { id: result.id } });
  });
});

describe("capture.list query", () => {
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
        item: "test-item",
        locator: null,
        sourceHint: null,
      }),
    ),
  } as unknown as LLMClient;

  it("returns one-off captures ordered by creation time", async () => {
    // Seed a one-off capture
    const created = await prisma.capture.create({
      data: {
        rawText: "test-item",
        item: "test-item",
        locator: null,
        sourceHint: null,
      },
    });

    const caller = appRouter.createCaller({ prisma, llm: mockLLM });
    const result = await caller.capture.list();

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.id,
          item: "test-item",
          rawText: "test-item",
        }),
      ]),
    );

    // Cleanup
    await prisma.capture.delete({ where: { id: created.id } });
  });
});
