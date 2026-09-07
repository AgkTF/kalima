import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CaptureList } from "./components/CaptureList";

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
  it("edits a Pending Capture's Item in place", async () => {
    const user = userEvent.setup();
    const onUpdateCapture = vi.fn();
    const captures: Capture[] = [
      {
        id: 1,
        item: "serendipty",
        locator: "p.45",
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

    await user.click(screen.getByText("serendipty"));
    const input = screen.getByRole("textbox", {
      name: "Item for serendipty",
    });
    await user.clear(input);
    await user.type(input, "serendipity{Enter}");

    expect(onUpdateCapture).toHaveBeenCalledWith(1, {
      item: "serendipity",
    });
  });

  it("edits an existing Locator in place", async () => {
    const user = userEvent.setup();
    const onUpdateCapture = vi.fn();
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
        onUpdateCapture={onUpdateCapture}
        updateError={null}
      />,
    );

    await user.click(screen.getByText("p.45"));
    const input = screen.getByRole("textbox", {
      name: "Locator for serendipity",
    });
    expect(input).toHaveValue("p.45");
    await user.clear(input);
    await user.type(input, "p.46{Enter}");

    expect(onUpdateCapture).toHaveBeenCalledWith(1, { locator: "p.46" });
  });

  it("edits and clears an existing Source Hint in place", async () => {
    const user = userEvent.setup();
    const onUpdateCapture = vi.fn();
    const captures: Capture[] = [
      {
        id: 1,
        item: "cardinal",
        locator: null,
        sourceHint: "in a conversation",
        entry: null,
      },
    ];
    render(
      <CaptureList
        captures={captures}
        hasSession={false}
        onUpdateCapture={onUpdateCapture}
        updateError={null}
      />,
    );

    await user.click(screen.getByText("in a conversation"));
    const input = screen.getByRole("textbox", {
      name: "Source Hint for cardinal",
    });
    expect(input).toHaveValue("in a conversation");
    await user.clear(input);
    await user.keyboard("{Enter}");

    expect(onUpdateCapture).toHaveBeenCalledWith(1, { sourceHint: null });
    expect(
      screen.queryByRole("button", { name: /Locator for cardinal/ }),
    ).not.toBeInTheDocument();
  });

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

  it("saves on blur after cancelling an earlier edit with Escape", async () => {
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
        <button type="button">outside</button>
      </div>,
    );

    await user.click(screen.getByText("+ add locator"));
    await user.type(screen.getByRole("textbox"), "cancelled{Escape}");
    await user.click(screen.getByText("+ add locator"));
    await user.type(screen.getByRole("textbox"), "p.45");
    await user.click(screen.getByRole("button", { name: "outside" }));

    expect(onUpdateCapture).toHaveBeenCalledWith(1, { locator: "p.45" });
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
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Failed to update locator",
    );
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

describe("CaptureList Pending Capture deletion", () => {
  const pendingCapture: Capture = {
    id: 1,
    item: "serendipity",
    locator: null,
    sourceHint: null,
    entry: null,
  };

  function renderDeletion({
    captures = [pendingCapture],
    onDeleteCapture = vi.fn().mockResolvedValue(undefined),
    onPendingDeletionChange,
    onEnrich,
    updateError = null,
  }: {
    captures?: Capture[];
    onDeleteCapture?: (captureId: number) => Promise<void>;
    onPendingDeletionChange?: (captureId: number | null) => void;
    onEnrich?: () => void;
    updateError?: string | null;
  } = {}) {
    return render(
      <CaptureList
        captures={captures}
        hasSession={false}
        onUpdateCapture={noUpdate}
        updateError={updateError}
        onDeleteCapture={onDeleteCapture}
        onPendingDeletionChange={onPendingDeletionChange}
        onEnrich={onEnrich}
      />,
    );
  }

  function confirmDelete(item = "serendipity") {
    fireEvent.click(screen.getByRole("button", { name: `Delete ${item}` }));
    fireEvent.click(
      screen.getByRole("button", { name: `Confirm delete ${item}` }),
    );
  }

  it("removes a confirmed deletion immediately and restores it on Undo", async () => {
    const user = userEvent.setup();
    const onDeleteCapture = vi.fn().mockResolvedValue(undefined);
    const onPendingDeletionChange = vi.fn();
    renderDeletion({ onDeleteCapture, onPendingDeletionChange });

    await user.click(
      screen.getByRole("button", { name: "Delete serendipity" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm delete serendipity" }),
    );

    expect(screen.queryByText("serendipity")).not.toBeInTheDocument();
    expect(onPendingDeletionChange).toHaveBeenLastCalledWith(1);
    await user.click(
      screen.getByRole("button", { name: "Undo delete serendipity" }),
    );

    expect(screen.getByText("serendipity")).toBeInTheDocument();
    expect(onDeleteCapture).not.toHaveBeenCalled();
    expect(onPendingDeletionChange).toHaveBeenLastCalledWith(null);
  });

  it("keeps focus and announces confirmation, deletion, and Undo", async () => {
    const user = userEvent.setup();
    renderDeletion();

    await user.click(
      screen.getByRole("button", { name: "Delete serendipity" }),
    );
    expect(
      screen.getByRole("button", { name: "Confirm delete serendipity" }),
    ).toHaveFocus();

    await user.click(
      screen.getByRole("button", { name: "Cancel delete serendipity" }),
    );
    expect(
      screen.getByRole("button", { name: "Delete serendipity" }),
    ).toHaveFocus();

    await user.click(
      screen.getByRole("button", { name: "Delete serendipity" }),
    );
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("button", { name: "Undo delete serendipity" }),
    ).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(
      "serendipity removed. Undo available for five seconds.",
    );

    await user.keyboard("{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent(
      "serendipity restored.",
    );
  });

  it("commits the deletion when the Undo window expires", async () => {
    vi.useFakeTimers();
    const onDeleteCapture = vi.fn().mockResolvedValue(undefined);

    try {
      renderDeletion({ onDeleteCapture });
      confirmDelete();
      expect(onDeleteCapture).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });

      expect(onDeleteCapture).toHaveBeenCalledWith(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("closes the Undo window while deletion is in flight", async () => {
    vi.useFakeTimers();
    let finishDelete: (() => void) | undefined;
    const onDeleteCapture = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishDelete = resolve;
        }),
    );

    try {
      renderDeletion({ onDeleteCapture });
      confirmDelete();

      act(() => vi.advanceTimersByTime(5_000));

      expect(onDeleteCapture).toHaveBeenCalledWith(1);
      expect(
        screen.queryByRole("button", { name: "Undo delete serendipity" }),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Deleting capture…")).toBeInTheDocument();

      await act(async () => finishDelete?.());
    } finally {
      vi.useRealTimers();
    }
  });

  it("restores the Capture when deletion fails", async () => {
    vi.useFakeTimers();

    try {
      renderDeletion({
        updateError: "Delete failed",
        onDeleteCapture: vi.fn().mockRejectedValue(new Error("failed")),
      });
      confirmDelete();

      await act(async () => vi.advanceTimersByTimeAsync(5_000));

      expect(screen.getByText("serendipity")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(
        "serendipity could not be deleted and was restored.",
      );
      expect(screen.getByRole("alert")).toHaveTextContent("Delete failed");
    } finally {
      vi.useRealTimers();
    }
  });

  it("blocks Enrichment while deletion is pending", () => {
    vi.useFakeTimers();
    const captures: Capture[] = [
      { id: 1, item: "first", locator: null, sourceHint: null, entry: null },
      { id: 2, item: "second", locator: null, sourceHint: null, entry: null },
    ];

    try {
      renderDeletion({ captures, onEnrich: vi.fn() });
      confirmDelete("first");

      expect(
        screen.getByRole("button", { name: "Enrich all (1)" }),
      ).toBeDisabled();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it("commits a confirmed deletion when the Capture list unmounts", () => {
    vi.useFakeTimers();
    const onDeleteCapture = vi.fn().mockResolvedValue(undefined);

    try {
      const { unmount } = renderDeletion({ onDeleteCapture });
      confirmDelete();

      unmount();

      expect(onDeleteCapture).toHaveBeenCalledWith(1);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it("does not offer edit or delete controls after Enrichment begins", () => {
    renderDeletion({
      captures: [{ ...pendingCapture, entry: { status: "pending_review" } }],
    });

    expect(
      screen.queryByRole("button", { name: /Edit|Delete/ }),
    ).not.toBeInTheDocument();
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
