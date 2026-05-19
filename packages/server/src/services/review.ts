import type { PrismaClient } from "../generated/prisma/client.js";
import type { FTSSearchHelper } from "./fts-search-helper.js";

export interface EntryWithCapture {
  id: number;
  captureId: number;
  status: string;
  definition: string;
  translationArabic: string;
  nuance: string;
  examples: string;
  tags: string;
  relatedEntries: string;
  confidence: string | null;
  flaggedFields: string | null;
  rejectionNote: string | null;
  enrichedAt: Date;
  capture: {
    id: number;
    item: string;
    locator: string | null;
    rawText: string;
    sessionId: number | null;
  };
}

export interface SessionGroup {
  sourceName: string;
  sourceType: string;
  sessionId: number;
  entries: EntryWithCapture[];
}

export interface PendingReview {
  sessionGroups: SessionGroup[];
  oneOffs: EntryWithCapture[];
}

export const ReviewService = {
  async badgeCount(prisma: PrismaClient): Promise<number> {
    return prisma.entry.count({
      where: {
        status: {
          in: ["processing", "pending_review"],
        },
      },
    });
  },

  async approve(
    entryId: number,
    prisma: PrismaClient,
    fts?: FTSSearchHelper,
  ): Promise<void> {
    await prisma.entry.update({
      where: { id: entryId },
      data: { status: "approved" },
    });

    if (fts) {
      await indexApprovedEntry(entryId, prisma, fts);
    }
  },

  async approveAll(
    entryIds: number[],
    prisma: PrismaClient,
    fts?: FTSSearchHelper,
  ): Promise<void> {
    await prisma.entry.updateMany({
      where: { id: { in: entryIds } },
      data: { status: "approved" },
    });

    if (fts) {
      for (const entryId of entryIds) {
        await indexApprovedEntry(entryId, prisma, fts);
      }
    }
  },

  async reject(
    entryId: number,
    flaggedFields: string[],
    note: string | null,
    prisma: PrismaClient,
  ): Promise<void> {
    await prisma.entry.update({
      where: { id: entryId },
      data: {
        status: "rejected",
        flaggedFields: JSON.stringify(flaggedFields),
        rejectionNote: note,
      },
    });
  },

  async getPending(prisma: PrismaClient): Promise<PendingReview> {
    const entries = await prisma.entry.findMany({
      where: {
        status: {
          in: ["processing", "pending_review"],
        },
      },
      include: {
        capture: {
          select: {
            id: true,
            item: true,
            locator: true,
            rawText: true,
            sessionId: true,
          },
        },
      },
      orderBy: { enrichedAt: "desc" },
    });

    const oneOffs: EntryWithCapture[] = [];
    const sessionMap = new Map<number, EntryWithCapture[]>();

    for (const entry of entries) {
      if (entry.capture.sessionId === null) {
        oneOffs.push(entry as unknown as EntryWithCapture);
      } else {
        const existing = sessionMap.get(entry.capture.sessionId);
        if (existing) {
          existing.push(entry as unknown as EntryWithCapture);
        } else {
          sessionMap.set(entry.capture.sessionId, [
            entry as unknown as EntryWithCapture,
          ]);
        }
      }
    }

    const sessionGroups: SessionGroup[] = [];

    if (sessionMap.size > 0) {
      const sessions = await prisma.session.findMany({
        where: { id: { in: [...sessionMap.keys()] } },
        include: { source: true },
      });

      for (const session of sessions) {
        const groupEntries = sessionMap.get(session.id);
        if (groupEntries && groupEntries.length > 0) {
          sessionGroups.push({
            sourceName: session.source.name,
            sourceType: session.source.type,
            sessionId: session.id,
            entries: groupEntries,
          });
        }
      }
    }

    return { sessionGroups, oneOffs };
  },

  async getRejected(prisma: PrismaClient): Promise<EntryWithCapture[]> {
    const entries = await prisma.entry.findMany({
      where: { status: "rejected" },
      include: {
        capture: {
          select: {
            id: true,
            item: true,
            locator: true,
            rawText: true,
            sessionId: true,
          },
        },
      },
      orderBy: { enrichedAt: "desc" },
    });

    return entries as unknown as EntryWithCapture[];
  },

  async reEnrich(entryId: number, prisma: PrismaClient): Promise<void> {
    await prisma.entry.update({
      where: { id: entryId },
      data: {
        status: "processing",
        flaggedFields: null,
        rejectionNote: null,
      },
    });
  },
};

async function indexApprovedEntry(
  entryId: number,
  prisma: PrismaClient,
  fts: FTSSearchHelper,
): Promise<void> {
  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    include: {
      capture: {
        include: { session: { include: { source: true } } },
      },
    },
  });

  if (!entry) return;

  const text = [
    entry.capture.item,
    entry.definition,
    entry.translationArabic,
    entry.nuance,
    entry.examples,
    ...JSON.parse(entry.tags || "[]"),
    ...JSON.parse(entry.relatedEntries || "[]"),
    entry.capture.session?.source.name ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  await fts.indexEntry({ entryId, text });
}
