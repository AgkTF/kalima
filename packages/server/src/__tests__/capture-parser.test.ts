import { describe, expect, it, vi } from "vitest";
import { CaptureParser } from "../services/capture-parser.js";
import type { LLMClient } from "../services/llm-client.js";

function mockLLM(response: object): LLMClient {
  return {
    complete: vi.fn().mockResolvedValue(JSON.stringify(response)),
  } as unknown as LLMClient;
}

describe("CaptureParser.parse", () => {
  it("extracts item and locator from raw text", async () => {
    const llm = mockLLM({
      item: "serendipity",
      locator: "chapter 12, page 45",
      sourceHint: null,
    });

    const parser = new CaptureParser(llm);
    const result = await parser.parse("serendipity chapter 12 page 45");

    expect(result).toEqual({
      item: "serendipity",
      locator: "chapter 12, page 45",
      sourceHint: null,
    });
  });

  it("parses multi-word items correctly", async () => {
    const llm = mockLLM({
      item: "call me Ishmael",
      locator: "page 1",
      sourceHint: null,
    });

    const parser = new CaptureParser(llm);
    const result = await parser.parse("call me Ishmael, page 1");

    expect(result).toEqual({
      item: "call me Ishmael",
      locator: "page 1",
      sourceHint: null,
    });
  });

  it("extracts loose source hints when present", async () => {
    const llm = mockLLM({
      item: "ubiquitous",
      locator: null,
      sourceHint: "conversation",
    });

    const parser = new CaptureParser(llm);
    const result = await parser.parse("ubiquitous from a conversation");

    expect(result).toEqual({
      item: "ubiquitous",
      locator: null,
      sourceHint: "conversation",
    });
  });

  it("sends raw text to the LLM as part of the prompt", async () => {
    const llm = mockLLM({
      item: "serendipity",
      locator: null,
      sourceHint: null,
    });

    const parser = new CaptureParser(llm);
    await parser.parse("serendipity");

    expect(llm.complete).toHaveBeenCalledWith(
      "serendipity",
      expect.objectContaining({
        tier: "cheap",
        schema: expect.any(Object),
        systemPrompt: expect.stringContaining("capture parser"),
      }),
    );
  });
});
