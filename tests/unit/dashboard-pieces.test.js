import { describe, expect, it } from "vitest";
import { STITCH_RECEIVED_STAGES, stitchingBalance, stitchingPieces } from "@/constants/dashboard";
import { stitchBalanceOf } from "@/constants/lots";

const lot = (stage, cutQty, more = {}) => ({ stage, cutQty, ...more });

describe("dashboard: stitching balance (invoices at stitching now)", () => {
  it("counts only invoices at stitching: received, sent out, lying", () => {
    const lots = [
      lot("cutting", 500),
      lot("stitching", 100, { stitchOutQty: 40 }),
      lot("stitching", 60),
      lot("washing", 80, { stitchOutQty: 30, stitchedQty: 78 }),
      lot("packing", 70, { stitchedQty: 70, washedQty: 69 }),
    ];
    expect(stitchingBalance(lots)).toEqual({ lots: 2, received: 160, out: 40, lying: 120 });
  });

  it("lying is the sum of each invoice's stitching balance (the Stitching page rows)", () => {
    const lots = [lot("stitching", 100, { stitchOutQty: 40 }), lot("stitching", 60, { stitchOutQty: "5" })];
    const rows = lots.reduce((sum, row) => sum + stitchBalanceOf(row), 0);
    expect(stitchingBalance(lots).lying).toBe(rows);
    expect(rows).toBe(115);
  });

  it("is all zeros with nothing at stitching", () => {
    expect(stitchingBalance()).toEqual({ lots: 0, received: 0, out: 0, lying: 0 });
    expect(stitchingBalance([lot("cutting", 10)])).toEqual({ lots: 0, received: 0, out: 0, lying: 0 });
  });
});

describe("dashboard: stitching pieces (received, out this week, out in all, left)", () => {
  it("received pieces are those of invoices at stitching or past it, never still at cutting", () => {
    expect(STITCH_RECEIVED_STAGES).toEqual(["stitching", "washing", "packing", "ready"]);
    expect(STITCH_RECEIVED_STAGES).not.toContain("cutting");
  });

  it("left is what is lying at stitching; received = out in all + left + short", () => {
    // In all: 100 (stitching, 40 out) + 80 (washing, closed with 78 stitched) + 50 (ready, 50 stitched) = 230 received.
    // Out on washing passes: 40 + 78 + 50 = 168; left 60; 2 short (80 cut, 78 stitched).
    const lots = [lot("stitching", 100, { stitchOutQty: 40 }), lot("washing", 80, { stitchedQty: 78 })];
    const pieces = stitchingPieces({ received: 230, out: { all: 168, week: 48 }, lots });
    expect(pieces).toEqual({ received: 230, outWeek: 48, outAll: 168, left: 60, short: 2, lots: 1 });
    expect(pieces.outAll + pieces.left + pieces.short).toBe(pieces.received);
  });

  it("left matches the stitching balance (the 'Lying in stitching' tile) exactly", () => {
    const lots = [lot("stitching", 90, { stitchOutQty: 25 }), lot("stitching", 30), lot("cutting", 400)];
    expect(stitchingPieces({ received: 120, out: { all: 25, week: 25 }, lots }).left).toBe(
      stitchingBalance(lots).lying
    );
  });

  it("a partial out moves pieces from left to out, received stays", () => {
    const before = stitchingPieces({ received: 60, out: { all: 0, week: 0 }, lots: [lot("stitching", 60)] });
    const after = stitchingPieces({
      received: 60,
      out: { all: 25, week: 25 },
      lots: [lot("stitching", 60, { stitchOutQty: 25 })],
    });
    expect(after.received - before.received).toBe(0);
    expect(after.outWeek - before.outWeek).toBe(25);
    expect(after.outAll - before.outAll).toBe(25);
    expect(after.left - before.left).toBe(-25);
    expect(after.short).toBe(0);
  });

  it("is all zeros before anything reached stitching (no aggregate rows)", () => {
    expect(stitchingPieces()).toEqual({ received: 0, outWeek: 0, outAll: 0, left: 0, short: 0, lots: 0 });
    expect(stitchingPieces({ received: undefined, out: undefined, lots: [lot("cutting", 50)] })).toEqual({
      received: 0,
      outWeek: 0,
      outAll: 0,
      left: 0,
      short: 0,
      lots: 0,
    });
  });

  it("never shows a negative short or negative totals", () => {
    // More out than received can only come from odd old data (e.g. a reprint without an action): short stays 0.
    const pieces = stitchingPieces({ received: 50, out: { all: 70, week: -3 }, lots: [] });
    expect(pieces.short).toBe(0);
    expect(pieces.outWeek).toBe(0);
    expect(stitchingPieces({ received: -10 }).received).toBe(0);
  });

  it("reads numbers that come as strings", () => {
    expect(stitchingPieces({ received: "40", out: { all: "10", week: "10" } })).toMatchObject({
      received: 40,
      outAll: 10,
      outWeek: 10,
      short: 30,
    });
  });
});
