import { PencilSquareIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import { useState } from "react";

/* ── Shared types ────────────────────────────────────────────────── */

export type EditableField =
  | "definition"
  | "translationArabic"
  | "nuance"
  | "examples";

export const FIELD_LABELS: Record<EditableField, string> = {
  definition: "Definition",
  translationArabic: "Translation",
  nuance: "Nuance",
  examples: "Examples",
};

export interface EntryData {
  definition: string;
  translationArabic: string;
  nuance: string;
  examples: string;
}

export interface VariantProps {
  entry: EntryData;
  onSaveField: (field: EditableField, value: string) => void;
  children?: ReactNode; // for tags, source chip — rendered below fields
}

/* ── Shared editing sub-component ────────────────────────────────── */

function EditTextarea({
  value,
  onSave,
  onCancel,
  isArabic,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
  isArabic?: boolean;
}) {
  const [text, setText] = useState(value);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSave(text.trim());
    }
    if (e.key === "Escape") onCancel();
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className={`w-full rounded-button border border-accent bg-surface px-3 py-2 text-sm text-ink outline-none resize-none ${
          isArabic ? "font-arabic" : ""
        }`}
        rows={Math.min(text.split("\n").length + 1, 4)}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave(text.trim())}
          className="rounded-button bg-accent px-3 py-1 text-xs font-medium text-white hover:opacity-90 cursor-pointer"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-button border border-divider px-3 py-1 text-xs text-dim hover:text-ink cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Variant A: Per-field pencil icon ─────────────────────────────── */

export function VariantA({ entry, onSaveField, children }: VariantProps) {
  const [editing, setEditing] = useState<EditableField | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {children}
      {(["definition", "translationArabic", "nuance", "examples"] as const).map(
        (field) => {
          const value = entry[field];
          const isEditing = editing === field;
          const isArabic = field === "translationArabic";

          return (
            <div key={field} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-dim">
                  {FIELD_LABELS[field]}
                </span>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setEditing(field)}
                    className="rounded-full p-1 text-dim hover:text-accent hover:bg-accent-subtle cursor-pointer transition-colors"
                    aria-label={`Edit ${FIELD_LABELS[field]}`}
                  >
                    <PencilSquareIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {isEditing ? (
                <EditTextarea
                  value={value}
                  isArabic={isArabic}
                  onSave={(v) => {
                    onSaveField(field, v);
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <p
                  className={`text-sm text-ink leading-relaxed select-text ${
                    isArabic ? "font-arabic text-end" : ""
                  }`}
                >
                  {value || <span className="italic text-dim">Empty</span>}
                </p>
              )}
            </div>
          );
        },
      )}
    </div>
  );
}

/* ── Variant B: View / Edit mode toggle ───────────────────────────── */

export function VariantB({ entry, onSaveField, children }: VariantProps) {
  const [editMode, setEditMode] = useState(false);
  const [drafts, setDrafts] = useState<Partial<Record<EditableField, string>>>(
    {},
  );

  function enterEdit() {
    setDrafts({
      definition: entry.definition,
      translationArabic: entry.translationArabic,
      nuance: entry.nuance,
      examples: entry.examples,
    });
    setEditMode(true);
  }

  function saveAll() {
    for (const [field, value] of Object.entries(drafts)) {
      if (value !== entry[field as EditableField]) {
        onSaveField(field as EditableField, value);
      }
    }
    setEditMode(false);
  }

  function cancelAll() {
    setEditMode(false);
    setDrafts({});
  }

  return (
    <div>
      {/* Edit/Done toggle in the content area, not header (header stays clean) */}
      <div className="flex justify-end mb-3">
        {editMode ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveAll}
              className="rounded-button bg-accent px-4 py-1.5 text-xs font-medium text-white hover:opacity-90 cursor-pointer"
            >
              Done
            </button>
            <button
              type="button"
              onClick={cancelAll}
              className="rounded-button border border-divider px-4 py-1.5 text-xs text-dim hover:text-ink cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={enterEdit}
            className="rounded-button border border-divider px-3 py-1.5 text-xs text-dim hover:text-accent hover:border-accent cursor-pointer transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {children}

      <div className="flex flex-col gap-4 mt-3">
        {(
          ["definition", "translationArabic", "nuance", "examples"] as const
        ).map((field) => {
          const value = entry[field];
          const draft = drafts[field] ?? value;
          const isArabic = field === "translationArabic";

          return (
            <div key={field} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-dim">
                {FIELD_LABELS[field]}
              </span>
              {editMode ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [field]: e.target.value }))
                    }
                    className={`w-full rounded-button border border-accent bg-surface px-3 py-2 text-sm text-ink outline-none resize-none ${
                      isArabic ? "font-arabic" : ""
                    }`}
                    rows={Math.min(draft.split("\n").length + 1, 4)}
                  />
                </div>
              ) : (
                <p
                  className={`text-sm text-ink leading-relaxed select-text ${
                    isArabic ? "font-arabic text-end" : ""
                  }`}
                >
                  {value || <span className="italic text-dim">Empty</span>}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Variant C: Click to reveal edit button ───────────────────────── */

export function VariantC({ entry, onSaveField, children }: VariantProps) {
  const [selectedField, setSelectedField] = useState<EditableField | null>(
    null,
  );
  const [editing, setEditing] = useState<EditableField | null>(null);

  function handleFieldClick(field: EditableField) {
    if (editing) return;
    // If already selected, toggle off; otherwise select
    setSelectedField(selectedField === field ? null : field);
  }

  return (
    <div className="flex flex-col gap-4">
      {children}
      {(["definition", "translationArabic", "nuance", "examples"] as const).map(
        (field) => {
          const value = entry[field];
          const isEditing = editing === field;
          const isSelected = selectedField === field;
          const isArabic = field === "translationArabic";

          return (
            <div key={field} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-dim">
                {FIELD_LABELS[field]}
              </span>
              {isEditing ? (
                <EditTextarea
                  value={value}
                  isArabic={isArabic}
                  onSave={(v) => {
                    onSaveField(field, v);
                    setEditing(null);
                    setSelectedField(null);
                  }}
                  onCancel={() => {
                    setEditing(null);
                    setSelectedField(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => handleFieldClick(field)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSelectedField(null);
                  }}
                  className={`group rounded-button transition-colors w-full text-left ${
                    isSelected
                      ? "bg-accent-subtle ring-1 ring-accent/20"
                      : "hover:bg-surface"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 px-2 py-1.5">
                    <p
                      className={`text-sm text-ink leading-relaxed select-text flex-1 ${
                        isArabic ? "font-arabic text-end" : ""
                      }`}
                    >
                      {value || <span className="italic text-dim">Empty</span>}
                    </p>
                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(field);
                        }}
                        className="shrink-0 rounded-button bg-accent px-2.5 py-1 text-xs font-medium text-white cursor-pointer hover:opacity-90"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </button>
              )}
            </div>
          );
        },
      )}
    </div>
  );
}
