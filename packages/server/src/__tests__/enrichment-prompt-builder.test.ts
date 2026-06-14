import { describe, expect, it } from "vitest";
import { EnrichmentPromptBuilder } from "../services/enrichment/enrichment-prompt-builder.js";

describe("EnrichmentPromptBuilder", () => {
  const builder = new EnrichmentPromptBuilder();

  it("uses the default template when no session override is provided", () => {
    const prompt = builder.build({
      item: "serendipity",
      source: { name: "Moby Dick", type: "book" },
      locator: "chapter 12, page 45",
      existingEntries: ["whale", "ship", "ocean"],
    });

    expect(prompt).toContain('Enrich the following item: "serendipity"');
    expect(prompt).toContain('Source: "Moby Dick" (book)');
    expect(prompt).toContain("Locator: chapter 12, page 45");
    expect(prompt).toContain("Existing word bank entries for context:");
    expect(prompt).toContain("- whale");
    expect(prompt).toContain("- ship");
    expect(prompt).toContain("- ocean");
  });

  it("uses a custom session override template when provided", () => {
    const prompt = builder.build({
      item: "harpoon",
      source: { name: "Moby Dick", type: "book" },
      locator: "chapter 3, page 15",
      existingEntries: ["whale", "ship", "ocean"],
      template:
        'Study "{{item}}" from {{sourceName}} ({{sourceType}}) at {{locator}}. Known entries:\n{{existingEntries}}',
    });

    expect(prompt).toContain(
      'Study "harpoon" from Moby Dick (book) at chapter 3, page 15.',
    );
    expect(prompt).toContain("Known entries:");
    expect(prompt).toContain("- whale");
  });

  it("pre-filled session override with the default template produces the same prompt as no override", () => {
    const defaultOutput = builder.build({
      item: "ephemeral",
      source: null,
      locator: null,
      existingEntries: [],
    });

    const preFilledOutput = builder.build({
      item: "ephemeral",
      source: null,
      locator: null,
      existingEntries: [],
      template: EnrichmentPromptBuilder.DEFAULT_TEMPLATE,
    });

    expect(preFilledOutput).toBe(defaultOutput);
  });

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
});
