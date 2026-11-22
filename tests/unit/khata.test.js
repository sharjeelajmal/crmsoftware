import { describe, expect, it } from "vitest";
import { productSchema } from "@/lib/validation";
import {
  baqayaLabel,
  baqayaOf,
  lockCash,
  lockCutProblem,
  lockSettlement,
  overallBalance,
  operationPieces,
  piecesLeftProblem,
  summarizeWages,
  workRefLabel,
  workRefOf,
  workSheetProblem,
} from "@/constants/wages";
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

describe("an operation can't go past its cut's pieces (client, 2026-11-21)", () => {
  // cut 2: 240 pieces; three workers write the back pockets between them
  const entries = [
    { _id: "e1", operationId: "bp", workerId: "w1", workerName: "Rashid", pieces: 100 },
    { _id: "e2", operationId: "bp", workerId: "w2", workerName: "Akram", pieces: 70 },
    { _id: "e3", operationId: "bp", workerId: "w1", workerName: "Rashid", pieces: 20 },
    { _id: "e4", operationId: "ov", workerId: "w3", workerName: "Bilal", pieces: 240 },
  ];

  it("counts every worker's pieces of the operation, most first", () => {
    expect(operationPieces(entries, "bp")).toEqual({
      total: 190,
      byWorker: [
        { workerId: "w1", workerName: "Rashid", pieces: 120 },
        { workerId: "w2", workerName: "Akram", pieces: 70 },
      ],
    });
    expect(operationPieces(entries, "bp", { exceptId: "e3" }).total).toBe(170);
  });

  it("refuses more than is left, naming who wrote what", () => {
    const done = operationPieces(entries, "bp");
    const base = { limit: 240, done, operationName: "Back pocket", label: "INV-1015 · Cut 2" };
    expect(piecesLeftProblem({ ...base, adding: 50 })).toBe("");
    expect(piecesLeftProblem({ ...base, adding: 80 })).toBe(
      "Back pocket on INV-1015 · Cut 2: the cut has 240 pcs and 190 are already entered (Rashid 120, Akram 70) — only 50 left."
    );
    const full = operationPieces(entries, "ov");
    expect(piecesLeftProblem({ ...base, done: full, adding: 1 })).toContain("nothing is left");
    expect(piecesLeftProblem({ ...base, limit: 0, adding: 999 })).toBe(""); // a cut without its pieces checks nothing
  });

  it("knows each cut's limit and name; an invoice shows its cut number", () => {
    expect(workRefOf({ lot: { lotNumber: "INV-1015", bundleNumber: "2", cutQty: 240 } })).toEqual({
      limit: 240,
      label: "INV-1015 · Cut 2",
    });
    expect(workRefOf({ lot: { lotNumber: "INV-1015", cutQty: 240, stitchedQty: 236 } }).limit).toBe(240); // the pieces cut
    expect(workRefOf({ cut: { cutNumber: "20", pieces: 150 } })).toEqual({ limit: 150, label: "Cut 20" });
    expect(workRefLabel({ lotNumber: "INV-1015", cutNumber: "2" })).toBe("INV-1015 · Cut 2");
    expect(workRefLabel({ lotNumber: "INV-1015" })).toBe("INV-1015");
    expect(workRefLabel({ cutNumber: "20" })).toBe("Cut 20");
  });

  it("the work sheet stops at what is left", () => {
    const op = { name: "Back pocket", rate: "7", limit: 240, done: 190 };
    const sheet = (pieces) => ({ operations: [{ ...op, rows: [{ workerId: "w1", pieces, payType: "piece" }] }] });
    expect(workSheetProblem(sheet("50"))).toBe("");
    expect(workSheetProblem(sheet("60"))).toBe("Back pocket: only 50 of 240 pcs left (190 already entered), not 60.");
    expect(workSheetProblem({ operations: [{ ...op, done: 240, rows: [{ workerId: "w1", pieces: "1" }] }] })).toBe(
      "Back pocket: all 240 pcs are already entered."
    );
  });
});

describe("baqaya: what is left between the owner and a worker (client, 2026-11-22)", () => {
  it("adds old balances and what each lock left", () => {
    const balances = [{ amount: 500 }, { amount: -200 }];
    const payments = [
      { kind: "lock", balanceChange: 270 },
      { kind: "lock" }, // an older lock, paid exactly
      { kind: "work", balanceChange: 999 }, // only locks carry a baqaya
    ];
    expect(baqayaOf({ balances, payments })).toBe(570);
    expect(baqayaOf()).toBe(0);
  });

  it("a lock brings the baqaya in, and what is not given stays", () => {
    // work 4,270, nothing from before, 4,000 in hand: 270 still to give
    expect(lockSettlement({ work: 4270, cash: 4000 })).toEqual({ due: 4270, cash: 4000, after: 270, change: 270 });
    // next time: work 1,000 + the 270, all given
    expect(lockSettlement({ work: 1000, baqaya: 270 })).toEqual({ due: 1270, cash: 1270, after: 0, change: -270 });
    // a little extra given: he owes it back
    expect(lockSettlement({ work: 1000, cash: 1100 })).toEqual({ due: 1000, cash: 1100, after: -100, change: -100 });
    // an advance cut comes off before the cash; he owes more than his work: nothing to give
    expect(lockSettlement({ work: 1000, advanceCut: 200, baqaya: -1500 })).toEqual({
      due: -700,
      cash: 0,
      after: -700,
      change: 800,
    });
  });

  it("says who owes whom", () => {
    expect(baqayaLabel(270)).toBe("You owe him Rs 270");
    expect(baqayaLabel(-1300)).toBe("He owes you Rs 1,300");
    expect(baqayaLabel(0)).toBe("Settled");
    expect(overallBalance({ toPay: 1000, baqaya: 270, advanceLeft: 500 })).toBe(770);
    expect(overallBalance({ toPay: 0, baqaya: -100, advanceLeft: 500 })).toBe(-600);
  });
});
