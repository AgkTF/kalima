export type EditableField =
  | "definition"
  | "translationArabic"
  | "nuance"
  | "examples";

export const FIELD_LABELS: Record<EditableField, string> = {
  definition: "Definition",
  translationArabic: "Translation",
  nuance: "Nuance",
  examples: "Examples",
};
