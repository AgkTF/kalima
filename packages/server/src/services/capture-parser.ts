import type { LLMClient } from "./llm-client.js";

export interface ParsedCapture {
  item: string;
  locator: string | null;
  sourceHint: string | null;
}

const CAPTURE_SCHEMA = {
  type: "object",
  properties: {
    item: { type: "string" },
    locator: { type: ["string", "null"] },
    sourceHint: { type: ["string", "null"] },
  },
  required: ["item", "locator", "sourceHint"],
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
    const response = await this.llm.complete(
      `${SYSTEM_PROMPT}\n\nRaw input: ${rawText}`,
      { tier: "cheap", schema: CAPTURE_SCHEMA },
    );
    return JSON.parse(response) as ParsedCapture;
  }
}