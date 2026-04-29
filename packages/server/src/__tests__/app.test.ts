import { describe, it, expect } from "vitest";
import { appRouter } from "../router.js";

describe("app.status query", () => {
  it("returns the app name and status", async () => {
    const caller = appRouter.createCaller({});
    const result = await caller.app.status();

    expect(result).toEqual({ name: "Kalima", status: "ok" });
  });
});