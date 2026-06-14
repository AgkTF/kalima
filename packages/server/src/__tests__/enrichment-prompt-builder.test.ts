import { describe, expect, it } from "vitest";
import { EnrichmentPromptBuilder } from "../services/enrichment/enrichment-prompt-builder.js";

describe("EnrichmentPromptBuilder (no template — legacy hardcoded)", () => {
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
});

describe("EnrichmentPromptBuilder (template mode)", () => {
  const builder = new EnrichmentPromptBuilder();

  it("renders a provided template with {{item}} placeholder", () => {
    const prompt = builder.build(
      {
        item: "serendipity",
        source: null,
        locator: null,
        existingEntries: [],
      },
      "Enrich: {{item}}",
    );

    expect(prompt).toBe("Enrich: serendipity");
  });

  it("renders all placeholders: {{sourceName}}, {{sourceType}}, {{locator}}, {{existingEntries}}", () => {
    const prompt = builder.build(
      {
        item: "harpoon",
        source: { name: "Moby Dick", type: "book" },
        locator: "chapter 3, page 15",
        existingEntries: ["whale", "ship"],
      },
      "Item: {{item}} | Source: {{sourceName}} ({{sourceType}}) | Loc: {{locator}} | Related: {{existingEntries}}",
    );

    expect(prompt).toBe(
      "Item: harpoon | Source: Moby Dick (book) | Loc: chapter 3, page 15 | Related: whale, ship",
    );
  });

  it("replaces missing source/locator/entries with empty strings in template mode", () => {
    const prompt = builder.build(
      {
        item: "ephemeral",
        source: null,
        locator: null,
        existingEntries: [],
      },
      "{{item}} | {{sourceName}} | {{locator}} | {{existingEntries}}",
    );

    expect(prompt).toBe("ephemeral |  |  | ");
  });

  it("falls back to legacy hardcoded prompt when template is undefined", () => {
    const prompt = builder.build({
      item: "serendipity",
      source: { name: "Moby Dick", type: "book" },
      locator: "chapter 12, page 45",
      existingEntries: [],
    });

    expect(prompt).toContain('Enrich the following item: "serendipity"');
    expect(prompt).toContain('Source: "Moby Dick" (book)');
    expect(prompt).toContain("Locator: chapter 12, page 45");
  });

  it("falls back to legacy hardcoded prompt when template is null", () => {
    const prompt = builder.build(
      {
        item: "serendipity",
        source: null,
        locator: null,
        existingEntries: [],
      },
      null as unknown as string | undefined,
    );

    expect(prompt).toContain('Enrich the following item: "serendipity"');
    expect(prompt).not.toContain("Source:");
  });
});
