import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";
import { appRouter } from "../router.js";
import type { LLMClient } from "../services/llm-client.js";

describe("review.reEnrich mutation", () => {
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
        locator: "p. 42",
        sourceHint: null,
        definition: "Test definition",
        translationArabic: "اختبار",
        nuance: "Test",
        examples: ["Example"],
        tags: ["test"],
        relatedEntries: [],
        confidence: "high",
      }),
    ),
  } as unknown as LLMClient;

  it("resets status to processing, clears flagged fields and rejection note", async () => {
    // Seed a rejected entry
    const capture = await prisma.capture.create({
      data: { item: "serendipity" },
    });
    const entry = await prisma.entry.create({
      data: {
        captureId: capture.id,
        definition: "Bad",
        translationArabic: "خطأ",
        nuance: "n",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
        status: "rejected",
        flaggedFields: '["definition","nuance"]',
        rejectionNote: "Wrong",
      },
    });

    const caller = appRouter.createCaller({ prisma, llm: mockLLM });
    await caller.review.reEnrich({ entryId: entry.id });

    const updated = await prisma.entry.findUnique({
      where: { id: entry.id },
    });
    expect(updated?.status).toBe("processing");
    expect(updated?.flaggedFields).toBeNull();
    expect(updated?.rejectionNote).toBeNull();

    // Clean up — the fire-and-forget enrichment may have updated the entry
    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
  });
});
