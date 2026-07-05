import { useRef, useState } from "react";

interface Capture {
  id: number;
  item: string;
  locator: string | null;
  sourceHint: string | null;
  entry: { status: string } | null;
}

interface CaptureUpdateData {
  locator?: string | null;
  sourceHint?: string | null;
}

/* ── Processing capture entry (B3: dim ping dot, 80% text) ── */
function ProcessingCaptureEntry({ capture }: { capture: Capture }) {
  return (
    <li className="border-b border-divider py-2.5 last:border-b-0">
      <div className="flex items-center gap-2.5 font-display text-base font-semibold text-ink/80">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-dim opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-dim" />
        </span>
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

/* ── Inline locator/source editor ── */
function InlineFieldEditor({
  hasSession,
  onUpdate,
}: {
  hasSession: boolean;
  onUpdate: (data: CaptureUpdateData) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const escapePressed = useRef(false);

  const label = hasSession ? "+ add locator" : "+ add source";

  function handleSave() {
    const trimmed = value.trim();
    if (!trimmed) {
      setEditing(false);
      return;
    }
    if (hasSession) {
      onUpdate({ locator: trimmed });
    } else {
      onUpdate({ sourceHint: trimmed });
    }
    setEditing(false);
  }

  function handleCancel() {
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      escapePressed.current = true;
      handleCancel();
    }
  }

  if (editing) {
    return (
      <input
        // biome-ignore lint/a11y/noAutofocus: intentional for inline edit UX
        autoFocus
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (escapePressed.current) {
            escapePressed.current = false;
            return;
          }
          handleSave();
        }}
        className="rounded-[5px] border border-accent bg-surface px-1.5 py-px font-medium text-xs text-ink outline-none focus:ring-1 focus:ring-accent"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue("");
        setEditing(true);
      }}
      className="rounded-[5px] border border-dashed border-divider px-1.5 py-px font-medium text-xs text-dim transition-colors hover:border-accent hover:text-accent cursor-pointer"
    >
      {label}
    </button>
  );
}

/* ── Normal (non-processing) capture entry ── */
function NormalCaptureEntry({
  capture,
  hasSession,
  onUpdateCapture,
}: {
  capture: Capture;
  hasSession: boolean;
  onUpdateCapture: (captureId: number, data: CaptureUpdateData) => void;
}) {
  const showTapTarget = hasSession ? !capture.locator : !capture.sourceHint;

  return (
    <li className="border-b border-divider py-2.5 last:border-b-0">
      <div className="font-display text-base font-semibold text-ink">
        {capture.item}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-xs">
        {showTapTarget ? (
          <InlineFieldEditor
            hasSession={hasSession}
            onUpdate={(data) => onUpdateCapture(capture.id, data)}
          />
        ) : (
          <>
            {capture.locator && (
              <span className="font-medium text-accent">{capture.locator}</span>
            )}
            {capture.sourceHint && (
              <>
                {capture.locator && (
                  <span className="select-none text-divider">&middot;</span>
                )}
                <span className="rounded-[5px] bg-chip px-1.5 py-px font-medium text-chip-text">
                  {capture.sourceHint}
                </span>
              </>
            )}
          </>
        )}
      </div>
    </li>
  );
}

/* ── Entry point ── */
function CaptureEntry({
  capture,
  hasSession,
  onUpdateCapture,
}: {
  capture: Capture;
  hasSession: boolean;
  onUpdateCapture: (captureId: number, data: CaptureUpdateData) => void;
}) {
  if (capture.entry?.status === "processing") {
    return <ProcessingCaptureEntry capture={capture} />;
  }
  return (
    <NormalCaptureEntry
      capture={capture}
      hasSession={hasSession}
      onUpdateCapture={onUpdateCapture}
    />
  );
}

export function CaptureList({
  captures,
  hasSession,
  onUpdateCapture,
  updateError,
  onEnrich,
  enrichPending,
}: {
  captures: Capture[];
  hasSession: boolean;
  onUpdateCapture: (captureId: number, data: CaptureUpdateData) => void;
  updateError: string | null;
  onEnrich?: () => void;
  enrichPending?: boolean;
}) {
  const pendingCount = captures.filter((c) => c.entry === null).length;
  const showEnrichButton = !hasSession && pendingCount > 0 && onEnrich != null;

  if (captures.length === 0) {
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
      {/* Enrich all (N) batch button — mirrors Review screen's "Approve all (N)". */}
      {/* Shown only when no session is active and there are pending one-offs. */}
      {/* Inline by design (1 use). Extract at 3+ uses. See ADR 0006. */}
      {showEnrichButton && (
        <div className="flex items-center justify-end px-5 pt-2">
          <button
            type="button"
            onClick={() => onEnrich?.()}
            disabled={enrichPending}
            className="rounded-button border border-accent px-2.5 py-1 text-xs font-medium text-accent cursor-pointer hover:bg-accent hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enrichPending ? "\u2026" : `Enrich all (${pendingCount})`}
          </button>
        </div>
      )}
      {updateError && (
        <div className="mx-5 mt-2 rounded-button border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {updateError}
        </div>
      )}
      <ul className="px-5">
        {captures.map((capture) => (
          <CaptureEntry
            key={capture.id}
            capture={capture}
            hasSession={hasSession}
            onUpdateCapture={onUpdateCapture}
          />
        ))}
      </ul>
    </div>
  );
}
