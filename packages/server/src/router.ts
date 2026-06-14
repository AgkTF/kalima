import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { AppService } from "./services/app.js";
import { CaptureService } from "./services/capture.js";
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
    getEnrichmentTemplate: t.procedure.query(async ({ ctx }) => {
      const row = await ctx.prisma.appMeta.findUnique({
        where: { key: "enrichment_prompt_template" },
      });
      return { template: row?.value ?? null };
    }),
    setEnrichmentTemplate: t.procedure
      .input(z.object({ template: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        await ctx.prisma.appMeta.upsert({
          where: { key: "enrichment_prompt_template" },
          create: { key: "enrichment_prompt_template", value: input.template },
          update: { value: input.template },
        });
      }),
  }),
  session: t.router({
    open: t.procedure
      .input(
        z.object({
          name: z.string().min(1),
          type: z.enum(["book", "video", "article"]),
          enrichmentTemplate: z.string().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) =>
        SessionService.open(
          input.name,
          input.type,
          ctx.prisma,
          input.enrichmentTemplate,
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
        }),
      )
      .mutation(async ({ input, ctx }) =>
        SourceService.create(input.name, input.type, ctx.prisma),
      ),
    list: t.procedure.query(async ({ ctx }) => SourceService.list(ctx.prisma)),
  }),
  capture: t.router({
    create: t.procedure
      .input(
        z.object({
          rawText: z.string().min(1),
          sessionId: z.number().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const capture = await CaptureService.create(
          input.rawText,
          ctx.prisma,
          ctx.llm,
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
