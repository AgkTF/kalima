import { describe, expect, it, vi } from "vitest";
import {
  buildEnrichmentSystemPrompt,
  EnrichmentPipeline,
  type EnrichmentResult,
  FACTORY_DEFAULT_SYSTEM_PROMPT,
} from "../services/enrichment/enrichment-pipeline.js";
import type { LLMClient } from "../services/llm-client.js";

function enrichmentResponse(overrides: Partial<EnrichmentResult> = {}): string {
  return JSON.stringify({
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
    ...overrides,
  });
}

describe("buildEnrichmentSystemPrompt", () => {
  it("appends enrichment context with 'Additional context:' label when present", () => {
    const base = "You are a word bank enrichment agent.";
    const context = "Focus on technical terminology. Formal register.";

    const result = buildEnrichmentSystemPrompt(base, context);

    expect(result).toContain(base);
    expect(result).toContain("Additional context:");
    expect(result).toContain(context);
    // The context must come after the base prompt
    expect(result.indexOf(base)).toBeLessThan(
      result.indexOf("Additional context:"),
    );
  });

  it("returns the base prompt unchanged when enrichment context is null", () => {
    const base = "You are a word bank enrichment agent.";

    const result = buildEnrichmentSystemPrompt(base, null);

    expect(result).toBe(base);
    expect(result).not.toContain("Additional context:");
  });

  it("returns the base prompt unchanged when enrichment context is empty string", () => {
    const base = "You are a word bank enrichment agent.";

    const result = buildEnrichmentSystemPrompt(base, "");

    expect(result).toBe(base);
    expect(result).not.toContain("Additional context:");
  });
});

describe("EnrichmentPipeline", () => {
  it("uses EnrichmentPromptBuilder to construct the prompt sent to the LLM", async () => {
    // Mock LLMClient
    const mockComplete = vi.fn().mockResolvedValue(enrichmentResponse());

    const mockLLM: LLMClient = {
      complete: mockComplete,
    } as unknown as LLMClient;

    const pipeline = new EnrichmentPipeline(mockLLM);

    await pipeline.enrich({
      capture: {
        item: "harpoon",
        locator: "chapter 3, page 15",
        rawText: "harpoon p.15",
      },
      source: { name: "Moby Dick", type: "book" },
      existingEntries: ["whale", "ship", "ocean"],
    });

    // Assert the prompt passed to the LLM includes all expected context
    const promptArg = mockComplete.mock.calls[0][0] as string;
    expect(promptArg).toContain("harpoon");
    expect(promptArg).toContain("Moby Dick");
    expect(promptArg).toContain("book");
    expect(promptArg).toContain("chapter 3, page 15");
    expect(promptArg).toContain("whale");
    expect(promptArg).toContain("ship");
    expect(promptArg).toContain("ocean");
  });

  it("produces all 6 enrichment fields from the LLM response", async () => {
    const mockLLM: LLMClient = {
      complete: vi.fn().mockResolvedValue(
        JSON.stringify({
          definition: "To regard with great respect",
          translationArabic: "يُبَجِّل",
          nuance: "Stronger than 'admire'; implies deep reverence",
          examples: [
            "She revered her grandmother for her wisdom.",
            "The ancient texts were revered by scholars worldwide.",
          ],
          tags: ["formal", "positive"],
          relatedEntries: ["admire", "respect"],
          confidence: "high",
        }),
      ),
    } as unknown as LLMClient;

    const pipeline = new EnrichmentPipeline(mockLLM);

    const result = await pipeline.enrich({
      capture: {
        item: "revere",
        locator: null,
        rawText: "revere",
      },
      source: null,
      existingEntries: ["admire", "respect"],
    });

    expect(result.definition).toBe("To regard with great respect");
    expect(result.translationArabic).toBe("يُبَجِّل");
    expect(result.nuance).toContain("Stronger");
    expect(result.examples).toHaveLength(2);
    expect(result.tags).toEqual(["formal", "positive"]);
    // Confidence is present in all results
    expect(result.confidence).toBe("high");
  });

  it("excludes etymology from enrichment output", async () => {
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
          etymology: "From Latin testum",
        }),
      ),
    } as unknown as LLMClient;

    const pipeline = new EnrichmentPipeline(mockLLM);

    const result = await pipeline.enrich({
      capture: {
        item: "test",
        locator: null,
        rawText: "test",
      },
      source: null,
      existingEntries: [],
    });

    expect(result).not.toHaveProperty("etymology");
  });

  it("returns low confidence when the LLM is uncertain", async () => {
    const mockLLM: LLMClient = {
      complete: vi.fn().mockResolvedValue(
        enrichmentResponse({
          confidence: "low",
          nuance: "Meaning unclear from context",
        }),
      ),
    } as unknown as LLMClient;

    const pipeline = new EnrichmentPipeline(mockLLM);

    const result = await pipeline.enrich({
      capture: { item: "obscure", locator: null, rawText: "obscure" },
      source: null,
      existingEntries: [],
    });

    expect(result.confidence).toBe("low");
  });

  it("calls LLM with cheap tier for regular enrichment", async () => {
    const mockComplete = vi.fn().mockResolvedValue(enrichmentResponse());
    const mockLLM: LLMClient = {
      complete: mockComplete,
    } as unknown as LLMClient;

    const pipeline = new EnrichmentPipeline(mockLLM);

    await pipeline.enrich({
      capture: { item: "test", locator: null, rawText: "test" },
      source: null,
      existingEntries: [],
    });

    const options = mockComplete.mock.calls[0][1];
    expect(options.tier).toBe("cheap");
  });

  it("calls LLM with premium tier when explicitly requested", async () => {
    const mockComplete = vi.fn().mockResolvedValue(enrichmentResponse());
    const mockLLM: LLMClient = {
      complete: mockComplete,
    } as unknown as LLMClient;

    const pipeline = new EnrichmentPipeline(mockLLM);

    await pipeline.enrich(
      {
        capture: { item: "test", locator: null, rawText: "test" },
        source: null,
        existingEntries: [],
      },
      "premium",
    );

    const options = mockComplete.mock.calls[0][1];
    expect(options.tier).toBe("premium");
  });

  it("uses factory default system prompt when none is provided", async () => {
    const mockComplete = vi.fn().mockResolvedValue(enrichmentResponse());
    const mockLLM: LLMClient = {
      complete: mockComplete,
    } as unknown as LLMClient;

    const pipeline = new EnrichmentPipeline(mockLLM);

    await pipeline.enrich({
      capture: { item: "test", locator: null, rawText: "test" },
      source: null,
      existingEntries: [],
    });

    const options = mockComplete.mock.calls[0][1];
    expect(options.systemPrompt).toBe(FACTORY_DEFAULT_SYSTEM_PROMPT);
  });

  it("uses a custom system prompt when one is provided to the constructor", async () => {
    const mockComplete = vi.fn().mockResolvedValue(enrichmentResponse());
    const mockLLM: LLMClient = {
      complete: mockComplete,
    } as unknown as LLMClient;

    const customPrompt = "You are a specialized agent for technical terms.";
    const pipeline = new EnrichmentPipeline(mockLLM, customPrompt);

    await pipeline.enrich({
      capture: { item: "test", locator: null, rawText: "test" },
      source: null,
      existingEntries: [],
    });

    const options = mockComplete.mock.calls[0][1];
    expect(options.systemPrompt).toBe(customPrompt);
  });
});
