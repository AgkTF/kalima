import { useState } from "react";
import { EnrichmentFields } from "./EnrichmentFields";
import { type PendingEntry, parseJsonField } from "./utils";

interface RejectedEntryCardProps {
  entry: PendingEntry;
  onReEnrich: (entryId: number) => void;
}

export function RejectedEntryCard({
  entry,
  onReEnrich,
}: RejectedEntryCardProps) {
  const [expanded, setExpanded] = useState(true);
  const flagged = new Set(parseJsonField(entry.flaggedFields ?? "[]"));

  return (
    <div className="mb-2 rounded-button border border-divider bg-surface p-3 opacity-80">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-display text-sm font-semibold text-ink">
          {entry.capture.item}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 text-dim cursor-pointer hover:text-accent"
            title={expanded ? "Show less" : "Show all"}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={expanded ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onReEnrich(entry.id)}
            className="rounded-button border border-accent px-2 py-0.5 text-[10px] font-medium text-accent cursor-pointer hover:bg-accent hover:text-white transition-colors"
            title="Re-enrich"
          >
            Re-enrich
          </button>
        </div>
      </div>

      <EnrichmentFields
        definition={entry.definition}
        translationArabic={entry.translationArabic}
        nuance={entry.nuance}
        examples={entry.examples}
        tags={entry.tags}
        relatedEntries={entry.relatedEntries}
        expanded={expanded}
        flaggedFields={flagged}
      />

      {entry.rejectionNote && (
        <p className="mt-1.5 text-[10px] text-dim italic">
          Note: {entry.rejectionNote}
        </p>
      )}
    </div>
  );
}
