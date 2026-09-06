import { useEffect, useRef, useState } from "react";
import type { Capture, CaptureUpdateData } from "../captureTypes";
import { CaptureEntry } from "./CaptureEntry";

const DELETE_UNDO_MS = 5_000;

interface PendingDeletion {
  capture: Capture;
  timeoutId: number | null;
}

export function CaptureList({
  captures,
  hasSession,
  onUpdateCapture,
  updateError,
  onDeleteCapture,
  onPendingDeletionChange,
  onEnrich,
  enrichPending,
}: {
  captures: Capture[];
  hasSession: boolean;
  onUpdateCapture: (captureId: number, data: CaptureUpdateData) => void;
  updateError: string | null;
  onDeleteCapture?: (captureId: number) => Promise<void>;
  onPendingDeletionChange?: (captureId: number | null) => void;
  onEnrich?: () => void;
  enrichPending?: boolean;
}) {
  const [pendingDeletion, setPendingDeletion] =
    useState<PendingDeletion | null>(null);
  const [deletionAnnouncement, setDeletionAnnouncement] = useState("");
  const pendingDeletionRef = useRef<PendingDeletion | null>(null);
  const onDeleteCaptureRef = useRef(onDeleteCapture);
  onDeleteCaptureRef.current = onDeleteCapture;

  // ponytail: client timer commits on React unmount; use a server-scheduled
  // deletion if hard-reload durability becomes necessary.
  useEffect(
    () => () => {
      const deletion = pendingDeletionRef.current;
      if (!deletion || deletion.timeoutId === null) return;

      window.clearTimeout(deletion.timeoutId);
      const deleteCapture = onDeleteCaptureRef.current;
      if (deleteCapture) {
        void deleteCapture(deletion.capture.id).catch(() => {});
      }
    },
    [],
  );
  const visibleCaptures = pendingDeletion
    ? captures.filter((capture) => capture.id !== pendingDeletion.capture.id)
    : captures;
  const pendingCount = visibleCaptures.filter((c) => c.entry === null).length;
  const showEnrichButton = !hasSession && pendingCount > 0 && onEnrich != null;

  function updatePendingDeletion(deletion: PendingDeletion | null) {
    pendingDeletionRef.current = deletion;
    setPendingDeletion(deletion);
    onPendingDeletionChange?.(deletion?.capture.id ?? null);
  }

  function requestDelete(capture: Capture) {
    if (!onDeleteCapture) return;

    const timeoutId = window.setTimeout(async () => {
      updatePendingDeletion({ capture, timeoutId: null });
      setDeletionAnnouncement(`Deleting ${capture.item}.`);
      try {
        await onDeleteCapture(capture.id);
        setDeletionAnnouncement(`${capture.item} deleted.`);
      } catch {
        // The mutation exposes its message through updateError; restore the row.
        setDeletionAnnouncement(
          `${capture.item} could not be deleted and was restored.`,
        );
      } finally {
        updatePendingDeletion(null);
      }
    }, DELETE_UNDO_MS);
    updatePendingDeletion({ capture, timeoutId });
    setDeletionAnnouncement(
      `${capture.item} removed. Undo available for five seconds.`,
    );
  }

  function undoDelete() {
    if (!pendingDeletion || pendingDeletion.timeoutId === null) return;
    window.clearTimeout(pendingDeletion.timeoutId);
    setDeletionAnnouncement(`${pendingDeletion.capture.item} restored.`);
    updatePendingDeletion(null);
  }

  if (visibleCaptures.length === 0 && !pendingDeletion) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto pb-40">
        <div className="flex flex-1 items-center justify-center">
          <p className="font-ui text-dim">
            {hasSession
              ? "Capture your first word in this session"
              : "Capture your first word"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto pb-40">
      <p className="sr-only" role="status">
        {deletionAnnouncement}
      </p>
      {/* Enrich all (N) batch button — mirrors Review screen's "Approve all (N)". */}
      {/* Shown only when no session is active and there are pending one-offs. */}
      {/* Inline by design (1 use). Extract at 3+ uses. See ADR 0006. */}
      {showEnrichButton && (
        <div className="flex items-center justify-end px-5 pt-2">
          <button
            type="button"
            onClick={() => onEnrich?.()}
            disabled={enrichPending || pendingDeletion !== null}
            className="rounded-button border border-accent px-2.5 py-1 text-xs font-medium text-accent cursor-pointer hover:bg-accent hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enrichPending ? "\u2026" : `Enrich all (${pendingCount})`}
          </button>
        </div>
      )}
      {updateError && (
        <div
          className="mx-5 mt-2 rounded-button border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
          role="alert"
        >
          {updateError}
        </div>
      )}
      <ul className="px-5">
        {pendingDeletion && (
          <li className="flex min-h-12 items-center justify-between border-b border-divider text-sm text-dim">
            <span>
              {pendingDeletion.timeoutId !== null
                ? "Capture removed"
                : "Deleting capture…"}
            </span>
            {pendingDeletion.timeoutId !== null && (
              <button
                type="button"
                aria-label={`Undo delete ${pendingDeletion.capture.item}`}
                onClick={undoDelete}
                // biome-ignore lint/a11y/noAutofocus: focus follows the confirmed destructive action
                autoFocus
                className="min-h-10 rounded-button px-3 font-medium text-accent transition-[background-color,scale] duration-150 ease-out hover:bg-accent-subtle active:scale-[0.96]"
              >
                Undo
              </button>
            )}
          </li>
        )}
        {visibleCaptures.map((capture) => (
          <CaptureEntry
            key={capture.id}
            capture={capture}
            hasSession={hasSession}
            onUpdateCapture={onUpdateCapture}
            onRequestDelete={
              onDeleteCapture && !pendingDeletion ? requestDelete : undefined
            }
          />
        ))}
      </ul>
    </div>
  );
}
