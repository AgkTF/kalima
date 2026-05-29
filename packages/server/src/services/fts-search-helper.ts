import type { PrismaClient } from "../generated/prisma/client.js";

export interface IndexEntryInput {
  entryId: number;
  text: string;
}

export interface FTSBuildTextInput {
  capture: { item: string; session?: { source?: { name: string } } | null };
  definition: string;
  translationArabic: string;
  nuance: string;
  examples: string;
  tags: string;
  relatedEntries: string;
}

export class FTSSearchHelper {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async initialize(): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
      CREATE VIRTUAL TABLE IF NOT EXISTS entry_fts USING fts5(
        entry_id UNINDEXED,
        text
      )
    `);
  }

  async indexEntry(input: IndexEntryInput): Promise<void> {
    // Delete any existing entry first to avoid duplicates on re-index
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM entry_fts WHERE entry_id = ?`,
      input.entryId,
    );
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO entry_fts (entry_id, text) VALUES (?, ?)`,
      input.entryId,
      input.text,
    );
  }

  async search(query: string): Promise<number[]> {
    // Sanitize: remove FTS5 special characters except * (user may provide their own wildcard).
    // Replace hyphens and non-word chars with spaces so compound terms like
    // "visible-word" don't confuse FTS5's column-name parser.
    const sanitized = query
      .replace(/['"()^]/g, "")
      .replace(/[^\w\s*\u0600-\u06FF]/g, " ")
      .trim();
    if (!sanitized) return [];

    // Build column-qualified prefix terms: text : term1* text : term2* ...
    // Column qualification avoids ambiguity with FTS5 column-name syntax.
    // Trailing * enables prefix matching so partial words match full tokens.
    // If the user already provided a *, don't double it.
    const terms = sanitized
      .split(/\s+/)
      .map((t) => {
        const term = t.endsWith("*") ? t : `${t}*`;
        return `text : ${term}`;
      })
      .join(" ");

    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT entry_id FROM entry_fts WHERE entry_fts MATCH ?`,
      terms,
    )) as Array<{ entry_id: number }>;

    return rows.map((r) => r.entry_id);
  }

  static buildText(entry: FTSBuildTextInput): string {
    return [
      entry.capture.item,
      entry.definition,
      entry.translationArabic,
      entry.nuance,
      entry.examples,
      ...JSON.parse(entry.tags || "[]"),
      ...JSON.parse(entry.relatedEntries || "[]"),
      entry.capture.session?.source?.name ?? "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  async deIndexEntry(entryId: number): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM entry_fts WHERE entry_id = ?`,
      entryId,
    );
  }
}
