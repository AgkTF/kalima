import { initTRPC } from "@trpc/server";
import { AppService } from "./services/app.js";

const t = initTRPC.context<object>().create();

export const appRouter = t.router({
  app: t.router({
    status: t.procedure.query(() => AppService.status()),
  }),
});

export type AppRouter = typeof appRouter;
