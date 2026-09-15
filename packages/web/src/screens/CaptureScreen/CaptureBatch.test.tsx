import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Capture } from "./captureTypes";
import { CaptureList } from "./components/CaptureList";

const captures: Capture[] = [
  { id: 1, item: "first", locator: "p.1", sourceHint: "old hint", entry: null },
  { id: 2, item: "second", locator: null, sourceHint: null, entry: null },
  { id: 3, item: "third", locator: "p.3", sourceHint: "keep", entry: null },
  {
    id: 4,
    item: "processing",
    locator: null,
    sourceHint: null,
    entry: { status: "processing" },
  },
  {
    id: 5,
    item: "reviewable",
    locator: null,
    sourceHint: null,
    entry: { status: "pending_review" },
  },
];

function setup(hasSession = true) {
  const onBatchCapture = vi.fn().mockResolvedValue(undefined);
  const props = {
    captures,
    hasSession,
    onUpdateCapture: vi.fn(),
    updateError: null,
    onBatchCapture,
  };
  return {
    ...render(<CaptureList {...props} />),
    props,
    onBatchCapture,
    user: userEvent.setup(),
  };
}

describe("Capture-only Pending Capture selection", () => {
  it.each([
    {
      hasSession: true,
      field: "Locator",
      type: "setLocator",
      otherField: "Source Hint",
    },
    {
      hasSession: false,
      field: "Source Hint",
      type: "setSourceHint",
      otherField: "Locator",
    },
  ])("sets one shared $field on only the selected subset", async ({
    hasSession,
    field,
    type,
    otherField,
  }) => {
    const { user, onBatchCapture } = setup(hasSession);
    expect(
      screen.queryByRole("button", { name: `Set ${field}` }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Select first" }));
    await user.click(screen.getByRole("checkbox", { name: "Select third" }));
    expect(
      screen.queryByRole("textbox", { name: `Shared ${otherField}` }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Replaces every selected value/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Set ${field}` })).toBeDisabled();
    await user.type(
      screen.getByRole("textbox", { name: `Shared ${field}` }),
      "   ",
    );
    expect(screen.getByRole("button", { name: `Set ${field}` })).toBeDisabled();
    await user.type(
      screen.getByRole("textbox", { name: `Shared ${field}` }),
      "shared value  ",
    );
    await user.click(screen.getByRole("button", { name: `Set ${field}` }));
    expect(onBatchCapture).toHaveBeenCalledWith([1, 3], {
      type,
      value: "shared value",
    });
    expect(screen.queryByText(/\d selected/)).not.toBeInTheDocument();
  });

  it.each([
    { hasSession: true, field: "Locators", type: "clearLocator" },
    { hasSession: false, field: "Source Hints", type: "clearSourceHint" },
  ])("clears selected $field only on the explicit clear action", async ({
    hasSession,
    field,
    type,
  }) => {
    const { user, onBatchCapture } = setup(hasSession);
    await user.click(
      screen.getByRole("button", { name: "Select all pending" }),
    );
    expect(onBatchCapture).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: `Clear ${field}` }));
    expect(onBatchCapture).toHaveBeenCalledWith([1, 2, 3], { type });
  });

  it("confirms batch deletion and supports keyboard cancellation before deleting only the subset", async () => {
    const { user, onBatchCapture } = setup();
    await user.click(screen.getByRole("checkbox", { name: "Select first" }));
    await user.click(screen.getByRole("checkbox", { name: "Select second" }));
    await user.click(screen.getByRole("button", { name: "Delete selected" }));
    expect(
      screen.getByText("Delete 2 Pending Captures? This cannot be undone."),
    ).toBeInTheDocument();
    expect(onBatchCapture).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Confirm delete (2)" }),
    ).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("button", { name: "Delete selected" }),
    ).toHaveFocus();
    expect(onBatchCapture).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    await user.keyboard("{Enter}");
    expect(onBatchCapture).toHaveBeenCalledWith([1, 2], { type: "delete" });
  });

  it("removes stale selections after refresh without selecting newly arrived or restored Captures", async () => {
    const { user, rerender, props, onBatchCapture } = setup();
    await user.click(
      screen.getByRole("button", { name: "Select all pending" }),
    );
    rerender(
      <CaptureList
        {...props}
        captures={[
          { ...captures[0], entry: { status: "processing" } },
          captures[2],
          { ...captures[1], id: 6, item: "new" },
        ]}
      />,
    );
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Select new" }),
    ).not.toBeChecked();
    rerender(<CaptureList {...props} />);
    expect(
      screen.getByRole("checkbox", { name: "Select first" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Select second" }),
    ).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Clear Locators" }));
    expect(onBatchCapture).toHaveBeenCalledWith([3], { type: "clearLocator" });
  });

  it("locks conflicting controls in flight, then retains the selection and draft on failure for retry", async () => {
    const { user, onBatchCapture, rerender, props } = setup(false);
    let rejectBatch: (error: Error) => void = () => {};
    onBatchCapture.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectBatch = reject;
        }),
    );
    rerender(
      <CaptureList {...props} onEnrich={vi.fn()} onDeleteCapture={vi.fn()} />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Select first" }));
    await user.type(
      screen.getByRole("textbox", { name: "Shared Source Hint" }),
      "shared",
    );
    await user.click(screen.getByRole("button", { name: "Set Source Hint" }));
    expect(
      screen.getByRole("checkbox", { name: "Select second" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Set Source Hint" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Edit Item for first" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Enrich all (3)" }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Clear Source Hints" }),
    );
    expect(onBatchCapture).toHaveBeenCalledTimes(1);
    await act(async () =>
      rejectBatch(
        new Error(
          "Only Pending Captures can be batch-managed. Nothing was changed.",
        ),
      ),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Nothing was changed.");
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Shared Source Hint" }),
    ).toHaveValue("shared");
    expect(
      screen.getByRole("button", { name: "Set Source Hint" }),
    ).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Set Source Hint" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/\d selected/)).not.toBeInTheDocument();
  });

  it("keeps single-delete Undo and batch selection from overlapping", async () => {
    const { user, rerender, props } = setup();
    rerender(
      <CaptureList
        {...props}
        onDeleteCapture={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Select first" }));
    expect(
      screen.queryByRole("button", { name: "Delete first" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Deselect all" }));
    await user.click(screen.getByRole("button", { name: "Delete first" }));
    await user.click(
      screen.getByRole("button", { name: "Confirm delete first" }),
    );
    expect(
      screen.getByRole("checkbox", { name: "Select second" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Select all pending" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Undo delete first" }));
    expect(
      screen.getByRole("checkbox", { name: "Select first" }),
    ).toBeEnabled();
  });

  it("requires a fresh delete confirmation when the selected target set changes", async () => {
    const { user, onBatchCapture } = setup();
    await user.click(screen.getByRole("checkbox", { name: "Select first" }));
    await user.click(screen.getByRole("button", { name: "Delete selected" }));
    await user.click(screen.getByRole("checkbox", { name: "Select third" }));
    expect(
      screen.queryByRole("button", { name: /Confirm delete/ }),
    ).not.toBeInTheDocument();
    expect(onBatchCapture).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete selected" }));
    await user.click(
      screen.getByRole("button", { name: "Confirm delete (2)" }),
    );
    expect(onBatchCapture).toHaveBeenCalledWith([1, 3], { type: "delete" });
  });

  it("selects and deselects useful subsets, with select-all restricted to Pending Captures", async () => {
    const { user } = setup();

    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(
      screen.queryByRole("checkbox", { name: "Select processing" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: "Select reviewable" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Select first" }));
    await user.click(screen.getByRole("checkbox", { name: "Select third" }));
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Select first" }));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Select all pending" }),
    );
    expect(screen.getByText("3 selected")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Deselect all" }));
    for (const box of screen.getAllByRole("checkbox"))
      expect(box).not.toBeChecked();
    expect(screen.queryByText(/\d selected/)).not.toBeInTheDocument();
  });
});
