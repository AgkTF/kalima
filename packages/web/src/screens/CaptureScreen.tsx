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

const SOURCE_TYPES = [
  { value: "book", label: "Book" },
  { value: "video", label: "Video" },
  { value: "article", label: "Article" },
] as const;

export function CaptureScreen() {
  const [rawText, setRawText] = useState("");
  const [lastParsed, setLastParsed] = useState<string | null>(null);

  // Session start form state
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] =
    useState<(typeof SOURCE_TYPES)[number]["value"]>("book");

  const utils = trpc.useUtils();

  // Queries
  const activeSession = trpc.session.getActive.useQuery();
  const captures = trpc.capture.list.useQuery();
  const sessionCaptures = trpc.capture.listSession.useQuery(
    { sessionId: activeSession.data?.id ?? 0 },
    { enabled: activeSession.data != null },
  );

  // Mutations
  const createCapture = trpc.capture.create.useMutation({
    onSuccess: (data) => {
      if (activeSession.data) {
        utils.capture.listSession.invalidate({
          sessionId: activeSession.data.id,
        });
      } else {
        utils.capture.list.invalidate();
      }
      const parts = [data.item];
      if (data.locator) parts.push(data.locator);
      setLastParsed(parts.join(" \u00b7 "));
      setTimeout(() => setLastParsed(null), 1500);
    },
  });

  const openSession = trpc.session.open.useMutation({
    onSuccess: () => {
      utils.session.getActive.invalidate();
      setShowSessionForm(false);
      setSourceName("");
    },
  });

  const closeSession = trpc.session.close.useMutation({
    onSuccess: () => {
      utils.session.getActive.invalidate();
    },
  });

  // Handlers
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim() || createCapture.isPending) return;

    const input: { rawText: string; sessionId?: number } = {
      rawText: rawText.trim(),
    };
    if (activeSession.data) {
      input.sessionId = activeSession.data.id;
    }

    await createCapture.mutateAsync(input);
    setRawText("");
  }

  async function handleStartSession(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceName.trim() || openSession.isPending) return;

    await openSession.mutateAsync({
      sourceName: sourceName.trim(),
      type: sourceType,
    });
  }

  function handleCloseSession() {
    if (!closeSession.isPending) {
      closeSession.mutate();
    }
  }

  // Determine which captures to show
  const activeCaptures = activeSession.data
    ? (sessionCaptures.data ?? [])
    : (captures.data ?? []);
  const isEmpty = activeCaptures.length === 0;
  const hasSession = activeSession.data != null;

  return (
    <main className="flex flex-1 flex-col relative">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="font-display text-lg font-bold text-ink">Capture</h1>
        {activeCaptures.length > 0 && (
          <span className="rounded-full bg-accent-subtle px-2 text-xs text-dim">
            {activeCaptures.length}
          </span>
        )}
      </header>

      {/* Session header (active session state) */}
      {hasSession && (
        <div className="mx-5 mb-2 flex items-center justify-between rounded-button border border-divider bg-surface px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-sm font-semibold text-ink">
              {activeSession.data?.sourceName}
            </div>
            <div className="mt-0.5 text-xs text-dim">
              {activeSession.data?.type}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseSession}
            disabled={closeSession.isPending}
            className="ml-2 shrink-0 rounded-button border border-divider px-3 py-1 text-xs font-medium text-dim transition-colors hover:border-red-200 hover:text-red-600 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {closeSession.isPending ? "\u2026" : "Close"}
          </button>
        </div>
      )}

      {/* Start session prompt (no session state) */}
      {!hasSession && (
        <div className="mx-5 mb-2">
          {!showSessionForm ? (
            <button
              type="button"
              onClick={() => setShowSessionForm(true)}
              className="w-full rounded-button border border-dashed border-divider px-3 py-2.5 text-center text-sm text-dim transition-colors hover:border-accent hover:text-accent cursor-pointer"
            >
              Start a Session
            </button>
          ) : (
            <form
              onSubmit={handleStartSession}
              className="space-y-2 rounded-button border border-accent bg-surface p-3"
            >
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="Source title (e.g. Moby Dick)"
                disabled={openSession.isPending}
                className="w-full rounded-button border border-divider bg-surface px-3 py-2 font-ui text-sm text-ink placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                // biome-ignore lint/a11y/noAutofocus: session start is the primary action when shown, autofocus is intentional
                autoFocus
              />
              <div className="flex gap-2">
                <select
                  value={sourceType}
                  onChange={(e) =>
                    setSourceType(
                      e.target.value as (typeof SOURCE_TYPES)[number]["value"],
                    )
                  }
                  disabled={openSession.isPending}
                  className="rounded-button border border-divider bg-surface px-3 py-2 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 cursor-pointer"
                >
                  {SOURCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={openSession.isPending || !sourceName.trim()}
                  className="flex-1 rounded-button bg-accent px-4 py-2 font-ui text-sm font-medium text-page transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {openSession.isPending ? "\u2026" : "Open Session"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowSessionForm(false)}
                className="w-full text-center text-xs text-dim hover:text-ink transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      )}

      {/* Capture list area */}
      <div className="flex flex-1 flex-col overflow-y-auto pb-40">
        {isEmpty ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="font-ui text-dim">
              {hasSession
                ? "Capture your first word in this session"
                : "Capture your first word"}
            </p>
          </div>
        ) : (
          <ul className="px-5">
            {activeCaptures.map((capture) => (
              <CaptureEntry key={capture.id} capture={capture} />
            ))}
          </ul>
        )}
      </div>

      {/* Inline feedback */}
      {lastParsed && (
        <p className="fixed bottom-32 left-3 right-3 rounded-button border border-dim bg-accent-subtle px-3 py-2 text-sm text-accent">
          Captured: {lastParsed}
        </p>
      )}
      {createCapture.error && (
        <p className="fixed bottom-32 left-3 right-3 rounded-button border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {createCapture.error.message}
        </p>
      )}

      {/* Capture input */}
      <div className="fixed bottom-14 w-full border-t border-divider bg-surface px-5 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
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
