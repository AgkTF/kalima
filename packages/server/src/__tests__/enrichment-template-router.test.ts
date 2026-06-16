import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";
import { appRouter } from "../router.js";
import type { LLMClient } from "../services/llm-client.js";

describe("enrichment template router", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.appMeta.deleteMany();
  });

  const mockLLM: LLMClient = {
    complete: vi
      .fn()
      .mockResolvedValue(
        JSON.stringify({ item: "test", locator: null, sourceHint: null }),
      ),
  } as unknown as LLMClient;

  it("getGlobalTemplate returns null when no template is set", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    const result = await caller.enrichment.getGlobalTemplate();
    expect(result).toBeNull();
  });

  it("setGlobalTemplate stores a template and getGlobalTemplate retrieves it", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    const template = "Define {item} from {source} at {locator}.";

    await caller.enrichment.setGlobalTemplate({ template });
    const result = await caller.enrichment.getGlobalTemplate();

    expect(result).toBe(template);
  });

  it("setGlobalTemplate overwrites previous template", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    await caller.enrichment.setGlobalTemplate({ template: "First" });
    await caller.enrichment.setGlobalTemplate({ template: "Second" });

    const result = await caller.enrichment.getGlobalTemplate();
    expect(result).toBe("Second");
  });

  it("setGlobalTemplate validates input (rejects empty string)", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    await expect(
      caller.enrichment.setGlobalTemplate({ template: "" }),
    ).rejects.toThrow();
  });
});
