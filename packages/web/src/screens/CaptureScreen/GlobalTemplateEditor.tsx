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
            ? "Edit Enrichment Prompt Template"
            : "Set Enrichment Prompt Template"}
        </button>
      ) : (
        <div className="space-y-2 rounded-button border border-accent bg-surface p-3">
          <label
            htmlFor="global-template"
            className="block font-ui text-xs font-medium text-dim"
          >
            Global Enrichment Prompt Template
          </label>
          <p className="text-xs text-dim">
            Use {"{item}"}, {"{source}"}, {"{locator}"}, and{" "}
            {"{existingEntries}"} as placeholders.
          </p>
          <textarea
            id="global-template"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={setGlobalTemplate.isPending}
            rows={5}
            className="w-full rounded-button border border-divider bg-surface px-3 py-2 font-ui text-sm text-ink placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 resize-y"
            placeholder={`Enrich the following item: "{item}"\n\nSource: "{source}"\nLocator: {locator}\n\nExisting word bank entries for context:\n{existingEntries}`}
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
