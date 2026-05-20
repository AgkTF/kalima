import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { trpc } from "../trpc";

// ── helpers ──

function groupByDate<T extends { enrichedAt: string }>(
  entries: T[],
): Record<string, T[]> {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  ).toDateString();

  const groups: Record<string, T[]> = {};
  for (const e of entries) {
    const d = new Date(e.enrichedAt);
    const key =
      d.toDateString() === today
        ? "Today"
        : d.toDateString() === yesterday
          ? "Yesterday"
          : d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return groups;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function parseTags(raw: string): string[] {
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

// ── screen ──

export function WordBankScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [input, setInput] = useState(query);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = input.trim();
      if (trimmed !== query) {
        if (trimmed) setSearchParams({ q: trimmed });
        else setSearchParams({});
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [input, query, setSearchParams]);

  const recent = trpc.wordBank.getRecent.useQuery(undefined, {
    enabled: query.length === 0,
    refetchOnMount: true,
  });
  const search = trpc.wordBank.search.useQuery(
    { query },
    { enabled: query.length > 0 },
  );

  const entries = query.length > 0 ? (search.data ?? []) : (recent.data ?? []);
  const isLoading = recent.isLoading || search.isLoading;

  return (
    <main className="flex flex-1 flex-col pb-16">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="font-display text-lg font-bold text-ink">Word Bank</h1>
        {entries.length > 0 && (
          <span className="rounded-full bg-accent-subtle px-2.5 py-0.5 text-xs font-medium text-dim">
            {entries.length}
          </span>
        )}
      </header>

      {/* Search bar */}
      <div className="mx-5 mb-4 flex items-center gap-2 rounded-button border border-divider bg-surface px-3 py-2.5">
        <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-dim" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search entries, sources, tags…"
          className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-dim"
        />
        {input.length > 0 && (
          <button
            type="button"
            onClick={() => setInput("")}
            className="shrink-0 text-xs text-dim hover:text-ink cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <p className="mx-5 mt-8 text-center text-sm text-dim">Loading…</p>
      )}

      {/* Empty */}
      {!isLoading && entries.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 pb-16">
          <p className="text-sm text-dim">
            {query ? `Nothing found for “${query}”` : "Your word bank is empty"}
          </p>
        </div>
      )}

      {/* Entries — typographic journal */}
      {!isLoading && entries.length > 0 && (
        <div className="flex flex-col gap-5 px-5">
          {Object.entries(groupByDate(entries)).map(([label, group]) => (
            <section key={label}>
              {/* Date header */}
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-dim/35">
                {label}
              </h3>

              <div className="flex flex-col gap-0.5">
                {group.map((entry) => {
                  const tags = parseTags(entry.tags);

                  return (
                    <Link
                      key={entry.id}
                      to={`/wordbank/${entry.id}`}
                      className="group block rounded-card px-3 py-2.5 -mx-3 transition-colors hover:bg-surface/80"
                    >
                      {/* Word — the typographic anchor */}
                      <h2 className="font-display text-[17px] font-semibold text-ink leading-snug group-hover:text-accent transition-colors">
                        {entry.capture.item}
                      </h2>

                      {/* Definition */}
                      {entry.definition && (
                        <p className="mt-0.5 text-[13px] text-dim/70 leading-relaxed line-clamp-2">
                          {entry.definition}
                        </p>
                      )}

                      {/* Meta row: tags · time */}
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-dim/45 flex-wrap">
                        {tags.length > 0 && (
                          <span>{tags.slice(0, 3).join(", ")}</span>
                        )}
                        {tags.length > 0 && <span aria-hidden="true">·</span>}
                        <span>{timeAgo(entry.enrichedAt)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
