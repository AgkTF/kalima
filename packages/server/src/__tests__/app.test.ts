import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router.js";
import type { LLMClient } from "../services/llm-client.js";

const mockLLM = { complete: vi.fn() } as unknown as LLMClient;
const mockPrisma = {} as any;

describe("app.status query", () => {
  it("returns the app name and status", async () => {
    const caller = appRouter.createCaller({ prisma: mockPrisma, llm: mockLLM });
    const result = await caller.app.status();

    expect(result).toEqual({ name: "Kalima", status: "ok" });
  });
});