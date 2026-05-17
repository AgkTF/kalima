interface Capture {
  id: number;
  item: string;
  locator: string | null;
  sourceHint: string | null;
  entry: { status: string } | null;
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

/* ── Normal (non-processing) capture entry ── */
function NormalCaptureEntry({ capture }: { capture: Capture }) {
  const locator = capture.locator || "—";
  return (
    <li className="border-b border-divider py-2.5 last:border-b-0">
      <div className="font-display text-base font-semibold text-ink">
        {capture.item}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-xs">
        <span className="font-medium text-accent">{locator}</span>
        {capture.sourceHint && (
          <>
            <span className="select-none text-divider">&middot;</span>
            <span className="rounded-[5px] bg-chip px-1.5 py-px font-medium text-chip-text">
              {capture.sourceHint}
            </span>
          </>
        )}
      </div>
    </li>
  );
}

/* ── Entry point ── */
function CaptureEntry({ capture }: { capture: Capture }) {
  if (capture.entry?.status === "processing") {
    return <ProcessingCaptureEntry capture={capture} />;
  }
  return <NormalCaptureEntry capture={capture} />;
}

export function CaptureList({
  captures,
  hasSession,
}: {
  captures: Capture[];
  hasSession: boolean;
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
          <CaptureEntry key={capture.id} capture={capture} />
        ))}
      </ul>
    </div>
  );
}
