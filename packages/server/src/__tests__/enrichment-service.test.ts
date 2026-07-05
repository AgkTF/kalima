import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";
import { appRouter } from "../router.js";
import { AppService } from "../services/app.js";
import { FACTORY_DEFAULT_SYSTEM_PROMPT } from "../services/enrichment/enrichment-pipeline.js";
import { EnrichmentService } from "../services/enrichment/enrichment-service.js";
import type { LLMClient } from "../services/llm-client.js";
import { SourceService } from "../services/source.js";

describe("EnrichmentService.enrichSessionCaptures", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("updates placeholder entries for all captures in a session", async () => {
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
          confidence: "high",
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
        item: "harpoon",
        locator: "p.15",
        sessionId: session.id,
      },
    });
    await prisma.capture.create({
      data: {
        item: "whale",
        locator: "p.20",
        sessionId: session.id,
      },
    });

    // Create placeholder entries first (as the router would)
    await EnrichmentService.createPlaceholderEntries(session.id, prisma);

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
          confidence: "high",
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
        item: "harpoon",
        locator: "p.15",
        sessionId: session.id,
      },
    });

    // Create placeholder entries first
    await EnrichmentService.createPlaceholderEntries(session.id, prisma);

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

describe("EnrichmentService pending_review routing", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("sets pending_review status regardless of confidence level", async () => {
    const mockLLM: LLMClient = {
      complete: vi.fn().mockResolvedValue(
        JSON.stringify({
          definition: "A test definition",
          translationArabic: "اختبار",
          nuance: "Test nuance",
          examples: ["Example 1", "Example 2"],
          tags: ["test"],
          relatedEntries: [],
          confidence: "high",
        }),
      ),
    } as unknown as LLMClient;

    const source = await SourceService.create(
      "High Confidence Book",
      "book",
      prisma,
    );
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    const capture = await prisma.capture.create({
      data: {
        item: "confident-word",
        sessionId: session.id,
      },
    });

    await EnrichmentService.createPlaceholderEntries(session.id, prisma);
    await EnrichmentService.enrichSessionCaptures(session.id, prisma, mockLLM);

    const entry = await prisma.entry.findUnique({
      where: { captureId: capture.id },
    });
    expect(entry?.status).toBe("pending_review");
    expect(entry?.confidence).toBe("high");

    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "High Confidence Book" },
    });
  });

  it("sets pending_review status even when enrichment returns low confidence", async () => {
    const mockComplete = vi.fn().mockResolvedValueOnce(
      JSON.stringify({
        definition: "A test definition",
        translationArabic: "اختبار",
        nuance: "Test nuance",
        examples: ["Example 1", "Example 2"],
        tags: ["test"],
        relatedEntries: [],
        confidence: "low",
      }),
    );

    const mockLLM: LLMClient = {
      complete: mockComplete,
    } as unknown as LLMClient;

    const source = await SourceService.create(
      "Low Confidence Book",
      "book",
      prisma,
    );
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    const capture = await prisma.capture.create({
      data: {
        item: "obscure-word",
        sessionId: session.id,
      },
    });

    await EnrichmentService.createPlaceholderEntries(session.id, prisma);
    await EnrichmentService.enrichSessionCaptures(session.id, prisma, mockLLM);

    const entry = await prisma.entry.findUnique({
      where: { captureId: capture.id },
    });
    expect(entry?.status).toBe("pending_review");
    expect(entry?.confidence).toBe("low");

    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "Low Confidence Book" },
    });
  });

  it("writes all captures as pending_review regardless of confidence mix", async () => {
    // Mock that returns high for first call, low for second
    const mockComplete = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({
          definition: "Confident",
          translationArabic: "واثق",
          nuance: "Clear",
          examples: ["Example"],
          tags: ["test"],
          relatedEntries: [],
          confidence: "high",
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          definition: "Unsure",
          translationArabic: "غير متأكد",
          nuance: "Ambiguous",
          examples: ["Example"],
          tags: ["test"],
          relatedEntries: [],
          confidence: "low",
        }),
      );

    const mockLLM: LLMClient = {
      complete: mockComplete,
    } as unknown as LLMClient;

    const source = await SourceService.create(
      "Mixed Confidence Book",
      "book",
      prisma,
    );
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });

    const c1 = await prisma.capture.create({
      data: {
        item: "clear",
        sessionId: session.id,
      },
    });
    const c2 = await prisma.capture.create({
      data: {
        item: "fuzzy",
        sessionId: session.id,
      },
    });

    await EnrichmentService.createPlaceholderEntries(session.id, prisma);
    await EnrichmentService.enrichSessionCaptures(session.id, prisma, mockLLM);

    const entry1 = await prisma.entry.findUnique({
      where: { captureId: c1.id },
    });
    const entry2 = await prisma.entry.findUnique({
      where: { captureId: c2.id },
    });

    expect(entry1?.status).toBe("pending_review");
    expect(entry1?.confidence).toBe("high");
    expect(entry2?.status).toBe("pending_review");
    expect(entry2?.confidence).toBe("low");

    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "Mixed Confidence Book" },
    });
  });
});

