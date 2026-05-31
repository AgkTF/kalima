import { Link } from "react-router-dom";
import { parseTags } from "./utils";

export function EntryGroup({
  entries,
}: {
  entries: Array<{
    id: number;
    capture: { item: string };
    translationArabic: string;
    tags: string;
  }>;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {entries.map((entry) => {
        const tags = parseTags(entry.tags);

        return (
          <Link
            key={entry.id}
            to={`/wordbank/${entry.id}`}
            className="group block rounded-card px-3 py-2.5 -mx-3 transition-colors hover:bg-surface/80"
          >
            {/* Word + Arabic — bilingual typographic pair */}
            <h2 className="flex items-baseline justify-between gap-3">
              <span className="font-display text-[17px] font-semibold text-ink leading-snug group-hover:text-accent transition-colors">
                {entry.capture.item}
              </span>
              {entry.translationArabic && (
                <span className="shrink-0 max-w-[45%] truncate font-arabic text-[15px] text-dim/75 text-end leading-snug">
                  {entry.translationArabic}
                </span>
              )}
            </h2>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mt-1 flex items-center gap-2 text-[11px] text-dim/50 flex-wrap">
                {tags.slice(0, 3).join(", ")}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
