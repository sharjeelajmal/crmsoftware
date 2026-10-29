import { describe, expect, it } from "vitest";
import {
  balanceAfterCut,
  dailyCuttingReport,
  fabricBalances,
  fabricDayLedger,
  fabricKey,
  fabricMovements,
  formatFabricQty,
  formatUnitTotals,
  receiptProblem,
  totalsByUnit,
} from "@/constants/fabric";
import { fabricReceiptSchema, fabricReceiptUpdateSchema } from "@/lib/validation";

const at = (day, time = "12:00") => new Date(`${day}T${time}:00`);
const receipt = (id, day, name, qty, unit = "m") => ({ _id: id, date: at(day), name, qty, unit, createdAt: at(day) });
const lot = (id, day, time, name, qty, extra = {}) => ({
  _id: id,
  lotNumber: `LOT-${id}`,
  productName: "Slim Denim",
  createdAt: at(day, time),
  fabric: { name, qty, unit: "m" },
  sizes: [
    { size: "30", qty: 40 },
    { size: "32", qty: 0 },
  ],
  cutQty: 40,
  ...extra,
});

const receipts = [
  receipt("r1", "2026-10-20", "15-14 KZ", 500),
  receipt("r2", "2026-10-22", "15-14  kz ", 200),
  receipt("r3", "2026-10-22", "Lining", 30, "kg"),
];
const lots = [
  lot("1001", "2026-10-21", "10:00", "15-14 KZ", 120),
  lot("1002", "2026-10-22", "09:30", "15-14 kz", 80, { note: "Double stitch on pockets", bundleNumber: "B-7" }),
  lot("1003", "2026-10-22", "16:00", "Denim 12oz", 25),
  lot("1004", "2026-10-23", "11:00", "", 10), // no fabric name: not counted
];

