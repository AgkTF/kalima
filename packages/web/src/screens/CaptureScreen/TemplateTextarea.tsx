import { useId } from "react";

interface TemplateTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function TemplateTextarea({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: TemplateTextareaProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-dim">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        rows={6}
        className="w-full resize-y rounded-button border border-divider bg-surface px-3 py-2 font-mono text-xs text-ink placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
      />
    </div>
  );
}
