/**
 * PROTOTYPE — throwaway UI variants for Word Bank screen (round 2).
 * Switchable via ?variant=H|I|J on /wordbank.
 * Delete this file when a variant is chosen.
 */

import { CalendarIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

interface Entry {
  id: number;
  capture: { id: number; item: string; locator: string | null };
  definition: string;
  translationArabic: string;
  tags: string;
  source?: { name: string } | null;
  enrichedAt: string;
}

// ────────────────────────── Shared helpers ──────────────────────────

function sourceBorder(name: string): string {
  const colors: Record<string, string> = {
    book: "border-accent/60",
    movie: "border-amber-400/60",
    podcast: "border-sky-400/60",
    article: "border-rose-400/60",
    conversation: "border-emerald-400/60",
  };
  return colors[name] ?? "border-accent/60";
}

function sourceDot(name: string): string {
  const colors: Record<string, string> = {
    book: "bg-accent",
    movie: "bg-amber-500",
    podcast: "bg-sky-500",
    article: "bg-rose-500",
    conversation: "bg-emerald-500",
  };
  return colors[name] ?? "bg-accent";
}

function groupByDate(entries: Entry[]): Record<string, Entry[]> {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  ).toDateString();

  const groups: Record<string, Entry[]> = {};
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

function parseTags(raw: string): string[] {
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

// ────────────────────────── Prototype Switcher ──────────────────────────

export function PrototypeSwitcher({ current }: { current: string }) {
  if (import.meta.env.PROD) return null;

  const variants = ["H", "I", "J"];
  const names: Record<string, string> = {
    H: "Typographic Gallery",
    I: "Reading Journal",
    J: "Card Stack Browse",
  };

  function go(dir: -1 | 1) {
    const idx = variants.indexOf(current);
    const next = (idx + dir + variants.length) % variants.length;
    const url = new URL(window.location.href);
    url.searchParams.set("variant", variants[next]);
    window.history.replaceState(null, "", url.toString());
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 shadow-lg">
      <div className="flex items-center gap-3 rounded-full bg-ink/90 px-4 py-2 text-white backdrop-blur">
        <button
          type="button"
          onClick={() => go(-1)}
          className="text-lg leading-none opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
        >
          ←
        </button>
        <span className="text-xs font-medium whitespace-nowrap">
          {current} — {names[current] ?? current}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          className="text-lg leading-none opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
        >
          →
        </button>
      </div>
    </div>
  );
}

// ────────────────────────── Shared empty state ──────────────────────────

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-16">
      <SparklesIcon className="h-10 w-10 text-dim/20" />
      <p className="text-sm text-dim">
        {query ? `Nothing found for "${query}"` : "Your lexicon is empty"}
      </p>
      {!query && (
        <p className="text-xs text-dim/50">
          Words you capture will appear here
        </p>
      )}
    </div>
  );
}

// ────────────────────────── Variant H — Typographic Gallery ──────────────────────────

