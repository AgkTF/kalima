import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CaptureList } from "./CaptureList";

interface Capture {
  id: number;
  item: string;
  locator: string | null;
  sourceHint: string | null;
  entry: { status: string } | null;
}

const noUpdate = vi.fn();

describe("CaptureList empty-state tap target", () => {
  it("shows '+ add locator' when session is active and locator is empty", () => {
    const captures: Capture[] = [
      {
        id: 1,
        item: "serendipity",
        locator: null,
        sourceHint: null,
        entry: null,
      },
    ];
    render(
      <CaptureList
        captures={captures}
        hasSession={true}
        onUpdateCapture={noUpdate}
        updateError={null}
      />,
    );
    expect(screen.getByText("+ add locator")).toBeInTheDocument();
  });

  it("shows '+ add source' when no session and sourceHint is empty", () => {
    const captures: Capture[] = [
      { id: 1, item: "cardinal", locator: null, sourceHint: null, entry: null },
    ];
    render(
      <CaptureList
        captures={captures}
        hasSession={false}
        onUpdateCapture={noUpdate}
        updateError={null}
      />,
    );
    expect(screen.getByText("+ add source")).toBeInTheDocument();
  });

  it("does not show tap target when capture already has a locator (session active)", () => {
    const captures: Capture[] = [
      {
        id: 1,
        item: "serendipity",
        locator: "p.45",
        sourceHint: null,
        entry: null,
      },
    ];
    render(
      <CaptureList
        captures={captures}
        hasSession={true}
        onUpdateCapture={noUpdate}
        updateError={null}
      />,
    );
    expect(screen.queryByText("+ add locator")).not.toBeInTheDocument();
    expect(screen.getByText("p.45")).toBeInTheDocument();
  });

  it("does not show tap target when capture already has a sourceHint (no session)", () => {
    const captures: Capture[] = [
      {
        id: 1,
        item: "cardinal",
        locator: null,
        sourceHint: "conversation with a friend",
        entry: null,
      },
    ];
    render(
      <CaptureList
        captures={captures}
        hasSession={false}
        onUpdateCapture={noUpdate}
        updateError={null}
      />,
    );
    expect(screen.queryByText("+ add source")).not.toBeInTheDocument();
    expect(screen.getByText("conversation with a friend")).toBeInTheDocument();
  });
});

