import { useState } from "react";

export function CaptureInput({
  isPending,
  error,
  lastParsed,
  onSubmit,
}: {
  isPending: boolean;
  error: string | null;
  lastParsed: string | null;
  onSubmit: (text: string) => void;
}) {
  const [rawText, setRawText] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim() || isPending) return;
    onSubmit(rawText.trim());
    setRawText("");
  }

  return (
    <>
      {/* Inline feedback */}
      {lastParsed && (
        <p className="fixed bottom-32 left-3 right-3 rounded-button border border-dim bg-accent-subtle px-3 py-2 text-sm text-accent">
          Captured: {lastParsed}
        </p>
      )}
      {error && (
        <p className="fixed bottom-32 left-3 right-3 rounded-button border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Input bar */}
      <div className="fixed bottom-14 w-full border-t border-divider bg-surface px-5 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Capture a word or phrase..."
            disabled={isPending}
            className="min-w-0 flex-1 rounded-button border border-divider bg-surface px-3 py-2 font-ui text-ink placeholder:text-dim placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            // biome-ignore lint/a11y/noAutofocus: capture input is the primary action, autofocus is intentional
            autoFocus
          />
          <button
            type="submit"
            disabled={isPending || !rawText.trim()}
            className="shrink-0 rounded-button bg-accent px-4 py-2 font-ui font-medium text-page transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isPending ? "\u2026" : "Capture"}
          </button>
        </form>
      </div>
    </>
  );
}
