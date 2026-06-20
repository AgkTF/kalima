import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SessionForm } from "../screens/CaptureScreen/SessionForm";

const baseProps = {
  isPending: false,
  onCancel: vi.fn(),
};

function renderForm(
  sources: {
    id: number;
    name: string;
    type: string;
    enrichmentContext: string | null;
  }[] = [],
  onStart = vi.fn(),
) {
  const user = userEvent.setup();
  render(
    <SessionForm
      sources={sources}
      onStart={onStart}
      isPending={baseProps.isPending}
      onCancel={baseProps.onCancel}
    />,
  );
  return { user, onStart };
}

describe("SessionForm enrichmentContext", () => {
  it("renders a textarea for enrichment context", () => {
    renderForm();
    expect(
      screen.getByPlaceholderText(/enrichment context/i),
    ).toBeInTheDocument();
  });

  it("passes enrichmentContext to onStart when opening a session", async () => {
    const onStart = vi.fn();
    const { user } = renderForm([], onStart);

    await user.type(screen.getByPlaceholderText(/source title/i), "New Book");
    await user.type(
      screen.getByPlaceholderText(/enrichment context/i),
      "Focus on technical terms.",
    );
    await user.click(screen.getByRole("button", { name: /open session/i }));

    expect(onStart).toHaveBeenCalledWith(
      "New Book",
      "book",
      "Focus on technical terms.",
    );
  });

  it("pre-fills enrichmentContext when an existing source is selected", async () => {
    const onStart = vi.fn();
    const sources = [
      {
        id: 1,
        name: "Moby Dick",
        type: "book",
        enrichmentContext: "Focus on nautical terms. Formal register.",
      },
    ];
    const { user } = renderForm(sources, onStart);

    const input = screen.getByPlaceholderText(/source title/i);
    await user.type(input, "Moby");
    // Select the suggestion
    await user.click(screen.getByText("Moby Dick"));

    const textarea = screen.getByPlaceholderText(
      /enrichment context/i,
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe("Focus on nautical terms. Formal register.");

    // Type auto-locks to the source's type
    await user.click(screen.getByRole("button", { name: /open session/i }));

    expect(onStart).toHaveBeenCalledWith(
      "Moby Dick",
      "book",
      "Focus on nautical terms. Formal register.",
    );
  });

  it("passes null enrichmentContext when the field is left empty", async () => {
    const onStart = vi.fn();
    const { user } = renderForm([], onStart);

    await user.type(screen.getByPlaceholderText(/source title/i), "No Context");
    await user.click(screen.getByRole("button", { name: /open session/i }));

    expect(onStart).toHaveBeenCalledWith("No Context", "book", null);
  });
});