describe("fabric khata", () => {
  const movements = fabricMovements({ receipts, lots });

  it("treats names case- and space-insensitively, per unit", () => {
    expect(fabricKey(" 15-14  KZ ", "m")).toBe(fabricKey("15-14 kz", "m"));
    expect(fabricKey("Lining", "kg")).not.toBe(fabricKey("Lining", "m"));
    expect(fabricKey("Denim", undefined)).toBe("denim|m");
  });

  it("adds received and subtracts what each cutting used, per fabric", () => {
    const balances = fabricBalances(movements);
    expect(balances.map((b) => [b.name, b.unit, b.received, b.used, b.balance])).toEqual([
      ["15-14 kz", "m", 700, 200, 500],
      ["Denim 12oz", "m", 0, 25, -25],
      ["Lining", "kg", 30, 0, 30],
    ]);
    expect(balances[0].cuts).toBe(2);
  });

  it("never adds metres and kilos together", () => {
    const totals = totalsByUnit(fabricBalances(movements));
    expect(totals).toEqual([
      { unit: "m", received: 700, rolls: 0, used: 225, balance: 475 },
      { unit: "kg", received: 30, rolls: 0, used: 0, balance: 30 },
    ]);
    expect(formatUnitTotals(totals, "balance")).toBe("475 m · 30 kg");
    expect(formatUnitTotals(totals, "used")).toBe("225 m");
    expect(formatUnitTotals([], "balance")).toBe("0 m");
    expect(formatFabricQty(1250.5, "yards")).toBe("1,250.5 yards");
  });

  it("shows the balance in hand at the end of every day, with an opening balance before the period", () => {
    const [metres] = fabricDayLedger(movements, { key: fabricKey("15-14 KZ", "m") });
    expect(metres.opening).toBe(0);
    expect(metres.days.map((d) => [d.day, d.received, d.used, d.balance])).toEqual([
      ["2026-10-20", 500, 0, 500],
      ["2026-10-21", 0, 120, 380],
      ["2026-10-22", 200, 80, 500],
    ]);
    expect(metres.closing).toBe(500);

    const [period] = fabricDayLedger(movements, {
      key: fabricKey("15-14 KZ", "m"),
      from: at("2026-10-22", "00:00"),
      to: at("2026-10-22", "23:59"),
    });
    expect(period.opening).toBe(380);
    expect(period.days).toHaveLength(1);
    expect([period.received, period.used, period.closing]).toEqual([200, 80, 500]);
  });

  it("keeps one block per unit when all fabrics are shown", () => {
    const blocks = fabricDayLedger(movements);
    expect(blocks.map((b) => [b.unit, b.closing])).toEqual([
      ["m", 475],
      ["kg", 30],
    ]);
  });

  it("builds the daily cutting report with opening, received, used and in hand", () => {
    const report = dailyCuttingReport({ receipts, lots, day: "2026-10-22" });
    expect(report.lots.map((l) => l.lotNumber)).toEqual(["LOT-1002", "LOT-1003"]);
    expect(report.lots[0].note).toBe("Double stitch on pockets");
    expect(report.lots[0].sizes).toEqual([{ size: "30", qty: 40 }]);
    expect(report.receipts.map((r) => r._id)).toEqual(["r2", "r3"]);
    expect(report.fabrics.map((f) => [f.name, f.opening, f.received, f.used, f.closing])).toEqual([
      ["15-14 kz", 380, 200, 80, 500],
      ["Denim 12oz", 0, 0, 25, -25],
      ["Lining", 0, 30, 0, 30],
    ]);
    expect(report.totals).toMatchObject({
      lots: 2,
      pieces: 80,
      received: [
        { unit: "m", qty: 200 },
        { unit: "kg", qty: 30 },
      ],
      used: [{ unit: "m", qty: 105 }],
    });
  });

  it("lists fabric still in hand on a day nothing happened, and nothing for a bad day", () => {
    const quiet = dailyCuttingReport({ receipts, lots, day: "2026-10-25" });
    expect(quiet.lots).toHaveLength(0);
    expect(quiet.fabrics.map((f) => [f.name, f.opening, f.closing])).toEqual([
      ["15-14 kz", 500, 500],
      ["Denim 12oz", -25, -25],
      ["Lining", 30, 30],
    ]);
    expect(dailyCuttingReport({ receipts, lots, day: "26/10/2026" })).toBeNull();
  });

  it("tells the cutting form what will be left, giving back the entry's own use when editing", () => {
    const balances = fabricBalances(movements);
    const fresh = balanceAfterCut(balances, { name: "15-14 KZ", unit: "m", qty: 150 });
    expect([fresh.before, fresh.after, fresh.usedBefore]).toEqual([500, 350, 200]);
    const editing = balanceAfterCut(balances, { name: "15-14 KZ", unit: "m", qty: 100 }, lots[1]);
    expect([editing.before, editing.after, editing.usedBefore]).toEqual([580, 480, 120]);
    expect(balanceAfterCut(balances, { name: "Unknown", unit: "m", qty: 5 })).toBeNull();
    expect(balanceAfterCut(balances, { name: "", unit: "m", qty: 5 })).toBeNull();
  });

  it("checks a receipt before saving", () => {
    const ok = { name: "15-14 KZ", qty: "500", unit: "m", day: "2026-10-26" };
    expect(receiptProblem(ok)).toBe("");
    expect(receiptProblem({ ...ok, name: "  " })).toMatch(/fabric name/);
    expect(receiptProblem({ ...ok, qty: "0" })).toMatch(/more than 0/);
    expect(receiptProblem({ ...ok, unit: "feet" })).toMatch(/unit/);
    expect(receiptProblem({ ...ok, day: "" })).toMatch(/date/);
  });

  it("validates the receipt request", () => {
    const parsed = fabricReceiptSchema.parse({ day: "2026-10-26", name: " 15-14 KZ ", qty: "500" });
    expect(parsed).toEqual({ day: "2026-10-26", name: "15-14 KZ", qty: 500, unit: "m", note: "" });
    expect(() => fabricReceiptSchema.parse({ day: "26-10-2026", name: "x", qty: 1 })).toThrow();
    expect(() => fabricReceiptSchema.parse({ day: "2026-10-26", name: "x", qty: 0 })).toThrow();
    expect(() => fabricReceiptSchema.parse({ day: "2026-10-26", name: "x", qty: 1, unit: "feet" })).toThrow();
    expect(fabricReceiptUpdateSchema.parse({ qty: "250" })).toEqual({ qty: 250 });
  });
});
