import { ExamplesDisplay } from "../../components/ExamplesDisplay";
import { renderEmphasis } from "../../components/renderEmphasis";
import { type EditableField, FIELD_LABELS } from "./constants";

interface ContentFieldProps {
  field: EditableField;
  value: string;
  isEditing: boolean;
  isSelected: boolean;
  editText: string;
  onEditStart: (field: EditableField) => void;
  onFieldClick: (field: EditableField) => void;
  onSave: () => void;
  onCancel: () => void;
  onEditTextChange: (text: string) => void;
}

export function ContentField({
  field,
  value,
  isEditing,
  isSelected,
  editText,
  onEditStart,
  onFieldClick,
  onSave,
  onCancel,
  onEditTextChange,
}: ContentFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      {/* Label row: field name + edit button on selection */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-dim">
          {FIELD_LABELS[field]}
        </span>
        <button
          type="button"
          onClick={(ev) => {
            ev.stopPropagation();
            onEditStart(field);
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
            onChange={(e) => onEditTextChange(e.target.value)}
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
          onClick={() => onFieldClick(field)}
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
            onClick={onSave}
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
      )}
    </div>
  );
}
