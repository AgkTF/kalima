import { parseJsonField } from "./utils";

interface EnrichmentFieldsProps {
  definition: string;
  translationArabic: string;
  nuance: string;
  examples: string;
  tags: string;
  relatedEntries: string;
  expanded: boolean;
  flaggedFields?: Set<string>;
}

export function EnrichmentFields({
  definition,
  translationArabic,
  nuance,
  examples,
  tags,
  relatedEntries,
  expanded,
  flaggedFields,
}: EnrichmentFieldsProps) {
  const fieldClass = (key: string) =>
    flaggedFields?.has(key)
      ? "border-red-300 bg-red-50 rounded px-1 -mx-1"
      : "";

  return (
    <>
      <p
        className={`text-xs text-ink leading-relaxed mb-1 ${fieldClass("definition")}`}
      >
        {definition}
      </p>
      <p
        className={`text-xs text-dim font-arabic text-end ${fieldClass("translationArabic")}`}
      >
        {translationArabic}
      </p>

      <div className="mt-2 flex flex-wrap gap-1">
        {parseJsonField(tags).map((tag: string) => (
          <span
            key={tag}
            className={`rounded-full px-1.5 py-0.5 text-[10px] ${
              flaggedFields?.has("tags")
                ? "text-red-700 bg-red-50 border border-red-300"
                : "bg-accent-subtle text-dim"
            }`}
          >
            {tag}
          </span>
        ))}
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-divider space-y-1.5">
          {nuance && (
            <div>
              <span className="text-[10px] font-semibold text-dim">
                Nuance
              </span>
              <p
                className={`text-xs text-ink leading-relaxed ${fieldClass("nuance")}`}
              >
                {nuance}
              </p>
            </div>
          )}
          <div>
            <span className="text-[10px] font-semibold text-dim">
              Examples
            </span>
            <ul
              className={`list-disc list-inside text-xs text-ink ${fieldClass("examples")}`}
            >
              {parseJsonField(examples).map((ex: string) => (
                <li key={ex} className="leading-relaxed">
                  {ex}
                </li>
              ))}
            </ul>
          </div>
          {parseJsonField(relatedEntries).length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-dim">
                Related entries
              </span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {parseJsonField(relatedEntries).map((r: string) => (
                  <span
                    key={r}
                    className={`rounded-full border px-1.5 py-0.5 text-[10px] ${
                      flaggedFields?.has("relatedEntries")
                        ? "border-red-300 bg-red-50 text-red-700"
                        : "border-accent/30 bg-accent/5 text-accent"
                    }`}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
