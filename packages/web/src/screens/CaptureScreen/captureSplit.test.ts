import { describe, expect, it } from "vitest";
import { splitCaptureInput } from "./captureSplit";

describe("splitCaptureInput", () => {
  it("returns item with no after-slash when there is no slash", () => {
    expect(splitCaptureInput("serendipity")).toEqual({
      item: "serendipity",
      afterSlash: null,
    });
  });

  it("splits on the first slash into item and after-slash", () => {
    expect(splitCaptureInput("serendipity / p.45")).toEqual({
      item: "serendipity",
      afterSlash: "p.45",
    });
  });

  it("splits multi-word items correctly", () => {
    expect(splitCaptureInput("call me Ishmael / ch.1 p.1")).toEqual({
      item: "call me Ishmael",
      afterSlash: "ch.1 p.1",
    });
  });

  it("only splits on the first slash, keeping subsequent slashes in after-slash", () => {
    expect(splitCaptureInput("path / a/b/c")).toEqual({
      item: "path",
      afterSlash: "a/b/c",
    });
  });

  it("trims whitespace around item and after-slash", () => {
    expect(splitCaptureInput("  serendipity  /  p.45  ")).toEqual({
      item: "serendipity",
      afterSlash: "p.45",
    });
  });

  it("returns null after-slash when slash is at the end with nothing after", () => {
    expect(splitCaptureInput("serendipity /")).toEqual({
      item: "serendipity",
      afterSlash: null,
    });
  });

  it("returns empty item with after-slash when slash is at the start", () => {
    expect(splitCaptureInput("/ p.45")).toEqual({
      item: "",
      afterSlash: "p.45",
    });
  });

  it("returns empty item and null after-slash for empty input", () => {
    expect(splitCaptureInput("")).toEqual({
      item: "",
      afterSlash: null,
    });
  });

  it("returns empty item and null after-slash for whitespace-only input", () => {
    expect(splitCaptureInput("   ")).toEqual({
      item: "",
      afterSlash: null,
    });
  });
});
