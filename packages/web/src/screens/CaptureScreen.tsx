import { useState } from "react";
import { trpc } from "../trpc";

function formatCapture(capture: {
  id: number;
  item: string;
  locator: string | null;
  sourceHint: string | null;
}): string {
  const parts = [capture.item];
  if (capture.locator) parts.push(capture.locator);
  return parts.join(" · ");
}

export function CaptureScreen() {
  const [rawText, setRawText] = useState("");
  const [lastParsed, setLastParsed] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const captures = trpc.capture.list.useQuery();
  const createCapture = trpc.capture.create.useMutation({
    onSuccess: (data) => {
      utils.capture.list.invalidate();
      const parsed = formatCapture(data);
      setLastParsed(parsed);
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

  return (
    <main className="flex flex-1 flex-col pb-16">
      {/* Capture list area */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="font-ui text-dim">Capture your first word</p>
          </div>
        ) : (
          <ul className="divide-y divide-divider px-4">
            {captures.data.map((capture) => (
              <li key={capture.id} className="py-3">
                <span className="font-display text-ink">
                  {formatCapture(capture)}
                </span>
                {capture.sourceHint && (
                  <span className="ml-2 text-sm text-dim">
                    ({capture.sourceHint})
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Inline feedback */}
      {lastParsed && (
        <p className="mx-3 mb-1 rounded-button bg-accent-subtle px-3 py-1.5 text-sm text-accent transition-opacity">
          Captured: {lastParsed}
        </p>
      )}
      {createCapture.error && (
        <p className="mx-3 mb-1 text-sm text-accent">
          {createCapture.error.message}
        </p>
      )}

      {/* Capture input */}
      <div className="border-t border-divider bg-surface p-3 pb-safe">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Capture a word or phrase…"
            disabled={createCapture.isPending}
            className="min-w-0 flex-1 rounded-button border border-divider bg-surface px-3 py-2 font-ui text-ink placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            // biome-ignore lint/a11y/noAutofocus: capture input is the primary action, autofocus is intentional
            autoFocus
          />
          <button
            type="submit"
            disabled={createCapture.isPending || !rawText.trim()}
            className="shrink-0 rounded-button bg-accent px-4 py-2 font-ui font-medium text-page transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createCapture.isPending ? "…" : "Capture"}
          </button>
        </form>
      </div>
    </main>
  );
}
