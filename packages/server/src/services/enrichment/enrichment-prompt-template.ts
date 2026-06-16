import type { PrismaClient } from "../../generated/prisma/client.js";

const GLOBAL_TEMPLATE_KEY = "enrichment_prompt_template";

export async function getGlobalTemplate(
  prisma: PrismaClient,
): Promise<string | null> {
  const row = await prisma.appMeta.findUnique({
    where: { key: GLOBAL_TEMPLATE_KEY },
  });
  return row?.value ?? null;
}

export async function setGlobalTemplate(
  prisma: PrismaClient,
  template: string,
): Promise<void> {
  await prisma.appMeta.upsert({
    where: { key: GLOBAL_TEMPLATE_KEY },
    create: { key: GLOBAL_TEMPLATE_KEY, value: template },
    update: { value: template },
  });
}
