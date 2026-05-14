/**
 * PROTOTYPE — Throwaway. Explore entry card variants for Review screen.
 * Route: /prototype/review-cards?variant=a|b|c|d
 *
 * Goal: show all 6 enrichment fields compactly for fast scanning, with
 * ability to expand. Currently only shows definition, translationArabic,
 * and tags. Missing: nuance, examples, relatedEntries.
 */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";

const MOCK_ENTRIES = [
  {
    item: "serendipity",
    definition:
      "The occurrence of events by chance in a happy or beneficial way.",
    translationArabic: "مصادفة سعيدة",
    nuance:
      "Positive connotation — implies the discovery was not just accidental but fortunate.",
    examples: [
      "It was pure serendipity that I found that bookstore on a rainy afternoon.",
      "Their meeting at the conference was a moment of serendipity.",
    ],
    tags: ["emotion", "discovery", "literary"],
    relatedEntries: ["epiphany", "destiny"],
  },
  {
    item: "harpoon",
    definition:
      "A barbed spear-like missile attached to a rope, used for catching large fish or whales.",
    translationArabic: "حربة",
    nuance:
      "Strongly associated with 19th-century whaling; carries a sense of the maritime and industrial.",
    examples: [
      "The harpoon struck the whale with tremendous force.",
      "Each whaler carried several harpoons on deck.",
    ],
    tags: ["maritime", "weapon", "historical"],
    relatedEntries: ["whale", "ship", "crew"],
  },
];

function PrototypeSwitcher({
  variants,
  current,
  onSwitch,
}: {
  variants: string[];
  current: string;
  onSwitch: (v: string) => void;
}) {
  const idx = variants.indexOf(current);
  const go = (dir: number) => {
    const next = (idx + dir + variants.length) % variants.length;
    onSwitch(variants[next]);
  };
  const labels: Record<string, string> = {
    a: "Current fields only",
    b: "Compact + expand",
    c: "Progressive disclosure",
    d: "All inline",
  };
  return (
    <div className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-full bg-gray-900 px-4 py-1.5 text-white shadow-lg">
      <button
        type="button"
        onClick={() => go(-1)}
        className="text-lg leading-none cursor-pointer"
      >
        ←
      </button>
      <span className="text-xs font-semibold">
        {current.toUpperCase()} — {labels[current] ?? ""}
      </span>
      <button
        type="button"
        onClick={() => go(1)}
        className="text-lg leading-none cursor-pointer"
      >
        →
      </button>
    </div>
  );
}

