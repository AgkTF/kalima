import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "../generated/prisma/client.js";
import { SourceService } from "./source.js";

export const SessionService = {
  async open(name: string, type: string, prisma: PrismaClient) {
    const active = await prisma.session.findFirst({
      where: { closedAt: null },
    });
    if (active) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "A session is already active. Close it before opening a new one.",
      });
    }

    const source = await SourceService.create(name, type, prisma);

    return prisma.session.create({
      data: { sourceId: source.id },
      include: { source: true },
    });
  },

  async close(prisma: PrismaClient) {
    const active = await prisma.session.findFirst({
      where: { closedAt: null },
    });
    if (!active) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No active session to close.",
      });
    }

    return prisma.session.update({
      where: { id: active.id },
      data: { closedAt: new Date() },
    });
  },

  async getActive(prisma: PrismaClient) {
    return prisma.session.findFirst({
      where: { closedAt: null },
      include: { source: true },
    });
  },
};
