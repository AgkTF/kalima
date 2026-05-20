/**
 * PROTOTYPE — throwaway UI variants for Word Bank screen.
 * Switchable via ?variant=A|B|C|D on /wordbank.
 * Delete this file when a variant is chosen.
 */

import { CalendarIcon } from "@heroicons/react/24/outline";
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

function SourceDot({ name }: { name: string }) {
  const colors: Record<string, string> = {
    book: "bg-accent",
    movie: "bg-amber-500",
    podcast: "bg-sky-500",
    article: "bg-rose-500",
    conversation: "bg-emerald-500",
  };
  const color = colors[name] ?? "bg-accent";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

function TagChip({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-divider px-2 py-0.5 text-[10px] text-dim">
      {tag}
    </span>
  );
}

function DefinitionSnippet({ text }: { text: string }) {
  if (!text) return null;
  // Truncate to ~80 chars
  const snippet = text.length > 80 ? `${text.slice(0, 77)}...` : text;
  return <p className="text-sm text-dim leading-relaxed">{snippet}</p>;
}

// ────────────────────────── Prototype Switcher ──────────────────────────

export function PrototypeSwitcher({ current }: { current: string }) {
  if (import.meta.env.PROD) return null;

  const variants = ["A", "B", "C", "D"];
  const names: Record<string, string> = {
    A: "Dense Feed",
    B: "Magazine Grid",
    C: "Timeline",
    D: "Dashboard",
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

// ────────────────────────── Variant A — Dense Feed ──────────────────────────

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

export function VariantA({
  entries,
  query,
  isLoading,
}: {
  entries: Entry[];
  query: string;
  isLoading: boolean;
}) {
  if (isLoading)
    return <p className="mx-5 mt-8 text-center text-sm text-dim">Loading...</p>;

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-16">
        <CalendarIcon className="h-10 w-10 text-dim/40" />
        <p className="text-sm text-dim">
          {query ? `No results for "${query}"` : "Your word bank is empty"}
        </p>
        {!query && (
          <p className="text-xs text-dim/60">
            Start capturing words to build your collection
          </p>
        )}
      </div>
    );
  }

  const groups = groupByDate(entries);
  const sourceCount = new Set(entries.map((e) => e.source?.name)).size;

  return (
    <div className="flex flex-col gap-4 px-3 pb-16">
      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs text-dim/70">
        <span>{entries.length} entries</span>
        <span aria-hidden="true">·</span>
        <span>{sourceCount} sources</span>
      </div>

      {/* Grouped entries */}
      {Object.entries(groups).map(([label, groupEntries]) => (
        <section key={label}>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-dim/50">
            {label}
          </h3>
          <ul className="flex flex-col gap-2">
            {groupEntries.map((entry) => (
              <li key={entry.id}>
                <Link
                  to={`/wordbank/${entry.id}`}
                  className="flex items-start gap-3 rounded-card border border-divider/60 bg-surface px-3 py-3 transition-colors hover:bg-accent-subtle/50"
                >
                  {/* Source color bar */}
                  <div className="mt-1 shrink-0">
                    <SourceDot name={entry.source?.name ?? ""} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-semibold text-ink truncate">
                        {entry.capture.item}
                      </span>
                      <span className="shrink-0 rounded-full bg-chip px-1.5 text-[10px] text-chip-text">
                        {entry.source?.name}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {entry.tags
                        ? (() => {
                            try {
                              return (JSON.parse(entry.tags) as string[]).map(
                                (tag: string) => (
                                  <TagChip key={tag} tag={tag} />
                                ),
                              );
                            } catch {
                              return null;
                            }
                          })()
                        : null}
                    </div>
                    <div className="mt-1.5">
                      <DefinitionSnippet text={entry.definition} />
                    </div>
                    {entry.translationArabic && (
                      <p className="mt-1 text-sm text-dim/80 font-arabic text-end">
                        {entry.translationArabic}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ────────────────────────── Variant B — Magazine Grid ──────────────────────────

export function VariantB({
  entries,
  query,
  isLoading,
}: {
  entries: Entry[];
  query: string;
  isLoading: boolean;
}) {
  if (isLoading)
    return <p className="mx-5 mt-8 text-center text-sm text-dim">Loading...</p>;

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-16">
        <CalendarIcon className="h-12 w-12 text-dim/30" />
        <p className="text-sm text-dim">
          {query ? `Nothing found for "${query}"` : "No words yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-3 pb-16">
      {entries.map((entry) => {
        const tags: string[] = (() => {
          try {
            return JSON.parse(entry.tags) as string[];
          } catch {
            return [];
          }
        })();

        return (
          <Link
            key={entry.id}
            to={`/wordbank/${entry.id}`}
            className="flex flex-col gap-2 rounded-card border border-divider/40 bg-surface p-3.5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-1.5">
              <SourceDot name={entry.source?.name ?? ""} />
              <span className="text-[10px] text-dim/60 uppercase tracking-wider truncate">
                {entry.source?.name}
              </span>
            </div>
            <span className="font-display text-base font-semibold text-ink leading-snug">
              {entry.capture.item}
            </span>
            <DefinitionSnippet text={entry.definition} />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-auto pt-1">
                {tags.slice(0, 2).map((tag) => (
                  <TagChip key={tag} tag={tag} />
                ))}
                {tags.length > 2 && (
                  <span className="text-[10px] text-dim/50">
                    +{tags.length - 2}
                  </span>
                )}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

// ────────────────────────── Variant C — Timeline ──────────────────────────

export function VariantC({
  entries,
  query,
  isLoading,
}: {
  entries: Entry[];
  query: string;
  isLoading: boolean;
}) {
  if (isLoading)
    return <p className="mx-5 mt-8 text-center text-sm text-dim">Loading...</p>;

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-16">
        <CalendarIcon className="h-10 w-10 text-dim/40" />
        <p className="text-sm text-dim">
          {query ? "No matches" : "Your word bank is empty"}
        </p>
      </div>
    );
  }

  // Group by month
  const months: Record<string, Entry[]> = {};
  for (const e of entries) {
    const key = new Date(e.enrichedAt).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    if (!months[key]) months[key] = [];
    months[key].push(e);
  }

  return (
    <div className="flex flex-col gap-6 px-3 pb-16">
      {Object.entries(months).map(([month, monthEntries]) => (
        <section key={month}>
          <h3 className="mb-3 text-xs font-medium text-dim/50 uppercase tracking-widest">
            {month}
          </h3>
          <div className="relative pl-6 border-l border-divider/40">
            {monthEntries.map((entry, i) => (
              <Link
                key={entry.id}
                to={`/wordbank/${entry.id}`}
                className={`relative block pb-6 last:pb-0 group ${
                  i === 0 ? "pt-0" : ""
                }`}
              >
                {/* Timeline dot */}
                <span className="absolute -left-[23px] top-0.5 flex h-[14px] w-[14px] items-center justify-center rounded-full border-2 border-divider/40 bg-page group-hover:border-accent/60 transition-colors">
                  <span className="h-[5px] w-[5px] rounded-full bg-accent/50" />
                </span>

                <span className="font-display text-base font-semibold text-ink group-hover:text-accent transition-colors">
                  {entry.capture.item}
                </span>
                {entry.definition && (
                  <p className="mt-0.5 text-sm text-dim/80 leading-relaxed line-clamp-1">
                    {entry.definition}
                  </p>
                )}
                {entry.translationArabic && (
                  <p className="mt-0.5 text-sm text-dim/60 font-arabic">
                    {entry.translationArabic}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ────────────────────────── Variant D — Dashboard ──────────────────────────

function sortEntries(entries: Entry[], sort: string): Entry[] {
  const sorted = [...entries];
  switch (sort) {
    case "alpha":
      return sorted.sort((a, b) =>
        a.capture.item.localeCompare(b.capture.item),
      );
    case "source":
      return sorted.sort((a, b) =>
        (a.source?.name ?? "").localeCompare(b.source?.name ?? ""),
      );
    default: // recent
      return sorted;
  }
}

export function VariantD({
  entries,
  query,
  isLoading,
}: {
  entries: Entry[];
  query: string;
  isLoading: boolean;
}) {
  if (isLoading)
    return <p className="mx-5 mt-8 text-center text-sm text-dim">Loading...</p>;

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-16">
        <CalendarIcon className="h-10 w-10 text-dim/40" />
        <p className="text-sm text-dim">
          {query ? `No results for "${query}"` : "Your word bank is empty"}
        </p>
      </div>
    );
  }

  const sourceCount = new Set(entries.map((e) => e.source?.name)).size;
  const lastEntry = entries[0];
  const lastTime = lastEntry
    ? (() => {
        const diff = Date.now() - new Date(lastEntry.enrichedAt).getTime();
        const hours = Math.floor(diff / 3600000);
        if (hours < 1) return "Just now";
        if (hours === 1) return "1h ago";
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
      })()
    : "";

  return (
    <div className="flex flex-col gap-4 px-3 pb-16">
      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-card border border-divider/40 bg-surface px-3 py-2.5 text-center">
          <div className="text-lg font-display font-bold text-accent">
            {entries.length}
          </div>
          <div className="text-[10px] text-dim/60">entries</div>
        </div>
        <div className="rounded-card border border-divider/40 bg-surface px-3 py-2.5 text-center">
          <div className="text-lg font-display font-bold text-accent">
            {sourceCount}
          </div>
          <div className="text-[10px] text-dim/60">sources</div>
        </div>
        <div className="rounded-card border border-divider/40 bg-surface px-3 py-2.5 text-center">
          <div className="text-sm font-display font-semibold text-accent truncate">
            {lastTime}
          </div>
          <div className="text-[10px] text-dim/60">last added</div>
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-1 text-xs">
        <span className="text-dim/60 mr-1">Sort:</span>
        {(["recent", "alpha", "source"] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={`rounded-full px-2.5 py-1 capitalize cursor-pointer transition-colors ${
              s === "recent"
                ? "bg-accent text-white"
                : "text-dim hover:text-ink hover:bg-accent-subtle"
            }`}
            // This is prototype-only — no state wiring needed
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table rows */}
      <ul className="flex flex-col">
        {entries.map((entry, i) => {
          const tags: string[] = (() => {
            try {
              return JSON.parse(entry.tags) as string[];
            } catch {
              return [];
            }
          })();
          return (
            <li
              key={entry.id}
              className={`border-b border-divider/30 ${
                i % 2 === 0 ? "bg-surface/50" : ""
              }`}
            >
              <Link
                to={`/wordbank/${entry.id}`}
                className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent-subtle/30"
              >
                <span className="w-[35%] font-display text-sm font-semibold text-ink truncate">
                  {entry.capture.item}
                </span>
                <span className="w-[35%] text-xs text-dim truncate">
                  {entry.definition || "—"}
                </span>
                <span className="w-[20%] text-[10px] text-dim/60 truncate">
                  {tags.length > 0 ? tags.slice(0, 2).join(", ") : "—"}
                </span>
                <span className="w-[10%] text-right">
                  <SourceDot name={entry.source?.name ?? ""} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
