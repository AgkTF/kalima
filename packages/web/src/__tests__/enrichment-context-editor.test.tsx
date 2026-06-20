import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EnrichmentContextEditor } from "../screens/CaptureScreen/EnrichmentContextEditor";

function renderEditor(
  props?: Partial<React.ComponentProps<typeof EnrichmentContextEditor>>,
) {
  const user = userEvent.setup();
  const onSave = vi.fn();
  render(
    <EnrichmentContextEditor
      initialContext="Focus on nautical terms."
      isPending={false}
      onSave={onSave}
      onCancel={vi.fn()}
      {...props}
    />,
  );
  return { user, onSave };
}

describe("EnrichmentContextEditor", () => {
  it("renders a textarea pre-filled with the current enrichment context", () => {
    renderEditor();
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Focus on nautical terms.");
  });

  it("calls onSave with the edited context when Save is clicked", async () => {
    const { user, onSave } = renderEditor();

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, "New guidance for enrichment.");

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith("New guidance for enrichment.");
  });

  it("calls onSave with null when the field is cleared and Save is clicked", async () => {
    const { user, onSave } = renderEditor();

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await user.clear(textarea);

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith(null);
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const onCancel = vi.fn();
    const { user } = renderEditor({ onCancel });

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalled();
  });

  it("disables Save when the context is unchanged", () => {
    renderEditor();
    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeDisabled();
  });
});
