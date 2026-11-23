import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import {
  FIRST_CUT_LIST,
  closeListProblem,
  closedListEntry,
  currentListOf,
  cutListFilter,
  cutListHint,
  cutListOf,
  newerCut,
} from "@/constants/cutLists";
import { isPathAllowedForRole } from "@/constants/roles";
import { cutListCloseSchema, lotUpdateSchema } from "@/lib/validation";
import { buildLot, requireFreeLotCutNumber } from "@/lib/lots";
import { buildCut, requireFreeCutNumber } from "@/lib/khata";
import { closeCutList, cutListState, currentCutList } from "@/lib/cutLists";

// ---- a tiny in-memory stand-in for the few Mongo calls the cut-list helpers make ------------------------------------
const valueMatches = (value, cond) => {
  if (cond && typeof cond === "object" && !(cond instanceof ObjectId) && !(cond instanceof Date)) {
    if ("$in" in cond) return cond.$in.some((c) => (c === null ? value === null || value === undefined : value === c));
    if ("$nin" in cond)
      return !cond.$nin.some((c) => (c === null ? value === null || value === undefined : value === c));
    if ("$ne" in cond) return String(value) !== String(cond.$ne);
  }
  if (cond === null) return value === null || value === undefined;
  return typeof value === "string" && typeof cond === "string"
    ? value.toLowerCase() === cond.toLowerCase() // the helpers ask with a case-insensitive collation
    : String(value) === String(cond);
};
const matches = (doc, filter) => Object.entries(filter).every(([key, cond]) => valueMatches(doc[key], cond));

function fakeDb(data = {}) {
  const store = { settings: [], lots: [], stitch_cuts: [], ...data };
  const queries = [];
  const collection = (name) => {
    store[name] ??= [];
    const rows = () => store[name];
    return {
      findOne: async (filter) => {
        queries.push({ name, filter });
        return rows().find((doc) => matches(doc, filter)) ?? null;
      },
      countDocuments: async (filter) => rows().filter((doc) => matches(doc, filter)).length,
      find: (filter) => {
        let list = rows().filter((doc) => matches(doc, filter));
        const cursor = {
          sort: (by) => {
            const [[key, dir]] = Object.entries(by);
            list = [...list].sort((a, b) => (a[key] > b[key] ? dir : a[key] < b[key] ? -dir : 0));
            return cursor;
          },
          limit: (n) => {
            list = list.slice(0, n);
            return cursor;
          },
          toArray: async () => list,
        };
        return cursor;
      },
      updateOne: async (filter, update, { upsert = false } = {}) => {
        let doc = rows().find((row) => matches(row, filter));
        if (!doc && !upsert) return { matchedCount: 0 };
        if (!doc) {
          doc = { _id: filter._id };
          rows().push(doc);
        }
        Object.assign(doc, update.$set ?? {});
        for (const [key, value] of Object.entries(update.$push ?? {})) doc[key] = [...(doc[key] ?? []), value];
        return { matchedCount: 1 };
      },
    };
  };
  return { collection, store, queries };
}

const at = (day) => new Date(`2026-11-${String(day).padStart(2, "0")}T10:00:00Z`);
const admin = { id: "a1", name: "Boss" };

