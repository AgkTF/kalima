import type { PrismaClient } from "../generated/prisma/client.js";

export const SourceService = {
  async create(name: string, type: string, prisma: PrismaClient) {
    const existing = await prisma.source.findUnique({
      where: { name_type: { name, type } },
    });
    if (existing) return existing;

    return prisma.source.create({
      data: { name, type },
    });
  },
};
