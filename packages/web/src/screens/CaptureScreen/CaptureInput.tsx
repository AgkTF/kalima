import { useRef, useState } from "react";
import { splitCaptureInput } from "./captureSplit";

export function CaptureInput({
  hasSession,
  error,
  onSubmit,
}: {
  hasSession: boolean;
  error: string | null;
  onSubmit: (
    item: string,
    locator: string | null,
    sourceHint: string | null,
  ) => void;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const placeholder = hasSession
    ? "word or phrase… use / for page or chapter"
    : "word or phrase… use / for where you heard it";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { item, afterSlash } = splitCaptureInput(text);
    if (!item) return;

    if (hasSession) {
      onSubmit(item, afterSlash, null);
    } else {
      onSubmit(item, null, afterSlash);
    }
    setText("");
  }

  // Build overlay segments for live visual split
  const slashIndex = text.indexOf("/");
  const hasSlash = slashIndex !== -1;
  const itemText = hasSlash ? text.slice(0, slashIndex) : text;
  const afterSlashText = hasSlash ? text.slice(slashIndex + 1) : "";

  return (
    <>
      {/* Error feedback */}
      {error && (
        <p className="fixed bottom-32 left-3 right-3 rounded-button border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Input bar */}
      <div className="fixed bottom-14 w-full border-t border-divider bg-surface px-5 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            {/* Live visual split overlay */}
            <div
              data-testid="split-overlay"
              className="pointer-events-none absolute inset-0 flex items-center overflow-hidden rounded-button border border-transparent px-3 py-2 font-ui text-base whitespace-pre"
              aria-hidden="true"
            >
              <span className="text-ink">{itemText}</span>
              {hasSlash && (
                <span data-slash className="text-dim">
                  /
                </span>
              )}
              {hasSlash && afterSlashText && (
                <span className="text-accent">{afterSlashText}</span>
              )}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              className="relative min-w-0 w-full rounded-button border border-divider bg-transparent px-3 py-2 font-ui text-base text-transparent placeholder:text-dim placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-accent caret-ink"
              // biome-ignore lint/a11y/noAutofocus: capture input is the primary action, autofocus is intentional
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!text.trim()}
            className="shrink-0 rounded-button bg-accent px-4 py-2 font-ui font-medium text-page transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            Capture
          </button>
        </form>
      </div>
    </>
  );
}
