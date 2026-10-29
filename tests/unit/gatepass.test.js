import { describe, expect, it } from "vitest";
import {
  GATE_PASS_FOR_ACTION,
  GATE_PASS_LABELS,
  GATE_PASS_TYPES,
  ISSUABLE_GATE_PASS_TYPES,
  canIssueGatePass,
  cuttingPassChanged,
  formatGatePassNumber,
  formatShrinkage,
  gatePassPiecesFor,
  sizeRangeOf,
  dispatchProblem,
  finalWashingPieces,
} from "@/constants/gatepass";
import { applyStageAction, minQtyFor, stitchBalanceOf, stitchOutQtyOf } from "@/constants/lots";
import { buildGatePass } from "@/lib/gatepass";
import { gatePassIssueSchema, lotCreateSchema, lotStageActionSchema } from "@/lib/validation";
import { BUSINESS } from "@/constants/brand";

const lot = {
  _id: "64b000000000000000000001",
  lotNumber: "LOT-1001",
  productName: "Slim Fit Denim",
  bundleNumber: "B-12",
  shrinkage: 12,
  fabric: { name: "Denim 12oz", qty: 62, unit: "m" },
  sizes: [
    { size: "30", qty: 60 },
    { size: "32", qty: 60 },
    { size: "34", qty: 0 },
  ],
  cutQty: 120,
  stitchedQty: null,
  stage: "stitching",
};

describe("gate pass rules", () => {
  it("numbers passes GP-1001 upwards and maps stage actions to pass types", () => {
    expect(formatGatePassNumber(1001)).toBe("GP-1001");
    expect(GATE_PASS_FOR_ACTION.send_stitching).toBe("stitching");
    expect(GATE_PASS_FOR_ACTION.stitched).toBe("washing");
    expect(GATE_PASS_FOR_ACTION.washed).toBeUndefined();
  });

  it("keeps cutting, stitching, washing and dispatch as separate passes", () => {
    expect([...GATE_PASS_TYPES]).toEqual(["cutting", "stitching", "washing", "dispatch"]);
    expect(GATE_PASS_LABELS.cutting).toBe("Cutting gate pass");
    expect(GATE_PASS_LABELS.stitching).toBe("Stitching gate pass");
    expect(GATE_PASS_LABELS.washing).toBe("Washing gate pass");
    expect(GATE_PASS_LABELS.dispatch).toBe("Dispatch gate pass");
    // a dispatch pass only comes from a dispatch, never from "Issue …"
    expect([...ISSUABLE_GATE_PASS_TYPES]).toEqual(["cutting", "stitching", "washing"]);
    expect(() => gatePassIssueSchema.parse({ type: "dispatch" })).toThrow();
  });

  it("derives the size range from sizes that have pieces", () => {
    expect(sizeRangeOf(lot.sizes)).toBe("30 – 32");
    expect(sizeRangeOf([{ size: "L", qty: 5 }])).toBe("L");
    expect(
      sizeRangeOf([
        { size: "36", qty: 1 },
        { size: "28", qty: 2 },
        { size: "32", qty: 3 },
      ])
    ).toBe("28 – 36");
    expect(sizeRangeOf([])).toBe("");
  });

  it("prints cut pieces on the cutting and stitching passes and stitched pieces on the washing pass", () => {
    expect(gatePassPiecesFor(lot, "cutting")).toBe(120);
    expect(gatePassPiecesFor(lot, "stitching")).toBe(120);
    expect(gatePassPiecesFor(lot, "washing")).toBe(120);
    expect(gatePassPiecesFor({ ...lot, stitchedQty: 118 }, "washing")).toBe(118);
    expect(gatePassPiecesFor({ ...lot, stitchedQty: 118 }, "stitching")).toBe(120);
  });

  it("only issues a pass once the lot reached that unit", () => {
    expect(canIssueGatePass({ stage: "cutting" }, "cutting")).toBe(true);
    expect(canIssueGatePass({ stage: "washing" }, "cutting")).toBe(true);
    expect(canIssueGatePass({ stage: "cutting" }, "stitching")).toBe(false);
    expect(canIssueGatePass({ stage: "stitching" }, "stitching")).toBe(true);
    expect(canIssueGatePass({ stage: "stitching" }, "washing")).toBe(false);
    expect(canIssueGatePass({ stage: "packing" }, "washing")).toBe(true);
    expect(canIssueGatePass({ stage: "ready" }, "other")).toBe(false);
  });

  it("needs a fresh cutting pass only when something printed on it changed", () => {
    const cut = { ...lot, stage: "cutting", note: "first" };
    expect(cuttingPassChanged(cut, { ...cut, note: "only the note" })).toBe(false);
    expect(cuttingPassChanged(cut, { ...cut, updatedAt: new Date() })).toBe(false);
    expect(cuttingPassChanged(cut, { ...cut, sizes: [{ size: "30", qty: 50 }] })).toBe(true);
    expect(cuttingPassChanged(cut, { ...cut, bundleNumber: "B-13" })).toBe(true);
    expect(cuttingPassChanged(cut, { ...cut, shrinkage: 10 })).toBe(true);
    expect(cuttingPassChanged(cut, { ...cut, fabric: { ...cut.fabric, qty: 60 } })).toBe(true);
    expect(cuttingPassChanged(cut, { ...cut, productName: "Regular Denim" })).toBe(true);
  });

  it("formats shrinkage", () => {
    expect(formatShrinkage(12)).toBe("12%");
    expect(formatShrinkage(null)).toBe("—");
    expect(formatShrinkage("")).toBe("—");
  });
});

