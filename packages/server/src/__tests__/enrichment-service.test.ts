import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";
import { appRouter } from "../router.js";
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
        rawText: "confident-word",
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
        rawText: "obscure-word",
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
        rawText: "clear",
        item: "clear",
        sessionId: session.id,
      },
    });
    const c2 = await prisma.capture.create({
      data: {
        rawText: "fuzzy",
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
        rawText: "test",
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
        rawText: "wordA",
        item: "wordA",
        sessionId: sessionA.id,
      },
    });
    const captureB = await prisma.capture.create({
      data: {
        rawText: "wordB",
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

describe("template tRPC endpoints", () => {
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

  async function closeAnyActiveSession() {
    const active = await prisma.session.findFirst({
      where: { closedAt: null },
    });
    if (active) {
      await prisma.session.update({
        where: { id: active.id },
        data: { closedAt: new Date() },
      });
    }
  }

  it("setEnrichmentTemplate stores the global default template in AppMeta", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    await closeAnyActiveSession();

    await caller.app.setEnrichmentTemplate({
      template: "Enrich {{item}} from {{sourceName}}",
    });

    const row = await prisma.appMeta.findUnique({
      where: { key: "enrichment_prompt_template" },
    });
    expect(row?.value).toBe("Enrich {{item}} from {{sourceName}}");

    // Cleanup
    await prisma.appMeta.deleteMany({
      where: { key: "enrichment_prompt_template" },
    });
  });

  it("getEnrichmentTemplate returns the stored global default template", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    await closeAnyActiveSession();

    // First set the template
    await caller.app.setEnrichmentTemplate({ template: "Custom: {{item}}" });

    const result = await caller.app.getEnrichmentTemplate();
    expect(result.template).toBe("Custom: {{item}}");

    // Cleanup
    await prisma.appMeta.deleteMany({
      where: { key: "enrichment_prompt_template" },
    });
  });

  it("getEnrichmentTemplate returns null when no template is configured", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    await closeAnyActiveSession();

    // Ensure no template exists
    await prisma.appMeta.deleteMany({
      where: { key: "enrichment_prompt_template" },
    });

    const result = await caller.app.getEnrichmentTemplate();
    expect(result.template).toBeNull();
  });

  it("session.open stores the per-session enrichmentTemplate", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    await closeAnyActiveSession();

    await caller.session.open({
      name: "Template Source",
      type: "book",
      enrichmentTemplate: "Per-session: {{item}}",
    });

    const session = await prisma.session.findFirst({
      where: { source: { name: "Template Source" } },
    });
    expect(session?.enrichmentTemplate).toBe("Per-session: {{item}}");

    // Cleanup
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "Template Source" },
    });
  });

  it("session.open without enrichmentTemplate leaves it null", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    await closeAnyActiveSession();

    await caller.session.open({
      name: "No Template Source",
      type: "book",
    });

    const session = await prisma.session.findFirst({
      where: { source: { name: "No Template Source" } },
    });
    expect(session?.enrichmentTemplate).toBeNull();

    // Cleanup
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "No Template Source" },
    });
  });

  it("changing global default does not affect sessions with existing overrides", async () => {
    const caller = appRouter.createCaller({ prisma, llm: mockLLM });

    await closeAnyActiveSession();

    // Create a session with a specific override
    await caller.session.open({
      name: "Override Source",
      type: "book",
      enrichmentTemplate: "Original override: {{item}}",
    });

    const session = await prisma.session.findFirst({
      where: { source: { name: "Override Source" } },
    });

    // Now change the global default
    await caller.app.setEnrichmentTemplate({
      template: "New global: {{item}}",
    });

    // The session should still have its original override
    expect(session?.enrichmentTemplate).toBe("Original override: {{item}}");

    // Cleanup
    await prisma.appMeta.deleteMany({
      where: { key: "enrichment_prompt_template" },
    });
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "Override Source" },
    });
  });
});