/* ── Variant A: Current fields only (baseline) ── */
function CardA({ e }: { e: (typeof MOCK_ENTRIES)[number] }) {
  return (
    <div className="mb-2 rounded-button border border-divider bg-surface p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-display text-sm font-semibold text-ink">{e.item}</p>
      </div>
      <p className="text-xs text-ink leading-relaxed mb-1">{e.definition}</p>
      <p className="text-xs text-dim font-arabic">{e.translationArabic}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {e.tags.map((t) => (
          <span
            key={t}
            className="rounded-full bg-accent-subtle px-1.5 py-0.5 text-[10px] text-dim"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Variant B: Compact + toggle to expand ── */
function CardB({ e }: { e: (typeof MOCK_ENTRIES)[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2 rounded-button border border-divider bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-sm font-semibold text-ink">{e.item}</p>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-[10px] text-accent cursor-pointer shrink-0 mt-0.5"
        >
          {open ? "less" : "more"}
        </button>
      </div>
      <p className="text-xs text-ink leading-relaxed mt-0.5">{e.definition}</p>
      <p className="text-xs text-dim font-arabic">{e.translationArabic}</p>
      {open && (
        <div className="mt-2 pt-2 border-t border-divider space-y-1.5">
          <div>
            <span className="text-[10px] font-semibold text-dim">Nuance</span>
            <p className="text-xs text-ink leading-relaxed">{e.nuance}</p>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-dim">Examples</span>
            <ul className="list-disc list-inside text-xs text-ink">
              {e.examples.map((ex, i) => (
                <li key={i} className="leading-relaxed">
                  {ex}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-dim">Related</span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {e.relatedEntries.map((r) => (
                <span
                  key={r}
                  className="rounded-full bg-accent-subtle px-1.5 py-0.5 text-[10px] text-accent"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="mt-1 flex flex-wrap gap-1">
        {e.tags.map((t) => (
          <span
            key={t}
            className="rounded-full bg-accent-subtle px-1.5 py-0.5 text-[10px] text-dim"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Variant C: Progressive disclosure ── */
function CardC({ e }: { e: (typeof MOCK_ENTRIES)[number] }) {
  const [section, setSection] = useState<string | null>(null);
  const toggle = (s: string) => setSection(section === s ? null : s);
  return (
    <div className="mb-2 rounded-button border border-divider bg-surface p-3">
      <p className="font-display text-sm font-semibold text-ink mb-1">
        {e.item}
      </p>
      <p className="text-xs text-ink leading-relaxed">{e.definition}</p>
      <p className="text-xs text-dim font-arabic mt-0.5">
        {e.translationArabic}
      </p>

      <div className="mt-2 flex flex-wrap gap-1">
        {(
          [
            { key: "nuance", label: "Nuance" },
            { key: "examples", label: "Examples" },
            { key: "related", label: "Related" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            className={`rounded-full px-2 py-0.5 text-[10px] border cursor-pointer ${
              section === key
                ? "border-accent bg-accent-subtle text-accent"
                : "border-divider text-dim"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {section === "nuance" && (
        <p className="mt-1.5 text-xs text-ink leading-relaxed">{e.nuance}</p>
      )}
      {section === "examples" && (
        <ul className="mt-1.5 list-disc list-inside text-xs text-ink">
          {e.examples.map((ex, i) => (
            <li key={i} className="leading-relaxed">
              {ex}
            </li>
          ))}
        </ul>
      )}
      {section === "related" && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {e.relatedEntries.map((r) => (
            <span
              key={r}
              className="rounded-full bg-accent-subtle px-1.5 py-0.5 text-[10px] text-accent"
            >
              {r}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1">
        {e.tags.map((t) => (
          <span
            key={t}
            className="rounded-full bg-accent-subtle px-1.5 py-0.5 text-[10px] text-dim"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Variant D: All fields inline (dense) ── */
function CardD({ e }: { e: (typeof MOCK_ENTRIES)[number] }) {
  return (
    <div className="mb-2 rounded-button border border-divider bg-surface p-3">
      <p className="font-display text-sm font-semibold text-ink mb-1">
        {e.item}
      </p>
      <p className="text-xs text-ink leading-relaxed">{e.definition}</p>
      <p className="text-xs text-dim font-arabic mt-0.5">
        {e.translationArabic}
      </p>
      <p className="text-xs text-dim italic mt-1 leading-relaxed">{e.nuance}</p>
      <ul className="mt-1 list-disc list-inside text-xs text-dim">
        {e.examples.map((ex, i) => (
          <li key={i} className="leading-relaxed">
            {ex}
          </li>
        ))}
      </ul>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {e.relatedEntries.map((r) => (
          <span
            key={r}
            className="rounded-full bg-accent-subtle px-1.5 py-0.5 text-[10px] text-accent"
          >
            {r}
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {e.tags.map((t) => (
          <span
            key={t}
            className="rounded-full bg-accent-subtle px-1.5 py-0.5 text-[10px] text-dim"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PrototypeReviewCards() {
  const [searchParams, setSearchParams] = useSearchParams();
  const variant = (searchParams.get("variant") ?? "a").toLowerCase();

  const Card =
    variant === "b"
      ? CardB
      : variant === "c"
        ? CardC
        : variant === "d"
          ? CardD
          : CardA;

  return (
    <main className="flex min-h-dvh flex-col bg-page font-ui text-ink pb-20">
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="font-display text-lg font-bold text-ink">
          Prototype — Entry cards
        </h1>
        <span className="rounded-full bg-accent-subtle px-2.5 py-0.5 text-xs font-semibold text-accent">
          {MOCK_ENTRIES.length}
        </span>
      </header>

      <div className="px-5">
        {MOCK_ENTRIES.map((e) => (
          <Card key={e.item} e={e} />
        ))}
      </div>

      <PrototypeSwitcher
        variants={["a", "b", "c", "d"]}
        current={variant}
        onSwitch={(v) => setSearchParams({ variant: v })}
      />
    </main>
  );
}
