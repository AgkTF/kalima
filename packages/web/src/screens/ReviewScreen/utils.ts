export const ENRICHMENT_FIELDS = [
  { key: "definition", label: "Definition" },
  { key: "translationArabic", label: "Translation (Arabic)" },
  { key: "nuance", label: "Nuance" },
  { key: "examples", label: "Examples" },
  { key: "tags", label: "Tags" },
  { key: "relatedEntries", label: "Related Entries" },
] as const;

export function parseJsonField(raw: string): string[] {
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export interface PendingEntry {
  id: number;
  status: string;
  definition: string;
  translationArabic: string;
  nuance: string;
  examples: string;
  tags: string;
  relatedEntries: string;
  confidence: string | null;
  flaggedFields: string | null;
  rejectionNote: string | null;
  capture: { id: number; item: string };
}
