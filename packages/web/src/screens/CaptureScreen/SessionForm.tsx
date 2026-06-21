import { useCombobox } from "downshift";
import { useState } from "react";

const SOURCE_TYPES = [
  { value: "book", label: "Book" },
  { value: "video", label: "Video" },
  { value: "article", label: "Article" },
] as const;

interface SourceSuggestion {
  id: number;
  name: string;
  type: string;
  enrichmentContext: string | null;
}

export function SessionForm({
  sources,
  isPending,
  onStart,
  onCancel,
}: {
  sources: SourceSuggestion[];
  isPending: boolean;
  onStart: (
    name: string,
    type: string,
    enrichmentContext: string | null,
  ) => void;
  onCancel: () => void;
}) {
  const [type, setType] =
    useState<(typeof SOURCE_TYPES)[number]["value"]>("book");
  const [typeLocked, setTypeLocked] = useState(false);
  const [inputItems, setInputItems] = useState<SourceSuggestion[]>([]);
  const [enrichmentContext, setEnrichmentContext] = useState<string>("");

  const {
    isOpen,
    getMenuProps,
    getInputProps,
    getItemProps,
    highlightedIndex,
    selectedItem,
    inputValue,
  } = useCombobox({
    items: inputItems,
    itemToString: (item) => item?.name ?? "",
    onInputValueChange({ inputValue: value, selectedItem: current }) {
      const query = (value ?? "").toLowerCase();
      setInputItems(
        query.length === 0
          ? []
          : sources.filter((s) => s.name.toLowerCase().includes(query)),
      );
      if (value !== current?.name) {
        setTypeLocked(false);
        setEnrichmentContext("");
      } else if (current) {
        // Name matches the selected item again — restore its context
        setEnrichmentContext(current.enrichmentContext ?? "");
      }
    },
    onSelectedItemChange({ selectedItem: source }) {
      if (source) {
        setType(source.type as (typeof SOURCE_TYPES)[number]["value"]);
        setTypeLocked(true);
        setEnrichmentContext(source.enrichmentContext ?? "");
      }
    },
  });

  const typedName = (inputValue ?? "").trim();
  const unselectedExistingMatch = typedName
    ? sources.find(
        (s) =>
          s.name === typedName && s.type === type && s.id !== selectedItem?.id,
      )
    : undefined;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!typedName || isPending || unselectedExistingMatch) return;
    const context = enrichmentContext.trim();
    onStart(typedName, type, context || null);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 rounded-button border border-accent bg-surface p-3"
    >
      <div className="relative">
        <input
          {...getInputProps({
            placeholder: "Source title (e.g. Moby Dick)",
            disabled: isPending,
            className:
              "w-full rounded-button border border-divider bg-surface px-3 py-2 font-ui text-sm text-ink placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50",
          })}
          // biome-ignore lint/a11y/noAutofocus: session start is the primary action when shown
          autoFocus
        />
        <ul
          {...getMenuProps({
            className: `absolute z-10 mt-1 w-full rounded-button border border-divider bg-surface shadow-lg ${
              !(isOpen && inputItems.length > 0) ? "hidden" : ""
            }`,
          })}
        >
          {isOpen &&
            inputItems.map((source, index) => (
              <li
                key={source.id}
                {...getItemProps({
                  item: source,
                  index,
                })}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors cursor-pointer ${
                  highlightedIndex === index
                    ? "bg-accent-subtle"
                    : "hover:bg-accent-subtle"
                }`}
              >
                <span className="font-display font-medium text-ink">
                  {source.name}
                </span>
                <span className="ml-2 shrink-0 text-xs text-dim">
                  {source.type}
                </span>
              </li>
            ))}
        </ul>
      </div>
      {unselectedExistingMatch && (
        <p className="text-xs text-dim">
          "{typedName}" already exists as a {type} source. Select it from the
          dropdown to reuse its enrichment context.
        </p>
      )}

      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) =>
            setType(e.target.value as (typeof SOURCE_TYPES)[number]["value"])
          }
          disabled={isPending || typeLocked}
          className="rounded-button border border-divider bg-surface px-3 py-2 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {SOURCE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending || !typedName || !!unselectedExistingMatch}
          className="flex-1 rounded-button bg-accent px-4 py-2 font-ui text-sm font-medium text-page transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {isPending ? "\u2026" : "Open Session"}
        </button>
      </div>
      <textarea
        value={enrichmentContext}
        onChange={(e) => setEnrichmentContext(e.target.value)}
        placeholder="Enrichment context (optional): guidance appended to the enrichment system prompt for this source"
        disabled={isPending}
        rows={2}
        className="w-full rounded-button border border-divider bg-surface px-3 py-2 font-ui text-sm text-ink placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
      />
      <button
        type="button"
        onClick={onCancel}
        className="w-full text-center text-xs text-dim hover:text-ink transition-colors cursor-pointer"
      >
        Cancel
      </button>
    </form>
  );
}
