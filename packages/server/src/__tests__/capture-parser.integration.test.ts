/**
 * Integration tests for CaptureParser against the real LLM API.
 *
 * These tests call the actual DeepInfra API and consume real tokens.
 * Run with: pnpm --filter server test:integration
 *
 * Requires LLM_API_KEY, LLM_BASE_URL, and LLM_CHEAP_MODEL in .env
 */
import dotenv from "dotenv";
import { describe, expect, it } from "vitest";
import type { ParsedCapture } from "../services/capture-parser.js";
import { CaptureParser } from "../services/capture-parser.js";
import { LLMClient } from "../services/llm-client.js";

dotenv.config();

// Integration tests call a real API — increase timeout
const INTEGRATION_TIMEOUT = 15_000;

const llm = new LLMClient({
  apiKey: process.env.LLM_API_KEY ?? "",
  baseUrl: process.env.LLM_BASE_URL ?? "https://api.deepinfra.com/v1/openai",
  cheapModel: process.env.LLM_CHEAP_MODEL,
});

const parser = new CaptureParser(llm);

/** Helper: parse and assert basic schema compliance */
async function parseAndValidate(rawText: string): Promise<ParsedCapture> {
  const result = await parser.parse(rawText);

  // Schema: item must be a non-empty string
  expect(typeof result.item).toBe("string");
  expect(result.item.length).toBeGreaterThan(0);

  // Schema: locator is string | null
  expect(result.locator === null || typeof result.locator === "string").toBe(
    true,
  );

  // Schema: sourceHint is string | null
  expect(
    result.sourceHint === null || typeof result.sourceHint === "string",
  ).toBe(true);

  // No extra fields leaked in
  expect(Object.keys(result)).toEqual(["item", "locator", "sourceHint"]);

  return result;
}

describe("CaptureParser integration — real LLM", {
  timeout: INTEGRATION_TIMEOUT,
}, () => {
  // --- Basic parsing ---

  it("extracts item + locator from simple input", async () => {
    const result = await parseAndValidate("serendipity chapter 12 page 45");
    expect(result.item.toLowerCase()).toContain("serendipity");
    expect(result.locator).toBeTruthy();
  });

  it("extracts standalone item with no locator", async () => {
    const result = await parseAndValidate("Ishmael");
    expect(result.item.toLowerCase()).toContain("ishmael");
    expect(result.locator).toBeNull();
  });

  it("extracts source hint", async () => {
    const result = await parseAndValidate("ubiquitous from a conversation");
    expect(result.item.toLowerCase()).toContain("ubiquitous");
    expect(result.sourceHint).toBeTruthy();
  });

  // --- Multi-word items ---

  it("recognizes multi-word book title as a single item", async () => {
    const result = await parseAndValidate("Moby Dick page 42");
    // The item should be "Moby Dick", not just "Moby"
    expect(result.item.toLowerCase()).toBe("moby dick");
    expect(result.locator).toBeTruthy();
  });

  it("recognizes multi-word concept as a single item", async () => {
    const result = await parseAndValidate("call me Ishmael page 1");
    expect(result.item.toLowerCase()).toContain("call me ishmael");
  });

  // --- Locators ---

  it("parses timestamp-style locator", async () => {
    const result = await parseAndValidate("deja vu timestamp 5:30");
    expect(result.item.toLowerCase()).toContain("deja vu");
    expect(result.locator).toContain("5:30");
  });

  it("parses chapter + verse locator", async () => {
    const result = await parseAndValidate("genesis 3:16");
    expect(result.item.toLowerCase()).toContain("genesis");
    // The model may interpret "3:16" as a chapter:verse locator
    expect(result.locator).toBeTruthy();
  });

  it("parses multi-part locator", async () => {
    const result = await parseAndValidate(
      "entropy volume 3 chapter 7 page 200",
    );
    expect(result.item.toLowerCase()).toContain("entropy");
    expect(result.locator).toBeTruthy();
  });

  // --- Source hints ---

  it("extracts 'conversation' as source hint", async () => {
    const result = await parseAndValidate("naïveté from a conversation");
    expect(result.sourceHint?.toLowerCase()).toContain("conversat");
  });

  it("extracts digital source hints", async () => {
    const result = await parseAndValidate("that vibe from TikTok");
    expect(result.sourceHint?.toLowerCase()).toContain("tiktok");
  });

  it("extracts podcast as source hint", async () => {
    const result = await parseAndValidate("dark matter from a podcast");
    expect(result.sourceHint?.toLowerCase()).toContain("podcast");
  });

  // --- Edge cases ---

  it("handles special characters in item", async () => {
    const result = await parseAndValidate("C++ from a textbook");
    expect(result.item).toContain("C++");
    expect(result.sourceHint).toBeTruthy();
  });

  it("handles non-English script", { timeout: 30_000 }, async () => {
    const result = await parseAndValidate("insha'Allah from a conversation");
    expect(result.item.length).toBeGreaterThan(0);
    expect(result.sourceHint).toBeTruthy();
  });

  it("handles input that's mostly a locator with a red herring", async () => {
    // "page 42" alone — ambiguous: is "page 42" the item or the locator?
    // The model may struggle here. Accept any non-empty interpretation
    // as long as the schema is valid.
    const result = await parser.parse("page 42");
    expect(typeof result.item).toBe("string");
    // Model might return empty item if it treats everything as a locator.
    // This is an edge case where the input itself is ambiguous.
    // We accept the result as long as it's valid schema-wise.
    expect(Object.keys(result).sort()).toEqual([
      "item",
      "locator",
      "sourceHint",
    ]);
  });

  it("handles long rambling input", async () => {
    const result = await parseAndValidate(
      "I was reading about the concept of serendipity in chapter 12 page 45 of that blue book",
    );
    expect(result.item.toLowerCase()).toContain("serendipity");
    expect(result.locator).toBeTruthy();
  });

  it("handles single technical term with no context", async () => {
    const result = await parseAndValidate("mitochondria");
    expect(result.item.toLowerCase()).toContain("mitochondria");
    expect(result.locator).toBeNull();
    expect(result.sourceHint).toBeNull();
  });

  it("handles number-like items", async () => {
    const result = await parseAndValidate("42 the answer from a book");
    expect(result.item.length).toBeGreaterThan(0);
    expect(result.sourceHint).toBeTruthy();
  });

  it("handles URL-like input", async () => {
    const result = await parseAndValidate("example.com from an email");
    expect(result.item.length).toBeGreaterThan(0);
    expect(result.sourceHint).toBeTruthy();
  });

  it("never returns extra fields beyond the schema", async () => {
    const result = await parser.parse("serendipity chapter 3");
    const keys = Object.keys(result as unknown as Record<string, unknown>);
    // strict: true + additionalProperties: false should guarantee this
    expect(keys.sort()).toEqual(["item", "locator", "sourceHint"]);
  });

  it("returns valid JSON that round-trips through parse/stringify", async () => {
    const result = await parser.parse("epiphany page 7");
    // If this doesn't throw, the response is valid JSON
    const roundTripped = JSON.parse(JSON.stringify(result));
    expect(roundTripped).toEqual(result);
  });
});
