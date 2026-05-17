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
      data: { rawText: "serendipity", item: "serendipity" },
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

describe("review.approveAllAutoApproved mutation", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const mockLLM: LLMClient = {
    complete: vi.fn().mockResolvedValue("ignored"),
  } as unknown as LLMClient;

  it("approves all auto_approved entries at once through the router", async () => {
    const source = await prisma.source.create({
      data: { name: "Router Auto Book", type: "book" },
    });
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });

    const c1 = await prisma.capture.create({
      data: { rawText: "r1", item: "r1", sessionId: session.id },
    });
    const c2 = await prisma.capture.create({
      data: { rawText: "r2", item: "r2", sessionId: session.id },
    });
    const c3 = await prisma.capture.create({
      data: { rawText: "r3", item: "r3", sessionId: session.id },
    });

    await prisma.entry.createMany({
      data: [
        {
          captureId: c1.id,
          definition: "R1",
          translationArabic: "١",
          nuance: "n",
          examples: "[]",
          tags: "[]",
          relatedEntries: "[]",
          status: "auto_approved",
        },
        {
          captureId: c2.id,
          definition: "R2",
          translationArabic: "٢",
          nuance: "n",
          examples: "[]",
          tags: "[]",
          relatedEntries: "[]",
          status: "auto_approved",
        },
        {
          captureId: c3.id,
          definition: "R3",
          translationArabic: "٣",
          nuance: "n",
          examples: "[]",
          tags: "[]",
          relatedEntries: "[]",
          status: "pending_review",
        },
      ],
    });

    const caller = appRouter.createCaller({ prisma, llm: mockLLM });
    const result = await caller.review.approveAllAutoApproved();

    expect(result.count).toBe(2);

    const e1 = await prisma.entry.findUnique({ where: { captureId: c1.id } });
    const e2 = await prisma.entry.findUnique({ where: { captureId: c2.id } });
    const e3 = await prisma.entry.findUnique({ where: { captureId: c3.id } });

    expect(e1?.status).toBe("approved");
    expect(e2?.status).toBe("approved");
    expect(e3?.status).toBe("pending_review");

    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "Router Auto Book" },
    });
  });
});
