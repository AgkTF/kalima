import type { PrismaClient } from "../generated/prisma/client.js";

export const SourceService = {
  /**
   * Find or create a Source by (name, type). When enrichmentContext is
   * provided (including null), it is written to the existing or new Source —
   * this lets the SessionForm set/update source-scoped guidance on open.
   * When enrichmentContext is undefined, an existing Source is left untouched.
   */
  async create(
    name: string,
    type: string,
    prisma: PrismaClient,
    enrichmentContext?: string | null,
  ) {
    const existing = await prisma.source.findUnique({
      where: { name_type: { name, type } },
    });
    if (existing) {
      if (enrichmentContext === undefined) return existing;
      return prisma.source.update({
        where: { id: existing.id },
        data: { enrichmentContext: enrichmentContext ?? null },
      });
    }

    return prisma.source.create({
      data: { name, type, enrichmentContext: enrichmentContext ?? null },
    });
  },

  async list(prisma: PrismaClient) {
    return prisma.source.findMany({
      orderBy: { name: "asc" },
    });
  },

  /**
   * Update the enrichmentContext on a Source. Passing null clears it.
   * Used for mid-session edits — applies to future enrichments only.
   */
  async updateEnrichmentContext(
    sourceId: number,
    enrichmentContext: string | null,
    prisma: PrismaClient,
  ) {
    return prisma.source.update({
      where: { id: sourceId },
      data: { enrichmentContext },
    });
  },
};
