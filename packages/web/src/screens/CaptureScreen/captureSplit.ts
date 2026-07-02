export interface SplitResult {
  item: string;
  afterSlash: string | null;
}

export function splitCaptureInput(text: string): SplitResult {
  const slashIndex = text.indexOf("/");

  if (slashIndex === -1) {
    return { item: text.trim(), afterSlash: null };
  }

  const item = text.slice(0, slashIndex).trim();
  const afterSlash = text.slice(slashIndex + 1).trim();

  return {
    item,
    afterSlash: afterSlash || null,
  };
}