describe("cut list rules", () => {
  it("reads a document's list, old documents without one being list 1", () => {
    expect(cutListOf({ cutList: 3 })).toBe(3);
    expect(cutListOf({})).toBe(FIRST_CUT_LIST);
    expect(cutListOf(null)).toBe(1);
    expect(cutListOf({ cutList: "x" })).toBe(1);
    expect(currentListOf(null)).toBe(1);
    expect(currentListOf({ current: 4 })).toBe(4);
  });

  it("filters one list; list 1 also holds the documents from before lists", () => {
    expect(cutListFilter(1)).toEqual({ cutList: { $in: [1, null] } });
    expect(cutListFilter(2)).toEqual({ cutList: 2 });
    expect(matches({ bundleNumber: "155" }, cutListFilter(1))).toBe(true);
    expect(matches({ cutList: 1 }, cutListFilter(1))).toBe(true);
    expect(matches({ cutList: 2 }, cutListFilter(1))).toBe(false);
    expect(matches({}, cutListFilter(2))).toBe(false);
  });

  it("picks the cut entered last", () => {
    const a = { cutNumber: "154", createdAt: at(1) };
    const b = { cutNumber: "155", createdAt: at(2) };
    expect(newerCut(a, b)).toBe(b);
    expect(newerCut(b, a)).toBe(b);
    expect(newerCut(null, a)).toBe(a);
    expect(newerCut(a, null)).toBe(a);
    expect(newerCut(null, null)).toBe(null);
  });

  it("hints the open list and its last cut, or the invoice's own list when editing", () => {
    expect(cutListHint({ current: 2, lastCutNumber: "155" })).toBe("List 2 · next after cut 155");
    expect(cutListHint({ current: 3, lastCutNumber: "" })).toBe("List 3 · no cuts yet — numbers start from 1");
    expect(cutListHint({ current: 2, lotList: 2 })).toBe("List 2 · this invoice's cut list");
    expect(cutListHint({ current: 3, lotList: 1 })).toBe("List 1 (closed) · this invoice's cut list");
    expect(cutListHint({ lotList: 1 })).toBe("List 1 · this invoice's cut list");
  });

  it("closes only a list with cuts, and only the list that was seen", () => {
    expect(closeListProblem({ current: 2, cuts: 0 })).toContain("List 2 has no cuts yet");
    expect(closeListProblem({ current: 2, cuts: 5 })).toBe(null);
    expect(closeListProblem({ current: 3, expected: 2, cuts: 5 })).toBe(
      "List 2 is already closed — list 3 is open now"
    );
    expect(closeListProblem({ current: 2, expected: 2, cuts: 1 })).toBe(null);
    expect(closedListEntry({ number: 2, closedAt: at(5), by: admin, lastCut: "155", cuts: 9 })).toEqual({
      number: 2,
      startedAt: null,
      closedAt: at(5),
      by: admin,
      lastCut: "155",
      cuts: 9,
    });
  });

  it("lets the cutting master read the cut list API (the route itself keeps closing admin only)", () => {
    expect(isPathAllowedForRole("/api/cut-list", "cutting_master")).toBe(true);
    expect(isPathAllowedForRole("/api/cut-list/close", "cutting_master")).toBe(true);
    expect(isPathAllowedForRole("/api/cut-listx", "cutting_master")).toBe(false);
  });

  it("validates the close request; an edit can't move an invoice to another list", () => {
    expect(cutListCloseSchema.parse({})).toEqual({});
    expect(cutListCloseSchema.parse({ current: "2" })).toEqual({ current: 2 });
    expect(() => cutListCloseSchema.parse({ current: 0 })).toThrow();
    expect("cutList" in lotUpdateSchema.parse({ cutList: 5, note: "x" })).toBe(false);
  });
});

describe("new invoices and khata cuts join the open list", () => {
  it("stores the list on the document", () => {
    const product = { _id: new ObjectId(), name: "Slim Fit" };
    const input = { fabric: { name: "Denim", qty: 1, unit: "m" }, sizes: [{ size: "30", qty: 5 }], bundleNumber: "7" };
    const session = { sub: "c1", name: "Ali", role: "cutting_master" };
    expect(buildLot({ input, product, seq: 1001, session, cutList: 3 }).cutList).toBe(3);
    expect(buildLot({ input, product, seq: 1001, session }).cutList).toBe(1);
    expect(buildCut({ input: { cutNumber: "7", pieces: 5 }, session, cutList: 2 }).cutList).toBe(2);
  });
});

