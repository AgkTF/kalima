import { useState } from "react";
import { trpc } from "../../trpc";
import { CaptureInput } from "./CaptureInput";
import { CaptureList } from "./CaptureList";
import { PromptTemplateEditor } from "./PromptTemplateEditor";
import { SessionForm } from "./SessionForm";

export function CaptureScreen() {
  const [lastParsed, setLastParsed] = useState<string | null>(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

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
  const defaultTemplate = trpc.promptTemplate.getDefault.useQuery(undefined, {
    staleTime: Infinity,
  });

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
      utils.source.list.invalidate();
      setShowSessionForm(false);
    },
  });

  const setDefaultTemplate = trpc.promptTemplate.setDefault.useMutation({
    onSuccess: () => {
      utils.promptTemplate.getDefault.invalidate();
    },
  });

  const closeSession = trpc.session.close.useMutation({
    onSuccess: () => {
      utils.session.getActive.invalidate();
    },
  });

  const hasSession = activeSession.data != null;
  const activeCaptures = hasSession
    ? (sessionCaptures.data ?? [])
    : (captures.data ?? []);

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
              {activeSession.data?.source?.name}
            </div>
            <div className="mt-0.5 text-xs text-dim">
              {activeSession.data?.source?.type}
            </div>
          </div>
          <button
            type="button"
            onClick={() => closeSession.mutate()}
            disabled={closeSession.isPending}
            className="ml-2 shrink-0 rounded-button border border-divider px-3 py-1 text-xs font-medium text-dim transition-colors hover:border-red-200 hover:text-red-600 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {closeSession.isPending ? "\u2026" : "Close"}
          </button>
        </div>
      )}

      {/* Start session prompt (no session state) */}
      {!hasSession && (
        <div className="mx-5 mb-2 space-y-2">
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
              defaultTemplate={defaultTemplate.data}
              isPending={openSession.isPending}
              onStart={(name, type, enrichmentPromptTemplate) =>
                openSession.mutate({
                  name,
                  type: type as "book" | "video" | "article",
                  enrichmentPromptTemplate,
                })
              }
              onCancel={() => setShowSessionForm(false)}
            />
          )}

          {!showSessionForm && (
            <>
              <button
                type="button"
                onClick={() => setShowTemplateEditor((s) => !s)}
                className="w-full rounded-button border border-divider px-3 py-2 text-center text-xs text-dim transition-colors hover:border-accent hover:text-accent cursor-pointer"
              >
                {showTemplateEditor
                  ? "Hide prompt template"
                  : "Edit enrichment prompt template"}
              </button>
              {showTemplateEditor && (
                <PromptTemplateEditor
                  defaultTemplate={defaultTemplate.data}
                  isLoading={defaultTemplate.isLoading}
                  isPending={setDefaultTemplate.isPending}
                  onSave={(template) => setDefaultTemplate.mutate({ template })}
                />
              )}
            </>
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
    </main>
  );
}
