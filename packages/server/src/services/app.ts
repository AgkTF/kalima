import type { PrismaClient } from "../generated/prisma/client.js";
import { FACTORY_DEFAULT_SYSTEM_PROMPT } from "./enrichment/enrichment-pipeline.js";

const BASE_SYSTEM_PROMPT_KEY = "enrichment.baseSystemPrompt";

export const AppService = {
  status() {
    return { name: "Kalima" as const, status: "ok" as const };
  },

  /**
   * Returns the base system prompt — the stored override if one exists,
   * otherwise the factory default.
   */
  async getBaseSystemPrompt(prisma: PrismaClient): Promise<string> {
    const row = await prisma.appMeta.findUnique({
      where: { key: BASE_SYSTEM_PROMPT_KEY },
    });
    return row?.value ?? FACTORY_DEFAULT_SYSTEM_PROMPT;
  },

  /**
   * Stores (or replaces) the base system prompt override in AppMeta.
   */
  async setBaseSystemPrompt(
    prisma: PrismaClient,
    value: string,
  ): Promise<void> {
    await prisma.appMeta.upsert({
      where: { key: BASE_SYSTEM_PROMPT_KEY },
      update: { value },
      create: { key: BASE_SYSTEM_PROMPT_KEY, value },
    });
  },

  /**
   * Removes the stored override so that getBaseSystemPrompt falls back
   * to the factory default.
   */
  async resetBaseSystemPrompt(prisma: PrismaClient): Promise<void> {
    await prisma.appMeta.deleteMany({
      where: { key: BASE_SYSTEM_PROMPT_KEY },
    });
  },
};
