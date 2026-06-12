import { Fragment } from "react";

/** Converts *italic* and **bold** markdown spans into <em>/<strong> elements. */
export function renderEmphasis(text: string) {
  const parts = text.split(/(\*{1,2}[^*]+\*{1,2})/g);
  return parts.map((part) => {
    const bold = part.match(/^\*\*(.+)\*\*$/);
    if (bold) return <strong key={part}>{bold[1]}</strong>;

    const italic = part.match(/^\*(.+)\*$/);
    if (italic) return <em key={part}>{italic[1]}</em>;

    return <Fragment key={part}>{part}</Fragment>;
  });
}
