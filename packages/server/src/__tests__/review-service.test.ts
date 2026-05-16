import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";
import { ReviewService } from "../services/review.js";
import { SourceService } from "../services/source.js";

describe("ReviewService.badgeCount", () => {
  const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns the number of entries with status processing or pending_review", async () => {
    const source = await SourceService.create(
      "Badge Count Book",
      "book",
      prisma,
    );
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });

    const capture1 = await prisma.capture.create({
      data: { rawText: "word1", item: "word1", sessionId: session.id },
    });
    const capture2 = await prisma.capture.create({
      data: { rawText: "word2", item: "word2", sessionId: session.id },
    });

    await prisma.entry.createMany({
      data: [
        {
          captureId: capture1.id,
          definition: "Def 1",
          translationArabic: "ترجمة 1",
          nuance: "Note 1",
          examples: "[]",
          tags: "[]",
          relatedEntries: "[]",
        },
        {
          captureId: capture2.id,
          definition: "Def 2",
          translationArabic: "ترجمة 2",
          nuance: "Note 2",
          examples: "[]",
          tags: "[]",
          relatedEntries: "[]",
        },
      ],
    });

    const count = await ReviewService.badgeCount(prisma);
    expect(count).toBe(2);
  });

  it("counts entries with status processing", async () => {
    const source = await SourceService.create(
      "Processing Count Book",
      "book",
      prisma,
    );
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    const capture = await prisma.capture.create({
      data: { rawText: "proc", item: "proc", sessionId: session.id },
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

    const count = await ReviewService.badgeCount(prisma);
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

describe("ReviewService.approve", () => {
  const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("changes an entry status from pending_review to approved", async () => {
    const source = await SourceService.create("Approve Book", "book", prisma);
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    const capture = await prisma.capture.create({
      data: { rawText: "word", item: "word", sessionId: session.id },
    });
    const entry = await prisma.entry.create({
      data: {
        captureId: capture.id,
        definition: "A unit of language",
        translationArabic: "كلمة",
        nuance: "Basic",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
      },
    });

    expect(entry.status).toBe("pending_review");

    await ReviewService.approve(entry.id, prisma);

    const updated = await prisma.entry.findUnique({ where: { id: entry.id } });
    expect(updated?.status).toBe("approved");
  });
});

describe("ReviewService.approveAll", () => {
  const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("approves all specified entries at once", async () => {
    const source = await SourceService.create(
      "Batch Approve Book",
      "book",
      prisma,
    );
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });

    const c1 = await prisma.capture.create({
      data: { rawText: "a", item: "a", sessionId: session.id },
    });
    const c2 = await prisma.capture.create({
      data: { rawText: "b", item: "b", sessionId: session.id },
    });
    const c3 = await prisma.capture.create({
      data: { rawText: "c", item: "c", sessionId: session.id },
    });

    await prisma.entry.createMany({
      data: [
        {
          captureId: c1.id,
          definition: "A",
          translationArabic: "أ",
          nuance: "a",
          examples: "[]",
          tags: "[]",
          relatedEntries: "[]",
        },
        {
          captureId: c2.id,
          definition: "B",
          translationArabic: "ب",
          nuance: "b",
          examples: "[]",
          tags: "[]",
          relatedEntries: "[]",
        },
        {
          captureId: c3.id,
          definition: "C",
          translationArabic: "ت",
          nuance: "c",
          examples: "[]",
          tags: "[]",
          relatedEntries: "[]",
        },
      ],
    });

    const entries = await prisma.entry.findMany({
      where: { capture: { sessionId: session.id } },
    });
    const ids = entries.map((e) => e.id);

    await ReviewService.approveAll(ids, prisma);

    const after = await prisma.entry.findMany({
      where: { id: { in: ids } },
    });
    for (const e of after) {
      expect(e.status).toBe("approved");
    }
  });
});

describe("ReviewService.reject", () => {
  const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores flagged fields, note, and sets status to rejected", async () => {
    const source = await SourceService.create("Reject Book", "book", prisma);
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    const capture = await prisma.capture.create({
      data: { rawText: "word", item: "word", sessionId: session.id },
    });
    const entry = await prisma.entry.create({
      data: {
        captureId: capture.id,
        definition: "Bad def",
        translationArabic: "خطأ",
        nuance: "Wrong",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
      },
    });

    await ReviewService.reject(
      entry.id,
      ["definition", "translationArabic"],
      "Wrong sense",
      prisma,
    );

    const updated = await prisma.entry.findUnique({ where: { id: entry.id } });
    expect(updated?.status).toBe("rejected");
    expect(updated?.flaggedFields).toBe('["definition","translationArabic"]');
    expect(updated?.rejectionNote).toBe("Wrong sense");
  });

  it("rejection note is optional, status still set to rejected", async () => {
    const source = await SourceService.create(
      "Reject No Note Book",
      "book",
      prisma,
    );
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    const capture = await prisma.capture.create({
      data: { rawText: "word", item: "word", sessionId: session.id },
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
      },
    });

    await ReviewService.reject(entry.id, ["nuance"], null, prisma);

    const updated = await prisma.entry.findUnique({ where: { id: entry.id } });
    expect(updated?.status).toBe("rejected");
    expect(updated?.flaggedFields).toBe('["nuance"]');
    expect(updated?.rejectionNote).toBeNull();
  });
});

