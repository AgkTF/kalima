export interface SplitResult {
  item: string;
  afterSlash: string | null;
}

export interface RawSegments {
  item: string;
  hasSlash: boolean;
  afterSlash: string;
}

/**
 * Returns the raw (untrimmed) segments of the input split on the first slash.
 * Used for live visual overlays that must mirror the exact text the user typed.
 */
export function getRawSegments(text: string): RawSegments {
  const slashIndex = text.indexOf("/");

  if (slashIndex === -1) {
    return { item: text, hasSlash: false, afterSlash: "" };
  }

  return {
    item: text.slice(0, slashIndex),
    hasSlash: true,
    afterSlash: text.slice(slashIndex + 1),
  };
}

/**
 * Splits capture input on the first slash, trimming whitespace from both parts.
 * Returns `afterSlash: null` when there is no slash or nothing after it.
 */
export function splitCaptureInput(text: string): SplitResult {
  const { item, hasSlash, afterSlash } = getRawSegments(text);
  const trimmedItem = item.trim();
  const trimmedAfterSlash = afterSlash.trim();

  return {
    item: trimmedItem,
    afterSlash: hasSlash ? trimmedAfterSlash || null : null,
  };
}