describe("a cut number is free only inside its own list", () => {
  const data = () => ({
    settings: [{ _id: "cutList", current: 2, history: [{ number: 1, closedAt: at(10) }] }],
    lots: [
      { _id: new ObjectId(), lotNumber: "INV-1001", bundleNumber: "155" }, // from before lists: list 1
      { _id: new ObjectId(), lotNumber: "INV-1019", bundleNumber: "155", cutList: 2 },
    ],
    stitch_cuts: [{ _id: new ObjectId(), cutNumber: "K9", cutList: 1 }],
  });

  it("refuses a number of the same list and names the invoice and the list", async () => {
    const db = fakeDb(data());
    await expect(requireFreeLotCutNumber(db, "155")).rejects.toMatchObject({
      status: 409,
      message: "Cut 155 is already invoice INV-1019 in list 2 — check the cut number",
    });
    await expect(requireFreeLotCutNumber(db, "155", { cutList: 1 })).rejects.toMatchObject({
      message: "Cut 155 is already invoice INV-1001 in list 1 — check the cut number",
    });
    await expect(requireFreeLotCutNumber(db, "k9", { cutList: 1 })).rejects.toMatchObject({
      message: "Cut k9 is already a cut in the Stitching Khata in list 1 — check the cut number",
    });
  });

  it("accepts a number used only in another list, and the invoice's own number on an edit", async () => {
    const db = fakeDb(data());
    await expect(requireFreeLotCutNumber(db, "K9")).resolves.toBeUndefined(); // K9 is in list 1, we are in list 2
    await expect(requireFreeLotCutNumber(db, "156")).resolves.toBeUndefined();
    const own = db.store.lots[1];
    await expect(
      requireFreeLotCutNumber(db, "155", { exceptId: String(own._id), cutList: 2 })
    ).resolves.toBeUndefined();
    await expect(requireFreeLotCutNumber(db, "")).resolves.toBeUndefined();
  });

  it("checks a khata cut against the khata cuts and invoices of its list", async () => {
    const db = fakeDb(data());
    await expect(requireFreeCutNumber(db, "155")).rejects.toMatchObject({
      message: "Cut 155 is invoice INV-1019 in list 2 — choose that invoice when you add the work",
    });
    await expect(requireFreeCutNumber(db, "K9", { cutList: 1 })).rejects.toMatchObject({
      message: "Cut K9 already exists in list 1",
    });
    await expect(requireFreeCutNumber(db, "K9")).resolves.toBeUndefined();
  });
});

describe("closing a list", () => {
  it("starts at list 1 with no settings document", async () => {
    const db = fakeDb();
    expect(await currentCutList(db)).toBe(1);
    expect(await cutListState(db)).toEqual({ current: 1, startedAt: null, cuts: 0, lastCutNumber: "", history: [] });
  });

  it("refuses an empty list", async () => {
    await expect(closeCutList(fakeDb(), undefined, { by: admin })).rejects.toMatchObject({ status: 409 });
  });

  it("closes the open list with its last cut and opens the next one", async () => {
    const db = fakeDb({
      lots: [
        { lotNumber: "INV-1001", bundleNumber: "154", createdAt: at(1) },
        { lotNumber: "INV-1002", bundleNumber: "", createdAt: at(4) },
      ],
      stitch_cuts: [{ cutNumber: "155", createdAt: at(3) }],
    });
    const before = await cutListState(db);
    expect([before.current, before.cuts, before.lastCutNumber].join()).toBe("1,3,155");

    const state = await closeCutList(db, undefined, { expected: 1, by: admin });
    expect([state.current, state.cuts, state.lastCutNumber].join()).toBe("2,0,");
    expect(state.startedAt).toBeInstanceOf(Date);
    expect(state.history).toHaveLength(1);
    expect(state.history[0]).toMatchObject({ number: 1, startedAt: null, by: admin, lastCut: "155", cuts: 3 });

    // the same click again: list 1 is gone, list 2 is empty
    await expect(closeCutList(db, undefined, { expected: 1, by: admin })).rejects.toMatchObject({
      message: "List 1 is already closed — list 2 is open now",
    });
    await expect(closeCutList(db, undefined, { by: admin })).rejects.toMatchObject({
      message: "List 2 has no cuts yet — there is nothing to close",
    });

    db.store.lots.push({ lotNumber: "INV-1003", bundleNumber: "1", cutList: 2, createdAt: at(6) });
    const next = await closeCutList(db, undefined, { expected: 2, by: admin });
    expect(next.current).toBe(3);
    expect(next.history.map((row) => [row.number, row.lastCut, row.cuts].join())).toEqual(["1,155,3", "2,1,1"]);
    expect(next.history[1].startedAt).toEqual(next.history[0].closedAt);
  });
});
