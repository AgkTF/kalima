import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SessionForm } from "../SessionForm";

describe("SessionForm", () => {
  it("pre-fills the enrichment prompt template from the global default", () => {
    render(
      <SessionForm
        sources={[]}
        defaultTemplate="Default template for {{item}}"
        isPending={false}
        onStart={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/enrichment prompt template/i)).toHaveValue(
      "Default template for {{item}}",
    );
  });

  it("passes the edited template when starting a session", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();

    render(
      <SessionForm
        sources={[]}
        defaultTemplate="Default template"
        isPending={false}
        onStart={onStart}
        onCancel={vi.fn()}
      />,
    );

    const sourceInput = screen.getByPlaceholderText(/source title/i);
    const templateInput = screen.getByLabelText(/enrichment prompt template/i);

    await user.type(sourceInput, "Moby Dick");
    await user.clear(templateInput);
    await user.type(templateInput, "Custom session template");
    await user.click(screen.getByRole("button", { name: /open session/i }));

    expect(onStart).toHaveBeenCalledWith(
      "Moby Dick",
      "book",
      "Custom session template",
    );
  });
});
