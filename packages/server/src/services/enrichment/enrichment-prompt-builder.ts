export interface EnrichmentPromptParams {
  item: string;
  source?: { name: string; type: string } | null;
  locator?: string | null;
  existingEntries: string[];
}

export class EnrichmentPromptBuilder {
  /**
   * Build an enrichment prompt.
   *
   * When `template` is provided, placeholder substitution is used:
   *   {{item}} → the item name
   *   {{sourceName}} → source name (or empty string)
   *   {{sourceType}} → source type (or empty string)
   *   {{locator}} → locator text (or empty string)
   *   {{existingEntries}} → comma-separated existing entry names (or empty string)
   *
   * When `template` is null/undefined, falls back to the existing hardcoded prompt.
   */
  build(params: EnrichmentPromptParams, template?: string): string {
    const { item, source, locator, existingEntries } = params;

    if (template != null) {
      return template
        .replaceAll("{{item}}", item)
        .replaceAll("{{sourceName}}", source?.name ?? "")
        .replaceAll("{{sourceType}}", source?.type ?? "")
        .replaceAll("{{locator}}", locator ?? "")
        .replaceAll("{{existingEntries}}", existingEntries.join(", "));
    }

    let prompt = `Enrich the following item: "${item}"\n\n`;

    if (source) {
      prompt += `Source: "${source.name}" (${source.type})\n`;
    }

    if (locator) {
      prompt += `Locator: ${locator}\n`;
    }

    if (existingEntries.length > 0) {
      prompt += `\nExisting word bank entries for context:\n`;
      for (const entry of existingEntries) {
        prompt += `- ${entry}\n`;
      }
    }

    return prompt;
  }
}
