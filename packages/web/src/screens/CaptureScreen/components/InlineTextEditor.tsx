import { useState } from "react";

export function InlineTextEditor({
  value,
  inputLabel,
  emptyLabel,
  allowEmpty = false,
  variant = "item",
  onSave,
}: {
  value: string | null;
  inputLabel: string;
  emptyLabel?: string;
  allowEmpty?: boolean;
  variant?: "item" | "metadata";
  onSave: (value: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  function save() {
    const trimmed = draft.trim();
    const nextValue = trimmed || null;
    if (!nextValue && !allowEmpty) {
      setDraft(value ?? "");
      setEditing(false);
      return;
    }
    if (nextValue !== value) {
      onSave(nextValue);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        // biome-ignore lint/a11y/noAutofocus: intentional for inline edit UX
        autoFocus
        aria-label={inputLabel}
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            save();
          } else if (event.key === "Escape") {
            event.preventDefault();
            setDraft(value ?? "");
            setEditing(false);
          }
        }}
        onBlur={save}
        className={
          variant === "item"
            ? "min-h-10 w-full rounded-[5px] border border-accent bg-surface px-2 font-display text-base font-semibold text-ink outline-none focus:ring-1 focus:ring-accent"
            : "min-h-10 min-w-32 rounded-[5px] border border-accent bg-surface px-2 font-medium text-xs text-ink outline-none focus:ring-1 focus:ring-accent"
        }
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={`Edit ${inputLabel}`}
      onClick={() => {
        setDraft(value ?? "");
        setEditing(true);
      }}
      className={
        variant === "item"
          ? "min-h-10 w-full text-left font-display text-base font-semibold text-ink transition-[color,scale] duration-150 ease-out hover:text-accent active:scale-[0.96]"
          : "min-h-10 text-left font-medium text-xs text-accent transition-[color,scale] duration-150 ease-out hover:text-ink active:scale-[0.96]"
      }
    >
      <span
        className={
          value
            ? undefined
            : "rounded-[5px] border border-dashed border-divider px-1.5 py-px text-dim"
        }
      >
        {value || emptyLabel}
      </span>
    </button>
  );
}
