import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";
import { EnrichmentService } from "../services/enrichment/enrichment-service.js";
import type { LLMClient } from "../services/llm-client.js";
import { SourceService } from "../services/source.js";

describe("EnrichmentService.enrichSessionCaptures", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/dev.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates Entry records for all captures in a session", async () => {
    const mockLLM: LLMClient = {
      complete: vi.fn().mockResolvedValue(
        JSON.stringify({
          definition: "A barbed spear used for hunting whales",
          translationArabic: "حَرْبَة",
          nuance: "Associated with maritime and whaling contexts",
          examples: [
            "The sailor hurled the harpoon at the great whale.",
            "Each harpoon was carefully crafted by the ship's blacksmith.",
          ],
          tags: ["maritime", "hunting", "weapon"],
          relatedEntries: ["whale", "ship"],
        }),
      ),
    } as unknown as LLMClient;

    const source = await SourceService.create(
      "Enrich Test Book",
      "book",
      prisma,
    );
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    await prisma.capture.create({
      data: {
        rawText: "harpoon p.15",
        item: "harpoon",
        locator: "p.15",
        sessionId: session.id,
      },
    });
    await prisma.capture.create({
      data: {
        rawText: "whale p.20",
        item: "whale",
        locator: "p.20",
        sessionId: session.id,
      },
    });

    await EnrichmentService.enrichSessionCaptures(session.id, prisma, mockLLM);

    const entries = await prisma.entry.findMany({
      where: { capture: { sessionId: session.id } },
      include: { capture: true },
    });

    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      expect(entry.status).toBe("pending_review");
      expect(entry.definition).toBeTruthy();
      expect(entry.translationArabic).toBeTruthy();
      expect(entry.nuance).toBeTruthy();
      expect(entry.examples).toBeTruthy();
      expect(entry.tags).toBeTruthy();
      expect(entry.relatedEntries).toBeTruthy();
    }

    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "Enrich Test Book" },
    });
  });

  it("includes source metadata and existing entries in enrichment context", async () => {
    const mockLLM: LLMClient = {
      complete: vi.fn().mockResolvedValue(
        JSON.stringify({
          definition: "A barbed spear used for hunting whales",
          translationArabic: "حَرْبَة",
          nuance: "Associated with maritime and whaling contexts",
          examples: ["Example 1"],
          tags: ["maritime"],
          relatedEntries: ["whale"],
        }),
      ),
    } as unknown as LLMClient;

    const source = await SourceService.create(
      "Enrich Context Book",
      "book",
      prisma,
    );
    const existingSession = await prisma.session.create({
      data: { sourceId: source.id },
    });
    const existingCapture = await prisma.capture.create({
      data: {
        rawText: "whale",
        item: "whale",
        sessionId: existingSession.id,
      },
    });
    await prisma.entry.create({
      data: {
        captureId: existingCapture.id,
        definition: "A large marine mammal",
        translationArabic: "حُوت",
        nuance: "Test",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
      },
    });

    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    await prisma.capture.create({
      data: {
        rawText: "harpoon p.15",
        item: "harpoon",
        locator: "p.15",
        sessionId: session.id,
      },
    });

    await EnrichmentService.enrichSessionCaptures(session.id, prisma, mockLLM);

    const promptArg = (mockLLM.complete as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(promptArg).toContain("harpoon");
    expect(promptArg).toContain("Enrich Context Book");
    expect(promptArg).toContain("book");
    expect(promptArg).toContain("p.15");
    expect(promptArg).toContain("whale");

    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "Enrich Context Book" },
    });
  });
});
