import type { PrismaClient } from "../generated/prisma/client.js";

export const CaptureService = {
  async create(
    item: string,
    locator: string | null,
    sourceHint: string | null,
    prisma: PrismaClient,
    sessionId?: number,
  ) {
    return prisma.capture.create({
      data: {
        item,
        locator,
        sourceHint,
        sessionId: sessionId ?? null,
      },
    });
  },

  async update(
    captureId: number,
    data: { locator?: string | null; sourceHint?: string | null },
    prisma: PrismaClient,
  ) {
    return prisma.capture.update({
      where: { id: captureId },
      data: {
        locator: data.locator,
        sourceHint: data.sourceHint,
      },
    });
  },

  async list(prisma: PrismaClient) {
    return prisma.capture.findMany({
      where: {
        sessionId: null,
        OR: [{ entry: null }, { entry: { status: "processing" } }],
      },
      include: {
        entry: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async listSession(sessionId: number, prisma: PrismaClient) {
    return prisma.capture.findMany({
      where: { sessionId },
      include: {
        entry: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
