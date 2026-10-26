import { describe, expect, it } from "vitest";
import {
  buildVendorLedger,
  paymentEntry,
  paymentProblem,
  purchaseEntry,
  vendorBalances,
} from "@/constants/purchasingLedger";
import { createdAtOf, inDayRange, rangeLabel } from "@/constants/datePresets";
import { filterVendors, ledgerCsv, ledgerUrl } from "@/features/purchasing/utils";
import { vendorPaymentSchema } from "@/lib/validation";

const d = (day, hour = 10) => new Date(2026, 9, day, hour);
const V1 = "64b000000000000000000001";
const V2 = "64b000000000000000000002";

const purchases = [
  {
    _id: "p1",
    vendorId: V1,
    vendorName: "Sweat Shirt",
    productName: "Denim",
    quantity: 10,
    costPerItem: 100,
    totalCost: 1000,
    purchaseDate: d(1),
  },
  {
    _id: "p2",
    vendorId: V1,
    vendorName: "Sweat Shirt",
    productName: "Zip",
    size: "32",
    quantity: 5,
    costPerItem: 40,
    totalCost: 200,
    purchaseDate: d(10),
  },
  {
    _id: "p3",
    vendorId: V2,
    vendorName: "Aura Fabrics",
    productName: "Thread",
    quantity: 3,
    costPerItem: 50,
    totalCost: 150,
    purchaseDate: d(12),
  },
  {
    _id: "p4",
    vendorId: V1,
    vendorName: "Sweat Shirt",
    productName: "Old row",
    quantity: 1,
    costPerItem: 70,
    purchaseDate: "2026-10-20",
  },
];
const payments = [
  { _id: "y1", vendorId: V1, vendorName: "Sweat Shirt", amount: 600, method: "cash", date: d(5) },
  { _id: "y2", vendorId: V1, vendorName: "Sweat Shirt", amount: 300, method: "cheque", note: "chq 77", date: d(15) },
];

describe("purchasing ledger entries", () => {
  it("turns a purchase into a debit and a payment into a credit", () => {
    expect(purchaseEntry(purchases[1])).toMatchObject({
      kind: "purchase",
      vendorId: V1,
      detail: "Zip (Size 32) · 5 × 40",
      debit: 200,
      credit: 0,
    });
    expect(purchaseEntry(purchases[3]).debit).toBe(70); // no totalCost saved → qty × rate
    expect(paymentEntry(payments[1])).toMatchObject({
      kind: "payment",
      detail: "Payment · Cheque · chq 77",
      debit: 0,
      credit: 300,
    });
  });
});

describe("buildVendorLedger", () => {
  it("runs the balance across purchases and payments, oldest first", () => {
    const { opening, rows, totals } = buildVendorLedger({ purchases, payments });
    expect(opening).toBe(0);
    expect(rows.map((r) => [r._id, r.balance])).toEqual([
      ["p1", 1000],
      ["y1", 400],
      ["p2", 600],
      ["p3", 750],
      ["y2", 450],
      ["p4", 520],
    ]);
    expect(totals).toEqual({ purchases: 1420, payments: 900, closing: 520 });
  });

  it("carries everything before the period into the opening balance and drops what comes after", () => {
    const { opening, rows, totals } = buildVendorLedger({
      purchases,
      payments,
      from: new Date(2026, 9, 6),
      to: new Date(2026, 9, 14, 23, 59, 59),
    });
    expect(opening).toBe(400); // 1000 bought − 600 paid before the 6th
    expect(rows.map((r) => r._id)).toEqual(["p2", "p3"]);
    expect(rows.at(-1).balance).toBe(750);
    expect(totals).toEqual({ purchases: 350, payments: 0, closing: 750 });
  });

  it("closes at the opening balance when the period is empty", () => {
    const { rows, totals } = buildVendorLedger({ purchases, payments, from: new Date(2026, 10, 1) });
    expect(rows).toEqual([]);
    expect(totals.closing).toBe(520);
  });
});

