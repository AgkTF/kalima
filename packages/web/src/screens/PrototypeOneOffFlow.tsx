/**
 * PROTOTYPE — Throwaway screen to compare two one-off capture enrichment flows.
 * Route: /prototype/one-off-flow?variant=a | ?variant=b
 *
 * Variant A (Deferred): captures accumulate in the list. Enrichment fires
 *   only when the user explicitly triggers it ("Switch to Review"). Then
 *   placeholder entries appear in Review as "Enriching…" → pending_review.
 *
 * Variant B (Immediate): enrichment starts immediately in the background.
 *   The capture shows a spinner in the list until complete, then disappears
 *   and appears in Review.
 */

import { ArrowPathIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PrototypeSwitcher } from "../components/PrototypeSwitcher";

type CaptureState =
  | { kind: "pending" } // Variant A: waiting for user to trigger enrichment
  | { kind: "enriching" } // Variant B: enrichment started, waiting for LLM
  | { kind: "done" }; // Enrichment complete

interface SimCapture {
  id: number;
  item: string;
  state: CaptureState;
  readyInMs: number; // when enrichment will complete (for simulation)
}

const ENRICH_DELAY_MS = 3000; // simulate LLM latency

export function PrototypeOneOffFlow() {
  const [searchParams, setSearchParams] = useSearchParams();
  const variant = (searchParams.get("variant") ?? "a").toLowerCase();

  const [captures, setCaptures] = useState<SimCapture[]>([]);
  const [entries, setEntries] = useState<
    { id: number; item: string; status: string }[]
  >([]);
  const [nextId, setNextId] = useState(1);
  const [input, setInput] = useState("");
  const [enrichRunning, setEnrichRunning] = useState(false);

  const addCapture = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const id = nextId;

    if (variant === "b") {
      // Variant B: immediate enrichment
      const cap: SimCapture = {
        id,
        item: trimmed,
        state: { kind: "enriching" },
        readyInMs: ENRICH_DELAY_MS,
      };
      setCaptures((prev) => [...prev, cap]);
      // Schedule transition
      setTimeout(() => {
        setCaptures((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, state: { kind: "done" } } : c,
          ),
        );
      }, ENRICH_DELAY_MS);
      // Schedule removal from capture + addition to entries
      setTimeout(() => {
        setCaptures((prev) => prev.filter((c) => c.id !== id));
        setEntries((prev) => [
          ...prev,
          { id, item: trimmed, status: "pending_review" },
        ]);
      }, ENRICH_DELAY_MS + 500);
    } else {
      // Variant A: deferred
      const cap: SimCapture = {
        id,
        item: trimmed,
        state: { kind: "pending" },
        readyInMs: 0,
      };
      setCaptures((prev) => [...prev, cap]);
    }

    setNextId((n) => n + 1);
    setInput("");
  };

  const triggerEnrichment = () => {
    if (variant !== "a" || enrichRunning) return;
    setEnrichRunning(true);

    // Create placeholder entries for all pending captures
    const pendingIds = captures
      .filter((c) => c.state.kind === "pending")
      .map((c) => c.id);
    const newEntries = captures
      .filter((c) => c.state.kind === "pending")
      .map((c) => ({ id: c.id, item: c.item, status: "processing" }));
    setEntries((prev) => [...prev, ...newEntries]);

    // Clear capture list
    setCaptures([]);

    // Simulate enrichment completing one by one with staggered timing
    for (let i = 0; i < pendingIds.length; i++) {
      setTimeout(
        () => {
          setEntries((prev) =>
            prev.map((e) =>
              e.id === pendingIds[i] ? { ...e, status: "pending_review" } : e,
            ),
          );
        },
        ENRICH_DELAY_MS + i * 1000,
      );
    }
  };

  const reviewCount = entries.length;

  return (
    <main className="flex min-h-dvh flex-col bg-page font-ui text-ink pb-24">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="font-display text-lg font-bold text-ink">
          Prototype — One‑off flow
        </h1>
      </header>

      {/* Explanation */}
      <div className="mx-5 mb-3 rounded-button border border-divider bg-surface p-3">
        <p className="text-xs text-dim leading-relaxed mb-2">
          <strong className="text-ink">
            {variant === "a" ? "Deferred enrichment" : "Immediate enrichment"}
          </strong>
        </p>
        {variant === "a" ? (
          <p className="text-xs text-dim leading-relaxed">
            Captures accumulate here. Enrichment starts only when you press
            &ldquo;Switch to Review.&rdquo; Then placeholder entries appear in
            Review as &ldquo;Enriching…&rdquo; and resolve over{" "}
            {ENRICH_DELAY_MS / 1000}s.
          </p>
        ) : (
          <p className="text-xs text-dim leading-relaxed">
            Enrichment starts immediately in the background. Captures show a
            spinner until complete ({ENRICH_DELAY_MS / 1000}s), then disappear
            and appear in Review.
          </p>
        )}
      </div>

      {/* Mock Review section */}
      <div className="mx-5 mb-3 rounded-button border border-accent/30 bg-accent-subtle/20 p-3">
        <h2 className="font-display text-xs font-semibold text-ink mb-2">
          📋 Review ({reviewCount})
        </h2>
        {entries.length === 0 ? (
          <p className="text-xs text-dim">No entries yet</p>
        ) : (
          <div className="space-y-1.5">
            {entries.map((e) => (
              <div
                key={e.id}
                className={`rounded px-2 py-1.5 text-xs flex items-center gap-2 ${
                  e.status === "processing"
                    ? "bg-yellow-50 text-yellow-800"
                    : e.status === "pending_review"
                      ? "bg-green-50 text-green-800"
                      : "bg-blue-50 text-blue-800"
                }`}
              >
                {e.status === "processing" ? (
                  <ArrowPathIcon className="h-3 w-3 animate-spin shrink-0" />
                ) : e.status === "pending_review" ? (
                  <CheckIcon className="h-3 w-3 shrink-0" />
                ) : null}
                <span className="font-semibold">{e.item}</span>
                <span className="opacity-60 ml-auto">{e.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Capture list */}
      <div className="mx-5 mb-3 flex-1">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-xs font-semibold text-ink">
            📝 Captures ({captures.length})
          </h2>
          {variant === "a" && captures.length > 0 && (
            <button
              type="button"
              onClick={triggerEnrichment}
              disabled={enrichRunning}
              className="rounded-button border border-accent px-2.5 py-1 text-xs font-medium text-accent cursor-pointer hover:bg-accent hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Switch to Review →
            </button>
          )}
        </div>

        {captures.length === 0 ? (
          <p className="text-xs text-dim">
            {variant === "a"
              ? "Add captures below. They'll sit here until you're ready."
              : "Add captures below. Enrichment starts immediately."}
          </p>
        ) : (
          <div className="space-y-1.5">
            {captures.map((c) => (
              <div
                key={c.id}
                className={`rounded-button border border-divider bg-surface px-3 py-2 flex items-center gap-2 text-xs ${
                  c.state.kind === "done" ? "opacity-50" : ""
                }`}
              >
                {c.state.kind === "enriching" ? (
                  <ArrowPathIcon className="h-3 w-3 animate-spin text-dim shrink-0" />
                ) : c.state.kind === "done" ? (
                  <CheckIcon className="h-3 w-3 text-green-500 shrink-0" />
                ) : (
                  <span className="h-3 w-3 shrink-0" />
                )}
                <span className="font-semibold text-ink">{c.item}</span>
                <span className="text-dim ml-auto">
                  {c.state.kind === "pending" && variant === "a"
                    ? "waiting"
                    : c.state.kind === "enriching"
                      ? "enriching…"
                      : c.state.kind === "done"
                        ? "removing…"
                        : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Capture input */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-divider bg-surface px-5 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addCapture();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a word and press Enter…"
            className="flex-1 rounded-button border border-divider bg-page px-3 py-2 text-sm text-ink placeholder-dim outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-button bg-accent px-4 py-2 text-sm font-medium text-white cursor-pointer hover:opacity-90"
          >
            Add
          </button>
        </form>
      </div>

      {/* Switcher */}
      <PrototypeSwitcher
        variants={["a", "b"]}
        current={variant}
        onSwitch={(v: string) => {
          setCaptures([]);
          setEntries([]);
          setNextId(1);
          setEnrichRunning(false);
          setSearchParams({ variant: v });
        }}
      />
    </main>
  );
}
