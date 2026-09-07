import { TRPCError } from "@trpc/server";
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
    data: {
      item?: string;
      locator?: string | null;
      sourceHint?: string | null;
    },
    prisma: PrismaClient,
  ) {
    const normalizedData = {
      item: data.item?.trim(),
      locator:
        typeof data.locator === "string"
          ? data.locator.trim() || null
          : data.locator,
      sourceHint:
        typeof data.sourceHint === "string"
          ? data.sourceHint.trim() || null
          : data.sourceHint,
    };

    if (data.item !== undefined && !normalizedData.item) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "A Capture's Item cannot be empty.",
      });
    }

    if (
      normalizedData.locator !== undefined &&
      normalizedData.sourceHint !== undefined
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "A Capture cannot accept both a Locator and a Source Hint.",
      });
    }

    const result = await prisma.capture.updateMany({
      where: {
        id: captureId,
        entry: null,
        ...(normalizedData.locator !== undefined
          ? { sessionId: { not: null } }
          : normalizedData.sourceHint !== undefined
            ? { sessionId: null }
            : {}),
      },
      data: normalizedData,
    });

    if (result.count === 0) {
      const capture = await prisma.capture.findUnique({
        where: { id: captureId },
        include: { entry: { select: { id: true } } },
      });

      if (!capture) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Capture ${captureId} not found.`,
        });
      }
      if (capture.entry) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Only Pending Captures can be edited.",
        });
      }
      if (normalizedData.locator !== undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One-off Captures do not accept a Locator.",
        });
      }
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Session Captures do not accept a Source Hint.",
      });
    }

    return prisma.capture.findUniqueOrThrow({
      where: { id: captureId },
    });
  },

  async deletePending(captureId: number, prisma: PrismaClient): Promise<void> {
    const result = await prisma.capture.deleteMany({
      where: { id: captureId, entry: null },
    });

    if (result.count === 0) {
      const capture = await prisma.capture.findUnique({
        where: { id: captureId },
        select: { id: true },
      });
      if (!capture) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Capture ${captureId} not found.`,
        });
      }
      throw new TRPCError({
        code: "CONFLICT",
        message: "Only Pending Captures can be deleted.",
      });
    }
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