describe("CaptureList inline edit", () => {
  it("morphs tap target into inline text input when tapped", async () => {
    const user = userEvent.setup();
    const captures: Capture[] = [
      {
        id: 1,
        item: "serendipity",
        locator: null,
        sourceHint: null,
        entry: null,
      },
    ];
    render(
      <CaptureList
        captures={captures}
        hasSession={true}
        onUpdateCapture={noUpdate}
        updateError={null}
      />,
    );

    await user.click(screen.getByText("+ add locator"));

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("calls onUpdateCapture with locator on Enter (session active)", async () => {
    const user = userEvent.setup();
    const onUpdateCapture = vi.fn();
    const captures: Capture[] = [
      {
        id: 1,
        item: "serendipity",
        locator: null,
        sourceHint: null,
        entry: null,
      },
    ];
    render(
      <CaptureList
        captures={captures}
        hasSession={true}
        onUpdateCapture={onUpdateCapture}
        updateError={null}
      />,
    );

    await user.click(screen.getByText("+ add locator"));
    await user.type(screen.getByRole("textbox"), "p.45");
    await user.keyboard("{Enter}");

    expect(onUpdateCapture).toHaveBeenCalledWith(1, { locator: "p.45" });
  });

  it("calls onUpdateCapture with sourceHint on Enter (no session)", async () => {
    const user = userEvent.setup();
    const onUpdateCapture = vi.fn();
    const captures: Capture[] = [
      { id: 1, item: "cardinal", locator: null, sourceHint: null, entry: null },
    ];
    render(
      <CaptureList
        captures={captures}
        hasSession={false}
        onUpdateCapture={onUpdateCapture}
        updateError={null}
      />,
    );

    await user.click(screen.getByText("+ add source"));
    await user.type(screen.getByRole("textbox"), "in an ad");
    await user.keyboard("{Enter}");

    expect(onUpdateCapture).toHaveBeenCalledWith(1, { sourceHint: "in an ad" });
  });

  it("reverts to tap target on Escape without calling onUpdateCapture", async () => {
    const user = userEvent.setup();
    const onUpdateCapture = vi.fn();
    const captures: Capture[] = [
      {
        id: 1,
        item: "serendipity",
        locator: null,
        sourceHint: null,
        entry: null,
      },
    ];
    render(
      <CaptureList
        captures={captures}
        hasSession={true}
        onUpdateCapture={onUpdateCapture}
        updateError={null}
      />,
    );

    await user.click(screen.getByText("+ add locator"));
    await user.type(screen.getByRole("textbox"), "p.45");
    await user.keyboard("{Escape}");

    expect(onUpdateCapture).not.toHaveBeenCalled();
    expect(screen.getByText("+ add locator")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("saves on blur (tap away) when value is non-empty", async () => {
    const user = userEvent.setup();
    const onUpdateCapture = vi.fn();
    const captures: Capture[] = [
      {
        id: 1,
        item: "serendipity",
        locator: null,
        sourceHint: null,
        entry: null,
      },
    ];
    render(
      <div>
        <CaptureList
          captures={captures}
          hasSession={true}
          onUpdateCapture={onUpdateCapture}
          updateError={null}
        />
        <button type="button" data-testid="outside">
          outside
        </button>
      </div>,
    );

    await user.click(screen.getByText("+ add locator"));
    await user.type(screen.getByRole("textbox"), "p.45");
    await user.click(screen.getByTestId("outside"));

    expect(onUpdateCapture).toHaveBeenCalledWith(1, { locator: "p.45" });
  });
});

describe("CaptureList update error", () => {
  it("shows an error message when updateError is provided", () => {
    const captures: Capture[] = [
      {
        id: 1,
        item: "serendipity",
        locator: null,
        sourceHint: null,
        entry: null,
      },
    ];
    render(
      <CaptureList
        captures={captures}
        hasSession={true}
        onUpdateCapture={noUpdate}
        updateError="Failed to update locator"
      />,
    );
    expect(screen.getByText("Failed to update locator")).toBeInTheDocument();
  });

  it("does not show an error when updateError is null", () => {
    const captures: Capture[] = [
      {
        id: 1,
        item: "serendipity",
        locator: null,
        sourceHint: null,
        entry: null,
      },
    ];
    render(
      <CaptureList
        captures={captures}
        hasSession={true}
        onUpdateCapture={noUpdate}
        updateError={null}
      />,
    );
    expect(screen.queryByText(/failed to update/i)).not.toBeInTheDocument();
  });
});

describe("CaptureList processing entry separator", () => {
  it("does not show middot separator when locator is empty but sourceHint exists", () => {
    const captures: Capture[] = [
      {
        id: 1,
        item: "cardinal",
        locator: null,
        sourceHint: "conversation with a friend",
        entry: { status: "processing" },
      },
    ];
    const { container } = render(
      <CaptureList
        captures={captures}
        hasSession={false}
        onUpdateCapture={noUpdate}
        updateError={null}
      />,
    );
    // sourceHint should be visible
    expect(screen.getByText("conversation with a friend")).toBeInTheDocument();
    // but no middot separator (the · character)
    expect(container.textContent).not.toContain("·");
  });
});

describe("CaptureList Enrich all button", () => {
  const noUpdate = vi.fn();
  const noEnrich = vi.fn();

  it("renders 'Enrich all (N)' when no session and there are pending one-off captures", () => {
    const captures: Capture[] = [
      { id: 1, item: "word1", locator: null, sourceHint: null, entry: null },
      {
        id: 2,
        item: "word2",
        locator: null,
        sourceHint: "in a chat",
        entry: null,
      },
    ];
    render(
      <CaptureList
        captures={captures}
        hasSession={false}
        onUpdateCapture={noUpdate}
        updateError={null}
        onEnrich={noEnrich}
        enrichPending={false}
      />,
    );
    expect(screen.getByText("Enrich all (2)")).toBeInTheDocument();
  });

  it("is hidden when a session is active", () => {
    const captures: Capture[] = [
      { id: 1, item: "word1", locator: null, sourceHint: null, entry: null },
    ];
    render(
      <CaptureList
        captures={captures}
        hasSession={true}
        onUpdateCapture={noUpdate}
        updateError={null}
        onEnrich={noEnrich}
        enrichPending={false}
      />,
    );
    expect(screen.queryByText(/Enrich all/)).not.toBeInTheDocument();
  });

  it("is hidden when there are no pending (entry: null) captures", () => {
    const captures: Capture[] = [
      {
        id: 1,
        item: "word1",
        locator: null,
        sourceHint: null,
        entry: { status: "processing" },
      },
    ];
    render(
      <CaptureList
        captures={captures}
        hasSession={false}
        onUpdateCapture={noUpdate}
        updateError={null}
        onEnrich={noEnrich}
        enrichPending={false}
      />,
    );
    expect(screen.queryByText(/Enrich all/)).not.toBeInTheDocument();
  });

  it("calls onEnrich when clicked", async () => {
    const user = userEvent.setup();
    const onEnrich = vi.fn();
    const captures: Capture[] = [
      { id: 1, item: "word1", locator: null, sourceHint: null, entry: null },
    ];
    render(
      <CaptureList
        captures={captures}
        hasSession={false}
        onUpdateCapture={noUpdate}
        updateError={null}
        onEnrich={onEnrich}
        enrichPending={false}
      />,
    );

    await user.click(screen.getByText("Enrich all (1)"));

    expect(onEnrich).toHaveBeenCalledTimes(1);
  });

  it("is disabled and shows '…' while enrichPending is true", () => {
    const captures: Capture[] = [
      { id: 1, item: "word1", locator: null, sourceHint: null, entry: null },
    ];
    render(
      <CaptureList
        captures={captures}
        hasSession={false}
        onUpdateCapture={noUpdate}
        updateError={null}
        onEnrich={noEnrich}
        enrichPending={true}
      />,
    );
    const button = screen.getByRole("button", { name: /Enrich all|…/ });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("…");
  });
});
