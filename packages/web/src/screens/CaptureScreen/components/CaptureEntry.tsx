import { CheckIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import type { Capture, CaptureUpdateData } from "../captureTypes";
import { InlineTextEditor } from "./InlineTextEditor";

function LockedCaptureEntry({ capture }: { capture: Capture }) {
  const isProcessing = capture.entry?.status === "processing";

  return (
    <li className="border-b border-divider py-2.5 last:border-b-0">
      <div className="flex items-center gap-2.5 font-display text-base font-semibold text-ink/80">
        {isProcessing && (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-dim opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-dim" />
          </span>
        )}
        {capture.item}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-dim/60">
        {capture.locator && (
          <span className="font-medium text-accent/60">{capture.locator}</span>
        )}
        {capture.sourceHint && (
          <>
            {capture.locator && (
              <span className="select-none text-divider">&middot;</span>
            )}
            <span className="rounded-[5px] bg-chip/50 px-1.5 py-px font-medium text-chip-text/60">
              {capture.sourceHint}
            </span>
          </>
        )}
      </div>
    </li>
  );
}

function PendingCaptureEntry({
  capture,
  hasSession,
  onUpdateCapture,
  onRequestDelete,
}: {
  capture: Capture;
  hasSession: boolean;
  onUpdateCapture: (captureId: number, data: CaptureUpdateData) => void;
  onRequestDelete?: (capture: Capture) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const restoreDeleteFocus = useRef(false);

  useEffect(() => {
    if (!confirmingDelete && restoreDeleteFocus.current) {
      deleteButtonRef.current?.focus();
      restoreDeleteFocus.current = false;
    }
  }, [confirmingDelete]);

  return (
    <li
      className={`relative border-b border-divider py-2.5 last:border-b-0 ${
        onRequestDelete ? (confirmingDelete ? "pr-24" : "pr-12") : ""
      }`}
    >
      <div className="min-w-0">
        <InlineTextEditor
          value={capture.item}
          inputLabel={`Item for ${capture.item}`}
          onSave={(item) => {
            if (item) onUpdateCapture(capture.id, { item });
          }}
        />
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-xs">
        {hasSession ? (
          <InlineTextEditor
            value={capture.locator}
            inputLabel={`Locator for ${capture.item}`}
            emptyLabel="+ add locator"
            allowEmpty
            variant="metadata"
            onSave={(locator) => onUpdateCapture(capture.id, { locator })}
          />
        ) : (
          <InlineTextEditor
            value={capture.sourceHint}
            inputLabel={`Source Hint for ${capture.item}`}
            emptyLabel="+ add source"
            allowEmpty
            variant="metadata"
            onSave={(sourceHint) => onUpdateCapture(capture.id, { sourceHint })}
          />
        )}
      </div>
      {onRequestDelete && (
        <div className="absolute right-0 top-2.5 flex shrink-0 items-center gap-1">
          {confirmingDelete ? (
            <>
              <button
                type="button"
                aria-label={`Confirm delete ${capture.item}`}
                onClick={() => onRequestDelete(capture)}
                // biome-ignore lint/a11y/noAutofocus: focus follows the Delete disclosure
                autoFocus
                className="flex size-10 items-center justify-center rounded-full text-red-600 transition-[background-color,scale] duration-150 ease-out hover:bg-red-50 active:scale-[0.96]"
              >
                <CheckIcon className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Cancel delete ${capture.item}`}
                onClick={() => {
                  restoreDeleteFocus.current = true;
                  setConfirmingDelete(false);
                }}
                className="flex size-10 items-center justify-center rounded-full text-dim transition-[background-color,scale] duration-150 ease-out hover:bg-chip active:scale-[0.96]"
              >
                <XMarkIcon className="size-4" aria-hidden="true" />
              </button>
            </>
          ) : (
            <button
              ref={deleteButtonRef}
              type="button"
              aria-label={`Delete ${capture.item}`}
              onClick={() => setConfirmingDelete(true)}
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-dim transition-[background-color,color,scale] duration-150 ease-out hover:bg-red-50 hover:text-red-600 active:scale-[0.96]"
            >
              <TrashIcon className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export function CaptureEntry({
  capture,
  hasSession,
  onUpdateCapture,
  onRequestDelete,
}: {
  capture: Capture;
  hasSession: boolean;
  onUpdateCapture: (captureId: number, data: CaptureUpdateData) => void;
  onRequestDelete?: (capture: Capture) => void;
}) {
  if (capture.entry) {
    return <LockedCaptureEntry capture={capture} />;
  }
  return (
    <PendingCaptureEntry
      capture={capture}
      hasSession={hasSession}
      onUpdateCapture={onUpdateCapture}
      onRequestDelete={onRequestDelete}
    />
  );
}
