import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SystemPromptEditor } from "../screens/CaptureScreen/SystemPromptEditor";

function renderEditor(
  props?: Partial<React.ComponentProps<typeof SystemPromptEditor>>,
) {
  const user = userEvent.setup();
  const onClose = vi.fn();
  const onSave = vi.fn();
  const onReset = vi.fn();

  render(
    <SystemPromptEditor
      open={true}
      initialPrompt="You are a word bank enrichment agent."
      isPending={false}
      onClose={onClose}
      onSave={onSave}
      onReset={onReset}
      {...props}
    />,
  );

  return { user, onClose, onSave, onReset };
}

describe("SystemPromptEditor", () => {
  it("renders a textarea pre-filled with the current system prompt", () => {
    renderEditor();
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("You are a word bank enrichment agent.");
  });

  it("calls onSave with the edited prompt when Save is clicked", async () => {
    const { user, onSave } = renderEditor();

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, "Custom prompt text");

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith("Custom prompt text");
  });

  it("calls onReset when Reset to Default is clicked", async () => {
    const { user, onReset } = renderEditor();

    await user.click(screen.getByRole("button", { name: /reset/i }));

    expect(onReset).toHaveBeenCalled();
  });

  it("disables Save button when prompt is unchanged", async () => {
    renderEditor({ initialPrompt: "Original prompt" });

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const { user, onClose } = renderEditor();

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
