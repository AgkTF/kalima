import { useEffect, useState } from "react";
import { TemplateTextarea } from "./TemplateTextarea";

interface PromptTemplateEditorProps {
  defaultTemplate: string | undefined;
  isLoading: boolean;
  isPending: boolean;
  onSave: (template: string) => void;
}

export function PromptTemplateEditor({
  defaultTemplate,
  isLoading,
  isPending,
  onSave,
}: PromptTemplateEditorProps) {
  const [template, setTemplate] = useState("");

  useEffect(() => {
    if (defaultTemplate != null && template === "") {
      setTemplate(defaultTemplate);
    }
  }, [defaultTemplate, template]);

  const dirty = defaultTemplate != null && template !== defaultTemplate;

  return (
    <div className="space-y-2 rounded-button border border-divider bg-surface p-3">
      <TemplateTextarea
        label="Global enrichment prompt template"
        value={template}
        onChange={setTemplate}
        disabled={isLoading || isPending}
        placeholder="Loading default template..."
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-dim">
          Placeholders: {"{{item}}"}, {"{{source}}"}, {"{{sourceName}}"},{" "}
          {"{{sourceType}}"}, {"{{locator}}"}, {"{{existingEntries}}"}
        </span>
        <button
          type="button"
          onClick={() => onSave(template)}
          disabled={isLoading || isPending || !dirty}
          className="rounded-button bg-accent px-3 py-1.5 font-ui text-xs font-medium text-page transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
