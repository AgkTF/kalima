import { useState } from "react";
import { renderEmphasis } from "../../components/renderEmphasis";

export function InlineEdit({
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

  function renderContent() {
    // Editing: Arabic
    if (editing && isArabic) {
      return (
        <input
          // biome-ignore lint/a11y/noAutofocus: intentional for edit UX
          autoFocus
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full font-arabic text-xl text-dim/75 text-end leading-snug px-2 py-1.5 bg-transparent rounded-button outline-none ring-1 ring-accent"
        />
      );
    }

    // Editing: text
    if (editing) {
      return (
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
      );
    }

    const buttonClass = `w-full text-left rounded-button transition-colors cursor-pointer ${
      selected ? "bg-accent-subtle ring-1 ring-accent/20" : "hover:bg-surface"
    }`;

    // Display: Arabic
    if (isArabic) {
      return (
        <button
          type="button"
          onClick={handleFieldClick}
          className={buttonClass}
        >
          {value ? (
            <p className="px-2 py-1.5 font-arabic text-xl text-dim/75 text-end leading-snug select-text">
              {value}
            </p>
          ) : (
            <p className="px-2 py-1.5">
              <span className="text-sm text-dim italic">
                {placeholder ?? "Empty"}
              </span>
            </p>
          )}
        </button>
      );
    }

    // Display: text
    return (
      <button type="button" onClick={handleFieldClick} className={buttonClass}>
        <p className="px-2 py-1.5 text-sm text-ink leading-relaxed select-text text-left">
          {value ? (
            renderEmphasis(value)
          ) : (
            <span className="italic text-dim">{placeholder ?? "Empty"}</span>
          )}
        </p>
      </button>
    );
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

      {renderContent()}

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
