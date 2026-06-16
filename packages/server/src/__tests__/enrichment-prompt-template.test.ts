import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";
import {
  getGlobalTemplate,
  setGlobalTemplate,
} from "../services/enrichment/enrichment-prompt-template.js";

describe("Enrichment Prompt Template storage", () => {
  const adapter = new PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
  });
  const prisma = new PrismaClient({ adapter });

  afterAll(async () => {
    await prisma.$disconnect();
  });
  it("returns null when no global template has been set", async () => {
    const result = await getGlobalTemplate(prisma);
    expect(result).toBeNull();
  });

  it("stores and retrieves a global template", async () => {
    const template = "Define {item} from {source}. Context: {existingEntries}";

    await setGlobalTemplate(prisma, template);
    const result = await getGlobalTemplate(prisma);

    expect(result).toBe(template);
  });

  it("overwrites the global template on subsequent sets", async () => {
    await setGlobalTemplate(prisma, "First template");
    await setGlobalTemplate(prisma, "Second template");

    const result = await getGlobalTemplate(prisma);
    expect(result).toBe("Second template");
  });

  it("preserves the template exactly, including placeholders and whitespace", async () => {
    const template = `Enrich {item}.

Source: {source}
Locator: {locator}

Existing entries: {existingEntries}`;

    await setGlobalTemplate(prisma, template);
    const result = await getGlobalTemplate(prisma);

    expect(result).toBe(template);
  });
});
