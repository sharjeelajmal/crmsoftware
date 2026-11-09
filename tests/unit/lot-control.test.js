import { describe, expect, it } from "vitest";
import { deleteProblem, isStopped, previousStage, reversePlan, stoppedProblem } from "@/constants/lots";
import { buildGatePass } from "@/lib/gatepass";
import { lotHoldSchema } from "@/lib/validation";

// Stop, reverse and delete from any stage (client, Rashid, 2026-11-09).

const at = (minute) => new Date(2026, 10, 9, 10, minute);
const pass = (number, type, extra = {}) => ({ _id: number, number, type, issuedAt: at(0), ...extra });

describe("stop", () => {
  it("knows a stopped invoice and says how to go on", () => {
    expect(isStopped({ hold: { at: at(1) } })).toBe(true);
    expect(isStopped({ hold: null })).toBe(false);
    expect(isStopped({})).toBe(false);
    expect(stoppedProblem({ lotNumber: "INV-1001", hold: { at: at(1) } })).toBe(
      "INV-1001 is stopped — resume it first"
    );
    expect(stoppedProblem({ lotNumber: "INV-1001" })).toBe("");
  });

  it("takes an optional reason", () => {
    expect(lotHoldSchema.parse({})).toEqual({ reason: "" });
    expect(lotHoldSchema.parse({ reason: "  waiting for buttons " })).toEqual({ reason: "waiting for buttons" });
    expect(() => lotHoldSchema.parse({ reason: "x".repeat(501) })).toThrow();
  });
});

describe("reverse one stage", () => {
  it("goes back one stage, never before cutting", () => {
    expect(["cutting", "stitching", "washing", "packing", "ready"].map(previousStage)).toEqual([
      null,
      "cutting",
      "stitching",
      "washing",
      "packing",
    ]);
    expect(reversePlan({ stage: "cutting" }).problem).toMatch(/first stage/);
  });

  it("stitching → cutting: cancels the stitching pass and the washing passes of pieces sent out", () => {
    const passes = [
      pass("GP-1", "cutting"),
      pass("GP-2", "stitching", { action: "send_stitching" }),
      pass("GP-3", "washing", { action: "stitch_out", partial: true }),
      pass("GP-4", "washing", { cancelled: { at: at(2) } }),
    ];
    const plan = reversePlan({ stage: "stitching", stitchOutQty: 40 }, passes);
    expect(plan.to).toBe("cutting");
    expect(plan.set).toEqual({ stage: "cutting", stitchOutQty: 0 });
    expect(plan.cancel.map((p) => p.number)).toEqual(["GP-2", "GP-3"]); // the cutting pass stays, GP-4 already cancelled
    expect(plan.stock).toBe(false);
  });

  it("washing → stitching: cancels only the washing pass issued when stitching was received", () => {
    const passes = [
      pass("GP-3", "washing", { action: "stitch_out", partial: true }),
      pass("GP-5", "washing", { action: "stitched" }),
    ];
    const plan = reversePlan({ stage: "washing", stitchedQty: 118 }, passes);
    expect(plan.set).toEqual({ stage: "stitching", stitchedQty: null });
    expect(plan.cancel.map((p) => p.number)).toEqual(["GP-5"]);
  });

  it("washing → stitching for passes issued before passes kept their action: by the time of the stitched entry", () => {
    const passes = [pass("GP-3", "washing", { issuedAt: at(5) }), pass("GP-5", "washing", { issuedAt: at(20) })];
    const events = [
      { type: "dispatched", at: at(5) },
      { type: "stitched", at: at(20) },
    ];
    expect(reversePlan({ stage: "washing" }, passes, events).cancel.map((p) => p.number)).toEqual(["GP-5"]);
    // without a stitched entry in the history nothing is guessed
    expect(reversePlan({ stage: "washing" }, passes, []).cancel).toEqual([]);
  });

  it("packing → washing clears the washed pieces; ready → packing takes stock back unless dispatched", () => {
    expect(reversePlan({ stage: "packing", washedQty: 117 })).toEqual({
      to: "washing",
      set: { stage: "washing", washedQty: null },
      cancel: [],
      stock: false,
    });
    expect(reversePlan({ stage: "ready", stockApplied: true })).toMatchObject({ to: "packing", stock: true });
    expect(reversePlan({ stage: "ready", lotNumber: "INV-1001", dispatchQty: 20 }).problem).toMatch(
      /20 pieces of INV-1001 were already dispatched/
    );
  });
});

describe("delete at any stage", () => {
  it("is refused only once pieces were dispatched", () => {
    expect(deleteProblem({ stage: "washing" })).toBe("");
    expect(deleteProblem({ stage: "ready", stockApplied: true })).toBe("");
    expect(deleteProblem({ stage: "ready", lotNumber: "INV-1001", dispatchQty: 3 })).toMatch(
      /3 pieces of INV-1001 were dispatched/
    );
  });
});

describe("gate pass action", () => {
  it("keeps which action issued a pass", () => {
    const lot = {
      _id: "64b000000000000000000001",
      lotNumber: "INV-1001",
      sizes: [{ size: "30", qty: 10 }],
      cutQty: 10,
    };
    expect(buildGatePass({ lot, type: "stitching", seq: 1001, action: "send_stitching" }).action).toBe(
      "send_stitching"
    );
    expect("action" in buildGatePass({ lot, type: "stitching", seq: 1002 })).toBe(false);
  });
});