describe("buildGatePass", () => {
  const session = { sub: "u1", name: "Admin" };
  const now = new Date("2026-10-21T09:00:00Z");

  it("snapshots the stitching pass with bundle, sizes, shrinkage and fabric", () => {
    const pass = buildGatePass({ lot, type: "stitching", seq: 1001, session, now });
    expect(pass).toMatchObject({
      number: "GP-1001",
      type: "stitching",
      lotNumber: "LOT-1001",
      bundleNumber: "B-12",
      shrinkage: 12,
      sizeRange: "30 – 32",
      pieces: 120,
      washType: "",
      fabric: { name: "Denim 12oz", qty: 62, unit: "m" },
      issuedBy: { id: "u1", name: "Admin" },
      issuedAt: now,
    });
    expect(String(pass.lotId)).toBe(lot._id);
  });

  it("snapshots the cutting pass with the same cutting details", () => {
    const pass = buildGatePass({ lot: { ...lot, stage: "cutting" }, type: "cutting", seq: 1004, session, now });
    expect(pass).toMatchObject({
      number: "GP-1004",
      type: "cutting",
      productName: "Slim Fit Denim",
      bundleNumber: "B-12",
      shrinkage: 12,
      sizeRange: "30 – 32",
      pieces: 120,
      washType: "",
      fabric: { name: "Denim 12oz", qty: 62, unit: "m" },
    });
  });

  it("snapshots the washing pass with the stitched pieces and wash type", () => {
    const pass = buildGatePass({
      lot: { ...lot, stitchedQty: 118 },
      type: "washing",
      seq: 1002,
      washType: "Enzyme",
      session,
      now,
    });
    expect(pass).toMatchObject({ number: "GP-1002", type: "washing", pieces: 118, washType: "Enzyme" });
    const fallback = buildGatePass({ lot: { ...lot, washType: "Random" }, type: "washing", seq: 1003, session, now });
    expect(fallback.washType).toBe("Random");
  });

  it("has both factory phone numbers configured for printing", () => {
    expect(BUSINESS.gatePass.phoneTop).toMatch(/\d{4}-\d{7}/);
    expect(BUSINESS.gatePass.phoneBottom).toMatch(/\d{4}-\d{7}/);
  });
});

