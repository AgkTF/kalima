import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";
import { FTSSearchHelper } from "../services/fts-search-helper.js";
import { SourceService } from "../services/source.js";
import { WordBankService } from "../services/word-bank.js";

describe("WordBankService", () => {
  const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/test.db" });
  const prisma = new PrismaClient({ adapter });
  let fts: FTSSearchHelper;
  let wordBank: typeof WordBankService;

  beforeAll(async () => {
    fts = new FTSSearchHelper(prisma);
    await fts.initialize();
    wordBank = WordBankService;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createApprovedEntry(
    item: string,
    overrides: Partial<{
      definition: string;
      translationArabic: string;
      nuance: string;
      examples: string;
      tags: string;
      relatedEntries: string;
      sourceName: string;
      sourceType: string;
    }> = {},
  ) {
    const sourceName = overrides.sourceName ?? `${item}-source`;
    const sourceType = overrides.sourceType ?? "book";
    const source = await SourceService.create(sourceName, sourceType, prisma);
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    const capture = await prisma.capture.create({
      data: { item, sessionId: session.id },
    });
    const entry = await prisma.entry.create({
      data: {
        captureId: capture.id,
        status: "approved",
        definition: overrides.definition ?? `Definition of ${item}`,
        translationArabic: overrides.translationArabic ?? `ترجمة ${item}`,
        nuance: overrides.nuance ?? `Nuance for ${item}`,
        examples: overrides.examples ?? "[]",
        tags: overrides.tags ?? "[]",
        relatedEntries: overrides.relatedEntries ?? "[]",
      },
    });
    return { entry, capture, session, source };
  }

  describe("getRecent", () => {
    it("returns only approved entries", async () => {
      const { entry: approved } = await createApprovedEntry("approved-word");

      // Create a pending entry that should NOT appear
      const pCapture = await prisma.capture.create({
        data: { item: "pending-word" },
      });
      await prisma.entry.create({
        data: {
          captureId: pCapture.id,
          definition: "Pending def",
          translationArabic: "معلق",
          nuance: "n",
          examples: "[]",
          tags: "[]",
          relatedEntries: "[]",
        },
      });

      const results = await wordBank.getRecent(prisma);
      expect(results.some((e) => e.id === approved.id)).toBe(true);
      expect(results.some((e) => e.capture.item === "pending-word")).toBe(
        false,
      );
    });

    it("returns entries ordered by enrichedAt descending", async () => {
      const source = await SourceService.create("Recent Sort", "book", prisma);
      const session = await prisma.session.create({
        data: { sourceId: source.id },
      });

      const c1 = await prisma.capture.create({
        data: { item: "older", sessionId: session.id },
      });
      const c2 = await prisma.capture.create({
        data: { item: "newer", sessionId: session.id },
      });

      const older = await prisma.entry.create({
        data: {
          captureId: c1.id,
          status: "approved",
          definition: "Older def",
          translationArabic: "قديم",
          nuance: "o",
          examples: "[]",
          tags: "[]",
          relatedEntries: "[]",
          enrichedAt: new Date("2024-01-01"),
        },
      });
      const newer = await prisma.entry.create({
        data: {
          captureId: c2.id,
          status: "approved",
          definition: "Newer def",
          translationArabic: "جديد",
          nuance: "n",
          examples: "[]",
          tags: "[]",
          relatedEntries: "[]",
          enrichedAt: new Date("2024-06-01"),
        },
      });

      const results = await wordBank.getRecent(prisma);

      const newerIndex = results.findIndex((e) => e.id === newer.id);
      const olderIndex = results.findIndex((e) => e.id === older.id);
      expect(newerIndex).toBeLessThan(olderIndex);
    });
  });

  describe("search", () => {
    it("returns approved entries matching the query via FTS5", async () => {
      const { entry } = await createApprovedEntry("serendipity", {
        definition: "The occurrence of events by chance in a happy way",
        tags: '["literary","chance"]',
      });
      await fts.indexEntry({
        entryId: entry.id,
        text: `serendipity ${entry.definition} ${entry.translationArabic} literary chance The Art of Innovation`,
      });

      const results = await wordBank.search("chance", prisma, fts);

      expect(results.some((e) => e.id === entry.id)).toBe(true);
    });

    it("excludes non-approved entries from search results", async () => {
      // Approved entry (should appear)
      const { entry: approved } = await createApprovedEntry("visible-word");
      await fts.indexEntry({
        entryId: approved.id,
        text: `visible-word ${approved.definition} ${approved.translationArabic}`,
      });

      // Pending entry with same search term (should NOT appear)
      const pCapture = await prisma.capture.create({
        data: { item: "hidden-word" },
      });
      const hidden = await prisma.entry.create({
        data: {
          captureId: pCapture.id,
          definition: "visible-word hidden def",
          translationArabic: "مخفي",
          nuance: "n",
          examples: "[]",
          tags: "[]",
          relatedEntries: "[]",
        },
      });
      await fts.indexEntry({
        entryId: hidden.id,
        text: `hidden-word ${hidden.definition} ${hidden.translationArabic}`,
      });

      const results = await wordBank.search("visible-word", prisma, fts);

      expect(results.some((e) => e.id === approved.id)).toBe(true);
      expect(results.some((e) => e.id === hidden.id)).toBe(false);
    });

    it("returns empty array when no approved entries match", async () => {
      const results = await wordBank.search("nonexistentzzz999", prisma, fts);
      expect(results).toEqual([]);
    });
  });

  describe("getEntry", () => {
    it("returns full entry with capture, source, and session details", async () => {
      const { entry, session, source } = await createApprovedEntry(
        "inspect-word",
        { sourceName: "The Great Gatsby", sourceType: "book" },
      );

      const result = await wordBank.getEntry(entry.id, prisma);

      expect(result).toBeDefined();
      expect(result?.id).toBe(entry.id);
      expect(result?.definition).toBe("Definition of inspect-word");
      expect(result?.capture.item).toBe("inspect-word");
      expect(result?.capture.session?.source.name).toBe("The Great Gatsby");
      expect(result?.capture.session?.source.type).toBe("book");
    });

    it("returns null for non-existent entry", async () => {
      const result = await wordBank.getEntry(99999, prisma);
      expect(result).toBeNull();
    });
  });

  describe("addTag", () => {
    it("appends a tag to the entry's tags string", async () => {
      const { entry } = await createApprovedEntry("tagged-word", {
        tags: '["existing-tag"]',
      });

      await wordBank.addTag(entry.id, "new-tag", prisma, fts);

      const updated = await prisma.entry.findUnique({
        where: { id: entry.id },
      });
      expect(updated?.tags).toContain("existing-tag");
      expect(updated?.tags).toContain("new-tag");
    });

    it("does not duplicate an existing tag", async () => {
      const { entry } = await createApprovedEntry("dup-tag-word", {
        tags: '["only-tag"]',
      });

      await wordBank.addTag(entry.id, "only-tag", prisma, fts);

      const updated = await prisma.entry.findUnique({
        where: { id: entry.id },
      });
      // "only-tag" should appear exactly once
      const parsed: string[] = JSON.parse(updated?.tags ?? "[]");
      expect(parsed.filter((t) => t === "only-tag")).toHaveLength(1);
    });
  });

  describe("removeTag", () => {
    it("removes a tag from the entry's tags string", async () => {
      const { entry } = await createApprovedEntry("remove-tag-word", {
        tags: '["keep-me","remove-me","also-keep"]',
      });

      await wordBank.removeTag(entry.id, "remove-me", prisma, fts);

      const updated = await prisma.entry.findUnique({
        where: { id: entry.id },
      });
      expect(updated?.tags).toContain("keep-me");
      expect(updated?.tags).toContain("also-keep");
      expect(updated?.tags).not.toContain("remove-me");
    });

    it("leaves tags unchanged when removing a non-existent tag", async () => {
      const { entry } = await createApprovedEntry("missing-tag-word", {
        tags: '["only-tag"]',
      });

      await wordBank.removeTag(entry.id, "never-added", prisma, fts);

      const updated = await prisma.entry.findUnique({
        where: { id: entry.id },
      });
      expect(updated?.tags).toContain("only-tag");
    });
  });

  describe("removeSource", () => {
    it("sets the capture's sessionId to null, detaching the source", async () => {
      const { entry, session } =
        await createApprovedEntry("remove-source-word");

      await wordBank.removeSource(entry.id, prisma, fts);

      const updated = await prisma.capture.findUnique({
        where: { id: entry.captureId },
      });
      expect(updated?.sessionId).toBeNull();
    });
  });
});
