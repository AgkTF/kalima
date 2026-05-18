import type { PrismaClient } from "../../generated/prisma/client.js";
import type { LLMClient } from "../llm-client.js";
import { EnrichmentPipeline } from "./enrichment-pipeline.js";

export const EnrichmentService = {
  /**
   * Create placeholder entries (status "processing") for all captures in a session.
   * Call this immediately when enrichment is triggered so the user sees cards right away.
   */
  async createPlaceholderEntries(
    sessionId: number,
    prisma: PrismaClient,
  ): Promise<void> {
    const captures = await prisma.capture.findMany({
      where: { sessionId },
      include: { entry: { select: { id: true } } },
    });

    const toCreate = captures.filter((c) => !c.entry);

    if (toCreate.length === 0) return;

    await prisma.entry.createMany({
      data: toCreate.map((c) => ({
        captureId: c.id,
        status: "processing",
        definition: "",
        translationArabic: "",
        nuance: "",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
      })),
    });
  },

  /**
   * Create a placeholder entry (status "processing") for a single one-off capture.
   */
  async createPlaceholderEntry(
    captureId: number,
    prisma: PrismaClient,
  ): Promise<void> {
    const existing = await prisma.entry.findUnique({
      where: { captureId },
    });
    if (existing) return;

    await prisma.entry.create({
      data: {
        captureId,
        status: "processing",
        definition: "",
        translationArabic: "",
        nuance: "",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
      },
    });
  },

  async enrichSessionCaptures(
    sessionId: number,
    prisma: PrismaClient,
    llm: LLMClient,
  ): Promise<void> {
    const pipeline = new EnrichmentPipeline(llm);

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { source: true },
    });

    if (!session) return;

    const captures = await prisma.capture.findMany({
      where: { sessionId },
    });

    const existingEntries = await prisma.entry.findMany({
      where: { capture: { session: { sourceId: session.sourceId } } },
      include: { capture: { select: { item: true } } },
    });

    const existingItemNames = existingEntries.map((e) => e.capture.item);

    for (const capture of captures) {
      try {
        const result = await pipeline.enrich({
          capture: {
            item: capture.item,
            locator: capture.locator,
            rawText: capture.rawText,
          },
          source: session.source,
          existingEntries: existingItemNames,
        });

        // All entries enter Review as pending_review — the user decides on every entry.
        // Confidence is stored as passive metadata for potential future use.
        await prisma.entry.update({
          where: { captureId: capture.id },
          data: {
            definition: result.definition,
            translationArabic: result.translationArabic,
            nuance: result.nuance,
            examples: JSON.stringify(result.examples),
            tags: JSON.stringify(result.tags),
            relatedEntries: JSON.stringify(result.relatedEntries),
            confidence: result.confidence,
            status: "pending_review",
          },
        });
      } catch {
        // Entry may have been deleted or enrichment failed.
        // Skip and continue with remaining captures.
      }
    }
  },

  async enrichCapture(
    captureId: number,
    prisma: PrismaClient,
    llm: LLMClient,
  ): Promise<void> {
    try {
      const pipeline = new EnrichmentPipeline(llm);

      const capture = await prisma.capture.findUnique({
        where: { id: captureId },
        include: {
          session: { include: { source: true } },
        },
      });

      if (!capture) return;

      const source = capture.session?.source ?? null;

      let existingItemNames: string[] = [];
      if (source) {
        const existingEntries = await prisma.entry.findMany({
          where: { capture: { session: { sourceId: source.id } } },
          include: { capture: { select: { item: true } } },
        });
        existingItemNames = existingEntries.map((e) => e.capture.item);
      }

      const result = await pipeline.enrich({
        capture: {
          item: capture.item,
          locator: capture.locator,
          rawText: capture.rawText,
        },
        source,
        existingEntries: existingItemNames,
      });

      // All entries enter Review as pending_review — the user decides.
      // Confidence is stored as passive metadata for potential future use.
      await prisma.entry.update({
        where: { captureId: capture.id },
        data: {
          definition: result.definition,
          translationArabic: result.translationArabic,
          nuance: result.nuance,
          examples: JSON.stringify(result.examples),
          tags: JSON.stringify(result.tags),
          relatedEntries: JSON.stringify(result.relatedEntries),
          confidence: result.confidence,
          status: "pending_review",
        },
      });
    } catch {
      // Entry may have been deleted before enrichment completed.
    }
  },
};
