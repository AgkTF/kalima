import { useMemo, useState } from "react";

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
  onStart: (name: string, type: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] =
    useState<(typeof SOURCE_TYPES)[number]["value"]>("book");
  const [typeLocked, setTypeLocked] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const matchedSources = useMemo(() => {
    if (name.trim().length === 0) return [];
    const query = name.toLowerCase();
    return sources.filter((s) => s.name.toLowerCase().includes(query));
  }, [sources, name]);

  function handleNameChange(value: string) {
    setName(value);
    setTypeLocked(false);
    setShowSuggestions(true);
  }

  function handleSelectSuggestion(source: SourceSuggestion) {
    setName(source.name);
    setType(source.type as (typeof SOURCE_TYPES)[number]["value"]);
    setTypeLocked(true);
    setShowSuggestions(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || isPending) return;
    onStart(name.trim(), type);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 rounded-button border border-accent bg-surface p-3"
    >
      {/* Autocomplete input */}
      <div className="relative">
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          onFocus={() => {
            if (name.trim().length > 0) setShowSuggestions(true);
          }}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 150);
          }}
          placeholder="Source title (e.g. Moby Dick)"
          disabled={isPending}
          className="w-full rounded-button border border-divider bg-surface px-3 py-2 font-ui text-sm text-ink placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          // biome-ignore lint/a11y/noAutofocus: session start is the primary action when shown
          autoFocus
        />
        {showSuggestions && matchedSources.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-button border border-divider bg-surface shadow-lg">
            {matchedSources.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(s);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-accent-subtle cursor-pointer"
                >
                  <span className="font-display font-medium text-ink">
                    {s.name}
                  </span>
                  <span className="ml-2 shrink-0 text-xs text-dim">
                    {s.type}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Type selector */}
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
          disabled={isPending || !name.trim()}
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
