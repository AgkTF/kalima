import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { trpc } from "../trpc";
import { parseJsonField } from "./ReviewScreen/utils";

type EditableField = "definition" | "translationArabic" | "nuance" | "examples";

const FIELD_LABELS: Record<EditableField, string> = {
  definition: "Definition",
  translationArabic: "Translation",
  nuance: "Nuance",
  examples: "Examples",
};

function ExamplesDisplay({ value }: { value: string }) {
  const parsed = parseJsonField(value);

  if (parsed.length === 0) {
    return (
      <div className="px-2 py-1.5">
        <span className="italic text-dim text-sm">Empty</span>
      </div>
    );
  }

  return (
    <ul className="list-disc list-inside px-2 py-1.5 text-sm text-ink leading-relaxed select-text text-left">
      {parsed.map((ex: string) => (
        <li key={ex}>{renderEmphasis(ex)}</li>
      ))}
    </ul>
  );
}

/** Converts *italic* and **bold** markdown spans into <em>/<strong> elements. */
function renderEmphasis(text: string) {
  const parts = text.split(/(\*{1,2}[^*]+\*{1,2})/g);
  return parts.map((part) => {
    const bold = part.match(/^\*\*(.+)\*\*$/);
    if (bold) return <strong key={part}>{bold[1]}</strong>;

    const italic = part.match(/^\*(.+)\*$/);
    if (italic) return <em key={part}>{italic[1]}</em>;

    return <Fragment key={part}>{part}</Fragment>;
  });
}

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
    },
  });

  const removeTag = trpc.wordBank.removeTag.useMutation({
    onSuccess: () => {
      utils.wordBank.getEntry.invalidate({ entryId: id });
    },
  });

  const removeSource = trpc.wordBank.removeSource.useMutation({
    onSuccess: () => {
      utils.wordBank.getEntry.invalidate({ entryId: id });
    },
  });

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
      <header className="sticky top-0 z-10 bg-page/95 backdrop-blur-sm flex items-center gap-3 px-5 pt-4 pb-2">
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

      {/* Locator absorbed into hero byline below */}
      {/* (intentionally empty — moved to hero section) */}

      <div className="flex flex-col gap-3 px-5 py-3">
        {/* Bilingual hero */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="font-display text-2xl font-bold text-ink text-balance">
              {e.capture.item}
            </h1>
            <div className="shrink-0 text-end">
              <InlineEdit
                value={e.translationArabic}
                isArabic
                onSave={(v) =>
                  updateField.mutate({
                    entryId: id,
                    field: "translationArabic",
                    value: v.trim(),
                  })
                }
                placeholder="+ Arabic"
              />
            </div>
          </div>

          {/* Tags under hero */}
          <TagsRow
            tags={tags}
            onAdd={(tag: string) => addTag.mutate({ entryId: id, tag })}
            onRemove={(tag: string) => removeTag.mutate({ entryId: id, tag })}
          />

          {/* Source + locator byline */}
          {(source || e.capture.locator) && (
            <p className="text-xs text-dim/70 mt-0.5">
              {source && (
                <>
                  from{" "}
                  <Link
                    to={`/wordbank?q=${encodeURIComponent(source.name)}`}
                    className="font-medium text-dim hover:text-accent decoration-dotted underline decoration-dim/25 hover:decoration-accent/50 underline-offset-2 transition-colors"
                  >
                    {source.name}
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeSource.mutate({ entryId: id })}
                    className="ml-1 text-dim/25 hover:text-dim active:scale-[0.96] transition-all cursor-pointer"
                    aria-label="Remove source"
                  >
                    <XMarkIcon className="h-2.5 w-2.5" />
                  </button>
                </>
              )}
              {source && e.capture.locator && (
                <span className="mx-1.5 text-dim/30">·</span>
              )}
              {e.capture.locator && <span>{e.capture.locator}</span>}
            </p>
          )}
        </div>

        {/* Separator between identity section and content */}
        <hr className="border-divider/20" />

        {/* Content fields — click to select, edit button in label row */}
        <div ref={containerRef} className="flex flex-col gap-4">
          {(["definition", "nuance", "examples"] as const).map((field) => {
            const value = e[field as keyof typeof e] as string;
            const isEditing = editing === field;
            const isSelected = selectedField === field;

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

                {/* Selectable area */}
                {isEditing ? (
                  <div className="w-full rounded-button">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full rounded-button border border-accent bg-surface px-2 py-1.5 text-sm text-ink leading-relaxed outline-none resize-none text-left"
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
                    {field === "examples" ? (
                      <ExamplesDisplay value={value} />
                    ) : (
                      <p className="px-2 py-1.5 text-sm text-ink leading-relaxed select-text text-left">
                        {value ? (
                          renderEmphasis(value)
                        ) : (
                          <span className="italic text-dim">Empty</span>
                        )}
                      </p>
                    )}
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
      </div>
    </main>
  );
}

// ── InlineEdit (used for hero Arabic) ──

function InlineEdit({
  value,
  isArabic,
  onSave,
  placeholder,
  label,
}: {
  value: string;
  isArabic?: boolean;
  onSave: (v: string) => void;
  placeholder?: string;
  label?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(false);
  const [text, setText] = useState(value);

  function handleFieldClick() {
    if (editing) return;
    setSelected(!selected);
    setText(value);
  }

  function handleEditClick(ev: React.MouseEvent) {
    ev.stopPropagation();
    setText(value);
    setEditing(true);
  }

  return (
    <div className="relative flex flex-col gap-1">
      {/* Label row — absolutely positioned above the field, out of document flow */}
      <div className="absolute bottom-full left-0 right-0 z-10 flex items-center justify-between">
        <span className="text-xs font-medium text-dim">{label ?? ""}</span>
        <button
          type="button"
          onClick={handleEditClick}
          className={`rounded-button bg-accent px-2.5 py-0.5 text-xs font-medium text-white cursor-pointer transition-all duration-150 ${
            selected
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-1 pointer-events-none"
          }`}
        >
          Edit
        </button>
      </div>

      {editing ? (
        isArabic ? (
          <input
            // biome-ignore lint/a11y/noAutofocus: intentional for edit UX
            autoFocus
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full font-arabic text-xl text-dim/75 text-end leading-snug px-2 py-1.5 bg-transparent rounded-button outline-none ring-1 ring-accent"
          />
        ) : (
          <div className="w-full rounded-button">
            <textarea
              // biome-ignore lint/a11y/noAutofocus: intentional for edit UX
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-button border border-accent bg-surface px-2 py-1.5 text-sm text-ink leading-relaxed outline-none resize-none text-left"
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
        )
      ) : (
        <button
          type="button"
          onClick={handleFieldClick}
          className={`w-full text-left rounded-button transition-colors cursor-pointer ${
            selected
              ? "bg-accent-subtle ring-1 ring-accent/20"
              : "hover:bg-surface"
          }`}
        >
          {isArabic ? (
            value ? (
              <p className="px-2 py-1.5 font-arabic text-xl text-dim/75 text-end leading-snug select-text">
                {value}
              </p>
            ) : (
              <p className="px-2 py-1.5">
                <span className="text-sm text-dim italic">
                  {placeholder ?? "Empty"}
                </span>
              </p>
            )
          ) : (
            <p className="px-2 py-1.5 text-sm text-ink leading-relaxed select-text text-left">
              {value ? (
                renderEmphasis(value)
              ) : (
                <span className="italic text-dim">
                  {placeholder ?? "Empty"}
                </span>
              )}
            </p>
          )}
        </button>
      )}

      {/* Save/Cancel — only when editing */}
      {editing && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              onSave(text.trim() || value);
              setEditing(false);
              setSelected(false);
            }}
            className="rounded-button bg-accent px-3 py-1 text-xs font-medium text-white hover:opacity-90 cursor-pointer"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setSelected(false);
            }}
            className="rounded-button border border-divider px-3 py-1 text-xs text-dim hover:text-ink cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── TagsRow ──

function TagsRow({
  tags,
  onAdd,
  onRemove,
}: {
  tags: string[];
  onAdd: (t: string) => void;
  onRemove: (t: string) => void;
}) {
  const [newTag, setNewTag] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-chip px-2 py-0.5 text-[10px] font-medium text-chip-text"
        >
          <Link
            to={`/wordbank?q=${encodeURIComponent(tag)}`}
            className="hover:text-ink transition-colors"
          >
            {tag}
          </Link>
          <button
            type="button"
            onClick={() => onRemove(tag)}
            className="text-dim hover:text-ink cursor-pointer"
            aria-label={`Remove tag ${tag}`}
          >
            <XMarkIcon className="h-3 w-3" />
          </button>
        </span>
      ))}
      {/* Add tag inline */}
      <span className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-divider px-2 py-0.5 text-[10px] text-dim">
        <input
          type="text"
          value={newTag}
          onChange={(ev) => setNewTag(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter" && newTag.trim()) {
              onAdd(newTag.trim());
            }
          }}
          placeholder="Add"
          className="w-12 bg-transparent text-chip-text outline-none placeholder:text-dim"
        />
        <button
          type="button"
          onClick={() => {
            if (newTag.trim()) {
              onAdd(newTag.trim());
              setNewTag("");
            }
          }}
          className="flex items-center justify-center w-5 h-5 -mr-1 text-dim hover:text-ink active:scale-[0.96] transition-transform cursor-pointer"
        >
          <PlusIcon className="h-3 w-3" />
        </button>
      </span>
    </div>
  );
}
