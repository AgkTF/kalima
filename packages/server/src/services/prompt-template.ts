import type { PrismaClient } from "../generated/prisma/client.js";
import { EnrichmentPromptBuilder } from "./enrichment/enrichment-prompt-builder.js";

export const DEFAULT_ENRICHMENT_PROMPT_TEMPLATE_KEY =
  "default_enrichment_prompt_template";

export const PromptTemplateService = {
  async getDefault(prisma: PrismaClient): Promise<string> {
    const meta = await prisma.appMeta.findUnique({
      where: { key: DEFAULT_ENRICHMENT_PROMPT_TEMPLATE_KEY },
    });
    return meta?.value ?? EnrichmentPromptBuilder.DEFAULT_TEMPLATE;
  },

  async setDefault(value: string, prisma: PrismaClient): Promise<void> {
    await prisma.appMeta.upsert({
      where: { key: DEFAULT_ENRICHMENT_PROMPT_TEMPLATE_KEY },
      create: { key: DEFAULT_ENRICHMENT_PROMPT_TEMPLATE_KEY, value },
      update: { value },
    });
  },
};
