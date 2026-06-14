import { useState } from "react";
import { trpc } from "../../trpc";

export function TemplateEditor() {
  const utils = trpc.useUtils();
  const { data } = trpc.app.getEnrichmentTemplate.useQuery();
  const setTemplate = trpc.app.setEnrichmentTemplate.useMutation({
    onSuccess: () => {
      utils.app.getEnrichmentTemplate.invalidate();
    },
  });

  const [draft, setDraft] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const currentTemplate = data?.template ?? "";
  const display = draft ?? currentTemplate;

  function handleSave() {
    const value = draft?.trim();
    if (value != null && value.length > 0 && value !== currentTemplate) {
      setTemplate.mutate({ template: value });
    }
    setDraft(null);
    setShowEditor(false);
  }

  function handleCancel() {
    setDraft(null);
    setShowEditor(false);
  }

  if (!showEditor) {
    return (
      <div className="mx-5 mb-2">
        <button
          type="button"
          onClick={() => {
            setDraft(currentTemplate);
            setShowEditor(true);
          }}
          className="w-full rounded-button border border-dashed border-divider px-3 py-2.5 text-center text-sm text-dim transition-colors hover:border-accent hover:text-accent cursor-pointer"
        >
          Edit Enrichment Template
        </button>
      </div>
    );
  }

  return (
    <div className="mx-5 mb-2 space-y-2 rounded-button border border-accent bg-surface p-3">
      <label
        htmlFor="enrichment-template-editor"
        className="font-ui text-xs font-medium text-dim"
      >
        Enrichment Prompt Template
      </label>
      <textarea
        id="enrichment-template-editor"
        value={display}
        onChange={(e) => setDraft(e.target.value)}
        rows={6}
        placeholder="Enrich {{item}} from {{sourceName}}..."
        className="w-full rounded-button border border-divider bg-surface px-3 py-2 font-ui text-sm text-ink placeholder:text-dim resize-y focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <p className="text-xs text-dim">
        Use {"{{item}}"}, {"{{sourceName}}"}, {"{{sourceType}}"},{" "}
        {"{{locator}}"}, {"{{existingEntries}}"} as placeholders.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={setTemplate.isPending || !draft?.trim()}
          className="flex-1 rounded-button bg-accent px-4 py-2 font-ui text-sm font-medium text-page transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {setTemplate.isPending ? "\u2026" : "Save"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-button border border-divider px-4 py-2 font-ui text-sm text-dim hover:text-ink transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