describe("enrichment tRPC endpoints", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const mockLLM: LLMClient = {
    complete: vi
      .fn()
      .mockResolvedValue(
        JSON.stringify({ item: "test", locator: null, sourceHint: null }),
      ),
  } as unknown as LLMClient;

  it("listPending returns entries with status pending_review", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    const source = await SourceService.create(
      "List Pending Book",
      "book",
      prisma,
    );
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    const capture = await prisma.capture.create({
      data: {
        item: "test",
        sessionId: session.id,
      },
    });
    await prisma.entry.create({
      data: {
        captureId: capture.id,
        definition: "A test",
        translationArabic: "اختبار",
        nuance: "Test",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
      },
    });

    const entries = await caller.enrichment.listPending();
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].status).toBe("pending_review");
    expect(entries[0].capture.item).toBe("test");

    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "List Pending Book" },
    });
  });

  it("listBySession returns entries for a specific session", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    const source = await SourceService.create(
      "Session Filter Book",
      "book",
      prisma,
    );
    const sessionA = await prisma.session.create({
      data: { sourceId: source.id },
    });
    const sessionB = await prisma.session.create({
      data: { sourceId: source.id },
    });

    const captureA = await prisma.capture.create({
      data: {
        item: "wordA",
        sessionId: sessionA.id,
      },
    });
    const captureB = await prisma.capture.create({
      data: {
        item: "wordB",
        sessionId: sessionB.id,
      },
    });

    await prisma.entry.create({
      data: {
        captureId: captureA.id,
        definition: "Word A definition",
        translationArabic: "أ",
        nuance: "Test A",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
      },
    });
    await prisma.entry.create({
      data: {
        captureId: captureB.id,
        definition: "Word B definition",
        translationArabic: "ب",
        nuance: "Test B",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
      },
    });

    const entriesA = await caller.enrichment.listBySession({
      sessionId: sessionA.id,
    });
    expect(entriesA).toHaveLength(1);
    expect(entriesA[0].capture.item).toBe("wordA");

    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "Session Filter Book" },
    });
  });
});

