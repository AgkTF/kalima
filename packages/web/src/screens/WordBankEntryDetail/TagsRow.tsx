import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link } from "react-router-dom";

export function TagsRow({
  tags,
  onAdd,
  onRemove,
}: {
  tags: string[];
  onAdd: (t: string) => void;
  onRemove: (t: string) => void;
}) {
  const [newTag, setNewTag] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-chip px-2 py-0.5 text-[10px] font-medium text-chip-text"
        >
          <Link
            to={`/wordbank?q=${encodeURIComponent(tag)}`}
            className="hover:text-ink transition-colors"
          >
            {tag}
          </Link>
          <button
            type="button"
            onClick={() => onRemove(tag)}
            className="text-dim hover:text-ink cursor-pointer"
            aria-label={`Remove tag ${tag}`}
          >
            <XMarkIcon className="h-3 w-3" />
          </button>
        </span>
      ))}
      {/* Add tag inline */}
      <span className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-divider px-2 py-0.5 text-[10px] text-dim">
        <input
          type="text"
          value={newTag}
          onChange={(ev) => setNewTag(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter" && newTag.trim()) {
              onAdd(newTag.trim());
            }
          }}
          placeholder="Add"
          className="w-12 bg-transparent text-chip-text outline-none placeholder:text-dim"
        />
        <button
          type="button"
          onClick={() => {
            if (newTag.trim()) {
              onAdd(newTag.trim());
              setNewTag("");
            }
          }}
          className="flex items-center justify-center w-5 h-5 -mr-1 text-dim hover:text-ink active:scale-[0.96] transition-transform cursor-pointer"
        >
          <PlusIcon className="h-3 w-3" />
        </button>
      </span>
    </div>
  );
}
