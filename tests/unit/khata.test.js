import { describe, expect, it } from "vitest";
import { productSchema } from "@/lib/validation";
import { lockCash, lockCutProblem, summarizeWages } from "@/constants/wages";
import { categoryOf, toProductPayload, toProductUpdatePayload, validateProductInput } from "@/features/inventory/utils";
import { usualOperations, workerFormFrom } from "@/features/wages/utils";
import {
  cutOptions,
  cutRefOf,
  khataEntryAmount,
  khataEntryProblem,
  khataSections,
  operationOptionsFor,
  khataRateFor,
  toKhataEntryPayload,
  withSuggestedRate,
} from "@/features/khata/utils";

const OPS = [
  { _id: "a1", name: "Overlock", rate: 3.5 },
  { _id: "b2", name: "Pocket", rate: 5 },
  { _id: "c3", name: "Old", rate: 2, active: false },
];

describe("stitching khata form", () => {
  it("lists the khata's cuts before the invoices, and reads a choice back", () => {
    const options = cutOptions(
      [{ _id: "c1", cutNumber: "20", article: "Baggy Pent" }],
      [{ _id: "l1", lotNumber: "INV-1001", bundleNumber: "7", productName: "Shirt" }]
    );
    expect(options).toEqual([
      { value: "cut:c1", label: "Cut 20 · Baggy Pent" },
      { value: "lot:l1", label: "INV-1001 · Cut 7 · Shirt" },
    ]);
    expect(cutRefOf("cut:c1")).toEqual({ cutId: "c1" });
    expect(cutRefOf("lot:l1")).toEqual({ lotId: "l1" });
    expect(cutRefOf("")).toEqual({});
  });

  it("offers the worker's usual operations first and hides inactive ones he doesn't do", () => {
    expect(operationOptionsFor(OPS, ["b2"]).map((o) => o.label)).toEqual(["Pocket · Rs 5", "Overlock · Rs 3.5"]);
    expect(operationOptionsFor(OPS, ["c3"]).map((o) => o.value)).toEqual(["c3", "a1", "b2"]);
  });

  it("works out the wage and says what is missing", () => {
    const form = { workerId: "w", cut: "cut:c1", operationId: "a1", pieces: "40", rate: "3.5", payType: "piece" };
    expect(khataEntryAmount(form)).toBe(140);
    expect(khataEntryProblem(form)).toBe("");
    expect(khataEntryProblem({ ...form, cut: "" })).toBe("Choose the cut.");
    expect(khataEntryProblem({ ...form, pieces: "0" })).toBe("Pieces must be more than 0.");
    expect(khataEntryProblem({ ...form, payType: "fixed", amount: "" })).toBe("Type the fixed amount.");
    expect(khataEntryAmount({ ...form, payType: "fixed", amount: "500" })).toBe(500);
  });

  it("sends the cut or the invoice it was done on", () => {
    const base = { workerId: "w", operationId: "a1", pieces: "40", rate: "3.5", payType: "piece", date: "2026-11-19" };
    expect(toKhataEntryPayload({ ...base, cut: "cut:c1", note: " ok " })).toEqual({
      workerId: "w",
      operationId: "a1",
      cutId: "c1",
      pieces: 40,
      payType: "piece",
      rate: 3.5,
      date: "2026-11-19",
      note: "ok",
    });
    const fixed = toKhataEntryPayload({ ...base, cut: "lot:l1", payType: "fixed", amount: "500" });
    expect(fixed).toMatchObject({ lotId: "l1", payType: "fixed", amount: 500 });
    expect(fixed).not.toHaveProperty("rate");
  });
});

describe("worker khata sections", () => {
  it("shows the unpaid work first, then each payment with the work it paid", () => {
    const entries = [
      { _id: "e1", amount: 100 },
      { _id: "e2", amount: 50.5, paymentId: "p1" },
      { _id: "e3", amount: 20, paymentId: "gone" },
    ];
    const sections = khataSections(entries, [{ _id: "p1", kind: "lock", amount: 50.5 }]);
    expect(sections.map((s) => [s.kind, s.entries.map((e) => e._id), s.amount])).toEqual([
      ["unpaid", ["e1"], 100],
      ["lock", ["e2"], 50.5],
      ["paid", ["e3"], 20],
    ]);
  });
});

