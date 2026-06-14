import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";
import { appRouter } from "../router.js";
import { EnrichmentPromptBuilder } from "../services/enrichment/enrichment-prompt-builder.js";
import type { LLMClient } from "../services/llm-client.js";
import { PromptTemplateService } from "../services/prompt-template.js";

const mockLLM = { complete: vi.fn() } as unknown as LLMClient;

describe("PromptTemplateService", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.appMeta.deleteMany({
      where: { key: "default_enrichment_prompt_template" },
    });
  });

  it("returns the builder default when no global default is stored", async () => {
    const result = await PromptTemplateService.getDefault(prisma);

    expect(result).toBe(EnrichmentPromptBuilder.DEFAULT_TEMPLATE);
  });

  it("stores and returns a custom global default", async () => {
    await PromptTemplateService.setDefault(
      "Custom global template {{item}}",
      prisma,
    );

    const result = await PromptTemplateService.getDefault(prisma);

    expect(result).toBe("Custom global template {{item}}");
  });

  it("updates an existing global default", async () => {
    await PromptTemplateService.setDefault("First version", prisma);
    await PromptTemplateService.setDefault("Second version", prisma);

    const result = await PromptTemplateService.getDefault(prisma);

    expect(result).toBe("Second version");
  });
});

describe("promptTemplate router", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.appMeta.deleteMany({
      where: { key: "default_enrichment_prompt_template" },
    });
  });

  it("getDefault returns the builder default when nothing is stored", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    const result = await caller.promptTemplate.getDefault();

    expect(result).toBe(EnrichmentPromptBuilder.DEFAULT_TEMPLATE);
  });

  it("setDefault persists a custom template", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    await caller.promptTemplate.setDefault({ template: "Router template" });
    const result = await caller.promptTemplate.getDefault();

    expect(result).toBe("Router template");
  });
});