describe("EnrichmentService uses stored base system prompt", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const enrichmentJson = JSON.stringify({
    definition: "A test definition",
    translationArabic: "اختبار",
    nuance: "Test nuance",
    examples: ["Example 1", "Example 2"],
    tags: ["test"],
    relatedEntries: [],
    confidence: "high",
  });

  it("enrichSessionCaptures passes the stored system prompt to the LLM", async () => {
    const mockComplete = vi.fn().mockResolvedValue(enrichmentJson);
    const mockLLM: LLMClient = {
      complete: mockComplete,
    } as unknown as LLMClient;

    const customPrompt = "You are a specialized technical terms agent.";
    await AppService.setBaseSystemPrompt(prisma, customPrompt);

    const source = await SourceService.create(
      "Stored Prompt Session Book",
      "book",
      prisma,
    );
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    await prisma.capture.create({
      data: {
        item: "harpoon",
        sessionId: session.id,
      },
    });

    await EnrichmentService.createPlaceholderEntries(session.id, prisma);
    await EnrichmentService.enrichSessionCaptures(session.id, prisma, mockLLM);

    const options = mockComplete.mock.calls[0][1];
    expect(options.systemPrompt).toBe(customPrompt);

    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "Stored Prompt Session Book" },
    });
    await AppService.resetBaseSystemPrompt(prisma);
  });

  it("enrichSessionCaptures falls back to factory default when no override is set", async () => {
    const mockComplete = vi.fn().mockResolvedValue(enrichmentJson);
    const mockLLM: LLMClient = {
      complete: mockComplete,
    } as unknown as LLMClient;

    await AppService.resetBaseSystemPrompt(prisma);

    const source = await SourceService.create(
      "Factory Default Session Book",
      "book",
      prisma,
    );
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    await prisma.capture.create({
      data: {
        item: "harpoon",
        sessionId: session.id,
      },
    });

    await EnrichmentService.createPlaceholderEntries(session.id, prisma);
    await EnrichmentService.enrichSessionCaptures(session.id, prisma, mockLLM);

    const options = mockComplete.mock.calls[0][1];
    expect(options.systemPrompt).toBe(FACTORY_DEFAULT_SYSTEM_PROMPT);

    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "Factory Default Session Book" },
    });
  });

  it("enrichCapture passes the stored system prompt to the LLM", async () => {
    const mockComplete = vi.fn().mockResolvedValue(enrichmentJson);
    const mockLLM: LLMClient = {
      complete: mockComplete,
    } as unknown as LLMClient;

    const customPrompt = "You are a specialized agent for one-off captures.";
    await AppService.setBaseSystemPrompt(prisma, customPrompt);

    const capture = await prisma.capture.create({
      data: { item: "ephemeral" },
    });
    await prisma.entry.create({
      data: {
        captureId: capture.id,
        status: "processing",
        definition: "",
        translationArabic: "",
        nuance: "",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
      },
    });

    await EnrichmentService.enrichCapture(capture.id, prisma, mockLLM);

    const options = mockComplete.mock.calls[0][1];
    expect(options.systemPrompt).toBe(customPrompt);

    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await AppService.resetBaseSystemPrompt(prisma);
  });
});

