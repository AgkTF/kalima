export interface EnrichmentPromptParams {
  item: string;
  source?: { name: string; type: string } | null;
  locator?: string | null;
  sourceHint?: string | null;
  existingEntries: string[];
}

export class EnrichmentPromptBuilder {
  build(params: EnrichmentPromptParams): string {
    const { item, source, locator, sourceHint, existingEntries } = params;

    let prompt = `Enrich the following item: "${item}"\n\n`;

    if (source) {
      prompt += `Source: "${source.name}" (${source.type})\n`;
    }

    if (locator) {
      prompt += `Locator: ${locator}\n`;
    }

    if (sourceHint) {
      prompt += `Encounter context: ${sourceHint}\n`;
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
