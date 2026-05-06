import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { AppService } from "./services/app.js";
import { CaptureService } from "./services/capture.js";

export interface AppContext {
  prisma: import("./generated/prisma/client.js").PrismaClient;
  llm: import("./services/llm-client.js").LLMClient;
}

const t = initTRPC.context<AppContext>().create();

export const appRouter = t.router({
  app: t.router({
    status: t.procedure.query(() => AppService.status()),
  }),
  capture: t.router({
    create: t.procedure
      .input(z.object({ rawText: z.string().min(1) }))
      .mutation(async ({ input, ctx }) =>
        CaptureService.create(input.rawText, ctx.prisma, ctx.llm),
      ),
    list: t.procedure.query(({ ctx }) => CaptureService.list(ctx.prisma)),
  }),
});

export type AppRouter = typeof appRouter;
