import { useState } from "react";
import { trpc } from "../../trpc";
import { ENRICHMENT_FIELDS } from "./utils";

interface RejectFormProps {
  entryId: number;
  onClose: () => void;
}

export function RejectForm({ entryId, onClose }: RejectFormProps) {
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