export function VariantH({
  entries,
  query,
  isLoading,
}: {
  entries: Entry[];
  query: string;
  isLoading: boolean;
}) {
  if (isLoading)
    return <p className="mx-5 mt-8 text-center text-sm text-dim">Loading…</p>;
  if (entries.length === 0) return <EmptyState query={query} />;

  return (
    <div className="flex flex-col gap-3 px-3 pb-16">
      {/* Toggle row */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-dim/50">{entries.length} words</span>
        {/* Prototype: non-functional toggle */}
        <div className="flex rounded-full bg-surface border border-divider/40 p-0.5">
          <span className="rounded-full bg-accent px-3 py-0.5 text-[10px] font-medium text-white">
            Gallery
          </span>
          <span className="rounded-full px-3 py-0.5 text-[10px] text-dim/60">
            List
          </span>
        </div>
      </div>

      {/* Word cards — each is a typographic composition */}
      <div className="grid grid-cols-2 gap-2.5">
        {entries.map((entry) => {
          const tags = parseTags(entry.tags);
          const border = sourceBorder(entry.source?.name ?? "");

          return (
            <Link
              key={entry.id}
              to={`/wordbank/${entry.id}`}
              className={`group flex flex-col gap-1.5 rounded-card border ${border} border-l-[3px] bg-surface p-3.5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5`}
            >
              {/* Word — the star */}
              <span className="font-display text-[17px] font-semibold text-ink leading-snug group-hover:text-accent transition-colors">
                {entry.capture.item}
              </span>

              {/* Definition snippet */}
              {entry.definition && (
                <p className="text-[12px] text-dim/70 leading-relaxed line-clamp-2">
                  {entry.definition}
                </p>
              )}

              {/* Tags as tiny dots + count */}
              {tags.length > 0 && (
                <div className="mt-auto flex items-center gap-1.5 pt-1">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${sourceDot(entry.source?.name ?? "")}`}
                  />
                  <span className="text-[10px] text-dim/50">
                    {tags.slice(0, 2).join(", ")}
                    {tags.length > 2 ? ` +${tags.length - 2}` : ""}
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────── Variant I — Reading Journal ──────────────────────────

export function VariantI({
  entries,
  query,
  isLoading,
}: {
  entries: Entry[];
  query: string;
  isLoading: boolean;
}) {
  if (isLoading)
    return <p className="mx-5 mt-8 text-center text-sm text-dim">Loading…</p>;
  if (entries.length === 0) return <EmptyState query={query} />;

  const groups = groupByDate(entries);

  return (
    <div className="flex flex-col gap-6 px-3 pb-16">
      {/* Milestone counter */}
      <div className="flex items-center gap-3 rounded-card border border-divider/20 bg-surface/60 px-4 py-3">
        <SparklesIcon className="h-5 w-5 text-accent/60" />
        <div>
          <p className="text-sm font-medium text-ink">
            {entries.length} words collected
          </p>
          <p className="text-xs text-dim/60">
            Across {new Set(entries.map((e) => e.source?.name)).size} sources
          </p>
        </div>
      </div>

      {/* Journal sections */}
      {Object.entries(groups).map(([label, groupEntries]) => (
        <section key={label}>
          {/* Date header */}
          <div className="flex items-center gap-3 mb-3">
            <span className="h-px flex-1 bg-divider/30" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-dim/40">
              {label}
            </span>
            <span className="h-px flex-1 bg-divider/30" />
          </div>

          {/* Entries */}
          <div className="flex flex-col gap-3">
            {groupEntries.map((entry) => {
              const tags = parseTags(entry.tags);

              return (
                <Link
                  key={entry.id}
                  to={`/wordbank/${entry.id}`}
                  className="group flex gap-3"
                >
                  {/* Left accent column */}
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${sourceDot(entry.source?.name ?? "")}`}
                    />
                    <span className="w-px flex-1 bg-divider/15" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 pb-3">
                    {/* Source ribbon */}
                    {entry.source && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-dim/50 font-medium uppercase tracking-wider mb-1">
                        {entry.source.name}
                      </span>
                    )}

                    {/* Word */}
                    <h3 className="font-display text-[19px] font-semibold text-ink leading-snug group-hover:text-accent transition-colors">
                      {entry.capture.item}
                    </h3>

                    {/* Definition */}
                    {entry.definition && (
                      <p className="mt-1 text-sm text-dim/75 leading-relaxed">
                        {entry.definition}
                      </p>
                    )}

                    {/* Tags */}
                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full bg-accent-subtle/50 px-2 py-0.5 text-[10px] text-dim/60"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

// ────────────────────────── Variant J — Card Stack Browse ──────────────────────────

export function VariantJ({
  entries,
  query,
  isLoading,
}: {
  entries: Entry[];
  query: string;
  isLoading: boolean;
}) {
  if (isLoading)
    return <p className="mx-5 mt-8 text-center text-sm text-dim">Loading…</p>;
  if (entries.length === 0) return <EmptyState query={query} />;

  // Show 3 cards deep for the stack illusion
  const visible = entries.slice(0, 3);

  return (
    <div className="flex flex-col gap-4 px-3 pb-16">
      {/* Hint */}
      <p className="text-center text-xs text-dim/40">
        Swipe or tap arrows to browse
      </p>

      {/* Card stack */}
      <div className="relative mx-auto w-full max-w-sm" style={{ height: 340 }}>
        {visible.map((entry, i) => {
          const tags = parseTags(entry.tags);
          const isTop = i === 0;

          return (
            <Link
              key={entry.id}
              to={`/wordbank/${entry.id}`}
              className={`absolute inset-x-0 rounded-card border border-divider/20 bg-surface p-5 shadow-md transition-all ${
                isTop
                  ? "z-20 scale-100 opacity-100"
                  : i === 1
                    ? "z-10 scale-[0.97] opacity-60 translate-y-3"
                    : "z-0 scale-[0.94] opacity-30 translate-y-6"
              }`}
              style={{ height: isTop ? 340 : 320 }}
            >
              {/* Source badge */}
              {entry.source && (
                <span className="inline-flex items-center gap-1 rounded-full border border-divider/30 px-2.5 py-0.5 text-[10px] font-medium text-dim/60 uppercase tracking-wider">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${sourceDot(entry.source.name)}`}
                  />
                  {entry.source.name}
                </span>
              )}

              {/* Word — large, the centerpiece */}
              <h2 className="mt-4 font-display text-[28px] font-bold text-ink leading-tight">
                {entry.capture.item}
              </h2>

              {/* Definition */}
              {entry.definition && (
                <p className="mt-3 text-sm text-dim/80 leading-relaxed">
                  {entry.definition}
                </p>
              )}

              {/* Translation */}
              {entry.translationArabic && (
                <p className="mt-3 text-base text-dim/70 font-arabic text-end">
                  {entry.translationArabic}
                </p>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-accent-subtle px-2.5 py-1 text-[11px] text-dim/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Navigation arrows */}
      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-divider/40 bg-surface text-dim hover:text-ink hover:border-accent/30 transition-colors cursor-pointer"
        >
          ←
        </button>
        <span className="text-xs text-dim/40">1 of {entries.length}</span>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-divider/40 bg-surface text-dim hover:text-ink hover:border-accent/30 transition-colors cursor-pointer"
        >
          →
        </button>
      </div>

      {/* Compact list below — the rest */}
      <div className="mt-4 border-t border-divider/15 pt-4">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-dim/30">
          All words
        </h3>
        <div className="flex flex-col gap-0.5">
          {entries.map((entry) => (
            <Link
              key={entry.id}
              to={`/wordbank/${entry.id}`}
              className="flex items-center gap-2 rounded-card px-3 py-2 text-sm transition-colors hover:bg-surface group"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${sourceDot(entry.source?.name ?? "")}`}
              />
              <span className="font-display font-semibold text-ink group-hover:text-accent transition-colors truncate">
                {entry.capture.item}
              </span>
              <span className="text-dim/50 text-xs truncate hidden sm:inline">
                {entry.definition?.slice(0, 40)}
                {entry.definition && entry.definition.length > 40 ? "…" : ""}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
