import { useEffect } from "react";

interface Props {
  variants: string[];
  current: string;
  onSwitch: (variant: string) => void;
}

export function PrototypeSwitcher({ variants, current, onSwitch }: Props) {
  const idx = variants.indexOf(current);

  const go = (dir: 1 | -1) => {
    const next = (idx + dir + variants.length) % variants.length;
    onSwitch(variants[next]);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  if (import.meta.env.PROD) return null;

  const label =
    {
      a: "Deferred enrichment",
      b: "Immediate enrichment",
    }[current.toLowerCase()] ?? current;

  return (
    <div className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-full bg-gray-900 px-4 py-1.5 text-white shadow-lg">
      <button
        type="button"
        onClick={() => go(-1)}
        className="text-lg leading-none cursor-pointer opacity-70 hover:opacity-100"
      >
        ←
      </button>
      <span className="text-xs font-semibold whitespace-nowrap">
        {current.toUpperCase()} — {label}
      </span>
      <button
        type="button"
        onClick={() => go(1)}
        className="text-lg leading-none cursor-pointer opacity-70 hover:opacity-100"
      >
        →
      </button>
    </div>
  );
}
