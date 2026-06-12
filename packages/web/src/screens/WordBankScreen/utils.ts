export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function groupByDate<T extends { enrichedAt: string }>(
  entries: T[],
): Record<string, T[]> {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  ).toDateString();

  const groups: Record<string, T[]> = {};
  for (const e of entries) {
    const d = new Date(e.enrichedAt);
    const key =
      d.toDateString() === today
        ? "Today"
        : d.toDateString() === yesterday
          ? "Yesterday"
          : d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return groups;
}

export function parseTags(raw: string): string[] {
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function groupByLetter<T extends { capture: { item: string } }>(
  entries: T[],
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const e of entries) {
    const letter = e.capture.item.charAt(0).toUpperCase();
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(e);
  }
  return groups;
}
