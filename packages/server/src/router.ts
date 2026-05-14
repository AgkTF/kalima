import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { AppService } from "./services/app.js";
import { CaptureService } from "./services/capture.js";
import { EnrichmentService } from "./services/enrichment/enrichment-service.js";
import { SessionService } from "./services/session.js";
import { SourceService } from "./services/source.js";

export interface AppContext {
  prisma: import("./generated/prisma/client.js").PrismaClient;
  llm: import("./services/llm-client.js").LLMClient;
}

const t = initTRPC.context<AppContext>().create();

export const appRouter = t.router({
  app: t.router({
    status: t.procedure.query(() => AppService.status()),
  }),
  session: t.router({
    open: t.procedure
      .input(
        z.object({
          name: z.string().min(1),
          type: z.enum(["book", "video", "article"]),
        }),
      )
      .mutation(async ({ input, ctx }) =>
        SessionService.open(input.name, input.type, ctx.prisma),
      ),
    close: t.procedure.mutation(async ({ ctx }) => {
      const session = await SessionService.close(ctx.prisma);
      // Fire-and-forget enrichment for all session captures
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
});

export type AppRouter = typeof appRouter;
