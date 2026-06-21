import type { LLMClient } from "../llm-client.js";
import { EnrichmentPromptBuilder } from "./enrichment-prompt-builder.js";

/**
 * Combines the base system prompt with optional source-scoped enrichment
 * context. When context is present (non-empty), it is appended under a
 * hardcoded "Additional context:" label. See ADR-0007.
 */
export function buildEnrichmentSystemPrompt(
  baseSystemPrompt: string,
  enrichmentContext: string | null,
): string {
  const trimmed = enrichmentContext?.trim();
  if (!trimmed) return baseSystemPrompt;
  return `${baseSystemPrompt}\n\nAdditional context:\n${trimmed}`;
}

export interface EnrichmentResult {
  definition: string;
  translationArabic: string;
  nuance: string;
  examples: string[];
  tags: string[];
  relatedEntries: string[];
  confidence: "high" | "low";
}

const ENRICHMENT_SCHEMA = {
  type: "object" as const,
  properties: {
    definition: { type: "string" as const },
    translationArabic: { type: "string" as const },
    nuance: { type: "string" as const },
    examples: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    tags: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    relatedEntries: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    confidence: {
      type: "string" as const,
      enum: ["high", "low"],
    },
  },
  required: [
    "definition",
    "translationArabic",
    "nuance",
    "examples",
    "tags",
    "relatedEntries",
    "confidence",
  ],
  additionalProperties: false,
} as const;

export const FACTORY_DEFAULT_SYSTEM_PROMPT = `You are a word bank enrichment agent. For the given item, produce:
- definition: a context-appropriate meaning
- translationArabic: the Arabic equivalent in Arabic script only (no transliteration, no pronunciation guides)
- nuance: a note on subtle shades of meaning
- examples: 2-3 sentences demonstrating usage
- tags: relevant categories
- relatedEntries: existing word bank entries that are connected to this item
- confidence: "high" if the context provides clear meaning, "low" if the item is ambiguous, rare, or the context is insufficient
Do NOT include etymology.`;

export interface EnrichParams {
  capture: {
    item: string;
    locator: string | null;
    rawText: string;
  };
  source?: { name: string; type: string } | null;
  existingEntries: string[];
}

export class EnrichmentPipeline {
  private llm: LLMClient;
  private promptBuilder: EnrichmentPromptBuilder;
  private systemPrompt: string;

  constructor(
    llm: LLMClient,
    systemPrompt: string = FACTORY_DEFAULT_SYSTEM_PROMPT,
  ) {
    this.llm = llm;
    this.promptBuilder = new EnrichmentPromptBuilder();
    this.systemPrompt = systemPrompt;
  }

  async enrich(
    params: EnrichParams,
    tier: "cheap" | "premium" = "cheap",
  ): Promise<EnrichmentResult> {
    const prompt = this.promptBuilder.build({
      item: params.capture.item,
      source: params.source,
      locator: params.capture.locator,
      existingEntries: params.existingEntries,
    });

    const response = await this.llm.complete(prompt, {
      tier,
      schema: ENRICHMENT_SCHEMA,
      systemPrompt: this.systemPrompt,
    });

    const result = JSON.parse(response) as EnrichmentResult;

    // Etymology is explicitly excluded — strip if LLM includes it anyway
    if ("etymology" in result) {
      delete (result as Record<string, unknown>).etymology;
    }

    return result;
  }
}