describe("vendor balances and payment form", () => {
  it("shows what is payable per vendor, most owed first", () => {
    expect(vendorBalances({ purchases, payments })).toEqual([
      { vendorId: V1, vendorName: "Sweat Shirt", purchases: 1270, payments: 900, balance: 370 },
      { vendorId: V2, vendorName: "Aura Fabrics", purchases: 150, payments: 0, balance: 150 },
    ]);
  });

  it("checks a payment before saving", () => {
    expect(paymentProblem({ vendorId: V1, amount: "500", method: "cash" })).toBe("");
    expect(paymentProblem({ vendorId: "", amount: "500" })).toMatch(/vendor/);
    expect(paymentProblem({ vendorId: V1, amount: "0" })).toMatch(/more than 0/);
    expect(paymentProblem({ vendorId: V1, amount: "5", method: "gold" })).toMatch(/paid/);
    expect(vendorPaymentSchema.parse({ vendorId: V1, amount: "250" })).toMatchObject({ amount: 250, method: "cash" });
    expect(() => vendorPaymentSchema.parse({ vendorId: V1, amount: 0 })).toThrow(/more than 0/);
  });

  it("builds the ledger URL and a CSV with opening and closing lines", () => {
    expect(ledgerUrl()).toBe("/api/purchases/ledger");
    expect(ledgerUrl({ vendorId: V1, range: { from: d(1), to: d(31) } })).toBe(
      `/api/purchases/ledger?vendorId=${V1}&from=2026-10-01&to=2026-10-31`
    );
    const csv = ledgerCsv(buildVendorLedger({ purchases: purchases.slice(0, 1), payments: [] })).split("\n");
    expect(csv[0]).toBe("Date,Vendor,Details,Purchase,Payment,Balance");
    expect(csv[1]).toBe(",,Opening balance,,,0");
    expect(csv[2]).toBe("2026-10-01,Sweat Shirt,Denim · 10 × 100,1000,,1000");
    expect(csv.at(-1)).toBe(",,Closing balance,1000,0,1000");
  });
});

describe("shared date helpers", () => {
  it("labels a range by its preset or its days", () => {
    const now = new Date(2026, 9, 26);
    expect(rangeLabel(null)).toBe("All time");
    expect(rangeLabel({ from: new Date(2026, 9, 1), to: new Date(2026, 9, 26) }, "All time", now)).toBe("This month");
    expect(rangeLabel({ from: new Date(2026, 9, 3), to: new Date(2026, 9, 9) }, "All time", now)).toBe(
      "3 Oct – 9 Oct 2026"
    );
  });

  it("checks whole days and reads creation time from the id", () => {
    const range = { from: new Date(2026, 9, 3), to: new Date(2026, 9, 3) };
    expect(inDayRange(new Date(2026, 9, 3, 23, 30), range)).toBe(true);
    expect(inDayRange(new Date(2026, 9, 4, 0, 1), range)).toBe(false);
    const at = new Date(2026, 5, 3, 12);
    const id = Math.floor(at.getTime() / 1000).toString(16) + "0000000000000000";
    expect(createdAtOf({ _id: id }).getTime()).toBe(at.getTime());
  });

  it("filters vendors by search and added date", () => {
    const idAt = (date) => Math.floor(date.getTime() / 1000).toString(16) + "0000000000000000";
    const vendors = [
      { _id: idAt(new Date(2026, 5, 3)), name: "Sweat Shirt", contactPerson: "Aura" },
      { _id: idAt(new Date(2026, 9, 20)), name: "Thread House", contactPerson: "" },
    ];
    const october = { from: new Date(2026, 9, 1), to: new Date(2026, 9, 31) };
    expect(filterVendors(vendors, "", october).map((v) => v.name)).toEqual(["Thread House"]);
    expect(filterVendors(vendors, "aura").map((v) => v.name)).toEqual(["Sweat Shirt"]);
  });
});
