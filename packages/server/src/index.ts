import path from "node:path";
import { fileURLToPath } from "node:url";
import * as trpcExpress from "@trpc/server/adapters/express";
import dotenv from "dotenv";
import express from "express";
import { appRouter } from "./router.js";
import { prisma } from "./prisma.js";
import { LLMClient } from "./services/llm-client.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 3001);

const llm = new LLMClient({
  apiKey: process.env.LLM_API_KEY ?? "",
  baseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1",
  cheapModel: process.env.LLM_CHEAP_MODEL,
});

const createContext = ({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) => ({
  prisma,
  llm,
});

const app = express();

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

// Serve frontend static files in production
// In dev, Vite handles this via its own dev server + proxy
const staticDir =
  process.env.STATIC_DIR ?? path.join(__dirname, "../../web/dist");
app.use(express.static(staticDir));

// SPA fallback: serve index.html for any non-API route
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Kalima server running at http://localhost:${port}`);
});