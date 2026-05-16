import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { trpc } from "../trpc";

const ENRICHMENT_FIELDS = [
  { key: "definition", label: "Definition" },
  { key: "translationArabic", label: "Translation (Arabic)" },
  { key: "nuance", label: "Nuance" },
  { key: "examples", label: "Examples" },
  { key: "tags", label: "Tags" },
  { key: "relatedEntries", label: "Related Entries" },
] as const;

function parseJsonField(raw: string): string[] {
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

interface RejectFormProps {
  entryId: number;
  onClose: () => void;
}

function RejectForm({ entryId, onClose }: RejectFormProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const utils = trpc.useUtils();

  const reject = trpc.review.reject.useMutation({
    onSuccess: () => {
      utils.review.getPending.invalidate();
      utils.review.getRejected.invalidate();
      onClose();
    },
  });

  const toggle = (key: string) => {
    const next = new Set(selectedFields);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedFields(next);
  };

  return (
    <div className="mt-2 rounded-button border border-divider bg-surface p-3">
      <p className="text-xs font-semibold text-ink mb-2">
        Flag incorrect fields:
      </p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {ENRICHMENT_FIELDS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => toggle(f.key)}
            className={`rounded-full px-2.5 py-1 text-xs border cursor-pointer transition-colors ${
              selectedFields.has(f.key)
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-divider text-dim hover:border-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <textarea
        placeholder="Optional note explaining what's wrong…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-button border border-divider bg-page px-3 py-2 text-xs text-ink placeholder-dim resize-none"
        rows={2}
      />
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={() =>
            reject.mutate({
              entryId,
              flaggedFields: [...selectedFields],
              note: note || null,
            })
          }
          disabled={selectedFields.size === 0 || reject.isPending}
          className="rounded-button bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {reject.isPending ? "…" : "Reject"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-button border border-divider px-3 py-1.5 text-xs text-dim cursor-pointer hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface PendingEntry {
  id: number;
  status: string;
  definition: string;
  translationArabic: string;
  nuance: string;
  examples: string;
  tags: string;
  relatedEntries: string;
  flaggedFields: string | null;
  rejectionNote: string | null;
  capture: { id: number; item: string };
}

interface EntryCardProps {
  entry: PendingEntry;
  isApproving: boolean;
  isRejecting: boolean;
  onApprove: (entryId: number) => void;
  onToggleReject: (entryId: number) => void;
}

function RejectedEntryCard({
  entry,
  onReEnrich,
}: {
  entry: PendingEntry;
  onReEnrich: (entryId: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const flagged = new Set(parseJsonField(entry.flaggedFields ?? "[]"));

  const fieldClass = (key: string) =>
    flagged.has(key) ? "border-red-300 bg-red-50 rounded px-1 -mx-1" : "";

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
            {expanded ? (
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
                  d="M5 15l7-7 7 7"
                />
              </svg>
            ) : (
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
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
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

      <p
        className={`text-xs text-ink leading-relaxed mb-1 ${fieldClass("definition")}`}
      >
        {entry.definition}
      </p>
      <p
        className={`text-xs text-dim font-arabic text-end ${fieldClass("translationArabic")}`}
      >
        {entry.translationArabic}
      </p>

      <div className="mt-2 flex flex-wrap gap-1">
        {parseJsonField(entry.tags).map((tag: string) => (
          <span
            key={tag}
            className={`rounded-full px-1.5 py-0.5 text-[10px] ${flagged.has("tags") ? "text-red-700 bg-red-50 border border-red-300" : "bg-accent-subtle text-dim"}`}
          >
            {tag}
          </span>
        ))}
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-divider space-y-1.5">
          {entry.nuance && (
            <div>
              <span className="text-[10px] font-semibold text-dim">Nuance</span>
              <p
                className={`text-xs text-ink leading-relaxed ${fieldClass("nuance")}`}
              >
                {entry.nuance}
              </p>
            </div>
          )}
          <div>
            <span className="text-[10px] font-semibold text-dim">Examples</span>
            <ul
              className={`list-disc list-inside text-xs text-ink ${fieldClass("examples")}`}
            >
              {parseJsonField(entry.examples).map((ex: string) => (
                <li key={ex} className="leading-relaxed">
                  {ex}
                </li>
              ))}
            </ul>
          </div>
          {parseJsonField(entry.relatedEntries).length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-dim">
                Related entries
              </span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {parseJsonField(entry.relatedEntries).map((r: string) => (
                  <span
                    key={r}
                    className={`rounded-full border px-1.5 py-0.5 text-[10px] ${flagged.has("relatedEntries") ? "border-red-300 bg-red-50 text-red-700" : "border-accent/30 bg-accent/5 text-accent"}`}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {entry.rejectionNote && (
        <p className="mt-1.5 text-[10px] text-dim italic">
          Note: {entry.rejectionNote}
        </p>
      )}
    </div>
  );
}

function EntryCard({
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
            {expanded ? (
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
                  d="M5 15l7-7 7 7"
                />
              </svg>
            ) : (
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
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
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

      <p className="text-xs text-ink leading-relaxed mb-1">
        {entry.definition}
      </p>
      <p className="text-xs text-dim font-arabic text-end">
        {entry.translationArabic}
      </p>

      <div className="mt-2 flex flex-wrap gap-1">
        {parseJsonField(entry.tags).map((tag: string) => (
          <span
            key={tag}
            className="rounded-full bg-accent-subtle px-1.5 py-0.5 text-[10px] text-dim"
          >
            {tag}
          </span>
        ))}
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-divider space-y-1.5">
          {entry.nuance && (
            <div>
              <span className="text-[10px] font-semibold text-dim">Nuance</span>
              <p className="text-xs text-ink leading-relaxed">{entry.nuance}</p>
            </div>
          )}
          <div>
            <span className="text-[10px] font-semibold text-dim">Examples</span>
            <ul className="list-disc list-inside text-xs text-ink">
              {parseJsonField(entry.examples).map((ex: string) => (
                <li key={ex} className="leading-relaxed">
                  {ex}
                </li>
              ))}
            </ul>
          </div>
          {parseJsonField(entry.relatedEntries).length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-dim">
                Related entries
              </span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {parseJsonField(entry.relatedEntries).map((r: string) => (
                  <span
                    key={r}
                    className="rounded-full border border-accent/30 bg-accent/5 px-1.5 py-0.5 text-[10px] text-accent"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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

export function ReviewScreen() {
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [showRejected, setShowRejected] = useState(false);
  const utils = trpc.useUtils();

  const pending = trpc.review.getPending.useQuery(undefined, {
    refetchInterval: 5_000,
  });

  const rejected = trpc.review.getRejected.useQuery(undefined, {
    refetchInterval: 5_000,
  });

  const approve = trpc.review.approve.useMutation({
    onSuccess: () => {
      utils.review.getPending.invalidate();
    },
  });

  const approveAll = trpc.review.approveAll.useMutation({
    onSuccess: () => {
      utils.review.getPending.invalidate();
    },
  });

  const reEnrich = trpc.review.reEnrich.useMutation({
    onSuccess: () => {
      utils.review.getPending.invalidate();
      utils.review.getRejected.invalidate();
    },
  });

  const groupCount = pending.data?.sessionGroups.length ?? 0;
  const oneOffCount = pending.data?.oneOffs.length ?? 0;
  const total =
    groupCount > 0 || oneOffCount > 0
      ? pending.data?.sessionGroups.reduce(
          (acc, g) => acc + g.entries.length,
          0,
        ) + (pending.data?.oneOffs.length ?? 0)
      : 0;

  if (pending.isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center pb-16">
        <p className="font-ui text-dim">Loading…</p>
      </main>
    );
  }

  if (pending.isError || total === 0) {
    return (
      <main className="flex flex-1 items-center justify-center pb-16">
        <p className="font-ui text-dim">All caught up</p>
      </main>
    );
  }

  const rejectedCount = rejected.data?.length ?? 0;

  return (
    <main className="flex flex-1 flex-col pb-16">
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="font-display text-lg font-bold text-ink">Review</h1>
        <span className="rounded-full bg-accent-subtle px-2.5 py-0.5 text-xs font-semibold text-accent">
          {total}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-5">
        {/* Session groups */}
        {pending.data?.sessionGroups.map((group) => (
          <section key={group.sessionId} className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-display text-sm font-semibold text-ink">
                  {group.sourceName}
                </h2>
                <p className="text-xs text-dim">{group.sourceType}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  approveAll.mutate({
                    entryIds: group.entries.map((e) => e.id),
                  })
                }
                disabled={approveAll.isPending}
                className="rounded-button border border-accent px-2.5 py-1 text-xs font-medium text-accent cursor-pointer hover:bg-accent hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Approve all ({group.entries.length})
              </button>
            </div>

            {group.entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                isApproving={approve.isPending}
                isRejecting={rejectingId === entry.id}
                onApprove={(id) => approve.mutate({ entryId: id })}
                onToggleReject={(id) =>
                  setRejectingId(rejectingId === id ? null : id)
                }
              />
            ))}
          </section>
        ))}

        {/* One-offs group */}
        {pending.data && pending.data.oneOffs.length > 0 && (
          <section className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-display text-sm font-semibold text-ink">
                  One-offs
                </h2>
                <p className="text-xs text-dim">No source</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  approveAll.mutate({
                    entryIds: pending.data.oneOffs.map((e) => e.id),
                  })
                }
                disabled={approveAll.isPending}
                className="rounded-button border border-accent px-2.5 py-1 text-xs font-medium text-accent cursor-pointer hover:bg-accent hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Approve all ({pending.data.oneOffs.length})
              </button>
            </div>

            {pending.data.oneOffs.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                isApproving={approve.isPending}
                isRejecting={rejectingId === entry.id}
                onApprove={(id) => approve.mutate({ entryId: id })}
                onToggleReject={(id) =>
                  setRejectingId(rejectingId === id ? null : id)
                }
              />
            ))}
          </section>
        )}

        {/* Rejected section */}
        {rejectedCount > 0 && (
          <section className="mb-5">
            <button
              type="button"
              onClick={() => setShowRejected(!showRejected)}
              className="flex items-center gap-2 w-full text-left mb-2 p-2 rounded-button hover:bg-surface cursor-pointer"
            >
              <svg
                className={`h-3.5 w-3.5 text-dim transition-transform ${showRejected ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="font-display text-sm font-semibold text-dim">
                Rejected
              </span>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                {rejectedCount}
              </span>
            </button>

            {showRejected &&
              rejected.data?.map((entry) => (
                <RejectedEntryCard
                  key={entry.id}
                  entry={entry}
                  onReEnrich={(id) => reEnrich.mutate({ entryId: id })}
                />
              ))}
          </section>
        )}
      </div>
    </main>
  );
}
