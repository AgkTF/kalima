import { useState } from "react";

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
  const locator = capture.locator || "—";
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
        <span className="font-medium text-accent/60">{locator}</span>
        {capture.sourceHint && (
          <>
            <span className="select-none text-divider">&middot;</span>
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
        onBlur={handleCancel}
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
}: {
  captures: Capture[];
  hasSession: boolean;
  onUpdateCapture: (captureId: number, data: CaptureUpdateData) => void;
}) {
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
