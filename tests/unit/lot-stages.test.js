import { describe, expect, it } from "vitest";
import {
  STAGE_ACTIONS,
  applyStageAction,
  distributeBySizes,
  lotShortfall,
  maxQtyFor,
  nextActionFor,
  readySizesProblem,
} from "@/constants/lots";

const base = { stage: "cutting", cutQty: 120, stitchedQty: null, washedQty: null };

describe("stage actions", () => {
  it("knows the next action for every stage", () => {
    expect(nextActionFor({ stage: "cutting" })).toBe("send_stitching");
    expect(nextActionFor({ stage: "stitching" })).toBe("stitched");
    expect(nextActionFor({ stage: "washing" })).toBe("washed");
    expect(nextActionFor({ stage: "packing" })).toBe("ready");
    expect(nextActionFor({ stage: "ready" })).toBeNull();
  });

  it("walks a lot cutting → stitching → washing → packing with shrinking quantities", () => {
    let lot = { ...base };
    lot = { ...lot, ...applyStageAction(lot, "send_stitching") };
    expect(lot.stage).toBe("stitching");

    lot = { ...lot, ...applyStageAction(lot, "stitched", { qty: "118" }) };
    expect(lot.stage).toBe("washing");
    expect(lot.stitchedQty).toBe(118);

    lot = { ...lot, ...applyStageAction(lot, "washed", { qty: 117 }) };
    expect(lot.stage).toBe("packing");
    expect(lot.washedQty).toBe(117);
  });

  it("rejects actions from the wrong stage", () => {
    expect(() => applyStageAction(base, "stitched", { qty: 10 })).toThrow(/only possible while/);
    expect(() => applyStageAction({ ...base, stage: "washing" }, "send_stitching")).toThrow(/only possible while/);
    expect(() => applyStageAction(base, "fly")).toThrow(/Unknown action/);
  });

  it("never lets a stage receive more than the previous one sent", () => {
    const stitching = { ...base, stage: "stitching" };
    expect(() => applyStageAction(stitching, "stitched", { qty: 121 })).toThrow(/only 120 reached/);
    expect(() => applyStageAction(stitching, "stitched", { qty: -1 })).toThrow(/0 or more/);
    expect(() => applyStageAction(stitching, "stitched", {})).toThrow(/0 or more/);
    const washing = { ...base, stage: "washing", stitchedQty: 100 };
    expect(maxQtyFor(washing, "washed")).toBe(100);
    expect(() => applyStageAction(washing, "washed", { qty: 101 })).toThrow(/only 100 reached/);
    expect(applyStageAction(washing, "washed", { qty: 100 }).washedQty).toBe(100);
  });

  it("computes the shortfall at each stage", () => {
    expect(lotShortfall(base)).toEqual({ afterStitching: null, afterWashing: null, total: null, lastQty: 120 });
    expect(lotShortfall({ ...base, stitchedQty: 118 })).toEqual({
      afterStitching: 2,
      afterWashing: null,
      total: 2,
      lastQty: 118,
    });
    expect(lotShortfall({ ...base, stitchedQty: 118, washedQty: 117 })).toEqual({
      afterStitching: 2,
      afterWashing: 1,
      total: 3,
      lastQty: 117,
    });
  });

  it("every action has a label and an event type", () => {
    for (const action of Object.values(STAGE_ACTIONS)) {
      expect(typeof action.label).toBe("string");
      expect(typeof action.eventType).toBe("string");
    }
  });
});

describe("ready for sale (Phase 3)", () => {
  const sizes = [
    { size: "30", qty: 30 },
    { size: "32", qty: 40 },
    { size: "34", qty: 30 },
  ];
  const packing = { stage: "packing", cutQty: 100, stitchedQty: 98, washedQty: 97, sizes };

  it("ready is the packing action, limited by the washed pieces", () => {
    expect(maxQtyFor(packing, "ready")).toBe(97);
    expect(applyStageAction(packing, "ready", { qty: 97 })).toEqual({ stage: "ready", readyQty: 97 });
    expect(() => applyStageAction(packing, "ready", { qty: 98 })).toThrow(/only 97 reached/);
    expect(STAGE_ACTIONS.ready.addsStock).toBe(true);
  });

  it("distributes pieces across sizes proportionally and exactly", () => {
    expect(distributeBySizes(sizes, 100)).toEqual([
      { size: "30", qty: 30 },
      { size: "32", qty: 40 },
      { size: "34", qty: 30 },
    ]);
    const split = distributeBySizes(sizes, 97);
    expect(split.reduce((s, r) => s + r.qty, 0)).toBe(97);
    expect(split.map((r) => r.size)).toEqual(["30", "32", "34"]);
    expect(distributeBySizes(sizes, 0).every((r) => r.qty === 0)).toBe(true);
    expect(distributeBySizes([], 10)).toEqual([]);
  });

  it("validates per-size ready quantities", () => {
    expect(readySizesProblem(packing, distributeBySizes(sizes, 97), 97)).toBeNull();
    expect(
      readySizesProblem(
        packing,
        [
          { size: "30", qty: 50 },
          { size: "32", qty: 40 },
        ],
        97
      )
    ).toMatch(/add up to 90/);
    expect(readySizesProblem(packing, [{ size: "36", qty: 97 }], 97)).toMatch(/not part of this invoice/);
    expect(readySizesProblem(packing, [{ size: "30", qty: -1 }], -1)).toMatch(/Invalid pieces/);
    expect(readySizesProblem(packing, [], 97)).toMatch(/per size/);
  });
});
