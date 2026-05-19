import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { trpc } from "../trpc";

type EditableField = "definition" | "translationArabic" | "nuance" | "examples";

const FIELD_LABELS: Record<EditableField, string> = {
  definition: "Definition",
  translationArabic: "Translation",
  nuance: "Nuance",
  examples: "Examples",
};

export function WordBankEntryDetail() {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const id = Number(entryId);
  const utils = trpc.useUtils();

  const entry = trpc.wordBank.getEntry.useQuery(
    { entryId: id },
    { enabled: !Number.isNaN(id) },
  );

  const updateField = trpc.wordBank.updateField.useMutation({
    onSuccess: () => {
      utils.wordBank.getEntry.invalidate({ entryId: id });
    },
  });

  const addTag = trpc.wordBank.addTag.useMutation({
    onSuccess: () => {
      utils.wordBank.getEntry.invalidate({ entryId: id });
      setNewTag("");
    },
  });

  const removeTag = trpc.wordBank.removeTag.useMutation({
    onSuccess: () => {
      utils.wordBank.getEntry.invalidate({ entryId: id });
    },
  });

  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newTag, setNewTag] = useState("");

  function startEdit(field: EditableField, current: string) {
    setEditingField(field);
    setEditValue(current);
  }

  function saveEdit() {
    if (editingField && editValue.trim() !== "") {
      updateField.mutate({
        entryId: id,
        field: editingField,
        value: editValue.trim(),
      });
    }
    setEditingField(null);
    setEditValue("");
  }

  function cancelEdit() {
    setEditingField(null);
    setEditValue("");
  }

  // Handle keyboard: Enter to save, Escape to cancel
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") cancelEdit();
  }

  // Loading
  if (entry.isLoading) {
    return (
      <main className="flex flex-1 flex-col pb-16">
        <header className="flex items-center gap-3 px-5 pt-4 pb-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-button p-1 text-dim hover:text-ink cursor-pointer"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold text-ink">
            Loading&hellip;
          </h1>
        </header>
      </main>
    );
  }

  // Not found
  if (!entry.data) {
    return (
      <main className="flex flex-1 flex-col pb-16">
        <header className="flex items-center gap-3 px-5 pt-4 pb-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-button p-1 text-dim hover:text-ink cursor-pointer"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold text-ink">Not found</h1>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-dim">Entry not found</p>
        </div>
      </main>
    );
  }

  const e = entry.data;
  const tags: string[] = JSON.parse(e.tags || "[]");
  const source = e.capture.session?.source;

  return (
    <main className="flex flex-1 flex-col pb-16">
      {/* Header with back button */}
      <header className="flex items-center gap-3 px-5 pt-4 pb-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-button p-1 text-dim hover:text-ink cursor-pointer"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="font-display text-xl font-bold text-ink">
          {e.capture.item}
        </h1>
      </header>

      {/* Locator */}
      {e.capture.locator && (
        <p className="mx-5 mb-1 text-xs text-dim">{e.capture.locator}</p>
      )}

      <div className="flex flex-col gap-4 px-5 py-3">
        {/* Source chip */}
        {source && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-dim">Source</span>
            <Link
              to={`/wordbank?q=${encodeURIComponent(source.name)}`}
              className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-xs font-medium text-chip-text hover:bg-accent-subtle transition-colors"
            >
              {source.name}
            </Link>
          </div>
        )}

        {/* Content fields: tap to edit */}
        {(
          ["definition", "translationArabic", "nuance", "examples"] as const
        ).map((field) => {
          const value = e[field];
          const isEditing = editingField === field;
          const isArabic = field === "translationArabic";

          return (
            <div key={field} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-dim">
                {FIELD_LABELS[field]}
              </span>
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={`w-full rounded-button border border-accent bg-surface px-3 py-2 text-sm text-ink outline-none resize-none ${
                      isArabic ? "font-arabic" : ""
                    }`}
                    rows={Math.min(editValue.split("\n").length + 1, 4)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="rounded-button bg-accent px-3 py-1 text-xs font-medium text-white hover:opacity-90 cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-button border border-divider px-3 py-1 text-xs text-dim hover:text-ink cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(field, value)}
                  className={`text-left text-sm text-ink cursor-pointer rounded-button px-1 py-0.5 hover:bg-accent-subtle transition-colors ${
                    isArabic ? "font-arabic" : ""
                  }`}
                >
                  {value || <span className="italic text-dim">Empty</span>}
                </button>
              )}
            </div>
          );
        })}

        {/* Tags: chips with remove, add */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-dim">Tags</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-xs font-medium text-chip-text"
              >
                <Link
                  to={`/wordbank?q=${encodeURIComponent(tag)}`}
                  className="hover:text-ink transition-colors"
                >
                  {tag}
                </Link>
                <button
                  type="button"
                  onClick={() => removeTag.mutate({ entryId: id, tag })}
                  className="text-dim hover:text-ink cursor-pointer"
                  aria-label={`Remove tag ${tag}`}
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
            {/* Add tag inline */}
            <span className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-divider px-2 py-1 text-xs text-dim">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTag.trim()) {
                    addTag.mutate({ entryId: id, tag: newTag.trim() });
                  }
                }}
                placeholder="Add tag"
                className="w-16 bg-transparent text-chip-text outline-none placeholder:text-dim"
              />
              <button
                type="button"
                onClick={() => {
                  if (newTag.trim()) {
                    addTag.mutate({ entryId: id, tag: newTag.trim() });
                  }
                }}
                className="text-dim hover:text-ink cursor-pointer"
                aria-label="Add tag"
              >
                <PlusIcon className="h-3 w-3" />
              </button>
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
