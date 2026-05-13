import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";
import { appRouter } from "../router.js";
import type { LLMClient } from "../services/llm-client.js";

describe("session.open mutation", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/dev.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const mockLLM: LLMClient = {
    complete: vi.fn().mockResolvedValue(
      JSON.stringify({
        item: "serendipity",
        locator: null,
        sourceHint: null,
      }),
    ),
  } as unknown as LLMClient;

  it("creates a session with source name and type, leaves it open (closedAt null)", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    const result = await caller.session.open({
      sourceName: "Moby Dick",
      type: "book",
    });

    expect(result).toMatchObject({
      sourceName: "Moby Dick",
      type: "book",
      closedAt: null,
    });

    // Verify persisted
    const found = await prisma.session.findUnique({
      where: { id: result.id },
    });
    expect(found).toMatchObject({
      sourceName: "Moby Dick",
      type: "book",
      closedAt: null,
    });

    // Cleanup
    await prisma.session.delete({ where: { id: result.id } });
  });
});
