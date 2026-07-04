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
