import type { PrismaClient } from "../generated/prisma/client.js";

export const SessionService = {
  async open(sourceName: string, type: string, prisma: PrismaClient) {
    return prisma.session.create({
      data: { sourceName, type },
    });
  },
};
