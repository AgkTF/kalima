import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { trpc } from "../trpc";

export function WordBankScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [input, setInput] = useState(query);

  // Debounced search: update URL params after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = input.trim();
      if (trimmed !== query) {
        if (trimmed) {
          setSearchParams({ q: trimmed });
        } else {
          setSearchParams({});
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [input, query, setSearchParams]);

  // Always fetch recent entries (for default view)
  const recent = trpc.wordBank.getRecent.useQuery(undefined, {
    enabled: query.length === 0,
    refetchOnMount: true,
  });

  // Fetch search results only when there's a query
  const search = trpc.wordBank.search.useQuery(
    { query },
    { enabled: query.length > 0 },
  );

  const entries = query.length > 0 ? (search.data ?? []) : (recent.data ?? []);

  return (
    <main className="flex flex-1 flex-col pb-16">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="font-display text-lg font-bold text-ink">Word Bank</h1>
        {entries.length > 0 && (
          <span className="rounded-full bg-accent-subtle px-2 text-xs text-dim">
            {entries.length}
          </span>
        )}
      </header>

      {/* Search bar */}
      <div className="mx-5 mb-3 flex items-center gap-2 rounded-button border border-divider bg-surface px-3 py-2.5">
        <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-dim" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search entries, sources, tags..."
          className="flex-1 bg-transparent text-ink text-sm outline-none placeholder:text-dim"
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

      {/* Loading state */}
      {(recent.isLoading || search.isLoading) && (
        <p className="mx-5 mt-8 text-center text-sm text-dim">Loading...</p>
      )}

      {/* Empty state */}
      {!recent.isLoading &&
        !search.isLoading &&
        entries.length === 0 &&
        query.length === 0 && (
          <div className="flex flex-1 items-center justify-center pb-16">
            <p className="font-ui text-dim">Your word bank is empty</p>
          </div>
        )}

      {/* No results */}
      {!search.isLoading && query.length > 0 && entries.length === 0 && (
        <p className="mx-5 mt-8 text-center text-sm text-dim">
          No entries found for &ldquo;{query}&rdquo;
        </p>
      )}

      {/* Entries list */}
      <ul className="flex flex-col gap-1 px-3">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link
              to={`/wordbank/${entry.id}`}
              className="flex flex-col rounded-card px-3 py-3 transition-colors hover:bg-surface"
            >
              <span className="font-display text-base font-semibold text-ink">
                {entry.capture.item}
              </span>
              {entry.capture.locator && (
                <span className="mt-0.5 text-xs text-dim">
                  {entry.capture.locator}
                </span>
              )}
              <span className="mt-1 line-clamp-1 text-sm text-dim font-arabic">
                {entry.translationArabic}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
