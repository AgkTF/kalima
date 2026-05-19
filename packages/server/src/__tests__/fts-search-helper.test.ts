import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";
import { FTSSearchHelper } from "../services/fts-search-helper.js";

describe("FTSSearchHelper", () => {
  const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/test.db" });
  const prisma = new PrismaClient({ adapter });
  let fts: FTSSearchHelper;

  beforeAll(async () => {
    fts = new FTSSearchHelper(prisma);
    await fts.initialize();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("indexEntry", () => {
    it("indexes an entry so it becomes searchable", async () => {
      await fts.indexEntry({
        entryId: 1,
        text: "serendipity The occurrence of events by chance in a happy way مصادفة سعيدة literary positive-connotation The Art of Innovation",
      });

      const results = await fts.search("serendipity");
      expect(results).toContain(1);
    });

    it("does not duplicate entries when re-indexing the same id", async () => {
      await fts.indexEntry({
        entryId: 2,
        text: "ephemeral lasting for a very short time",
      });
      await fts.indexEntry({
        entryId: 2,
        text: "ephemeral lasting for a very short time مؤقت transient",
      });

      const results = await fts.search("ephemeral");
      expect(results.filter((id) => id === 2)).toHaveLength(1);
    });
  });

  describe("search", () => {
    it("matches on definition text", async () => {
      await fts.indexEntry({
        entryId: 3,
        text: "laconic using very few words concise brief",
      });

      const results = await fts.search("concise");
      expect(results).toContain(3);
    });

    it("matches on translation Arabic text", async () => {
      await fts.indexEntry({
        entryId: 4,
        text: "moon قمر night sky",
      });

      const results = await fts.search("قمر");
      expect(results).toContain(4);
    });

    it("matches on tags", async () => {
      await fts.indexEntry({
        entryId: 5,
        text: "ubiquitous found everywhere common pervasive",
      });

      const results = await fts.search("pervasive");
      expect(results).toContain(5);
    });

    it("matches on source name", async () => {
      await fts.indexEntry({
        entryId: 6,
        text: "sonder The realization that strangers have complex lives Moby Dick",
      });

      const results = await fts.search("Moby");
      expect(results).toContain(6);
    });

    it("returns empty array when nothing matches", async () => {
      const results = await fts.search("nonexistentzzz123");
      expect(results).toEqual([]);
    });

    it("returns multiple matching entry IDs", async () => {
      await fts.indexEntry({
        entryId: 7,
        text: "resilience ability to recover quickly bounce back",
      });
      await fts.indexEntry({
        entryId: 8,
        text: "resolve determination resilience persistence",
      });

      const results = await fts.search("resilience");
      expect(results).toContain(7);
      expect(results).toContain(8);
    });
    it("matches partial words via prefix matching", async () => {
      await fts.indexEntry({
        entryId: 10,
        text: "serendipity The occurrence of events by chance in a happy way مصادفة سعيدة",
      });

      const results = await fts.search("seren");
      expect(results).toContain(10);
    });

    it("matches partial definition text via prefix", async () => {
      await fts.indexEntry({
        entryId: 11,
        text: "ephemeral lasting for a very short time مؤقت transient",
      });

      const results = await fts.search("last");
      expect(results).toContain(11);
    });

    it("matches partial tag text via prefix", async () => {
      await fts.indexEntry({
        entryId: 12,
        text: "ubiquitous found everywhere common pervasive",
      });

      const results = await fts.search("perva");
      expect(results).toContain(12);
    });

    it("does not match when prefix is wrong", async () => {
      await fts.indexEntry({
        entryId: 13,
        text: "resilience ability to recover quickly bounce back",
      });

      const results = await fts.search("xyzres");
      expect(results).not.toContain(13);
    });
  });

  describe("deIndexEntry", () => {
    it("removes an entry from FTS5 so it is no longer searchable", async () => {
      await fts.indexEntry({
        entryId: 9,
        text: "transient temporary fleeting short-lived",
      });

      // Confirm indexed
      const before = await fts.search("transient");
      expect(before).toContain(9);

      await fts.deIndexEntry(9);

      const after = await fts.search("transient");
      expect(after).not.toContain(9);
    });
  });
});