describe("ReviewService.getPending", () => {
  const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("includes entries with status processing and pending_review", async () => {
    const source = await SourceService.create(
      "GetPending Book",
      "book",
      prisma,
    );
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    const c1 = await prisma.capture.create({
      data: { rawText: "a", item: "a", sessionId: session.id },
    });
    const c2 = await prisma.capture.create({
      data: { rawText: "b", item: "b", sessionId: session.id },
    });

    const e1 = await prisma.entry.create({
      data: {
        captureId: c1.id,
        definition: "A",
        translationArabic: "أ",
        nuance: "a",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
      },
    });
    const e2 = await prisma.entry.create({
      data: {
        captureId: c2.id,
        definition: "",
        translationArabic: "",
        nuance: "",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
        status: "processing",
      },
    });
    // Should NOT be included — approved
    const c3 = await prisma.capture.create({
      data: { rawText: "c", item: "c", sessionId: session.id },
    });
    await prisma.entry.create({
      data: {
        captureId: c3.id,
        definition: "C",
        translationArabic: "ت",
        nuance: "c",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
        status: "approved",
      },
    });

    const result = await ReviewService.getPending(prisma);

    const allEntries = [
      ...result.sessionGroups.flatMap((g) => g.entries),
      ...result.oneOffs,
    ];
    expect(allEntries.some((e) => e.id === e1.id)).toBe(true);
    expect(allEntries.some((e) => e.id === e2.id)).toBe(true);
    expect(allEntries.some((e) => e.captureId === c3.id)).toBe(false);
    expect(["processing", "pending_review"]).toContain(
      allEntries.find((e) => e.id === e2.id)?.status ?? "",
    );
  });

  it("groups entries by session with source headers", async () => {
    const source = await SourceService.create("Grouped Book", "book", prisma);
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    const c1 = await prisma.capture.create({
      data: { rawText: "x", item: "x", sessionId: session.id },
    });
    const c2 = await prisma.capture.create({
      data: { rawText: "y", item: "y", sessionId: session.id },
    });
    await prisma.entry.createMany({
      data: [
        {
          captureId: c1.id,
          definition: "X",
          translationArabic: "س",
          nuance: "x",
          examples: "[]",
          tags: "[]",
          relatedEntries: "[]",
        },
        {
          captureId: c2.id,
          definition: "Y",
          translationArabic: "ص",
          nuance: "y",
          examples: "[]",
          tags: "[]",
          relatedEntries: "[]",
        },
      ],
    });

    const result = await ReviewService.getPending(prisma);

    const group = result.sessionGroups.find(
      (g) => g.sourceName === "Grouped Book",
    );
    expect(group).toBeDefined();
    expect(group?.sourceName).toBe("Grouped Book");
    expect(group?.sourceType).toBe("book");
    expect(group?.sessionId).toBe(session.id);
    expect(group?.entries).toHaveLength(2);
  });

  it("places one-off entries in their own group", async () => {
    const c1 = await prisma.capture.create({
      data: { rawText: "oneoff", item: "oneoff" },
    });
    await prisma.entry.create({
      data: {
        captureId: c1.id,
        definition: "One-off",
        translationArabic: "مفرد",
        nuance: "solo",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
      },
    });

    const result = await ReviewService.getPending(prisma);

    expect(result.oneOffs).toHaveLength(1);
    expect(result.oneOffs[0].capture.item).toBe("oneoff");
    expect(result.oneOffs[0].capture.sessionId).toBeNull();
  });
});

describe("ReviewService.getRejected", () => {
  const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns only entries with status rejected", async () => {
    const source = await SourceService.create(
      "Rejected List Book",
      "book",
      prisma,
    );
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    const c1 = await prisma.capture.create({
      data: { rawText: "rejA", item: "rejA", sessionId: session.id },
    });
    const c2 = await prisma.capture.create({
      data: { rawText: "pendA", item: "pendA", sessionId: session.id },
    });

    const e1 = await prisma.entry.create({
      data: {
        captureId: c1.id,
        definition: "RA",
        translationArabic: "ر",
        nuance: "r",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
        status: "rejected",
        flaggedFields: '["definition"]',
      },
    });
    await prisma.entry.create({
      data: {
        captureId: c2.id,
        definition: "PA",
        translationArabic: "ب",
        nuance: "p",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
        status: "pending_review",
      },
    });

    const result = await ReviewService.getRejected(prisma);

    // All returned entries must have status "rejected"
    for (const e of result) {
      expect(e.status).toBe("rejected");
    }
    // Our specific rejected entry must be present
    expect(result.some((e) => e.id === e1.id)).toBe(true);
    // The pending entry must NOT be present
    expect(result.some((e) => e.capture.item === "pendA")).toBe(false);
  });
});

describe("ReviewService.reEnrich", () => {
  const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("resets status to processing and clears flagged fields", async () => {
    const capture = await prisma.capture.create({
      data: { rawText: "re-enrich-me", item: "re-enrich-me" },
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

    await ReviewService.reEnrich(entry.id, prisma);

    const updated = await prisma.entry.findUnique({
      where: { id: entry.id },
    });
    expect(updated?.status).toBe("processing");
    expect(updated?.flaggedFields).toBeNull();
    expect(updated?.rejectionNote).toBeNull();
    // Existing data preserved (enrichment service will overwrite)
    expect(updated?.definition).toBe("Bad");
  });
});
