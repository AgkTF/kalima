import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";

export function SystemPromptEditor({
  open,
  initialPrompt,
  isPending,
  onClose,
  onSave,
  onReset,
}: {
  open: boolean;
  initialPrompt: string;
  isPending: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
  onReset: () => void;
}) {
  const [value, setValue] = useState(initialPrompt);
  const isUnchanged = value === initialPrompt;

  // Sync local state when the prop changes (e.g. after reset refetches
  // the factory default from the server).
  useEffect(() => {
    setValue(initialPrompt);
  }, [initialPrompt]);

  function handleSave() {
    if (isUnchanged || isPending) return;
    onSave(value);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-button border border-divider bg-surface p-4 shadow-lg">
          <Dialog.Title className="font-display text-base font-bold text-ink">
            Base System Prompt
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-dim">
            Foundational instructions to the enrichment agent.
          </Dialog.Description>

          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isPending}
            className="mt-3 min-h-[200px] w-full resize-y rounded-button border border-divider bg-surface px-3 py-2 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            // biome-ignore lint/a11y/noAutofocus: editor is the primary action when open
            autoFocus
          />

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onReset}
              disabled={isPending}
              className="rounded-button border border-divider px-3 py-2 text-xs font-medium text-dim transition-colors hover:border-red-200 hover:text-red-600 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              Reset to Default
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-button border border-divider px-4 py-2 text-sm font-medium text-dim transition-colors hover:text-ink cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isUnchanged || isPending}
                className="rounded-button bg-accent px-4 py-2 text-sm font-medium text-page transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isPending ? "…" : "Save"}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
