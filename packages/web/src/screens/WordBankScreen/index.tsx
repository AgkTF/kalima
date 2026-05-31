// ADR 0006: This file is a thin orchestrator.
// Sub-components → sibling files in this directory.
// Utilities → utils.ts

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { trpc } from "../../trpc";
import { EntryGroup } from "./EntryGroup";
import { SectionHeader } from "./SectionHeader";
import { ALPHABET, groupByDate, groupByLetter } from "./utils";

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

  // When URL is cleared externally (e.g. tab navigation), reset the input
  useEffect(() => {
    if (query === "") setInput("");
  }, [query]);

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
  const [sort, setSort] = useState<"recent" | "alpha" | "shuffle">("recent");

  const sorted = (() => {
    const copy = [...entries];
    switch (sort) {
      case "alpha":
        return copy.sort((a, b) =>
          a.capture.item.localeCompare(b.capture.item),
        );
      case "shuffle":
        // Deterministic-ish shuffle using a simple hash so it stays stable during the session
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      default:
        return copy; // "recent" — already sorted by enrichedAt desc from server
    }
  })();

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

      {/* Sort controls */}
      {!isLoading && sorted.length > 0 && (
        <div className="mx-5 mb-3 flex items-center gap-1">
          <span className="text-[10px] text-dim/40 mr-1">Sort</span>
          {(["recent", "alpha", "shuffle"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] cursor-pointer transition-colors ${
                sort === s
                  ? "bg-accent text-white"
                  : "text-dim/50 hover:text-dim hover:bg-accent-subtle"
              }`}
            >
              {s === "recent" ? "Recent" : s === "alpha" ? "A–Z" : "Shuffle ✦"}
            </button>
          ))}
        </div>
      )}

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

      {/* Entries */}
      {!isLoading && sorted.length > 0 && (
        <div className="relative flex flex-1">
          {/* Entry list */}
          <div
            className={`flex flex-col gap-5 flex-1 min-w-0 px-5 ${sort === "alpha" ? "pr-10" : ""}`}
          >
            {sort === "recent" &&
              Object.entries(groupByDate(sorted)).map(([label, group]) => (
                <section key={label}>
                  <SectionHeader label={label} />
                  <EntryGroup entries={group} />
                </section>
              ))}

            {sort === "alpha" &&
              Object.entries(groupByLetter(sorted)).map(([letter, group]) => (
                <section key={letter} id={`section-${letter}`}>
                  <SectionHeader label={letter} />
                  <EntryGroup entries={group} />
                </section>
              ))}

            {sort === "shuffle" && <EntryGroup entries={sorted} />}
          </div>

          {/* Alphabetical scrubber — right edge, A–Z mode only */}
          {sort === "alpha" && (
            <nav className="fixed right-1 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-px py-2">
              {ALPHABET.map((letter) => {
                const exists = sorted.some(
                  (e) => e.capture.item.charAt(0).toUpperCase() === letter,
                );
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(`section-${letter}`);
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`text-[10px] font-medium px-1 py-0.5 rounded-sm cursor-pointer transition-colors ${
                      exists
                        ? "text-dim/60 hover:text-accent"
                        : "text-dim/20 pointer-events-none"
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      )}
    </main>
  );
}