describe("workers' usual operations", () => {
  it("keeps the chosen order and drops deleted operations", () => {
    expect(usualOperations({ operationIds: ["b2", "zz", "a1"] }, OPS).map((op) => op.name)).toEqual([
      "Pocket",
      "Overlock",
    ]);
    expect(usualOperations({}, OPS)).toEqual([]);
  });

  it("carries them on the worker form", () => {
    expect(workerFormFrom({ _id: "w", name: "Rashid", operationIds: ["a1"] }).operationIds).toEqual(["a1"]);
    expect(workerFormFrom(null).operationIds).toEqual([]);
  });
});

describe("articles without prices (client, 2026-11-19)", () => {
  it("saves an article with no purchase or sale price", () => {
    const product = { name: "Baggy Pent", category: "Pants", remaining: "10" };
    expect(validateProductInput(product)).toBeNull();
    expect(toProductPayload(product)).toEqual({ name: "Baggy Pent", category: "Pants", remaining: 10 });
    expect(productSchema.parse(toProductPayload(product))).toMatchObject({ purchasePrice: 0, salePrice: 0 });
  });

  it("still needs the name, and an edit leaves a stored price alone", () => {
    expect(validateProductInput({ name: " ", category: "Pants", remaining: "1" })).toBe(
      "Please enter the article name."
    );
    expect(validateProductInput({ name: "Cargo", category: "", remaining: "0" })).toBe("Please choose the category.");
    expect(categoryOf(["Pants", "Shirts"], " pants ")).toBe("Pants");
    expect(categoryOf(["Pants"], "Cargo")).toBeUndefined();
    expect(toProductUpdatePayload({ name: "Baggy Pent", category: "Pants" })).toEqual({
      name: "Baggy Pent",
      category: "Pants",
    });
  });
});

describe("rate on an invoice", () => {
  const lotOperations = [{ operationId: "a1", rate: 5 }];
  it("takes the invoice's rate card, else the operation's own rate", () => {
    expect(khataRateFor("a1", { operations: OPS, lotOperations })).toBe("5");
    expect(khataRateFor("b2", { operations: OPS, lotOperations })).toBe("5");
    expect(khataRateFor("a1", { operations: OPS })).toBe("3.5");
    expect(khataRateFor("zz", { operations: OPS })).toBe("");
  });

  it("keeps a rate typed by hand", () => {
    const form = { operationId: "a1", rate: "4", rateEdited: false };
    expect(withSuggestedRate(form, { operations: OPS, lotOperations }).rate).toBe("5");
    expect(withSuggestedRate({ ...form, rateEdited: true }, { operations: OPS, lotOperations }).rate).toBe("4");
  });
});

describe("advance cut at a lock", () => {
  it("can't cut more than the advance left or the work", () => {
    expect(lockCutProblem(0, { work: 5000, advanceLeft: 0 })).toBe("");
    expect(lockCutProblem(1000, { work: 5000, advanceLeft: 3000 })).toBe("");
    expect(lockCutProblem(1000, { work: 5000, advanceLeft: 0 })).toBe("This worker has no advance left to cut.");
    expect(lockCutProblem(4000, { work: 5000, advanceLeft: 3000 })).toBe("Only Rs 3,000 of advance is left to cut.");
    expect(lockCutProblem(800, { work: 500, advanceLeft: 3000 })).toBe(
      "The advance cut can't be more than the work (Rs 500)."
    );
    expect(lockCash(5000, 1000)).toBe(4000);
  });

  it("the Wages page: work 5000, 1000 of it cut from the advance, 4000 in hand — nothing left to pay", () => {
    const w = { workerId: "w1", workerName: "Rashid" };
    const entries = [
      { ...w, amount: 3000, pieces: 1, paymentId: "p1", paymentKind: "lock" },
      { ...w, amount: 2000, pieces: 1, paymentId: "p1", paymentKind: "lock" },
    ];
    const adjustments = [{ ...w, type: "recovery", amount: 1000, paymentId: "p1" }];
    const payments = [{ ...w, _id: "p1", kind: "lock", amount: 4000, workAmount: 5000, advanceCut: 1000 }];
    const [row] = summarizeWages(entries, adjustments, payments).workers;
    expect([row.amount, row.recoveries, row.net, row.paid, row.due].join()).toBe("5000,1000,4000,4000,0");
  });
});