describe("EnrichmentService template resolution", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("uses session enrichmentTemplate when present", async () => {
    const mockComplete = vi.fn().mockResolvedValue(
      JSON.stringify({
        definition: "Test definition",
        translationArabic: "اختبار",
        nuance: "Test nuance",
        examples: ["Example 1"],
        tags: ["test"],
        relatedEntries: [],
        confidence: "high",
      }),
    );

    const mockLLM: LLMClient = {
      complete: mockComplete,
    } as unknown as LLMClient;

    const source = await SourceService.create(
      "Template Session Book",
      "book",
      prisma,
    );
    const session = await prisma.session.create({
      data: {
        sourceId: source.id,
        enrichmentTemplate: "Custom prompt for {{item}} from {{sourceName}}",
      },
    });
    await prisma.capture.create({
      data: {
        rawText: "testword",
        item: "testword",
        sessionId: session.id,
      },
    });

    await EnrichmentService.createPlaceholderEntries(session.id, prisma);
    await EnrichmentService.enrichSessionCaptures(session.id, prisma, mockLLM);

    const promptArg = mockComplete.mock.calls[0][0] as string;
    expect(promptArg).toContain("Custom prompt for testword from Template Session Book");

    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "Template Session Book" },
    });
  });

  it("falls back to global default from AppMeta when session has no template", async () => {
    const mockComplete = vi.fn().mockResolvedValue(
      JSON.stringify({
        definition: "Test definition",
        translationArabic: "اختبار",
        nuance: "Test nuance",
        examples: ["Example 1"],
        tags: ["test"],
        relatedEntries: [],
        confidence: "high",
      }),
    );

    const mockLLM: LLMClient = {
      complete: mockComplete,
    } as unknown as LLMClient;

    // Set global default template
    await prisma.appMeta.upsert({
      where: { key: "enrichment_prompt_template" },
      create: {
        key: "enrichment_prompt_template",
        value: "Global: {{item}} from {{sourceName}}",
      },
      update: { value: "Global: {{item}} from {{sourceName}}" },
    });

    const source = await SourceService.create(
      "Global Default Book",
      "book",
      prisma,
    );
    // Session without enrichmentTemplate
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    await prisma.capture.create({
      data: {
        rawText: "globword",
        item: "globword",
        sessionId: session.id,
      },
    });

    await EnrichmentService.createPlaceholderEntries(session.id, prisma);
    await EnrichmentService.enrichSessionCaptures(session.id, prisma, mockLLM);

    const promptArg = mockComplete.mock.calls[0][0] as string;
    expect(promptArg).toContain("Global: globword from Global Default Book");

    // Cleanup
    await prisma.appMeta.deleteMany({ where: { key: "enrichment_prompt_template" } });
    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "Global Default Book" },
    });
  });

  it("falls back to legacy hardcoded prompt when neither session nor global template exist", async () => {
    const mockComplete = vi.fn().mockResolvedValue(
      JSON.stringify({
        definition: "Test definition",
        translationArabic: "اختبار",
        nuance: "Test nuance",
        examples: ["Example 1"],
        tags: ["test"],
        relatedEntries: [],
        confidence: "high",
      }),
    );

    const mockLLM: LLMClient = {
      complete: mockComplete,
    } as unknown as LLMClient;

    // Ensure no global template exists
    await prisma.appMeta.deleteMany({ where: { key: "enrichment_prompt_template" } });

    const source = await SourceService.create(
      "No Template Book",
      "book",
      prisma,
    );
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    await prisma.capture.create({
      data: {
        rawText: "word",
        item: "word",
        sessionId: session.id,
      },
    });

    await EnrichmentService.createPlaceholderEntries(session.id, prisma);
    await EnrichmentService.enrichSessionCaptures(session.id, prisma, mockLLM);

    const promptArg = mockComplete.mock.calls[0][0] as string;
    expect(promptArg).toContain('Enrich the following item: "word"');

    // Cleanup
    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany({
      where: { name: "No Template Book" },
    });
  });
});
