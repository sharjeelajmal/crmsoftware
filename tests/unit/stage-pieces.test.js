import { describe, expect, it } from "vitest";
import { STAGES } from "@/constants/lots";
import { STAGE_PIECE_KEYS, STAGE_PIECE_LABELS, piecesInto, stageFlowOf, stagePieces } from "@/constants/stagePieces";

// One invoice at every point of the pipeline (cut → stitched → washed → ready → dispatched).
const atCutting = { stage: "cutting", cutQty: 50, stitchedQty: null, washedQty: null, readyQty: null };
const inStitching = { stage: "stitching", cutQty: 100, stitchOutQty: 0 };
const partlyOut = { stage: "stitching", cutQty: 100, stitchOutQty: 40 }; // 40 went to washing early with a gate pass
const stopped = { stage: "stitching", cutQty: 30, stitchOutQty: 10, hold: { at: new Date(), reason: "fabric fault" } };
const atWashing = { stage: "washing", cutQty: 80, stitchOutQty: 30, stitchedQty: 78 }; // 2 lost in stitching
const atPacking = { stage: "packing", cutQty: 60, stitchedQty: 60, washedQty: 57 };
const ready = { stage: "ready", cutQty: 40, stitchedQty: 40, washedQty: 40, readyQty: 38, dispatchQty: 10 };

const LOTS = [atCutting, inStitching, partlyOut, stopped, atWashing, atPacking, ready];

const addsUp = (t) => t.received === t.out + t.lying + t.short;

describe("stagePieces", () => {
  it("cutting: everything cut, what went on to stitching, what is still at cutting", () => {
    expect(stagePieces(LOTS, "cutting")).toEqual({ invoices: 1, received: 460, out: 410, lying: 50, short: 0 });
  });

  it("stitching: early outs count as sent, the rest of an open invoice is lying; a stopped invoice still counts", () => {
    // received: 100 + 100 + 30 + 80 + 60 + 40 · out: 0 + 40 + 10 + 78 + 60 + 40 · lying: 100 + 60 + 20 · short: 2
    expect(stagePieces(LOTS, "stitching")).toEqual({ invoices: 3, received: 410, out: 228, lying: 180, short: 2 });
  });

  it("washing: pieces sent out of stitching early are already lying at washing", () => {
    // received: 40 + 10 (early outs) + 78 + 60 + 40 · out: 57 + 40 · lying: 40 + 10 + 78 · short: 3
    expect(stagePieces(LOTS, "washing")).toEqual({ invoices: 1, received: 228, out: 97, lying: 128, short: 3 });
  });

  it("packing: washed pieces in, pieces marked ready out", () => {
    expect(stagePieces(LOTS, "packing")).toEqual({ invoices: 1, received: 97, out: 38, lying: 57, short: 2 });
  });

  it("ready: pieces marked ready, dispatched, and not dispatched yet", () => {
    expect(stagePieces(LOTS, "ready")).toEqual({ invoices: 1, received: 38, out: 10, lying: 28, short: 0 });
  });

  it("each stage's 'sent on' is the next stage's 'received', and every stage adds up", () => {
    for (const stage of STAGES) expect(addsUp(stagePieces(LOTS, stage)), stage).toBe(true);
    for (let i = 0; i < STAGES.length - 1; i += 1) {
      expect(stagePieces(LOTS, STAGES[i]).out).toBe(stagePieces(LOTS, STAGES[i + 1]).received);
    }
  });

  it("a partial out moves pieces from lying in stitching to lying at washing", () => {
    const before = { stage: "stitching", cutQty: 20, stitchOutQty: 0 };
    const after = { ...before, stitchOutQty: 8 };
    expect(stagePieces([before], "stitching")).toMatchObject({ invoices: 1, received: 20, out: 0, lying: 20 });
    expect(stagePieces([after], "stitching")).toMatchObject({ invoices: 1, received: 20, out: 8, lying: 12 });
    expect(stagePieces([after], "washing")).toMatchObject({ invoices: 0, received: 8, out: 0, lying: 8 });
  });

  it("never goes negative on odd data, and is all zero for no stage or no lots", () => {
    const odd = { stage: "stitching", cutQty: 10, stitchOutQty: 25 };
    const flow = stageFlowOf(odd, "stitching");
    expect(Object.values(flow).every((n) => n >= 0)).toBe(true);
    expect(flow).toEqual({ received: 10, out: 10, lying: 0, short: 0 });
    expect(stageFlowOf({ stage: "ready", readyQty: 5, dispatchQty: -3 }, "ready")).toEqual({
      received: 5,
      out: 0,
      lying: 5,
      short: 0,
    });
    const zero = { invoices: 0, received: 0, out: 0, lying: 0, short: 0 };
    expect(stagePieces(LOTS, "")).toEqual(zero);
    expect(stagePieces([], "washing")).toEqual(zero);
    expect(stagePieces(undefined, "washing")).toEqual(zero);
  });

  it("an invoice that never reached a stage brings nothing to it", () => {
    expect(piecesInto(atCutting, "stitching")).toBe(0);
    expect(piecesInto(inStitching, "washing")).toBe(0);
    expect(piecesInto(atWashing, "packing")).toBe(0);
    expect(piecesInto({ stage: "nowhere", cutQty: 9 }, "cutting")).toBe(0);
  });

  it("has a title for every box of every stage", () => {
    for (const stage of STAGES) {
      for (const key of STAGE_PIECE_KEYS) expect(STAGE_PIECE_LABELS[stage][key], `${stage}.${key}`).toBeTruthy();
    }
  });
});
