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

  it("includes existing word bank entries as context in the prompt", () => {
    const prompt = builder.build({
      item: "harpoon",
      source: { name: "Moby Dick", type: "book" },
      locator: "chapter 3, page 15",
      existingEntries: ["whale", "ship", "ocean"],
    });

    expect(prompt).toContain("whale");
    expect(prompt).toContain("ship");
    expect(prompt).toContain("ocean");
    // Should signal these are existing entries, not new items
    expect(prompt).toContain("Existing");
  });
});
