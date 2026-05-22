import type { PrismaClient } from "../generated/prisma/client.js";
import type { FTSSearchHelper } from "./fts-search-helper.js";

export interface WordBankEntry {
  id: number;
  definition: string;
  translationArabic: string;
  nuance: string;
  examples: string;
  tags: string;
  relatedEntries: string;
  enrichedAt: Date;
  capture: {
    id: number;
    item: string;
    locator: string | null;
  };
}

export interface WordBankEntryDetail extends WordBankEntry {
  capture: {
    id: number;
    item: string;
    locator: string | null;
    rawText: string;
    session: {
      id: number;
      source: {
        id: number;
        name: string;
        type: string;
      };
    } | null;
  };
}

export const WordBankService = {
  async getRecent(prisma: PrismaClient): Promise<WordBankEntry[]> {
    const entries = await prisma.entry.findMany({
      where: { status: "approved" },
      include: {
        capture: {
          select: { id: true, item: true, locator: true },
        },
      },
      orderBy: { enrichedAt: "desc" },
    });

    return entries as unknown as WordBankEntry[];
  },

  async search(
    query: string,
    prisma: PrismaClient,
    fts: FTSSearchHelper,
  ): Promise<WordBankEntry[]> {
    const matchingIds = await fts.search(query);

    if (matchingIds.length === 0) return [];

    const entries = await prisma.entry.findMany({
      where: {
        id: { in: matchingIds },
        status: "approved",
      },
      include: {
        capture: {
          select: { id: true, item: true, locator: true },
        },
      },
      orderBy: { enrichedAt: "desc" },
    });

    return entries as unknown as WordBankEntry[];
  },

  async getEntry(
    entryId: number,
    prisma: PrismaClient,
  ): Promise<WordBankEntryDetail | null> {
    const entry = await prisma.entry.findUnique({
      where: { id: entryId },
      include: {
        capture: {
          include: {
            session: {
              include: { source: true },
            },
          },
        },
      },
    });

    if (!entry) return null;

    return entry as unknown as WordBankEntryDetail;
  },

  async addTag(
    entryId: number,
    tag: string,
    prisma: PrismaClient,
  ): Promise<void> {
    const entry = await prisma.entry.findUnique({
      where: { id: entryId },
      select: { tags: true },
    });
    if (!entry) return;

    const tags: string[] = JSON.parse(entry.tags || "[]");
    if (!tags.includes(tag)) {
      tags.push(tag);
    }

    await prisma.entry.update({
      where: { id: entryId },
      data: { tags: JSON.stringify(tags) },
    });
  },

  async removeTag(
    entryId: number,
    tag: string,
    prisma: PrismaClient,
  ): Promise<void> {
    const entry = await prisma.entry.findUnique({
      where: { id: entryId },
      select: { tags: true },
    });
    if (!entry) return;

    const tags: string[] = JSON.parse(entry.tags || "[]");
    const filtered = tags.filter((t) => t !== tag);

    await prisma.entry.update({
      where: { id: entryId },
      data: { tags: JSON.stringify(filtered) },
    });
  },

  async removeSource(
    entryId: number,
    prisma: PrismaClient,
    fts: FTSSearchHelper,
  ): Promise<void> {
    const entry = await prisma.entry.findUnique({
      where: { id: entryId },
      select: { captureId: true },
    });
    if (!entry) return;

    await prisma.capture.update({
      where: { id: entry.captureId },
      data: { sessionId: null },
    });

    // Re-index to drop the source name from FTS5
    const updated = await prisma.entry.findUnique({
      where: { id: entryId },
      include: {
        capture: {
          include: { session: { include: { source: true } } },
        },
      },
    });
    if (updated) {
      const text = [
        updated.capture.item,
        updated.definition,
        updated.translationArabic,
        updated.nuance,
        updated.examples,
        ...JSON.parse(updated.tags || "[]"),
        ...JSON.parse(updated.relatedEntries || "[]"),
        updated.capture.session?.source.name ?? "",
      ]
        .filter(Boolean)
        .join(" ");
      await fts.indexEntry({ entryId: updated.id, text });
    }
  },
};
