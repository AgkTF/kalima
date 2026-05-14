/**
 * PROTOTYPE — iteration 3. Hybrid: B2 chevron toggle + B1 tag layout.
 * /prototype/review-cards?variant=b1|b2|b3|b4
 */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";

const MOCK = {
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
};

/* ── B4: B2 toggle + B1 tag layout ── */
function CardB4({ e }: { e: typeof MOCK }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2 rounded-button border border-divider bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-sm font-semibold text-ink">{e.item}</p>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-dim cursor-pointer hover:text-accent shrink-0"
        >
          {open ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>
      <p className="text-xs text-ink leading-relaxed mt-0.5">{e.definition}</p>
      <p className="text-xs text-dim font-arabic">{e.translationArabic}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {e.tags.map((t) => (
          <span key={t} className="rounded-full bg-accent-subtle px-1.5 py-0.5 text-[10px] text-dim">{t}</span>
        ))}
      </div>
      {open && (
        <div className="mt-2 pt-2 border-t border-divider space-y-1.5">
          <div>
            <span className="text-[10px] font-semibold text-dim">Nuance</span>
            <p className="text-xs text-ink leading-relaxed">{e.nuance}</p>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-dim">Examples</span>
            <ul className="list-disc list-inside text-xs text-ink">
              {e.examples.map((ex) => <li key={ex} className="leading-relaxed">{ex}</li>)}
            </ul>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-dim">Related entries</span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {e.relatedEntries.map((r) => (
                <span key={r} className="rounded-full border border-accent/30 bg-accent/5 px-1.5 py-0.5 text-[10px] text-accent">{r}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Switcher({
  variants,
  current,
  onSwitch,
}: {
  variants: string[];
  current: string;
  onSwitch: (v: string) => void;
}) {
  const idx = variants.indexOf(current);
  const go = (dir: number) => onSwitch(variants[(idx + dir + variants.length) % variants.length]);
  const labels: Record<string, string> = {
    b1: "Text toggle + labeled related",
    b2: "Chevron icon + comma related",
    b3: "Text toggle + related chips v2",
    b4: "★ Chevron (B2) + layout (B1)",
  };
  return (
    <div className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-full bg-gray-900 px-4 py-1.5 text-white shadow-lg">
      <button type="button" onClick={() => go(-1)} className="text-lg cursor-pointer">←</button>
      <span className="text-xs font-semibold">{current.toUpperCase()} — {labels[current] ?? ""}</span>
      <button type="button" onClick={() => go(1)} className="text-lg cursor-pointer">→</button>
    </div>
  );
}

/* ── B1: Chevron toggle + labeled related section ── */
function CardB1({ e }: { e: typeof MOCK }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2 rounded-button border border-divider bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-sm font-semibold text-ink">{e.item}</p>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-[10px] text-accent cursor-pointer shrink-0 mt-0.5 flex items-center gap-0.5"
        >
          {open ? "hide details ▲" : "show details ▼"}
        </button>
      </div>
      <p className="text-xs text-ink leading-relaxed mt-0.5">{e.definition}</p>
      <p className="text-xs text-dim font-arabic">{e.translationArabic}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {e.tags.map((t) => (
          <span key={t} className="rounded-full bg-accent-subtle px-1.5 py-0.5 text-[10px] text-dim">{t}</span>
        ))}
      </div>
      {open && (
        <div className="mt-2 pt-2 border-t border-divider space-y-1.5">
          <div>
            <span className="text-[10px] font-semibold text-dim">Nuance</span>
            <p className="text-xs text-ink leading-relaxed">{e.nuance}</p>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-dim">Examples</span>
            <ul className="list-disc list-inside text-xs text-ink">
              {e.examples.map((ex) => <li key={ex} className="leading-relaxed">{ex}</li>)}
            </ul>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-dim">Related entries</span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {e.relatedEntries.map((r) => (
                <span key={r} className="rounded-full border border-accent/30 bg-accent/5 px-1.5 py-0.5 text-[10px] text-accent">{r}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── B2: Icon toggle + related as inline comma text ── */
function CardB2({ e }: { e: typeof MOCK }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2 rounded-button border border-divider bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-sm font-semibold text-ink">{e.item}</p>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-dim cursor-pointer shrink-0"
        >
          {open ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>
      <p className="text-xs text-ink leading-relaxed mt-0.5">{e.definition}</p>
      <p className="text-xs text-dim font-arabic">{e.translationArabic}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {e.tags.map((t) => (
          <span key={t} className="rounded-full bg-accent-subtle px-1.5 py-0.5 text-[10px] text-dim">{t}</span>
        ))}
      </div>
      {open && (
        <div className="mt-2 pt-2 border-t border-divider space-y-1.5">
          <p className="text-xs text-ink italic leading-relaxed">{e.nuance}</p>
          <ul className="list-disc list-inside text-xs text-ink">
            {e.examples.map((ex) => <li key={ex} className="leading-relaxed">{ex}</li>)}
          </ul>
          <p className="text-xs text-dim">
            <span className="font-semibold">Related: </span>
            {e.relatedEntries.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── B3: "See all" toggle + related as distinct small chips ── */
function CardB3({ e }: { e: typeof MOCK }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2 rounded-button border border-divider bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-sm font-semibold text-ink">{e.item}</p>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-[10px] text-dim hover:text-accent cursor-pointer shrink-0"
        >
          {open ? "collapse" : "see all"}
        </button>
      </div>
      <p className="text-xs text-ink leading-relaxed mt-0.5">{e.definition}</p>
      <p className="text-xs text-dim font-arabic">{e.translationArabic}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
        {e.tags.map((t) => (
          <span key={t} className="rounded-full bg-accent-subtle px-1.5 py-0.5 text-[10px] text-dim">{t}</span>
        ))}
        {e.relatedEntries.map((r) => (
          <span key={r} className="rounded-full border border-accent/20 bg-transparent px-1.5 py-0.5 text-[10px] text-accent/70">↗ {r}</span>
        ))}
      </div>
      {open && (
        <div className="mt-2 pt-2 border-t border-divider space-y-1.5">
          <div>
            <span className="text-[10px] font-semibold text-dim">Nuance</span>
            <p className="text-xs text-ink leading-relaxed">{e.nuance}</p>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-dim">Examples</span>
            <ul className="list-disc list-inside text-xs text-ink">
              {e.examples.map((ex) => <li key={ex} className="leading-relaxed">{ex}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export function PrototypeReviewCards() {
  const [searchParams, setSearchParams] = useSearchParams();
  const variant = (searchParams.get("variant") ?? "b1").toLowerCase();

  const Card = variant === "b2" ? CardB2 : variant === "b3" ? CardB3 : variant === "b4" ? CardB4 : CardB1;

  return (
    <main className="flex min-h-dvh flex-col bg-page font-ui text-ink pb-20">
      <header className="px-5 pt-4 pb-2">
        <h1 className="font-display text-lg font-bold text-ink">Prototype — Refined B</h1>
        <p className="text-xs text-dim mt-0.5">Focus: clear expand label + distinct tags vs related</p>
      </header>
      <div className="px-5 space-y-3">
        <Card e={MOCK} />
        <Card e={{ ...MOCK, item: "serendipity", definition: "The occurrence of events by chance in a happy or beneficial way.", translationArabic: "مصادفة سعيدة", nuance: "Positive connotation — implies discovery was not just accidental but fortunate.", examples: ["It was pure serendipity that I found that bookstore."], tags: ["emotion", "discovery"], relatedEntries: ["epiphany", "destiny"] }} />
      </div>
      <Switcher variants={["b4", "b1", "b2", "b3"]} current={variant} onSwitch={(v) => setSearchParams({ variant: v })} />
    </main>
  );
}
