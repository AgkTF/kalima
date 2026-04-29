import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./router.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
  }),
);

app.listen(port, () => {
  console.log(`Kalima server running at http://localhost:${port}`);
});