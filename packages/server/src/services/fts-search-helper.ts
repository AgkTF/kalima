import type { PrismaClient } from "../generated/prisma/client.js";

export interface IndexEntryInput {
  entryId: number;
  text: string;
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
    // Sanitize: escape FTS5 special characters except * for prefix matching
    const sanitized = query.replace(/['"()^]/g, "").trim();
    if (!sanitized) return [];

    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT entry_id FROM entry_fts WHERE entry_fts MATCH ?`,
      sanitized,
    )) as Array<{ entry_id: number }>;

    return rows.map((r) => r.entry_id);
  }

  async deIndexEntry(entryId: number): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM entry_fts WHERE entry_id = ?`,
      entryId,
    );
  }
}
