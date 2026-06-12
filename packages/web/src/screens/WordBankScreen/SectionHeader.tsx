export function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mb-2 flex items-center gap-3">
      <span className="h-px flex-1 bg-divider/30" />
      <h3 className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.15em] text-dim/35">
        {label}
      </h3>
      <span className="h-px flex-1 bg-divider/30" />
    </div>
  );
}
