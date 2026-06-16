import { useCombobox } from "downshift";
import { useEffect, useState } from "react";
import { trpc } from "../../trpc";

const SOURCE_TYPES = [
  { value: "book", label: "Book" },
  { value: "video", label: "Video" },
  { value: "article", label: "Article" },
] as const;

interface SourceSuggestion {
  id: number;
  name: string;
  type: string;
}

export function SessionForm({
  sources,
  isPending,
  onStart,
  onCancel,
}: {
  sources: SourceSuggestion[];
  isPending: boolean;
  onStart: (name: string, type: string, template?: string | null) => void;
  onCancel: () => void;
}) {
  const [type, setType] =
    useState<(typeof SOURCE_TYPES)[number]["value"]>("book");
  const [typeLocked, setTypeLocked] = useState(false);
  const [inputItems, setInputItems] = useState<SourceSuggestion[]>([]);
  const [template, setTemplate] = useState("");
  const [templatePrefilled, setTemplatePrefilled] = useState(false);

  // Fetch global default template to pre-fill
  const globalTemplate = trpc.enrichment.getGlobalTemplate.useQuery();

  // Pre-fill template with global default once it loads
  useEffect(() => {
    if (!templatePrefilled && globalTemplate.data != null) {
      setTemplate(globalTemplate.data);
      setTemplatePrefilled(true);
    }
  }, [globalTemplate.data, templatePrefilled]);

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
      }
    },
    onSelectedItemChange({ selectedItem: source }) {
      if (source) {
        setType(source.type as (typeof SOURCE_TYPES)[number]["value"]);
        setTypeLocked(true);
      }
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = (selectedItem?.name ?? inputValue ?? "").trim();
    if (!name || isPending) return;
    const resolvedType = selectedItem?.type ?? type;
    const resolvedTemplate = template.trim() || null;
    onStart(name, resolvedType, resolvedTemplate);
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

      {/* Inline by design (1 use). Extract at 3+ uses. See ADR 0006. */}
      <div>
        <label
          htmlFor="session-template"
          className="block font-ui text-xs font-medium text-dim"
        >
          Enrichment Context (optional)
        </label>
        <p className="mt-0.5 text-xs text-dim">
          Additional instructions for the LLM. Pre-filled with global default.
          Override for this session only.
        </p>
        <textarea
          id="session-template"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          disabled={isPending}
          rows={4}
          className="mt-1 w-full rounded-button border border-divider bg-surface px-3 py-2 font-ui text-sm text-ink placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 resize-y"
          placeholder={`You are a word bank enrichment agent. For the given item, produce:
- definition: a context-appropriate meaning
- translationArabic: the Arabic equivalent
- nuance: a note on subtle shades of meaning
- examples: 2-3 sentences demonstrating usage
- tags: relevant categories
- relatedEntries: existing word bank entries that are connected
- confidence: "high" or "low"
Do NOT include etymology.

Additional context:
This is from Dune, a sci-fi novel. Focus on technical terminology.`}
        />
      </div>

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
          disabled={
            isPending || !(selectedItem?.name ?? inputValue ?? "").trim()
          }
          className="flex-1 rounded-button bg-accent px-4 py-2 font-ui text-sm font-medium text-page transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {isPending ? "\u2026" : "Open Session"}
        </button>
      </div>
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
