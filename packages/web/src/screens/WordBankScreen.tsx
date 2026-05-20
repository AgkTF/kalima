import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { trpc } from "../trpc";
import {
  PrototypeSwitcher,
  VariantH,
  VariantI,
  VariantJ,
} from "./WordBankScreen/prototype-variants";

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

  // Prototype: read variant from URL
  const variant = (searchParams.get("variant") ?? "H").toUpperCase();

  // Keyboard arrows to cycle prototypes
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const variants = ["H", "I", "J"];
      const idx = variants.indexOf(variant);
      if (e.key === "ArrowLeft" && idx > 0) {
        setSearchParams((p) => {
          p.set("variant", variants[idx - 1]);
          return p;
        });
      }
      if (e.key === "ArrowRight" && idx < variants.length - 1) {
        setSearchParams((p) => {
          p.set("variant", variants[idx + 1]);
          return p;
        });
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [variant, setSearchParams]);

  const isLoading = recent.isLoading || search.isLoading;

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

      {/* Variant rendering */}
      {variant === "H" && (
        <VariantH entries={entries} query={query} isLoading={isLoading} />
      )}
      {variant === "I" && (
        <VariantI entries={entries} query={query} isLoading={isLoading} />
      )}
      {variant === "J" && (
        <VariantJ entries={entries} query={query} isLoading={isLoading} />
      )}

      {/* Prototype switcher */}
      <PrototypeSwitcher current={variant} />
    </main>
  );
}
