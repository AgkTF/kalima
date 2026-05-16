import type { PrismaClient } from "../generated/prisma/client.js";
import { CaptureParser } from "./capture-parser.js";
import type { LLMClient } from "./llm-client.js";

export const CaptureService = {
  async create(
    rawText: string,
    prisma: PrismaClient,
    llm: LLMClient,
    sessionId?: number,
  ) {
    const parser = new CaptureParser(llm);
    const parsed = await parser.parse(rawText);

    return prisma.capture.create({
      data: {
        rawText,
        item: parsed.item,
        locator: parsed.locator,
        sourceHint: parsed.sourceHint,
        sessionId: sessionId ?? null,
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
