// ADR 0006: This file is a thin orchestrator.
// Sub-components → sibling files in this directory.
// Pure utilities → ../../components/

import { XMarkIcon } from "@heroicons/react/24/outline";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { trpc } from "../../trpc";
import { ContentField } from "./ContentField";
import type { EditableField } from "./constants";
import { InlineEdit } from "./InlineEdit";
import { TagsRow } from "./TagsRow";

export function WordBankEntryDetail() {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const id = Number(entryId);
  const utils = trpc.useUtils();
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedField, setSelectedField] = useState<EditableField | null>(
    null,
  );
  const [editing, setEditing] = useState<EditableField | null>(null);
  const [editText, setEditText] = useState("");

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
    },
  });

  const removeTag = trpc.wordBank.removeTag.useMutation({
    onSuccess: () => {
      utils.wordBank.getEntry.invalidate({ entryId: id });
    },
  });

  const removeSource = trpc.wordBank.removeSource.useMutation({
    onSuccess: () => {
      utils.wordBank.getEntry.invalidate({ entryId: id });
    },
  });

  // Click outside deselects
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setSelectedField(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleFieldClick(field: EditableField) {
    if (editing) return;
    setSelectedField(selectedField === field ? null : field);
  }

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

  // Error
  if (entry.isError) {
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
          <h1 className="font-display text-lg font-bold text-ink">Error</h1>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-dim">
            {entry.error?.message ?? "Something went wrong"}
          </p>
        </div>
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

  return (
    <main className="flex flex-1 flex-col pb-16">
      {/* Header with back button */}
      <header className="sticky top-0 z-10 bg-page/95 backdrop-blur-sm flex items-center gap-3 px-5 pt-4 pb-2">
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

      <div className="flex flex-col gap-3 px-5 py-3">
        {/* Bilingual hero */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="font-display text-2xl font-bold text-ink text-balance">
              {e.capture.item}
            </h1>
            <div className="shrink-0 text-end">
              <InlineEdit
                value={e.translationArabic}
                isArabic
                onSave={(v) =>
                  updateField.mutate({
                    entryId: id,
                    field: "translationArabic",
                    value: v.trim(),
                  })
                }
                placeholder="+ Arabic"
              />
            </div>
          </div>

          {/* Tags under hero */}
          <TagsRow
            tags={tags}
            onAdd={(tag: string) => addTag.mutate({ entryId: id, tag })}
            onRemove={(tag: string) => removeTag.mutate({ entryId: id, tag })}
          />

          {/* Source + locator */}
          {(source || e.capture.locator) && (
            <div className="flex items-center gap-1.5">
              {source && (
                <span className="inline-flex items-center gap-1 rounded-button border border-divider px-2 py-0.5 text-[10px] font-medium text-dim">
                  <Link
                    to={`/wordbank?q=${encodeURIComponent(source.name)}`}
                    className="hover:text-ink transition-colors"
                  >
                    {source.name}
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeSource.mutate({ entryId: id })}
                    className="text-dim/25 hover:text-dim active:scale-[0.96] transition-all cursor-pointer"
                    aria-label="Remove source"
                  >
                    <XMarkIcon className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              {e.capture.locator && (
                <span className="text-xs text-dim/70">{e.capture.locator}</span>
              )}
            </div>
          )}
        </div>

        {/* Separator between identity section and content */}
        <hr className="border-divider/20" />

        {/* Content fields — click to select, edit button in label row */}
        <div ref={containerRef} className="flex flex-col gap-4">
          {(["definition", "nuance", "examples"] as const).map((field) => (
            <ContentField
              key={field}
              field={field}
              value={e[field as keyof typeof e] as string}
              isEditing={editing === field}
              isSelected={selectedField === field}
              editText={editText}
              onEditStart={(f) => {
                const val = e[f as keyof typeof e] as string;
                setEditText(val);
                setEditing(f);
              }}
              onFieldClick={handleFieldClick}
              onSave={() => {
                handleSaveField(field, editText);
                setEditing(null);
                setSelectedField(null);
              }}
              onCancel={() => {
                setEditing(null);
                setSelectedField(null);
              }}
              onEditTextChange={setEditText}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
