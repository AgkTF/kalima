import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";
import { appRouter } from "../router.js";
import { AppService } from "../services/app.js";
import { FACTORY_DEFAULT_SYSTEM_PROMPT } from "../services/enrichment/enrichment-pipeline.js";
import type { LLMClient } from "../services/llm-client.js";

const adapter = new PrismaBetterSqlite3({
  url: "file:./prisma/test.db",
});
const prisma = new PrismaClient({ adapter });

afterAll(async () => {
  await prisma.$disconnect();
});

const mockLLM = { complete: vi.fn() } as unknown as LLMClient;

describe("app.status query", () => {
  it("returns the app name and status", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });
    const result = await caller.app.status();

    expect(result).toEqual({ name: "Kalima", status: "ok" });
  });
});

describe("AppService base system prompt", () => {
  const APPMETA_KEY = "enrichment.baseSystemPrompt";

  async function cleanup() {
    await prisma.appMeta.deleteMany({
      where: { key: APPMETA_KEY },
    });
  }

  it("returns factory default when no override is set", async () => {
    await cleanup();

    const result = await AppService.getBaseSystemPrompt(prisma);

    expect(result).toBe(FACTORY_DEFAULT_SYSTEM_PROMPT);
  });

  it("stores and retrieves a custom system prompt", async () => {
    await cleanup();

    const customPrompt = "You are a specialized technical terms agent.";
    await AppService.setBaseSystemPrompt(prisma, customPrompt);

    const result = await AppService.getBaseSystemPrompt(prisma);
    expect(result).toBe(customPrompt);

    await cleanup();
  });

  it("overwrites the stored prompt when set again", async () => {
    await cleanup();

    await AppService.setBaseSystemPrompt(prisma, "First prompt");
    await AppService.setBaseSystemPrompt(prisma, "Second prompt");

    const result = await AppService.getBaseSystemPrompt(prisma);
    expect(result).toBe("Second prompt");

    await cleanup();
  });

  it("reset restores factory default", async () => {
    await cleanup();

    await AppService.setBaseSystemPrompt(
      prisma,
      "Custom that should be cleared",
    );
    await AppService.resetBaseSystemPrompt(prisma);

    const result = await AppService.getBaseSystemPrompt(prisma);
    expect(result).toBe(FACTORY_DEFAULT_SYSTEM_PROMPT);

    await cleanup();
  });
});

describe("app base system prompt tRPC routes", () => {
  it("getBaseSystemPrompt returns current and factoryDefault when no override is set", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    await AppService.resetBaseSystemPrompt(prisma);

    const result = await caller.app.getBaseSystemPrompt();
    expect(result.current).toBe(FACTORY_DEFAULT_SYSTEM_PROMPT);
    expect(result.factoryDefault).toBe(FACTORY_DEFAULT_SYSTEM_PROMPT);
  });

  it("setBaseSystemPrompt stores and getBaseSystemPrompt returns the stored value as current", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    const customPrompt = "Custom prompt via tRPC route.";
    await caller.app.setBaseSystemPrompt({ value: customPrompt });

    const result = await caller.app.getBaseSystemPrompt();
    expect(result.current).toBe(customPrompt);
    expect(result.factoryDefault).toBe(FACTORY_DEFAULT_SYSTEM_PROMPT);

    await AppService.resetBaseSystemPrompt(prisma);
  });

  it("resetBaseSystemPrompt clears the override and current falls back to factory default", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    await caller.app.setBaseSystemPrompt({ value: "Temporary custom prompt" });
    await caller.app.resetBaseSystemPrompt();

    const result = await caller.app.getBaseSystemPrompt();
    expect(result.current).toBe(FACTORY_DEFAULT_SYSTEM_PROMPT);
    expect(result.factoryDefault).toBe(FACTORY_DEFAULT_SYSTEM_PROMPT);
  });
});
