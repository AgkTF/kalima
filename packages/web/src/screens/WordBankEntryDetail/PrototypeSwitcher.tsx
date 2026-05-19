import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

interface PrototypeSwitcherProps {
  variants: Array<{ key: string; label: string }>;
}

export function PrototypeSwitcher({ variants }: PrototypeSwitcherProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const current = searchParams.get("variant") ?? variants[0].key;

  const currentIndex = variants.findIndex((v) => v.key === current);
  const currentVariant = variants[currentIndex] ?? variants[0];

  function go(delta: number) {
    const next = (currentIndex + delta + variants.length) % variants.length;
    const nextKey = variants[next].key;
    setSearchParams({ variant: nextKey }, { replace: true });
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  return (
    <div className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-full bg-ink px-4 py-2 text-xs font-medium text-white shadow-floating">
        <button
          type="button"
          onClick={() => go(-1)}
          className="text-white/60 hover:text-white cursor-pointer"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <span className="min-w-0 whitespace-nowrap">
          {currentVariant.key} — {currentVariant.label}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          className="text-white/60 hover:text-white cursor-pointer"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
