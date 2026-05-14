import { describe, expect, it } from "vitest";
import { EnrichmentPromptBuilder } from "../services/enrichment/enrichment-prompt-builder.js";

describe("EnrichmentPromptBuilder", () => {
  const builder = new EnrichmentPromptBuilder();

  it("includes item, source metadata, and locator in the prompt", () => {
    const prompt = builder.build({
      item: "serendipity",
      source: { name: "Moby Dick", type: "book" },
      locator: "chapter 12, page 45",
      existingEntries: [],
    });

    expect(prompt).toContain("serendipity");
    expect(prompt).toContain("Moby Dick");
    expect(prompt).toContain("book");
    expect(prompt).toContain("chapter 12, page 45");
  });
});