describe("EnrichmentService appends source enrichmentContext to system prompt", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const enrichmentJson = JSON.stringify({
    definition: "A test definition",
    translationArabic: "اختبار",
    nuance: "Test nuance",
    examples: ["Example 1", "Example 2"],
    tags: ["test"],
    relatedEntries: [],
    confidence: "high",
  });

  it("appends enrichment context to the system prompt with 'Additional context:' label", async () => {
    const mockComplete = vi.fn().mockResolvedValue(enrichmentJson);
    const mockLLM: LLMClient = {
      complete: mockComplete,
    } as unknown as LLMClient;

    await AppService.resetBaseSystemPrompt(prisma);

    const source = await SourceService.create(
      "Enrichment Context Append Book",
      "book",
      prisma,
      "Focus on technical terminology. Formal register.",
    );
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    await prisma.capture.create({
      data: {
        item: "harpoon",
        sessionId: session.id,
      },
    });

    await EnrichmentService.createPlaceholderEntries(session.id, prisma);
    await EnrichmentService.enrichSessionCaptures(session.id, prisma, mockLLM);

    const systemPrompt = mockComplete.mock.calls[0][1].systemPrompt as string;
    expect(systemPrompt).toContain(FACTORY_DEFAULT_SYSTEM_PROMPT);
    expect(systemPrompt).toContain("Additional context:");
    expect(systemPrompt).toContain(
      "Focus on technical terminology. Formal register.",
    );
    // Context appears after the base prompt
    expect(systemPrompt.indexOf(FACTORY_DEFAULT_SYSTEM_PROMPT)).toBeLessThan(
      systemPrompt.indexOf("Additional context:"),
    );

    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "Enrichment Context Append Book" },
    });
  });

  it("uses base system prompt only when source has no enrichment context", async () => {
    const mockComplete = vi.fn().mockResolvedValue(enrichmentJson);
    const mockLLM: LLMClient = {
      complete: mockComplete,
    } as unknown as LLMClient;

    await AppService.resetBaseSystemPrompt(prisma);

    const source = await SourceService.create(
      "No Enrichment Context Book",
      "book",
      prisma,
      null,
    );
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    await prisma.capture.create({
      data: {
        item: "harpoon",
        sessionId: session.id,
      },
    });

    await EnrichmentService.createPlaceholderEntries(session.id, prisma);
    await EnrichmentService.enrichSessionCaptures(session.id, prisma, mockLLM);

    const systemPrompt = mockComplete.mock.calls[0][1].systemPrompt as string;
    expect(systemPrompt).toBe(FACTORY_DEFAULT_SYSTEM_PROMPT);
    expect(systemPrompt).not.toContain("Additional context:");

    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "No Enrichment Context Book" },
    });
  });

  it("one-off captures (no source) get base system prompt only", async () => {
    const mockComplete = vi.fn().mockResolvedValue(enrichmentJson);
    const mockLLM: LLMClient = {
      complete: mockComplete,
    } as unknown as LLMClient;

    await AppService.resetBaseSystemPrompt(prisma);

    const capture = await prisma.capture.create({
      data: { item: "ephemeral" },
    });
    await prisma.entry.create({
      data: {
        captureId: capture.id,
        status: "processing",
        definition: "",
        translationArabic: "",
        nuance: "",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
      },
    });

    await EnrichmentService.enrichCapture(capture.id, prisma, mockLLM);

    const systemPrompt = mockComplete.mock.calls[0][1].systemPrompt as string;
    expect(systemPrompt).toBe(FACTORY_DEFAULT_SYSTEM_PROMPT);
    expect(systemPrompt).not.toContain("Additional context:");

    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
  });
});

describe("EnrichmentService mid-session edit applies to future enrichments", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const enrichmentJson = JSON.stringify({
    definition: "A test definition",
    translationArabic: "اختبار",
    nuance: "Test nuance",
    examples: ["Example 1", "Example 2"],
    tags: ["test"],
    relatedEntries: [],
    confidence: "high",
  });

  it("uses the updated enrichmentContext for the next enrichment after a mid-session edit", async () => {
    const mockComplete = vi.fn().mockResolvedValue(enrichmentJson);
    const mockLLM: LLMClient = {
      complete: mockComplete,
    } as unknown as LLMClient;

    await AppService.resetBaseSystemPrompt(prisma);

    const source = await SourceService.create(
      "Future Enrichment Book",
      "book",
      prisma,
      "Original context.",
    );
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    await prisma.capture.create({
      data: {
        item: "harpoon",
        sessionId: session.id,
      },
    });

    // First enrichment uses the original context
    await EnrichmentService.createPlaceholderEntries(session.id, prisma);
    await EnrichmentService.enrichSessionCaptures(session.id, prisma, mockLLM);
    const firstSystemPrompt = mockComplete.mock.calls[0][1]
      .systemPrompt as string;
    expect(firstSystemPrompt).toContain("Original context.");

    // Mid-session edit: update the source's enrichmentContext
    await SourceService.updateEnrichmentContext(
      source.id,
      "Edited context for future enrichments.",
      prisma,
    );

    // Add a second capture and enrich — should use the NEW context
    await prisma.capture.create({
      data: {
        item: "whale",
        sessionId: session.id,
      },
    });
    await EnrichmentService.createPlaceholderEntries(session.id, prisma);
    await EnrichmentService.enrichSessionCaptures(session.id, prisma, mockLLM);

    // The latest enrichment call should use the edited context
    const lastSystemPrompt = mockComplete.mock.calls[
      mockComplete.mock.calls.length - 1
    ][1].systemPrompt as string;
    expect(lastSystemPrompt).toContain(
      "Edited context for future enrichments.",
    );
    expect(lastSystemPrompt).not.toContain("Original context.");

    // Already-completed enrichments are not retroactively re-run: the first
    // entry's data is unchanged (no automatic re-enrichment was triggered).
    const entries = await prisma.entry.findMany({
      where: { capture: { sessionId: session.id } },
      include: { capture: true },
    });
    expect(entries).toHaveLength(2);
    // Both have pending_review status — the edit did not reset or re-run them
    for (const entry of entries) {
      expect(entry.status).toBe("pending_review");
    }

    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "Future Enrichment Book" },
    });
  });
});

