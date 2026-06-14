export const DEFAULT_ENRICHMENT_PROMPT_TEMPLATE = `Enrich the following item: "{{item}}"

{{source}}{{locatorBlock}}{{existingEntriesBlock}}`;

export interface EnrichmentPromptParams {
  item: string;
  source?: { name: string; type: string } | null;
  locator?: string | null;
  existingEntries: string[];
  template?: string | null;
}

export class EnrichmentPromptBuilder {
  static DEFAULT_TEMPLATE = DEFAULT_ENRICHMENT_PROMPT_TEMPLATE;

  build(params: EnrichmentPromptParams): string {
    const { item, source, locator, existingEntries, template } = params;

    const tpl = template ?? DEFAULT_ENRICHMENT_PROMPT_TEMPLATE;

    const entriesList =
      existingEntries.length > 0
        ? existingEntries.map((entry) => `- ${entry}`).join("\n")
        : "";

    const sourceBlock = source
      ? `Source: "${source.name}" (${source.type})\n`
      : "";
    const locatorBlock = locator ? `Locator: ${locator}\n` : "";
    const existingEntriesBlock = entriesList
      ? `\nExisting word bank entries for context:\n${entriesList}\n`
      : "";

    return tpl
      .replaceAll("{{item}}", item)
      .replaceAll("{{source}}", sourceBlock)
      .replaceAll("{{sourceName}}", source?.name ?? "")
      .replaceAll("{{sourceType}}", source?.type ?? "")
      .replaceAll("{{locator}}", locator ?? "")
      .replaceAll("{{locatorBlock}}", locatorBlock)
      .replaceAll("{{existingEntries}}", entriesList)
      .replaceAll("{{existingEntriesBlock}}", existingEntriesBlock);
  }
}
