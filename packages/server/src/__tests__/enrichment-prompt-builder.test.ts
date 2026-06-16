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

  it("handles missing source and locator for one-off captures", () => {
    const prompt = builder.build({
      item: "ephemeral",
      source: null,
      locator: null,
      existingEntries: [],
    });

    // Should still produce a valid prompt with the item
    expect(prompt).toContain("ephemeral");
    // Should not crash or include source/locator sections
    expect(prompt).not.toContain("Source:");
    expect(prompt).not.toContain("Locator:");
  });

  describe("with template", () => {
    it("uses the provided template with placeholders replaced", () => {
      const template =
        "Define {item} from {source} at {locator}. Context: {existingEntries}";

      const prompt = builder.build({
        item: "serendipity",
        source: { name: "Moby Dick", type: "book" },
        locator: "chapter 12, page 45",
        existingEntries: ["whale", "ship"],
        template,
      });

      expect(prompt).toContain("Define serendipity");
      expect(prompt).toContain('from "Moby Dick" (book)');
      expect(prompt).toContain("at chapter 12, page 45");
      expect(prompt).toContain("whale, ship");
      // Should not contain the hardcoded format markers
      expect(prompt).not.toContain("Enrich the following item:");
    });

    it("falls back to hardcoded format when no template is provided", () => {
      const prompt = builder.build({
        item: "serendipity",
        source: { name: "Moby Dick", type: "book" },
        locator: "chapter 12, page 45",
        existingEntries: [],
      });

      expect(prompt).toContain("Enrich the following item:");
      expect(prompt).toContain('"serendipity"');
    });

    it("handles missing source and locator gracefully in template mode", () => {
      const template = "Item: {item}. Source: {source}. Locator: {locator}.";

      const prompt = builder.build({
        item: "ephemeral",
        source: null,
        locator: null,
        existingEntries: [],
        template,
      });

      expect(prompt).toContain("Item: ephemeral.");
      // Missing placeholders should be replaced with empty string
      expect(prompt).toContain("Source: .");
      expect(prompt).toContain("Locator: .");
    });

    it("handles empty existingEntries in template mode", () => {
      const template = "Enrich {item}. Related: {existingEntries}";

      const prompt = builder.build({
        item: "test",
        source: null,
        locator: null,
        existingEntries: [],
        template,
      });

      expect(prompt).toContain("Enrich test.");
      expect(prompt).toContain("Related: ");
    });
  });
});
