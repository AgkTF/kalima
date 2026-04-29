import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./router.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 3001);

const app = express();

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
  }),
);

// Serve frontend static files in production
// In dev, Vite handles this via its own dev server + proxy
app.use(express.static(path.join(__dirname, "../../web/dist")));

// SPA fallback: serve index.html for any non-API route
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(__dirname, "../../web/dist/index.html"));
});

app.listen(port, () => {
  console.log(`Kalima server running at http://localhost:${port}`);
});