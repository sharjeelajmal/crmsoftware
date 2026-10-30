import { describe, expect, it } from "vitest";
import {
  addDispatched,
  dispatchBalance,
  dispatchCost,
  dispatchOutProblem,
  dispatchRows,
  piecesOf,
} from "@/constants/dispatch";
import { dispatchOutSchema } from "@/lib/validation";
import { buildGatePass } from "@/lib/gatepass";
import { formatRolls, fabricBalances, fabricMovements, receiptProblem } from "@/constants/fabric";

const lot = {
  _id: "64b000000000000000000001",
  lotNumber: "LOT-1001",
  productName: "Baggy Jeans",
  bundleNumber: "C-12",
  stage: "ready",
  readyQty: 97,
  readySizes: [
    { size: "30", qty: 50 },
    { size: "32", qty: 47 },
  ],
  dispatchQty: 20,
  dispatchSizes: [{ size: "30", qty: 20 }],
};

describe("dispatch of ready goods", () => {
  it("knows what is ready, already sent and still in the factory, per size", () => {
    expect(dispatchBalance(lot)).toEqual({
      rows: [
        { size: "30", ready: 50, sent: 20, left: 30 },
        { size: "32", ready: 47, sent: 0, left: 47 },
      ],
      ready: 97,
      sent: 20,
      left: 77,
    });
    expect(dispatchBalance({ readySizes: [{ size: "M", qty: 5 }] })).toMatchObject({ ready: 5, sent: 0, left: 5 });
  });

  it("allows any part, but never more than is left, and needs the party", () => {
    const ten = [
      { size: "30", qty: 10 },
      { size: "32", qty: 0 },
    ];
    expect(dispatchOutProblem(lot, { sizes: ten, party: "Al-Madina" })).toBe("");
    expect(dispatchOutProblem(lot, { sizes: ten, party: "  " })).toMatch(/party or shop/);
    expect(dispatchOutProblem(lot, { sizes: [{ size: "30", qty: 31 }], party: "X" })).toMatch(
      /Only 30 pieces of size 30/
    );
    expect(dispatchOutProblem(lot, { sizes: [{ size: "34", qty: 1 }], party: "X" })).toMatch(
      /not part of this invoice/
    );
    expect(dispatchOutProblem(lot, { sizes: [{ size: "30", qty: 0 }], party: "X" })).toMatch(/more than 0/);
    expect(dispatchOutProblem({ ...lot, stage: "packing" }, { sizes: ten, party: "X" })).toMatch(/Ready/);
  });

  it("keeps the sizes going out and adds them to what was sent", () => {
    const rows = dispatchRows([
      { size: "30", qty: "10" },
      { size: "32", qty: "" },
    ]);
    expect(rows).toEqual([{ size: "30", qty: 10 }]);
    expect(piecesOf(rows)).toBe(10);
    expect(addDispatched(lot.dispatchSizes, [...rows, { size: "32", qty: 5 }])).toEqual([
      { size: "30", qty: 30 },
      { size: "32", qty: 5 },
    ]);
  });

  it("works out the labour cost of the pieces going out", () => {
    expect(dispatchCost({ labour: 4850, readyQty: 97, pieces: 10 })).toEqual({
      labour: 4850,
      perPiece: 50,
      amount: 500,
    });
    expect(dispatchCost({ labour: 100, readyQty: 3, pieces: 2 })).toEqual({
      labour: 100,
      perPiece: 33.33,
      amount: 66.66,
    });
    expect(dispatchCost({ labour: 500, readyQty: 0, pieces: 5 })).toMatchObject({ perPiece: 0, amount: 0 });
  });

  it("snapshots a dispatch gate pass with the sizes going out, the party and the cost", () => {
    const pass = buildGatePass({
      lot,
      type: "dispatch",
      seq: 1009,
      pieces: 10,
      partial: true,
      sizes: [{ size: "30", qty: 10 }],
      party: "Al-Madina",
      cost: { labour: 4850, perPiece: 50, amount: 500 },
      note: "2 cartons",
      session: { sub: "u1", name: "Admin" },
      now: new Date("2026-10-30T10:00:00Z"),
    });
    expect(pass).toMatchObject({
      number: "GP-1009",
      type: "dispatch",
      party: "Al-Madina",
      pieces: 10,
      partial: true,
      sizeRange: "30",
      sizes: [{ size: "30", qty: 10 }],
      bundleNumber: "C-12",
      cost: { perPiece: 50, amount: 500 },
      note: "2 cartons",
    });
    const cutting = buildGatePass({ lot, type: "cutting", seq: 1, session: {}, now: new Date() });
    expect(cutting.party).toBeUndefined();
  });

  it("validates the dispatch request", () => {
    const parsed = dispatchOutSchema.parse({ party: " Shop 4 ", sizes: [{ size: "30", qty: "10" }] });
    expect(parsed).toEqual({ party: "Shop 4", sizes: [{ size: "30", qty: 10 }], note: "" });
    expect(() => dispatchOutSchema.parse({ party: "", sizes: [{ size: "30", qty: 1 }] })).toThrow();
    expect(() => dispatchOutSchema.parse({ party: "X", sizes: [] })).toThrow();
    expect(() =>
      dispatchOutSchema.parse({
        party: "X",
        sizes: [
          { size: "30", qty: 1 },
          { size: "30", qty: 2 },
        ],
      })
    ).toThrow();
  });
});

describe("fabric received in rolls", () => {
  it("counts the rolls with the received fabric", () => {
    const receipts = [
      { _id: "r1", date: new Date("2026-10-28T12:00:00"), name: "15-14 KZ", qty: 500, rolls: 4, unit: "m" },
      { _id: "r2", date: new Date("2026-10-29T12:00:00"), name: "15-14 KZ", qty: 120, unit: "m" },
    ];
    const [row] = fabricBalances(fabricMovements({ receipts, lots: [] }));
    expect([row.received, row.rolls, row.balance]).toEqual([620, 4, 620]);
    expect(formatRolls(4)).toBe("4 rolls");
    expect(formatRolls(1)).toBe("1 roll");
    expect(formatRolls(0)).toBe("");
    const ok = { name: "15-14 KZ", qty: "500", unit: "m", day: "2026-10-30" };
    expect(receiptProblem({ ...ok, rolls: "4" })).toBe("");
    expect(receiptProblem({ ...ok, rolls: "" })).toBe("");
    expect(receiptProblem({ ...ok, rolls: "2.5" })).toMatch(/whole number/);
  });
});
