import type { LLMClient } from "./llm-client.js";

export interface ParsedCapture {
  item: string;
  locator: string | null;
  sourceHint: string | null;
}

const CAPTURE_SCHEMA = {
  type: "object" as const,
  properties: {
    item: { type: "string" as const },
    locator: { type: ["string", "null"] as const },
    sourceHint: { type: ["string", "null"] as const },
  },
  required: ["item", "locator", "sourceHint"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are a capture parser. Extract the following fields from the user's raw natural language input:
- "item": the word or phrase being captured (may be multi-word)
- "locator": the position within a source (page, chapter, timestamp, etc.), or null if none
- "sourceHint": a loose source description like "conversation", "Twitter", "TV", or null if none`;

export class CaptureParser {
  private llm: LLMClient;

  constructor(llm: LLMClient) {
    this.llm = llm;
  }

  async parse(rawText: string): Promise<ParsedCapture> {
    const response = await this.llm.complete(rawText, {
      tier: "cheap",
      schema: CAPTURE_SCHEMA,
      systemPrompt: SYSTEM_PROMPT,
    });
    return JSON.parse(response) as ParsedCapture;
  }
}
