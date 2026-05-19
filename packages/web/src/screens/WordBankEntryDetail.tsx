import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { trpc } from "../trpc";
import { PrototypeSwitcher } from "./WordBankEntryDetail/PrototypeSwitcher";
import {
  type EditableField,
  VariantA,
  VariantB,
  VariantC,
} from "./WordBankEntryDetail/prototype-variants";

const VARIANTS = [
  { key: "A", label: "Per-field pencil icon" },
  { key: "B", label: "View / Edit mode toggle" },
  { key: "C", label: "Click to select, then edit" },
];

export function WordBankEntryDetail() {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const variant = searchParams.get("variant") ?? "A";
  const id = Number(entryId);
  const utils = trpc.useUtils();

  const entry = trpc.wordBank.getEntry.useQuery(
    { entryId: id },
    { enabled: !Number.isNaN(id) },
  );

  const updateField = trpc.wordBank.updateField.useMutation({
    onSuccess: () => {
      utils.wordBank.getEntry.invalidate({ entryId: id });
    },
  });

  const addTag = trpc.wordBank.addTag.useMutation({
    onSuccess: () => {
      utils.wordBank.getEntry.invalidate({ entryId: id });
      setNewTag("");
    },
  });

  const removeTag = trpc.wordBank.removeTag.useMutation({
    onSuccess: () => {
      utils.wordBank.getEntry.invalidate({ entryId: id });
    },
  });

  const [newTag, setNewTag] = useState("");

  function handleSaveField(field: EditableField, value: string) {
    if (value.trim() !== "") {
      updateField.mutate({ entryId: id, field, value: value.trim() });
    }
  }

  // Loading
  if (entry.isLoading) {
    return (
      <main className="flex flex-1 flex-col pb-16">
        <header className="flex items-center gap-3 px-5 pt-4 pb-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-button p-1 text-dim hover:text-ink cursor-pointer"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold text-ink">
            Loading&hellip;
          </h1>
        </header>
      </main>
    );
  }

  // Not found
  if (!entry.data) {
    return (
      <main className="flex flex-1 flex-col pb-16">
        <header className="flex items-center gap-3 px-5 pt-4 pb-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-button p-1 text-dim hover:text-ink cursor-pointer"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold text-ink">Not found</h1>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-dim">Entry not found</p>
        </div>
      </main>
    );
  }

  const e = entry.data;
  const tags: string[] = JSON.parse(e.tags || "[]");
  const source = e.capture.session?.source;

  const entryData = {
    definition: e.definition,
    translationArabic: e.translationArabic,
    nuance: e.nuance,
    examples: e.examples,
  };

  return (
    <main className="flex flex-1 flex-col pb-16">
      {/* Header with back button */}
      <header className="flex items-center gap-3 px-5 pt-4 pb-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-button p-1 text-dim hover:text-ink cursor-pointer"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="font-display text-xl font-bold text-ink">
          {e.capture.item}
        </h1>
      </header>

      {/* Locator */}
      {e.capture.locator && (
        <p className="mx-5 mb-1 text-xs text-dim">{e.capture.locator}</p>
      )}

      <div className="flex flex-col gap-4 px-5 py-3">
        {/* Source chip */}
        {source && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-dim">Source</span>
            <Link
              to={`/wordbank?q=${encodeURIComponent(source.name)}`}
              className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-xs font-medium text-chip-text hover:bg-accent-subtle transition-colors"
            >
              {source.name}
            </Link>
          </div>
        )}

        {/* Content fields — swappable by variant */}
        {variant === "A" && (
          <VariantA entry={entryData} onSaveField={handleSaveField} />
        )}
        {variant === "B" && (
          <VariantB entry={entryData} onSaveField={handleSaveField} />
        )}
        {variant === "C" && (
          <VariantC entry={entryData} onSaveField={handleSaveField} />
        )}

        {/* Tags: chips with remove, add */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-dim">Tags</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-xs font-medium text-chip-text"
              >
                <Link
                  to={`/wordbank?q=${encodeURIComponent(tag)}`}
                  className="hover:text-ink transition-colors"
                >
                  {tag}
                </Link>
                <button
                  type="button"
                  onClick={() => removeTag.mutate({ entryId: id, tag })}
                  className="text-dim hover:text-ink cursor-pointer"
                  aria-label={`Remove tag ${tag}`}
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
            {/* Add tag inline */}
            <span className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-divider px-2 py-1 text-xs text-dim">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTag.trim()) {
                    addTag.mutate({ entryId: id, tag: newTag.trim() });
                  }
                }}
                placeholder="Add tag"
                className="w-16 bg-transparent text-chip-text outline-none placeholder:text-dim"
              />
              <button
                type="button"
                onClick={() => {
                  if (newTag.trim()) {
                    addTag.mutate({ entryId: id, tag: newTag.trim() });
                  }
                }}
                className="text-dim hover:text-ink cursor-pointer"
                aria-label="Add tag"
              >
                <PlusIcon className="h-3 w-3" />
              </button>
            </span>
          </div>
        </div>
      </div>

      {/* Prototype switcher — hidden in production */}
      <PrototypeSwitcher variants={VARIANTS} />
    </main>
  );
}
