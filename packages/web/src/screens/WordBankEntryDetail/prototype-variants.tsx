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
  children?: ReactNode;
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

/* ── Shared field click logic ─────────────────────────────────────── */

function useFieldClick(editing: EditableField | null) {
  const [selectedField, setSelectedField] = useState<EditableField | null>(
    null,
  );

  function handleFieldClick(field: EditableField) {
    if (editing) return;
    setSelectedField(selectedField === field ? null : field);
  }

  return { selectedField, setSelectedField, handleFieldClick };
}

/* ── Variant C1: Absolute overlay Edit button ─────────────────────── */

export function VariantC1({ entry, onSaveField, children }: VariantProps) {
  const [editing, setEditing] = useState<EditableField | null>(null);
  const { selectedField, setSelectedField, handleFieldClick } =
    useFieldClick(editing);

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
                  className={`group relative w-full text-left rounded-button transition-colors ${
                    isSelected
                      ? "bg-accent-subtle ring-1 ring-accent/20"
                      : "hover:bg-surface"
                  }`}
                >
                  <div className="px-2 py-1.5">
                    <p
                      className={`text-sm text-ink leading-relaxed select-text ${
                        isArabic ? "font-arabic text-end" : ""
                      }`}
                    >
                      {value || <span className="italic text-dim">Empty</span>}
                    </p>
                    {/* Spacer to reserve room for absolute button */}
                    <div
                      className={`transition-all duration-150 ${
                        isSelected ? "h-8" : "h-0"
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(field);
                    }}
                    className={`absolute bottom-1.5 right-2 rounded-button bg-accent px-2.5 py-1 text-xs font-medium text-white cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-1 pointer-events-none"
                    }`}
                  >
                    Edit
                  </button>
                </button>
              )}
            </div>
          );
        },
      )}
    </div>
  );
}

/* ── Variant C2: Edit button in label row ─────────────────────────── */

export function VariantC2({ entry, onSaveField, children }: VariantProps) {
  const [editing, setEditing] = useState<EditableField | null>(null);
  const { selectedField, setSelectedField, handleFieldClick } =
    useFieldClick(editing);

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
              {/* Label row: field name + edit button on selection */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-dim">
                  {FIELD_LABELS[field]}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
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
                  className={`w-full text-left rounded-button transition-colors ${
                    isSelected
                      ? "bg-accent-subtle ring-1 ring-accent/20"
                      : "hover:bg-surface"
                  }`}
                >
                  <div className="px-2 py-1.5">
                    <p
                      className={`text-sm text-ink leading-relaxed select-text ${
                        isArabic ? "font-arabic text-end" : ""
                      }`}
                    >
                      {value || <span className="italic text-dim">Empty</span>}
                    </p>
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
