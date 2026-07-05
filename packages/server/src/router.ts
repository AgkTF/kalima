import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { AppService } from "./services/app.js";
import { CaptureService } from "./services/capture.js";
import { FACTORY_DEFAULT_SYSTEM_PROMPT } from "./services/enrichment/enrichment-pipeline.js";
import { EnrichmentService } from "./services/enrichment/enrichment-service.js";
import { ReviewService } from "./services/review.js";
import { SessionService } from "./services/session.js";
import { SourceService } from "./services/source.js";
import { WordBankService } from "./services/word-bank.js";

export interface AppContext {
  prisma: import("./generated/prisma/client.js").PrismaClient;
  llm: import("./services/llm-client.js").LLMClient;
  fts: import("./services/fts-search-helper.js").FTSSearchHelper;
}

const t = initTRPC.context<AppContext>().create();

export const appRouter = t.router({
  app: t.router({
    status: t.procedure.query(() => AppService.status()),
    getBaseSystemPrompt: t.procedure.query(async ({ ctx }) => ({
      current: await AppService.getBaseSystemPrompt(ctx.prisma),
      factoryDefault: FACTORY_DEFAULT_SYSTEM_PROMPT,
    })),
    setBaseSystemPrompt: t.procedure
      .input(z.object({ value: z.string().min(1) }))
      .mutation(async ({ input, ctx }) =>
        AppService.setBaseSystemPrompt(ctx.prisma, input.value),
      ),
    resetBaseSystemPrompt: t.procedure.mutation(async ({ ctx }) =>
      AppService.resetBaseSystemPrompt(ctx.prisma),
    ),
  }),
  session: t.router({
    open: t.procedure
      .input(
        z.object({
          name: z.string().min(1),
          type: z.enum(["book", "video", "article"]),
          enrichmentContext: z.string().nullable().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) =>
        SessionService.open(
          input.name,
          input.type,
          ctx.prisma,
          input.enrichmentContext,
        ),
      ),
    close: t.procedure.mutation(async ({ ctx }) => {
      const session = await SessionService.close(ctx.prisma);
      // Create placeholder entries immediately so the user sees them in Review
      await EnrichmentService.createPlaceholderEntries(session.id, ctx.prisma);
      // Fire-and-forget enrichment to fill in real data
      EnrichmentService.enrichSessionCaptures(
        session.id,
        ctx.prisma,
        ctx.llm,
      ).catch(() => {
        // Enrichment failures are non-blocking
      });
      return session;
    }),
    getActive: t.procedure.query(async ({ ctx }) =>
      SessionService.getActive(ctx.prisma),
    ),
  }),
  source: t.router({
    create: t.procedure
      .input(
        z.object({
          name: z.string().min(1),
          type: z.enum(["book", "video", "article"]),
          enrichmentContext: z.string().nullable().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) =>
        SourceService.create(
          input.name,
          input.type,
          ctx.prisma,
          input.enrichmentContext,
        ),
      ),
    list: t.procedure.query(async ({ ctx }) => SourceService.list(ctx.prisma)),
    updateEnrichmentContext: t.procedure
      .input(
        z.object({
          sourceId: z.number(),
          enrichmentContext: z.string().nullable(),
        }),
      )
      .mutation(async ({ input, ctx }) =>
        SourceService.updateEnrichmentContext(
          input.sourceId,
          input.enrichmentContext,
          ctx.prisma,
        ),
      ),
  }),
  capture: t.router({
    create: t.procedure
      .input(
        z.object({
          item: z.string().min(1),
          locator: z.string().nullable().optional(),
          sourceHint: z.string().nullable().optional(),
          sessionId: z.number().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const capture = await CaptureService.create(
          input.item,
          input.locator ?? null,
          input.sourceHint ?? null,
          ctx.prisma,
          input.sessionId,
        );
        // Fire-and-forget enrichment for one-off captures
        if (!input.sessionId) {
          // Create placeholder entry immediately so the user sees it in Review
          await EnrichmentService.createPlaceholderEntry(
            capture.id,
            ctx.prisma,
          );
          EnrichmentService.enrichCapture(
            capture.id,
            ctx.prisma,
            ctx.llm,
          ).catch(() => {
            // Enrichment failures are non-blocking
          });
        }
        return capture;
      }),
    list: t.procedure.query(({ ctx }) => CaptureService.list(ctx.prisma)),
    listSession: t.procedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input, ctx }) =>
        CaptureService.listSession(input.sessionId, ctx.prisma),
      ),
    update: t.procedure
      .input(
        z.object({
          captureId: z.number(),
          locator: z.string().nullable().optional(),
          sourceHint: z.string().nullable().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) =>
        CaptureService.update(
          input.captureId,
          {
            locator: input.locator,
            sourceHint: input.sourceHint,
          },
          ctx.prisma,
        ),
      ),
  }),

  enrichment: t.router({
    listPending: t.procedure.query(async ({ ctx }) => {
      return ctx.prisma.entry.findMany({
        where: { status: "pending_review" },
        include: { capture: true },
        orderBy: { enrichedAt: "desc" },
      });
    }),
    listBySession: t.procedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input, ctx }) => {
        return ctx.prisma.entry.findMany({
          where: {
            status: "pending_review",
            capture: { sessionId: input.sessionId },
          },
          include: { capture: true },
          orderBy: { enrichedAt: "desc" },
        });
      }),
  }),
  review: t.router({
    getPending: t.procedure.query(async ({ ctx }) =>
      ReviewService.getPending(ctx.prisma),
    ),
    approve: t.procedure
      .input(z.object({ entryId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ReviewService.approve(input.entryId, ctx.prisma, ctx.fts);
      }),
    approveAll: t.procedure
      .input(z.object({ entryIds: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        await ReviewService.approveAll(input.entryIds, ctx.prisma, ctx.fts);
      }),
    reject: t.procedure
      .input(
        z.object({
          entryId: z.number(),
          flaggedFields: z.array(z.string()),
          note: z.string().nullable(),
        }),
      )
      .mutation(async ({ input, ctx }) =>
        ReviewService.reject(
          input.entryId,
          input.flaggedFields,
          input.note,
          ctx.prisma,
        ),
      ),
    getRejected: t.procedure.query(async ({ ctx }) =>
      ReviewService.getRejected(ctx.prisma),
    ),
    reEnrich: t.procedure
      .input(z.object({ entryId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await ReviewService.reEnrich(input.entryId, ctx.prisma);
        // Fire-and-forget re-enrichment
        const entry = await ctx.prisma.entry.findUnique({
          where: { id: input.entryId },
          include: { capture: true },
        });
        if (entry?.capture) {
          EnrichmentService.enrichCapture(
            entry.capture.id,
            ctx.prisma,
            ctx.llm,
          ).catch((err: unknown) => {
            console.error("Re-enrichment failed:", err);
          });
        }
      }),
  }),
  wordBank: t.router({
    search: t.procedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input, ctx }) =>
        WordBankService.search(input.query, ctx.prisma, ctx.fts),
      ),
    getRecent: t.procedure.query(async ({ ctx }) =>
      WordBankService.getRecent(ctx.prisma),
    ),
    getEntry: t.procedure
      .input(z.object({ entryId: z.number() }))
      .query(async ({ input, ctx }) =>
        WordBankService.getEntry(input.entryId, ctx.prisma),
      ),
    addTag: t.procedure
      .input(z.object({ entryId: z.number(), tag: z.string().min(1) }))
      .mutation(async ({ input, ctx }) =>
        WordBankService.addTag(input.entryId, input.tag, ctx.prisma, ctx.fts),
      ),
    removeTag: t.procedure
      .input(z.object({ entryId: z.number(), tag: z.string().min(1) }))
      .mutation(async ({ input, ctx }) =>
        WordBankService.removeTag(
          input.entryId,
          input.tag,
          ctx.prisma,
          ctx.fts,
        ),
      ),
    removeSource: t.procedure
      .input(z.object({ entryId: z.number() }))
      .mutation(async ({ input, ctx }) =>
        WordBankService.removeSource(input.entryId, ctx.prisma, ctx.fts),
      ),
    updateField: t.procedure
      .input(
        z.object({
          entryId: z.number(),
          field: z.enum([
            "definition",
            "translationArabic",
            "nuance",
            "examples",
          ]),
          value: z.string(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const exists = await ctx.prisma.entry.findUnique({
          where: { id: input.entryId },
          select: { id: true },
        });
        if (!exists) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Entry ${input.entryId} not found`,
          });
        }
        await ctx.prisma.entry.update({
          where: { id: input.entryId },
          data: { [input.field]: input.value },
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
