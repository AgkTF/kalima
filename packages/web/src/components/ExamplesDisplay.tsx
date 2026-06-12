import { parseJsonField } from "../screens/ReviewScreen/utils";
import { renderEmphasis } from "./renderEmphasis";

export function ExamplesDisplay({ value }: { value: string }) {
  const parsed = parseJsonField(value);

  if (parsed.length === 0) {
    return (
      <div className="px-2 py-1.5">
        <span className="italic text-dim text-sm">Empty</span>
      </div>
    );
  }

  return (
    <ul className="list-disc list-inside px-2 py-1.5 text-sm text-ink leading-relaxed select-text text-left">
      {parsed.map((ex: string) => (
        <li key={ex}>{renderEmphasis(ex)}</li>
      ))}
    </ul>
  );
}