describe("gate pass schemas", () => {
  const base = { productId: "64b000000000000000000001", fabric: { name: "Denim" }, sizes: [{ size: "30", qty: 10 }] };

  it("accepts the cut number and a free-text shrinkage on the cutting entry", () => {
    const parsed = lotCreateSchema.parse({ ...base, bundleNumber: " C-12 ", shrinkage: " 2 inch " });
    expect(parsed.bundleNumber).toBe("C-12");
    expect(parsed.shrinkage).toBe("2 inch");
    expect(lotCreateSchema.parse(base).bundleNumber).toBe("");
    expect(lotCreateSchema.parse(base).shrinkage).toBeUndefined();
    expect(lotCreateSchema.parse({ ...base, shrinkage: null }).shrinkage).toBe("");
    expect(lotCreateSchema.parse({ ...base, shrinkage: 120 }).shrinkage).toBe("120"); // no limit any more
    expect(() => lotCreateSchema.parse({ ...base, shrinkage: "x".repeat(41) })).toThrow();
  });

  it("prints shrinkage as written; old percent numbers keep their %", () => {
    expect(formatShrinkage("2 inch")).toBe("2 inch");
    expect(formatShrinkage(12)).toBe("12%");
    expect(formatShrinkage("")).toBe("—");
    expect(formatShrinkage(null)).toBe("—");
  });

  it("accepts a wash type with the stitched action and validates the issue request", () => {
    expect(lotStageActionSchema.parse({ action: "stitched", qty: 118, washType: " Enzyme wash " }).washType).toBe(
      "Enzyme wash"
    );
    expect(gatePassIssueSchema.parse({ type: "washing", washType: "Random" })).toEqual({
      type: "washing",
      washType: "Random",
    });
    expect(gatePassIssueSchema.parse({ type: "cutting" }).type).toBe("cutting");
    expect(() => gatePassIssueSchema.parse({ type: "packing" })).toThrow();
  });
});

describe("partial gate passes out of stitching (Phase 7b)", () => {
  const inStitching = { ...lot, stage: "stitching", cutQty: 100, stitchOutQty: 0 };

  it("tracks what went out and what is still lying in stitching", () => {
    expect(stitchOutQtyOf({ stitchOutQty: 40 })).toBe(40);
    expect(stitchOutQtyOf({})).toBe(0);
    expect(stitchBalanceOf({ ...inStitching, stitchOutQty: 40 })).toBe(60);
    expect(stitchBalanceOf({ ...inStitching, stage: "washing", stitchOutQty: 40 })).toBe(0);
  });

  it("only lets pieces out of stitching that are still there", () => {
    expect(dispatchProblem(inStitching, 40)).toBe("");
    expect(dispatchProblem({ ...inStitching, stitchOutQty: 40 }, 70)).toMatch(/Only 60 pieces are left/);
    expect(dispatchProblem(inStitching, 0)).toMatch(/more than 0/);
    expect(dispatchProblem({ ...inStitching, stage: "cutting" }, 5)).toMatch(
      /only be sent out while the lot is in stitching/
    );
  });

  it("closing stitching can't record fewer pieces than already went out", () => {
    const sent = { ...inStitching, stitchOutQty: 40 };
    expect(minQtyFor(sent, "stitched")).toBe(40);
    expect(minQtyFor(sent, "washed")).toBe(0);
    expect(() => applyStageAction(sent, "stitched", { qty: 30 })).toThrow(/already went out with gate passes/);
    expect(applyStageAction(sent, "stitched", { qty: 98 }).stitchedQty).toBe(98);
  });

  it("the final washing pass carries only the pieces not yet sent", () => {
    expect(finalWashingPieces({ stitchOutQty: 40 }, 98)).toBe(58);
    expect(finalWashingPieces({ stitchOutQty: 100 }, 100)).toBe(0);
    expect(finalWashingPieces({}, 118)).toBe(118);
  });

  it("builds a partial pass with its own piece count", () => {
    const pass = buildGatePass({
      lot: inStitching,
      type: "washing",
      seq: 1010,
      washType: "Enzyme",
      pieces: 40,
      partial: true,
      session: { sub: "u1", name: "Admin" },
    });
    expect(pass).toMatchObject({ number: "GP-1010", type: "washing", pieces: 40, partial: true, washType: "Enzyme" });
    expect(buildGatePass({ lot: inStitching, type: "stitching", seq: 1, session: {} })).toMatchObject({
      pieces: 100,
      partial: false,
    });
  });
});
