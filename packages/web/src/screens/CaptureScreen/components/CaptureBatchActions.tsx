import { useEffect, useId, useRef, useState } from "react";
import type { PendingCaptureBatchAction } from "../captureTypes";

export function CaptureBatchActions({
  hasSession,
  selectedCount,
  onAction,
}: {
  hasSession: boolean;
  selectedCount: number;
  onAction: (action: PendingCaptureBatchAction) => void;
}) {
  const [value, setValue] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (!confirmingDelete && restoreFocus.current) {
      deleteButtonRef.current?.focus();
      restoreFocus.current = false;
    }
  }, [confirmingDelete]);

  function cancelDelete() {
    restoreFocus.current = true;
    setConfirmingDelete(false);
  }
  const inputId = useId();
  const field = hasSession ? "Locator" : "Source Hint";

  if (confirmingDelete) {
    return (
      <form
        className="mx-5 mb-2 space-y-2 rounded-xl bg-red-50 p-3 text-sm"
        onSubmit={(event) => {
          event.preventDefault();
          onAction({ type: "delete" });
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancelDelete();
          }
        }}
      >
        <p>
          Delete {selectedCount} Pending{" "}
          {selectedCount === 1 ? "Capture" : "Captures"}? This cannot be undone.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            // biome-ignore lint/a11y/noAutofocus: focus follows the Delete selected disclosure
            autoFocus
            className="min-h-10 rounded-button bg-red-600 px-3 font-medium text-white transition-[opacity,scale] active:scale-[0.96]"
          >
            Confirm delete ({selectedCount})
          </button>
          <button
            type="button"
            onClick={cancelDelete}
            className="min-h-10 rounded-button px-3 text-dim hover:bg-chip"
          >
            Cancel delete selected
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      className="mx-5 mb-2 space-y-2 rounded-xl bg-accent-subtle/50 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim()) return;
        onAction({
          type: hasSession ? "setLocator" : "setSourceHint",
          value: value.trim(),
        });
      }}
    >
      <label htmlFor={inputId} className="block text-sm font-medium text-ink">
        Shared {field}
      </label>
      <p className="text-xs text-dim">
        Replaces every selected value, including existing values.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          id={inputId}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-h-10 min-w-0 flex-1 rounded-button border border-divider bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-accent"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="min-h-10 rounded-button bg-accent px-3 text-sm font-medium text-white transition-[opacity,scale] active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Set {field}
        </button>
      </div>
      <button
        type="button"
        onClick={() =>
          onAction({ type: hasSession ? "clearLocator" : "clearSourceHint" })
        }
        className="min-h-10 rounded-button px-3 text-sm text-accent transition-[background-color,scale] hover:bg-accent-subtle active:scale-[0.96]"
      >
        Clear {hasSession ? "Locators" : "Source Hints"}
      </button>
      <button
        ref={deleteButtonRef}
        type="button"
        onClick={() => setConfirmingDelete(true)}
        className="min-h-10 rounded-button px-3 text-sm text-red-600 transition-[background-color,scale] hover:bg-red-50 active:scale-[0.96]"
      >
        Delete selected
      </button>
    </form>
  );
}
