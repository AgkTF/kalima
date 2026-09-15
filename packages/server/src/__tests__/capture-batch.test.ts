import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "../generated/prisma/client.js";
import {
  CaptureService,
  type PendingCaptureBatchAction,
} from "../services/capture.js";

describe("CaptureService batch Pending Captures", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: "file:./prisma/test.db" }),
  });

  beforeEach(async () => {
    await prisma.entry.deleteMany();
    await prisma.capture.deleteMany();
    await prisma.session.deleteMany();
    await prisma.source.deleteMany();
  });

  afterAll(() => prisma.$disconnect());

  async function sessionCaptures() {
    const source = await prisma.source.create({
      data: { name: "Shared Locator", type: "book" },
    });
    const session = await prisma.session.create({
      data: { sourceId: source.id },
    });
    const captures = await Promise.all(
      ["p.1", null, "p.3"].map((locator, index) =>
        CaptureService.create(
          `word ${index}`,
          locator,
          null,
          prisma,
          session.id,
        ),
      ),
    );
    return { session, captures };
  }

  const actions: PendingCaptureBatchAction[] = [
    { type: "setLocator", value: "replacement" },
    { type: "clearLocator" },
    { type: "setSourceHint", value: "replacement" },
    { type: "clearSourceHint" },
    { type: "delete" },
  ];

  describe.each(actions)("$type eligibility", (action) => {
    it("rejects an empty target set", async () => {
      await expect(
        CaptureService.batchPending([], action, prisma),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it.each([
      "missing",
      "processing",
      "pending_review",
      "rejected",
      "approved",
    ])("rejects a %s sibling without modifying or deleting any target", async (status) => {
      const { session, captures } = await sessionCaptures();
      const oneOffs = await Promise.all(
        ["first", "second"].map((item) =>
          CaptureService.create(item, null, "original", prisma),
        ),
      );
      const targets = action.type.includes("SourceHint") ? oneOffs : captures;
      if (status !== "missing") {
        await prisma.entry.create({
          data: {
            captureId: targets[1].id,
            status,
            definition: "",
            translationArabic: "",
            nuance: "",
            examples: "[]",
            tags: "[]",
            relatedEntries: "[]",
          },
        });
      }
      const beforeSession = await CaptureService.listSession(
        session.id,
        prisma,
      );
      const beforeOneOffs = await CaptureService.list(prisma);

      await expect(
        CaptureService.batchPending(
          [targets[0].id, status === "missing" ? 2_147_483_647 : targets[1].id],
          action,
          prisma,
        ),
      ).rejects.toMatchObject({
        code: status === "missing" ? "NOT_FOUND" : "CONFLICT",
      });

      expect(await CaptureService.listSession(session.id, prisma)).toEqual(
        beforeSession,
      );
      expect(await CaptureService.list(prisma)).toEqual(beforeOneOffs);
    });
  });

  it.each(
    actions.filter((action) => action.type !== "delete"),
  )("rejects a mixed context set for $type without changing either sibling", async (action) => {
    const { session, captures } = await sessionCaptures();
    const oneOff = await CaptureService.create(
      "one-off",
      null,
      "original hint",
      prisma,
    );
    const beforeSession = await CaptureService.listSession(session.id, prisma);
    const beforeOneOffs = await CaptureService.list(prisma);

    await expect(
      CaptureService.batchPending([captures[0].id, oneOff.id], action, prisma),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(await CaptureService.listSession(session.id, prisma)).toEqual(
      beforeSession,
    );
    expect(await CaptureService.list(prisma)).toEqual(beforeOneOffs);
  });

  it("deletes only the requested Pending Captures together, even across contexts", async () => {
    const { session, captures } = await sessionCaptures();
    const oneOff = await CaptureService.create("one-off", null, "hint", prisma);

    await CaptureService.batchPending(
      [captures[0].id, oneOff.id],
      { type: "delete" },
      prisma,
    );

    expect(
      (await CaptureService.listSession(session.id, prisma))
        .map((c) => c.id)
        .sort(),
    ).toEqual([captures[1].id, captures[2].id].sort());
    expect(await CaptureService.list(prisma)).toEqual([]);
  });

  it.each([
    "setLocator",
    "setSourceHint",
  ] as const)("rejects a blank %s without erasing selected metadata", async (type) => {
    const { session, captures } = await sessionCaptures();
    const oneOff = await CaptureService.create(
      "one-off",
      null,
      "original",
      prisma,
    );
    const ids = type === "setLocator" ? captures.map((c) => c.id) : [oneOff.id];
    const before =
      type === "setLocator"
        ? await CaptureService.listSession(session.id, prisma)
        : await CaptureService.list(prisma);

    await expect(
      CaptureService.batchPending(ids, { type, value: "  " }, prisma),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(
      type === "setLocator"
        ? await CaptureService.listSession(session.id, prisma)
        : await CaptureService.list(prisma),
    ).toEqual(before);
  });

  it.each([
    "locator",
    "sourceHint",
  ] as const)("clears selected %s values only through an explicit clear action", async (field) => {
    const { session, captures } = await sessionCaptures();
    const oneOffs = await Promise.all(
      ["first", "second"].map((item) =>
        CaptureService.create(item, null, "keep until cleared", prisma),
      ),
    );
    const ids = (field === "locator" ? captures.slice(0, 2) : oneOffs).map(
      (c) => c.id,
    );

    await CaptureService.batchPending(
      ids,
      {
        type: field === "locator" ? "clearLocator" : "clearSourceHint",
      },
      prisma,
    );

    const listed =
      field === "locator"
        ? await CaptureService.listSession(session.id, prisma)
        : await CaptureService.list(prisma);
    expect(
      listed.filter((c) => ids.includes(c.id)).map((c) => c[field]),
    ).toEqual([null, null]);
    expect(
      (await CaptureService.listSession(session.id, prisma)).find(
        (c) => c.id === captures[2].id,
      )?.locator,
    ).toBe("p.3");
  });

  it("replaces every selected One-off Source Hint, including populated values", async () => {
    const first = await CaptureService.create(
      "first",
      null,
      "old hint",
      prisma,
    );
    const second = await CaptureService.create("second", null, null, prisma);
    const other = await CaptureService.create("other", null, "keep", prisma);

    await CaptureService.batchPending(
      [first.id, second.id],
      { type: "setSourceHint", value: "  conversation with a friend  " },
      prisma,
    );

    expect(await CaptureService.list(prisma)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: first.id,
          sourceHint: "conversation with a friend",
        }),
        expect.objectContaining({
          id: second.id,
          sourceHint: "conversation with a friend",
        }),
        expect.objectContaining({ id: other.id, sourceHint: "keep" }),
      ]),
    );
  });

  it("replaces every selected Session Locator, leaving unselected Captures alone", async () => {
    const { session, captures } = await sessionCaptures();

    await CaptureService.batchPending(
      [captures[0].id, captures[1].id],
      { type: "setLocator", value: "  ch.2 p.45  " },
      prisma,
    );

    const listed = await CaptureService.listSession(session.id, prisma);
    expect(listed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: captures[0].id, locator: "ch.2 p.45" }),
        expect.objectContaining({ id: captures[1].id, locator: "ch.2 p.45" }),
        expect.objectContaining({ id: captures[2].id, locator: "p.3" }),
      ]),
    );
  });
});
