import { useEffect, useState } from "react";

export function EnrichmentContextEditor({
  initialContext,
  isPending,
  onSave,
  onCancel,
}: {
  initialContext: string | null;
  isPending: boolean;
  onSave: (enrichmentContext: string | null) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialContext ?? "");

  // Reset local state when the dialog reopens with a fresh initialContext
  useEffect(() => {
    setValue(initialContext ?? "");
  }, [initialContext]);

  const trimmed = value.trim();
  const initialTrimmed = (initialContext ?? "").trim();
  const isUnchanged = trimmed === initialTrimmed;

  function handleSave() {
    if (isUnchanged || isPending) return;
    onSave(trimmed || null);
  }

  return (
    <div className="space-y-2 rounded-button border border-divider bg-surface p-3">
      <label
        htmlFor="enrichment-context"
        className="block text-xs font-medium text-dim"
      >
        Enrichment context
      </label>
      <textarea
        id="enrichment-context"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Optional guidance appended to the enrichment system prompt for this source"
        disabled={isPending}
        rows={3}
        className="w-full rounded-button border border-divider bg-surface px-3 py-2 font-ui text-sm text-ink placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isUnchanged || isPending}
          className="flex-1 rounded-button bg-accent px-4 py-2 font-ui text-sm font-medium text-page transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {isPending ? "\u2026" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-button border border-divider px-4 py-2 font-ui text-sm font-medium text-dim transition-colors hover:text-ink disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
