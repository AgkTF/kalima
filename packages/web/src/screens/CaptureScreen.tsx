import { useState } from "react";
import { trpc } from "../trpc";

function CaptureEntry({
  capture,
}: {
  capture: {
    id: number;
    item: string;
    locator: string | null;
    sourceHint: string | null;
  };
}) {
  const locator = capture.locator || "\u2014"; // em dash

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

export function CaptureScreen() {
  const [rawText, setRawText] = useState("");
  const [lastParsed, setLastParsed] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const captures = trpc.capture.list.useQuery();
  const createCapture = trpc.capture.create.useMutation({
    onSuccess: data => {
      utils.capture.list.invalidate();
      const parts = [data.item];
      if (data.locator) parts.push(data.locator);
      setLastParsed(parts.join(" \u00b7 "));
      setTimeout(() => setLastParsed(null), 1500);
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim() || createCapture.isPending) return;

    await createCapture.mutateAsync({ rawText: rawText.trim() });
    setRawText("");
  }

  const isEmpty = !captures.data || captures.data.length === 0;
  const count = captures.data?.length ?? 0;

  return (
    <main className="flex flex-1 flex-col pb-32 relative">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="font-display text-lg font-bold text-ink">Capture</h1>
        {count > 0 && (
          <span className="rounded-full bg-accent-subtle px-2 text-xs text-dim">
            {count}
          </span>
        )}
      </header>

      {/* Capture list area */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="font-ui text-dim">Capture your first word</p>
          </div>
        ) : (
          <ul className="px-5">
            {captures.data.map(capture => (
              <CaptureEntry key={capture.id} capture={capture} />
            ))}
          </ul>
        )}
      </div>

      {/* Inline feedback */}
      {lastParsed && (
        <p className="rounded-button bg-accent-subtle px-3 py-2 text-sm text-accent fixed bottom-32 left-3 right-3 border border-dim">
          Captured: {lastParsed}
        </p>
      )}
      {createCapture.error && (
        <p className="fixed bottom-32 left-3 right-3 rounded-button border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {createCapture.error.message}
        </p>
      )}

      {/* Capture input */}
      <div className="border-t border-divider bg-surface py-3 px-5 w-full fixed bottom-14">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="Capture a word or phrase..."
            disabled={createCapture.isPending}
            className="min-w-0 flex-1 rounded-button border border-divider bg-surface px-3 py-2 font-ui text-ink placeholder:text-dim placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            // biome-ignore lint/a11y/noAutofocus: capture input is the primary action, autofocus is intentional
            autoFocus
          />
          <button
            type="submit"
            disabled={createCapture.isPending || !rawText.trim()}
            className="shrink-0 rounded-button bg-accent px-4 py-2 font-ui font-medium text-page transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {createCapture.isPending ? "\u2026" : "Capture"}
          </button>
        </form>
      </div>
    </main>
  );
}
