import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useEffect, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedField, setSelectedField] = useState<EditableField | null>(
    null,
  );
  const [editing, setEditing] = useState<EditableField | null>(null);

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

  const [newTag, setNewTag] = useState("");
  const [editText, setEditText] = useState("");

  // Click outside deselects
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setSelectedField(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleFieldClick(field: EditableField) {
    if (editing) return;
    setSelectedField(selectedField === field ? null : field);
  }

  function handleSaveField(field: EditableField, value: string) {
    if (value.trim() !== "") {
      updateField.mutate({ entryId: id, field, value: value.trim() });
    }
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

        {/* Content fields — click to select, edit button in label row */}
        <div ref={containerRef} className="flex flex-col gap-4">
          {(
            ["definition", "translationArabic", "nuance", "examples"] as const
          ).map((field) => {
            const value = e[field as keyof typeof e] as string;
            const isEditing = editing === field;
            const isSelected = selectedField === field;
            const isArabic = field === "translationArabic";

            // Track textarea text separately so it updates during editing
            // We use a keyed child to reset state when field changes
            return (
              <div key={field} className="flex flex-col gap-1">
                {/* Label row: field name + edit button on selection */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-dim">
                    {FIELD_LABELS[field]}
                  </span>
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setEditText(value);
                      setEditing(field);
                    }}
                    className={`rounded-button bg-accent px-2.5 py-0.5 text-xs font-medium text-white cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-1 pointer-events-none"
                    }`}
                  >
                    Edit
                  </button>
                </div>

                {/* Selectable area: click to select, edit button appears.
                    View mode uses <button> for valid a11y semantics.
                    Edit mode uses <div> to avoid nesting <textarea> in <button>. */}
                {isEditing ? (
                  <div className="w-full rounded-button">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className={`w-full rounded-button border border-accent bg-surface px-2 py-1.5 text-sm text-ink leading-relaxed outline-none resize-none ${
                        isArabic ? "font-arabic text-end" : "text-left"
                      }`}
                      rows={Math.max(
                        2,
                        Math.min(
                          Math.ceil(value.length / 50) +
                            (value.match(/\n/g) || []).length,
                          6,
                        ),
                      )}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleFieldClick(field)}
                    className={`w-full rounded-button transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-accent-subtle ring-1 ring-accent/20"
                        : "hover:bg-surface"
                    }`}
                  >
                    <p
                      className={`px-2 py-1.5 text-sm text-ink leading-relaxed select-text ${
                        isArabic ? "font-arabic text-end" : "text-left"
                      }`}
                    >
                      {value || <span className="italic text-dim">Empty</span>}
                    </p>
                  </button>
                )}

                {/* Save/Cancel buttons — only shown when editing this field */}
                {isEditing && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleSaveField(field, editText);
                        setEditing(null);
                        setSelectedField(null);
                      }}
                      className="rounded-button bg-accent px-3 py-1 text-xs font-medium text-white hover:opacity-90 cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(null);
                        setSelectedField(null);
                      }}
                      className="rounded-button border border-divider px-3 py-1 text-xs text-dim hover:text-ink cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

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
                onChange={(ev) => setNewTag(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" && newTag.trim()) {
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