describe("EnrichmentService.enrichOneOffs", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 0 and creates no entries when there are no pending one-off captures", async () => {
    const mockLLM: LLMClient = {
      complete: vi.fn(),
    } as unknown as LLMClient;

    const result = await EnrichmentService.enrichOneOffs(prisma, mockLLM);

    expect(result).toEqual({ queuedCount: 0 });

    const entries = await prisma.entry.findMany({
      where: { capture: { sessionId: null } },
    });
    expect(entries).toHaveLength(0);
  });

  it("creates processing placeholders and returns the count; with a mock LLM, entries reach pending_review", async () => {
    const mockLLM: LLMClient = {
      complete: vi.fn().mockResolvedValue(
        JSON.stringify({
          definition: "A test definition",
          translationArabic: "اختبار",
          nuance: "Test nuance",
          examples: ["Example 1"],
          tags: ["test"],
          relatedEntries: [],
          confidence: "high",
        }),
      ),
    } as unknown as LLMClient;

    const capture = await prisma.capture.create({
      data: { item: "ephemeral", sourceHint: "in a conversation" },
    });

    const result = await EnrichmentService.enrichOneOffs(prisma, mockLLM);

    expect(result).toEqual({ queuedCount: 1 });

    // Phase 1 creates a processing placeholder immediately.
    const entry = await prisma.entry.findUnique({
      where: { captureId: capture.id },
    });
    expect(entry).not.toBeNull();
    expect(entry?.status).toBe("processing");

    // Phase 2 (fire-and-forget) flips the entry to pending_review once enrichment
    // completes. With a mock LLM that resolves immediately, this happens quickly.
    await vi.waitFor(async () => {
      const updated = await prisma.entry.findUnique({
        where: { captureId: capture.id },
      });
      expect(updated?.status).toBe("pending_review");
      expect(updated?.definition).toBeTruthy();
      expect(updated?.translationArabic).toBeTruthy();
    });

    await prisma.entry.deleteMany();
    await prisma.capture.delete({ where: { id: capture.id } });
  });

  it("skips one-offs that already have an entry (no duplicates)", async () => {
    const mockLLM: LLMClient = {
      complete: vi.fn().mockResolvedValue(
        JSON.stringify({
          definition: "A test definition",
          translationArabic: "اختبار",
          nuance: "Test nuance",
          examples: ["Example 1"],
          tags: ["test"],
          relatedEntries: [],
          confidence: "high",
        }),
      ),
    } as unknown as LLMClient;

    // A one-off that already has an entry (e.g. enriched before)
    const doneCapture = await prisma.capture.create({
      data: { item: "done-word" },
    });
    await prisma.entry.create({
      data: {
        captureId: doneCapture.id,
        status: "pending_review",
        definition: "already enriched",
        translationArabic: "تم",
        nuance: "",
        examples: "[]",
        tags: "[]",
        relatedEntries: "[]",
      },
    });
    // A pending one-off with no entry
    const pendingCapture = await prisma.capture.create({
      data: { item: "pending-word" },
    });

    const result = await EnrichmentService.enrichOneOffs(prisma, mockLLM);

    // Only the pending one-off is queued
    expect(result).toEqual({ queuedCount: 1 });

    // The already-enriched capture keeps its single entry unchanged
    const doneEntry = await prisma.entry.findUnique({
      where: { captureId: doneCapture.id },
    });
    expect(doneEntry?.definition).toBe("already enriched");
    expect(doneEntry?.status).toBe("pending_review");

    // Phase 2 (fire-and-forget) enriches only the pending capture.
    await vi.waitFor(() => {
      expect(mockLLM.complete).toHaveBeenCalledTimes(1);
    });
    expect(
      (mockLLM.complete as ReturnType<typeof vi.fn>).mock.calls[0][0] as string,
    ).toContain("pending-word");

    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany({
      where: { id: { in: [doneCapture.id, pendingCapture.id] } },
    });
  });

  it("leaves session captures untouched", async () => {
    const mockLLM: LLMClient = {
      complete: vi.fn(),
    } as unknown as LLMClient;

    const source = await SourceService.create(
      "OneOffs Session Skip Book",
      "book",
      prisma,
    );
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    // A session capture with no entry — should NOT be picked up by enrichOneOffs
    const sessionCapture = await prisma.capture.create({
      data: { item: "session-word", sessionId: session.id },
    });

    const result = await EnrichmentService.enrichOneOffs(prisma, mockLLM);

    expect(result).toEqual({ queuedCount: 0 });
    expect(mockLLM.complete).not.toHaveBeenCalled();

    // No entry created for the session capture
    const entry = await prisma.entry.findUnique({
      where: { captureId: sessionCapture.id },
    });
    expect(entry).toBeNull();

    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "OneOffs Session Skip Book" },
    });
  });

  it("enriches pending one-offs oldest-first (FIFO)", async () => {
    // Use distinct mock responses per call so we can observe order.
    const mockComplete = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({
          definition: "first-word-def",
          translationArabic: "أول",
          nuance: "",
          examples: [],
          tags: [],
          relatedEntries: [],
          confidence: "high",
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          definition: "second-word-def",
          translationArabic: "ثاني",
          nuance: "",
          examples: [],
          tags: [],
          relatedEntries: [],
          confidence: "high",
        }),
      );
    const mockLLM: LLMClient = {
      complete: mockComplete,
    } as unknown as LLMClient;

    // Create the oldest one-off first, the newer one second.
    // SQLite defaults createdAt to now(), so we set explicit timestamps to
    // guarantee ordering regardless of insert speed.
    const olderCapture = await prisma.capture.create({
      data: {
        item: "first-word",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
    });
    const newerCapture = await prisma.capture.create({
      data: {
        item: "second-word",
        createdAt: new Date("2026-01-02T00:00:00Z"),
      },
    });

    await EnrichmentService.enrichOneOffs(prisma, mockLLM);

    // The first LLM call should be for the oldest capture (first-word)
    await vi.waitFor(() => {
      expect(mockComplete.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
    const firstPrompt = mockComplete.mock.calls[0][0] as string;
    expect(firstPrompt).toContain("first-word");

    await vi.waitFor(async () => {
      const olderEntry = await prisma.entry.findUnique({
        where: { captureId: olderCapture.id },
      });
      const newerEntry = await prisma.entry.findUnique({
        where: { captureId: newerCapture.id },
      });
      expect(olderEntry?.definition).toBe("first-word-def");
      expect(newerEntry?.definition).toBe("second-word-def");
    });

    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany({
      where: { id: { in: [olderCapture.id, newerCapture.id] } },
    });
  });
});
