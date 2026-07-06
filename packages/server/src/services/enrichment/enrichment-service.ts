import type { PrismaClient } from "../../generated/prisma/client.js";
import { AppService } from "../app.js";
import type { LLMClient } from "../llm-client.js";
import {
  buildEnrichmentSystemPrompt,
  EnrichmentPipeline,
} from "./enrichment-pipeline.js";

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

  async enrichSessionCaptures(
    sessionId: number,
    prisma: PrismaClient,
    llm: LLMClient,
  ): Promise<void> {
    const baseSystemPrompt = await AppService.getBaseSystemPrompt(prisma);

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { source: true },
    });

    if (!session) return;

    const systemPrompt = buildEnrichmentSystemPrompt(
      baseSystemPrompt,
      session.source.enrichmentContext,
    );
    const pipeline = new EnrichmentPipeline(llm, systemPrompt);

    const captures = await prisma.capture.findMany({
      where: { sessionId },
    });

    const existingEntries = await prisma.entry.findMany({
      where: { capture: { session: { sourceId: session.sourceId } } },
      include: { capture: { select: { item: true } } },
    });

    const existingItemNames = existingEntries.map((e) => e.capture.item);

    // Process in parallel batches of 3 to avoid rate limits while maximizing throughput.
    const CONCURRENCY = 3;
    for (let i = 0; i < captures.length; i += CONCURRENCY) {
      const batch = captures.slice(i, i + CONCURRENCY);

      const results = await Promise.allSettled(
        batch.map((capture) =>
          pipeline.enrich({
            capture: {
              item: capture.item,
              locator: capture.locator,
              sourceHint: capture.sourceHint,
            },
            source: session.source,
            existingEntries: existingItemNames,
          }),
        ),
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const capture = batch[j];

        if (result.status === "fulfilled") {
          try {
            await prisma.entry.update({
              where: { captureId: capture.id },
              data: {
                definition: result.value.definition,
                translationArabic: result.value.translationArabic,
                nuance: result.value.nuance,
                examples: JSON.stringify(result.value.examples),
                tags: JSON.stringify(result.value.tags),
                relatedEntries: JSON.stringify(result.value.relatedEntries),
                confidence: result.value.confidence,
                status: "pending_review",
              },
            });
          } catch {
            // DB write failed; entry stays "processing" — user can reject and re-enrich.
          }
        }
        // If rejected (status === "rejected"), entry stays "processing" — user sees it and can act.
      }
    }
  },

  async enrichCapture(
    captureId: number,
    prisma: PrismaClient,
    llm: LLMClient,
  ): Promise<void> {
    try {
      const baseSystemPrompt = await AppService.getBaseSystemPrompt(prisma);

      const capture = await prisma.capture.findUnique({
        where: { id: captureId },
        include: {
          session: { include: { source: true } },
        },
      });

      if (!capture) return;

      const source = capture.session?.source ?? null;

      const systemPrompt = buildEnrichmentSystemPrompt(
        baseSystemPrompt,
        source?.enrichmentContext ?? null,
      );
      const pipeline = new EnrichmentPipeline(llm, systemPrompt);

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
          sourceHint: capture.sourceHint,
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

  /**
   * Phase 1 for one-off enrichment: select pending one-off captures
   * (sessionId: null, entry: null), create `processing` placeholder entries,
   * and return the capture IDs. Awaited so the UI flips to ping dots immediately.
   *
   * The caller (router) passes the returned IDs to `enrichOneOffCaptures`
   * (Phase 2, fire-and-forget). This mirrors the session-close pattern where
   * `createPlaceholderEntries` + `enrichSessionCaptures` are orchestrated at
   * the router level. See ADR 0009.
   */
  async createOneOffPlaceholderEntries(
    prisma: PrismaClient,
  ): Promise<number[]> {
    const pendingCaptures = await prisma.capture.findMany({
      where: { sessionId: null, entry: { is: null } },
      include: { entry: { select: { id: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (pendingCaptures.length === 0) {
      return [];
    }

    await prisma.entry.createMany({
      data: pendingCaptures.map((c) => ({
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

    return pendingCaptures.map((c) => c.id);
  },

  /**
   * Phase 2 for one-off enrichment: enrich a batch of captures via
   * `enrichCapture` (concurrency 3). The router calls this fire-and-forget
   * (not awaited, with `.catch()`) so enrichment runs in the background.
   *
   * Precondition: placeholder entries must already exist (created by
   * `createOneOffPlaceholderEntries`). Missing entries are skipped by
   * `enrichCapture` (no crash, just wasted work).
   */
  async enrichOneOffCaptures(
    captureIds: number[],
    prisma: PrismaClient,
    llm: LLMClient,
  ): Promise<void> {
    const CONCURRENCY = 3;
    for (let i = 0; i < captureIds.length; i += CONCURRENCY) {
      const batch = captureIds.slice(i, i + CONCURRENCY);
      await Promise.allSettled(
        batch.map((captureId) =>
          EnrichmentService.enrichCapture(captureId, prisma, llm),
        ),
      );
    }
  },
};
