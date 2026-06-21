import { useState } from "react";
import { trpc } from "../../trpc";
import { CaptureInput } from "./CaptureInput";
import { CaptureList } from "./CaptureList";
import { EnrichmentContextEditor } from "./EnrichmentContextEditor";
import { SessionForm } from "./SessionForm";
import { SystemPromptEditor } from "./SystemPromptEditor";

export function CaptureScreen() {
  const [lastParsed, setLastParsed] = useState<string | null>(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [showContextEditor, setShowContextEditor] = useState(false);

  const utils = trpc.useUtils();

  // Queries
  const activeSession = trpc.session.getActive.useQuery();
  const captures = trpc.capture.list.useQuery(undefined, {
    refetchInterval: 5_000,
  });
  const sessionCaptures = trpc.capture.listSession.useQuery(
    { sessionId: activeSession.data?.id ?? 0 },
    { enabled: activeSession.data != null },
  );
  const allSources = trpc.source.list.useQuery(undefined, {
    staleTime: Infinity,
  });
  const baseSystemPrompt = trpc.app.getBaseSystemPrompt.useQuery(undefined, {
    enabled: showPromptEditor,
  });

  // Mutations
  const setBaseSystemPrompt = trpc.app.setBaseSystemPrompt.useMutation({
    onSuccess: () => {
      utils.app.getBaseSystemPrompt.invalidate();
      setShowPromptEditor(false);
    },
  });
  const resetBaseSystemPrompt = trpc.app.resetBaseSystemPrompt.useMutation({
    onSuccess: () => {
      utils.app.getBaseSystemPrompt.invalidate();
    },
  });

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
      utils.source.list.invalidate();
      setShowSessionForm(false);
    },
  });

  const updateEnrichmentContext =
    trpc.source.updateEnrichmentContext.useMutation({
      onSuccess: () => {
        utils.session.getActive.invalidate();
        utils.source.list.invalidate();
        setShowContextEditor(false);
      },
    });

  const closeSession = trpc.session.close.useMutation({
    onSuccess: () => {
      utils.session.getActive.invalidate();
    },
  });

  const hasSession = activeSession.data != null;
  const activeSource = activeSession.data?.source ?? null;
  const activeCaptures = hasSession
    ? (sessionCaptures.data ?? [])
    : (captures.data ?? []);

  return (
    <main className="flex flex-1 flex-col relative">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="font-display text-lg font-bold text-ink">Capture</h1>
        <div className="flex items-center gap-2">
          {activeCaptures.length > 0 && (
            <span className="rounded-full bg-accent-subtle px-2 text-xs text-dim">
              {activeCaptures.length}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowPromptEditor(true)}
            className="rounded-button border border-divider px-2.5 py-1 text-xs font-medium text-dim transition-colors hover:border-accent hover:text-accent cursor-pointer"
          >
            Prompt
          </button>
        </div>
      </header>

      {/* Session header (active session state) */}
      {hasSession && (
        <div className="mx-5 mb-2 space-y-2">
          <div className="flex items-center justify-between rounded-button border border-divider bg-surface px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-sm font-semibold text-ink">
                {activeSession.data?.source?.name}
              </div>
              <div className="mt-0.5 text-xs text-dim">
                {activeSession.data?.source?.type}
              </div>
            </div>
            <div className="ml-2 flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setShowContextEditor((v) => !v)}
                className={`rounded-button border px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  activeSession.data?.source?.enrichmentContext
                    ? "border-accent text-accent"
                    : "border-divider text-dim hover:border-accent hover:text-accent"
                }`}
              >
                Context
              </button>
              <button
                type="button"
                onClick={() => closeSession.mutate()}
                disabled={closeSession.isPending}
                className="rounded-button border border-divider px-3 py-1 text-xs font-medium text-dim transition-colors hover:border-red-200 hover:text-red-600 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {closeSession.isPending ? "\u2026" : "Close"}
              </button>
            </div>
          </div>
          {showContextEditor && activeSource && (
            <EnrichmentContextEditor
              initialContext={activeSource.enrichmentContext}
              isPending={updateEnrichmentContext.isPending}
              onSave={(enrichmentContext) =>
                updateEnrichmentContext.mutate({
                  sourceId: activeSource.id,
                  enrichmentContext,
                })
              }
              onCancel={() => setShowContextEditor(false)}
            />
          )}
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
            <SessionForm
              sources={allSources.data ?? []}
              isPending={openSession.isPending}
              onStart={(name, type, enrichmentContext) =>
                openSession.mutate({
                  name,
                  type: type as "book" | "video" | "article",
                  enrichmentContext,
                })
              }
              onCancel={() => setShowSessionForm(false)}
            />
          )}
        </div>
      )}

      {/* Capture list */}
      <CaptureList captures={activeCaptures} hasSession={hasSession} />

      {/* Capture input + feedback */}
      <CaptureInput
        isPending={createCapture.isPending}
        error={createCapture.error?.message ?? null}
        lastParsed={lastParsed}
        onSubmit={(text) =>
          createCapture.mutate({
            rawText: text,
            sessionId: activeSession.data?.id,
          })
        }
      />

      {/* System prompt editor */}
      <SystemPromptEditor
        open={showPromptEditor}
        initialPrompt={baseSystemPrompt.data?.current ?? ""}
        factoryDefaultPrompt={baseSystemPrompt.data?.factoryDefault ?? ""}
        isPending={
          setBaseSystemPrompt.isPending || resetBaseSystemPrompt.isPending
        }
        onClose={() => setShowPromptEditor(false)}
        onSave={(value) => setBaseSystemPrompt.mutate({ value })}
        onReset={() => resetBaseSystemPrompt.mutate()}
      />
    </main>
  );
}
