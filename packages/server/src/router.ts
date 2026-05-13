import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { AppService } from "./services/app.js";
import { CaptureService } from "./services/capture.js";
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
    close: t.procedure.mutation(async ({ ctx }) =>
      SessionService.close(ctx.prisma),
    ),
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
  }),
  capture: t.router({
    create: t.procedure
      .input(
        z.object({
          rawText: z.string().min(1),
          sessionId: z.number().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) =>
        CaptureService.create(
          input.rawText,
          ctx.prisma,
          ctx.llm,
          input.sessionId,
        ),
      ),
    list: t.procedure.query(({ ctx }) => CaptureService.list(ctx.prisma)),
    listSession: t.procedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input, ctx }) =>
        CaptureService.listSession(input.sessionId, ctx.prisma),
      ),
  }),
});

export type AppRouter = typeof appRouter;
