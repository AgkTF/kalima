import type { PrismaClient } from "../../generated/prisma/client.js";
import type { LLMClient } from "../llm-client.js";
import { EnrichmentPipeline } from "./enrichment-pipeline.js";

export const EnrichmentService = {
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

        await prisma.entry.create({
          data: {
            captureId: capture.id,
            definition: result.definition,
            translationArabic: result.translationArabic,
            nuance: result.nuance,
            examples: JSON.stringify(result.examples),
            tags: JSON.stringify(result.tags),
            relatedEntries: JSON.stringify(result.relatedEntries),
          },
        });
      } catch {
        // Capture may have been deleted before enrichment completed.
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

      await prisma.entry.create({
        data: {
          captureId: capture.id,
          definition: result.definition,
          translationArabic: result.translationArabic,
          nuance: result.nuance,
          examples: JSON.stringify(result.examples),
          tags: JSON.stringify(result.tags),
          relatedEntries: JSON.stringify(result.relatedEntries),
        },
      });
    } catch {
      // Capture may have been deleted before enrichment completed.
    }
  },
};
