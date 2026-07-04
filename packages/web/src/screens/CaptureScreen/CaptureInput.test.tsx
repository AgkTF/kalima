import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CaptureInput } from "./CaptureInput";

function renderInput(
  overrides: { hasSession?: boolean; onSubmit?: typeof vi.fn } = {},
) {
  const onSubmit = overrides.onSubmit ?? vi.fn();
  const hasSession = overrides.hasSession ?? false;
  render(
    <CaptureInput hasSession={hasSession} error={null} onSubmit={onSubmit} />,
  );
  return { onSubmit };
}

describe("CaptureInput", () => {
  describe("placeholder text", () => {
    it("shows session placeholder when session is active", () => {
      renderInput({ hasSession: true });
      expect(
        screen.getByPlaceholderText(/page or chapter/i),
      ).toBeInTheDocument();
    });

    it("shows one-off placeholder when no session", () => {
      renderInput({ hasSession: false });
      expect(
        screen.getByPlaceholderText(/where you heard it/i),
      ).toBeInTheDocument();
    });
  });

  describe("submit behavior", () => {
    it("submits item with null locator and sourceHint when no slash is typed (no session)", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderInput({ hasSession: false });

      await user.type(screen.getByRole("textbox"), "serendipity");
      await user.click(screen.getByRole("button", { name: /capture/i }));

      expect(onSubmit).toHaveBeenCalledWith("serendipity", null, null);
    });

    it("submits item with locator when slash is typed and session is active", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderInput({ hasSession: true });

      await user.type(screen.getByRole("textbox"), "serendipity / p.45");
      await user.click(screen.getByRole("button", { name: /capture/i }));

      expect(onSubmit).toHaveBeenCalledWith("serendipity", "p.45", null);
    });

    it("submits item with sourceHint when slash is typed and no session", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderInput({ hasSession: false });

      await user.type(
        screen.getByRole("textbox"),
        "cardinal / conversation with a friend",
      );
      await user.click(screen.getByRole("button", { name: /capture/i }));

      expect(onSubmit).toHaveBeenCalledWith(
        "cardinal",
        null,
        "conversation with a friend",
      );
    });

    it("submits on Enter key press", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderInput({ hasSession: true });

      await user.type(screen.getByRole("textbox"), "epiphany / p.7");
      await user.keyboard("{Enter}");

      expect(onSubmit).toHaveBeenCalledWith("epiphany", "p.7", null);
    });

    it("clears the input after submit", async () => {
      const user = userEvent.setup();
      renderInput({ hasSession: false });

      await user.type(screen.getByRole("textbox"), "serendipity");
      await user.click(screen.getByRole("button", { name: /capture/i }));

      expect(screen.getByRole("textbox")).toHaveValue("");
    });
  });

  describe("button", () => {
    it("always shows 'Capture' text, never a loading indicator", () => {
      renderInput({ hasSession: false });
      const button = screen.getByRole("button", { name: /capture/i });
      expect(button).toHaveTextContent("Capture");
      expect(button).not.toHaveTextContent("…");
    });

    it("is disabled when input is empty", () => {
      renderInput({ hasSession: false });
      const button = screen.getByRole("button", { name: /capture/i });
      expect(button).toBeDisabled();
    });

    it("is enabled when input has text", async () => {
      const user = userEvent.setup();
      renderInput({ hasSession: false });

      await user.type(screen.getByRole("textbox"), "word");
      const button = screen.getByRole("button", { name: /capture/i });
      expect(button).toBeEnabled();
    });

    it("is disabled when input is only a slash with no item", async () => {
      const user = userEvent.setup();
      renderInput({ hasSession: false });

      await user.type(screen.getByRole("textbox"), "/ p.45");
      const button = screen.getByRole("button", { name: /capture/i });
      expect(button).toBeDisabled();
    });
  });

  describe("confirmation banner", () => {
    it("does not render a 'Captured:' confirmation banner", () => {
      renderInput({ hasSession: false });
      expect(screen.queryByText(/captured:/i)).not.toBeInTheDocument();
    });
  });

  describe("live visual split", () => {
    it("renders an overlay showing item, dimmed slash, and accent after-slash", async () => {
      const user = userEvent.setup();
      renderInput({ hasSession: true });

      await user.type(screen.getByRole("textbox"), "serendipity / p.45");

      // The overlay should contain the item, a dimmed slash, and the locator
      const overlay = screen.getByTestId("split-overlay");
      expect(overlay).toHaveTextContent("serendipity");
      expect(overlay).toHaveTextContent("p.45");
    });

    it("does not show overlay segments when there is no slash", async () => {
      const user = userEvent.setup();
      renderInput({ hasSession: true });

      await user.type(screen.getByRole("textbox"), "serendipity");

      const overlay = screen.getByTestId("split-overlay");
      // Just the item, no slash/accent segments
      expect(overlay).toHaveTextContent("serendipity");
      expect(overlay.querySelector("[data-slash]")).toBeNull();
    });
  });
});
