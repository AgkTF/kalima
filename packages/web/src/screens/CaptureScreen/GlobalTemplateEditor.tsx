import { useState } from "react";
import { trpc } from "../../trpc";

export function GlobalTemplateEditor() {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const utils = trpc.useUtils();

  const globalTemplate = trpc.enrichment.getGlobalTemplate.useQuery(undefined, {
    enabled: isOpen,
  });

  const setGlobalTemplate = trpc.enrichment.setGlobalTemplate.useMutation({
    onSuccess: () => {
      utils.enrichment.getGlobalTemplate.invalidate();
    },
  });

  function handleOpen() {
    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
    setDraft("");
  }

  function handleSave() {
    if (draft.trim()) {
      setGlobalTemplate.mutate({ template: draft.trim() });
    }
    setIsOpen(false);
    setDraft("");
  }

  // Sync draft with fetched template when it loads
  if (isOpen && globalTemplate.data != null && draft === "") {
    setDraft(globalTemplate.data);
  }

  return (
    <div className="mx-5 mb-2">
      {!isOpen ? (
        <button
          type="button"
          onClick={handleOpen}
          className="w-full rounded-button border border-dashed border-divider px-3 py-2 text-center text-xs text-dim transition-colors hover:border-accent hover:text-accent cursor-pointer"
        >
          {globalTemplate.data != null
            ? "Edit Enrichment Context"
            : "Set Enrichment Context"}
        </button>
      ) : (
        <div className="space-y-2 rounded-button border border-accent bg-surface p-3">
          <label
            htmlFor="global-template"
            className="block font-ui text-xs font-medium text-dim"
          >
            Global Enrichment Context
          </label>
          <p className="text-xs text-dim">
            Additional instructions injected into the system prompt for all
            enrichments. Use this to provide domain context (e.g., &quot;This is
            from Dune, a sci-fi novel. Focus on technical terminology.&quot;).
          </p>
          <textarea
            id="global-template"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={setGlobalTemplate.isPending}
            rows={5}
            className="w-full rounded-button border border-divider bg-surface px-3 py-2 font-ui text-sm text-ink placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 resize-y"
            placeholder={`You are a word bank enrichment agent. For the given item, produce:
- definition: a context-appropriate meaning
- translationArabic: the Arabic equivalent
- nuance: a note on subtle shades of meaning
- examples: 2-3 sentences demonstrating usage
- tags: relevant categories
- relatedEntries: existing word bank entries that are connected
- confidence: "high" or "low"
Do NOT include etymology.

Additional context:
This is from Dune, a sci-fi novel. Focus on technical terminology.`}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={setGlobalTemplate.isPending || !draft.trim()}
              className="flex-1 rounded-button bg-accent px-4 py-2 font-ui text-sm font-medium text-page transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {setGlobalTemplate.isPending ? "\u2026" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-button border border-divider px-4 py-2 font-ui text-sm text-dim hover:text-ink transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
