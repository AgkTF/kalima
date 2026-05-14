export interface EnrichmentPromptParams {
  item: string;
  source?: { name: string; type: string } | null;
  locator?: string | null;
  existingEntries: string[];
}

export class EnrichmentPromptBuilder {
  build(params: EnrichmentPromptParams): string {
    const { item, source, locator } = params;

    let prompt = `Enrich the following item: "${item}"\n\n`;

    if (source) {
      prompt += `Source: "${source.name}" (${source.type})\n`;
    }

    if (locator) {
      prompt += `Locator: ${locator}\n`;
    }

    return prompt;
  }
}
