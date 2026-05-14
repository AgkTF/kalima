import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface Capture {
  id: number;
  item: string;
  locator: string | null;
  sourceHint: string | null;
  entry: { status: string } | null;
}

function CaptureEntry({ capture }: { capture: Capture }) {
  const isProcessing = capture.entry?.status === "processing";

  if (isProcessing) {
    return (
      <li className="border-b border-divider py-2.5 last:border-b-0">
        <div className="flex items-center gap-2 font-display text-base italic font-semibold text-ink">
          <ArrowPathIcon className="h-4 w-4 animate-spin text-dim shrink-0" />
          {capture.item}
        </div>
        <p className="mt-0.5 text-xs text-dim">Enriching…</p>
      </li>
    );
  }

  const locator = capture.locator || "—";

  return (
    <li className="border-b border-divider py-2.5 last:border-b-0">
      <div className="font-display text-base italic font-semibold text-ink">
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
