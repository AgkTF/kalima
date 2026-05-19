import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { EnrichmentFields } from "./EnrichmentFields";
import { RejectForm } from "./RejectForm";
import { type PendingEntry, parseJsonField } from "./utils";

interface EntryCardProps {
  entry: PendingEntry;
  isApproving: boolean;
  isRejecting: boolean;
  onApprove: (entryId: number) => void;
  onToggleReject: (entryId: number) => void;
}

export function EntryCard({
  entry,
  isApproving,
  isRejecting,
  onApprove,
  onToggleReject,
}: EntryCardProps) {
  const isProcessing = entry.status === "processing";
  const [expanded, setExpanded] = useState(false);

  if (isProcessing) {
    return (
      <div className="mb-2 rounded-button border border-divider bg-surface p-3">
        <div className="flex items-center gap-2.5 font-display text-sm font-semibold text-ink/80">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-dim opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-dim" />
          </span>
          {entry.capture.item}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2 rounded-button border border-divider bg-surface p-3">
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
            onClick={() => onApprove(entry.id)}
            disabled={isApproving}
            className="rounded-full p-1 text-green-600 cursor-pointer hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Approve"
          >
            <CheckIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onToggleReject(entry.id)}
            className="rounded-full p-1 text-dim cursor-pointer hover:bg-red-50 hover:text-red-600"
            title="Reject"
          >
            <XMarkIcon className="h-4 w-4" />
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
      />

      {entry.flaggedFields && (
        <div className="mt-1.5 text-[10px] text-red-500">
          Previously flagged: {parseJsonField(entry.flaggedFields).join(", ")}
          {entry.rejectionNote && ` — "${entry.rejectionNote}"`}
        </div>
      )}

      {isRejecting && (
        <RejectForm
          entryId={entry.id}
          onClose={() => onToggleReject(entry.id)}
        />
      )}
    </div>
  );
}
