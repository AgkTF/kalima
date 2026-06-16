export interface EnrichmentPromptParams {
  item: string;
  source?: { name: string; type: string } | null;
  locator?: string | null;
  existingEntries: string[];
  template?: string | null;
}

export class EnrichmentPromptBuilder {
  build(params: EnrichmentPromptParams): string {
    const { item, source, locator, existingEntries, template } = params;

    if (template) {
      return this.applyTemplate(template, params);
    }

    // Fallback: hardcoded default format
    return this.buildDefault(params);
  }

  private applyTemplate(
    template: string,
    params: EnrichmentPromptParams,
  ): string {
    const { item, source, locator, existingEntries } = params;

    const sourceStr = source ? `"${source.name}" (${source.type})` : "";
    const locatorStr = locator ?? "";
    const entriesStr = existingEntries.join(", ");

    return template
      .replaceAll("{item}", item)
      .replaceAll("{source}", sourceStr)
      .replaceAll("{locator}", locatorStr)
      .replaceAll("{existingEntries}", entriesStr);
  }

  private buildDefault(params: EnrichmentPromptParams): string {
    const { item, source, locator, existingEntries } = params;

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
