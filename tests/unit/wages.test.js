import { describe, expect, it } from "vitest";
import {
  advanceAccount,
  advanceAccounts,
  advanceDeleteProblem,
  effectiveRate,
  entryAmount,
  leaveAmount,
  lotWorkTotals,
  payLabel,
  perPieceLabour,
  recoveryProblem,
  splitEvenly,
  summarizeWages,
  mergeTeam,
  splitByWeight,
  teamFromSheet,
  teamRowsFor,
  workBatches,
  workByInvoice,
  workByWorker,
  workPiecesOf,
  workSheetProblem,
  workSheetTotals,
} from "@/constants/wages";
import {
  clearWorkers,
  emptyWorkSheet,
  fillWorker,
  splitOperation,
  toWorkSheetPayload,
  workerWorkLine,
} from "@/features/wages/utils";
import { buildWageAdjustment, buildWorkEntry, workEntryEditOps } from "@/lib/wages";
import { operationSchema, workAssignmentSchema, workerSchema, wageAdjustmentSchema } from "@/lib/validation";
import { dateRangeFromFilter } from "@/lib/dates";

const session = { sub: "u1", name: "Admin" };

describe("wage maths", () => {
  it("multiplies pieces by rate with 2-decimal rounding", () => {
    expect(entryAmount(240, 3.5)).toBe(840);
    expect(entryAmount("240", "4")).toBe(960);
    expect(entryAmount(3, 0.333)).toBe(1);
    expect(entryAmount(0, 10)).toBe(0);
  });

  it("sums active operation rates into the labour cost per piece", () => {
    const ops = [{ rate: 3.5 }, { rate: 4 }, { rate: 62.5 }, { rate: 100, active: false }];
    expect(perPieceLabour(ops)).toBe(70);
    expect(perPieceLabour([])).toBe(0);
  });

  it("splits pieces evenly, remainder to the first workers", () => {
    expect(splitEvenly(240, 3)).toEqual([80, 80, 80]);
    expect(splitEvenly(241, 3)).toEqual([81, 80, 80]);
    expect(splitEvenly(5, 0)).toEqual([]);
    expect(splitEvenly(-5, 2)).toEqual([0, 0]);
  });

  it("uses stitched pieces when known, else cut pieces", () => {
    expect(workPiecesOf({ cutQty: 240, stitchedQty: null })).toBe(240);
    expect(workPiecesOf({ cutQty: 240, stitchedQty: 236 })).toBe(236);
    expect(workPiecesOf(null)).toBe(0);
  });

  it("totals a lot's work and the labour actually paid per piece", () => {
    const entries = [
      { operationName: "Belt", pieces: 240, amount: 840 },
      { operationName: "Pocket", pieces: 120, amount: 480 },
      { operationName: "Pocket", pieces: 120, amount: 480 },
    ];
    const totals = lotWorkTotals(entries, { cutQty: 240 });
    expect(totals).toEqual({ amount: 1800, byOperation: { Belt: 240, Pocket: 240 }, perPiece: 7.5, entries: 3 });
  });

  it("validates a work sheet: only rows with a worker count, fixed pay needs an amount", () => {
    const op = (rows, extra = {}) => ({ name: "Belt", rate: "3.5", rows, ...extra });
    const row = (workerId, pieces, more = {}) => ({
      workerId,
      pieces: String(pieces),
      payType: "piece",
      amount: "",
      ...more,
    });
    expect(workSheetProblem({ operations: [op([row("", 120)])] })).toMatch(/at least one operation/);
    expect(workSheetProblem({ operations: [op([row("w1", 120), row("", 5)])] })).toBe("");
    expect(workSheetProblem({ operations: [op([row("w1", 60), row("w1", 60)])] })).toMatch(
      /Belt: a worker can only appear once/
    );
    expect(workSheetProblem({ operations: [op([row("w1", 0)])] })).toMatch(/Belt: pieces must be more than 0/);
    expect(workSheetProblem({ operations: [op([row("w1", 10)], { rate: "" })] })).toMatch(/Belt: rate/);
    expect(workSheetProblem({ operations: [op([row("w1", 10, { payType: "fixed" })])] })).toMatch(/fixed amount/);
    // a fixed row needs no rate
    expect(
      workSheetProblem({ operations: [op([row("w1", 10, { payType: "fixed", amount: "500" })], { rate: "" })] })
    ).toBe("");
    // the same worker on two operations is fine
    const two = [op([row("w1", 120)]), { ...op([row("w1", 120)]), name: "Pocket" }];
    expect(workSheetProblem({ operations: two })).toBe("");
  });
});

describe("work sheet", () => {
  const offered = [
    { operationId: "o1", name: "Belt", stage: "stitching", rate: 3.5 },
    { operationId: "o2", name: "Pocket", stage: "stitching", rate: 4 },
    { operationId: "o3", name: "Wash", stage: "washing", rate: 2 },
  ];
  const done = [
    { operationId: "o1", pieces: 120 },
    { operationId: "o2", pieces: 20 },
  ];

  it("starts each operation at what is left and fills open ones with one worker", () => {
    const sheet = emptyWorkSheet(offered, done, 120);
    expect(sheet.operations.map((op) => [op.name, op.done, op.left, op.rows[0].pieces, op.rate])).toEqual([
      ["Belt", 120, 0, "", "3.5"],
      ["Pocket", 20, 100, "100", "4"],
      ["Wash", 0, 120, "120", "2"],
    ]);
    const filled = fillWorker(sheet, "w1");
    expect(filled.operations.map((op) => op.rows[0].workerId)).toEqual(["", "w1", "w1"]);
    // an operation that already has a worker keeps it
    const picked = {
      ...sheet,
      operations: sheet.operations.map((op, i) =>
        i === 2 ? { ...op, rows: [{ ...op.rows[0], workerId: "w9" }] } : op
      ),
    };
    expect(fillWorker(picked, "w1").operations[2].rows[0].workerId).toBe("w9");
  });

  it("splits what is left over the rows and totals the sheet", () => {
    const sheet = emptyWorkSheet(offered, done, 120);
    const pocket = splitOperation({
      ...sheet.operations[1],
      rows: [
        ...sheet.operations[1].rows,
        { workerId: "", pieces: "", payType: "piece", amount: "" },
        { workerId: "", pieces: "", payType: "piece", amount: "" },
      ],
    });
    expect(pocket.rows.map((row) => row.pieces)).toEqual(["34", "33", "33"]);
    const ready = {
      ...sheet,
      operations: [
        sheet.operations[0],
        {
          ...pocket,
          rows: [{ ...pocket.rows[0], workerId: "w1" }, { ...pocket.rows[1], workerId: "w2" }, pocket.rows[2]],
        },
        { ...sheet.operations[2], rows: [{ workerId: "w1", pieces: "120", payType: "fixed", amount: "1000" }] },
      ],
    };
    // 34 × 4 + 33 × 4 + 1000 fixed
    expect(workSheetTotals(ready)).toEqual({ workers: 2, operations: 2, rows: 3, amount: 1268 });
    expect(toWorkSheetPayload("lot1", { ...ready, note: "  shift 2 " })).toEqual({
      lotId: "lot1",
      date: ready.date,
      note: "shift 2",
      rememberTeam: true,
      operations: [
        {
          operationId: "o2",
          rate: 4,
          rows: [
            { workerId: "w1", pieces: 34, payType: "piece" },
            { workerId: "w2", pieces: 33, payType: "piece" },
          ],
        },
        { operationId: "o3", rate: 2, rows: [{ workerId: "w1", pieces: 120, payType: "fixed", amount: 1000 }] },
      ],
    });
  });
});

describe("category team (last time's workers fill the next invoice)", () => {
  it("splits pieces in the same proportion as last time", () => {
    expect(splitByWeight(120, [60, 60])).toEqual([60, 60]);
    expect(splitByWeight(100, [60, 30])).toEqual([67, 33]);
    expect(splitByWeight(10, [1, 1, 1])).toEqual([4, 3, 3]);
    expect(splitByWeight(7, [0, 0])).toEqual([4, 3]);
    expect(splitByWeight(5, [])).toEqual([]);
  });

  it("builds the team from a saved sheet and merges it by operation", () => {
    const saved = teamFromSheet([
      {
        operationId: "o1",
        rows: [
          { workerId: "w1", pieces: 60 },
          { workerId: "w2", pieces: 60, payType: "piece" },
        ],
      },
      { operationId: "o2", rows: [{ workerId: "w3", pieces: 120, payType: "fixed", amount: 650 }] },
    ]);
    expect(saved).toEqual([
      {
        operationId: "o1",
        rows: [
          { workerId: "w1", weight: 60, payType: "piece" },
          { workerId: "w2", weight: 60, payType: "piece" },
        ],
      },
      { operationId: "o2", rows: [{ workerId: "w3", weight: 120, payType: "fixed", amount: 650 }] },
    ]);
    const previous = [
      { operationId: "o2", rows: [{ workerId: "w9", weight: 1, payType: "piece" }] },
      { operationId: "o3", rows: [{ workerId: "w4", weight: 1, payType: "piece" }] },
    ];
    // o2 is replaced by this save, o3 (not on this sheet) keeps its team
    expect(
      mergeTeam(previous, saved).map((item) => [item.operationId, item.rows.map((r) => r.workerId).join()])
    ).toEqual([
      ["o3", "w4"],
      ["o1", "w1,w2"],
      ["o2", "w3"],
    ]);
  });

  it("fills a new invoice's sheet: active workers only, pieces left split by weight, done operations untouched", () => {
    const item = {
      operationId: "o1",
      rows: [
        { workerId: "w1", weight: 60, payType: "piece" },
        { workerId: "w2", weight: 30, payType: "piece" },
        { workerId: "w3", weight: 30, payType: "fixed", amount: 500 },
      ],
    };
    expect(teamRowsFor(item, 80, new Set(["w1", "w3"]))).toEqual([
      { workerId: "w1", pieces: "53", payType: "piece", amount: "" },
      { workerId: "w3", pieces: "27", payType: "fixed", amount: "500" },
    ]);
    expect(teamRowsFor(item, 80, new Set(["w9"]))).toBeNull();
    expect(teamRowsFor(undefined, 80, null)).toBeNull();

    const offered = [
      { operationId: "o1", name: "Belt", stage: "stitching", rate: 3.5 },
      { operationId: "o2", name: "Pocket", stage: "stitching", rate: 4 },
      { operationId: "o3", name: "Wash", stage: "washing", rate: 2 },
    ];
    const team = { items: [item, { operationId: "o2", rows: [{ workerId: "w2", weight: 1, payType: "piece" }] }] };
    const sheet = emptyWorkSheet(offered, [{ operationId: "o2", pieces: 100 }], 100, {
      team,
      activeIds: new Set(["w1", "w2", "w3"]),
    });
    expect(sheet.teamFilled).toBe(1); // o2 is already done, o3 has no team
    expect(sheet.rememberTeam).toBe(true);
    expect(sheet.operations[0].rows.map((r) => [r.workerId, r.pieces])).toEqual([
      ["w1", "50"],
      ["w2", "25"],
      ["w3", "25"],
    ]);
    expect(sheet.operations[1].rows).toEqual([{ workerId: "", pieces: "", payType: "piece", amount: "" }]);
    expect(workSheetTotals(sheet)).toEqual({ workers: 3, operations: 1, rows: 3, amount: 762.5 }); // 50×3.5 + 25×3.5 + 500
    const cleared = clearWorkers(sheet);
    expect(cleared.teamFilled).toBe(0);
    expect(cleared.operations[0].rows).toEqual([{ workerId: "", pieces: "100", payType: "piece", amount: "" }]);
  });
});

describe("work history", () => {
  const at = (h) => new Date(2026, 10, 6, h);
  const entries = [
    {
      _id: "e1",
      lotId: "l1",
      lotNumber: "INV-1001",
      productName: "Baggy",
      operationId: "o1",
      operationName: "Belt",
      workerId: "w1",
      workerName: "Akram",
      pieces: 60,
      rate: 3.5,
      amount: 210,
      payType: "piece",
      batchId: "b1",
      date: at(9),
      createdAt: at(9),
      by: { name: "admin" },
    },
    {
      _id: "e2",
      lotId: "l1",
      lotNumber: "INV-1001",
      productName: "Baggy",
      operationId: "o1",
      operationName: "Belt",
      workerId: "w2",
      workerName: "Bilal",
      pieces: 60,
      rate: 3.5,
      amount: 210,
      batchId: "b1",
      date: at(9),
      createdAt: at(9),
      by: { name: "admin" },
    },
    {
      _id: "e3",
      lotId: "l1",
      lotNumber: "INV-1001",
      productName: "Baggy",
      operationId: "o2",
      operationName: "Pocket",
      workerId: "w1",
      workerName: "Akram",
      pieces: 120,
      rate: 8.33,
      amount: 1000,
      payType: "fixed",
      batchId: "b2",
      date: at(15),
      createdAt: at(15),
      by: { name: "manager" },
    },
    {
      _id: "e4",
      lotId: "l2",
      lotNumber: "INV-1002",
      productName: "Simple",
      operationId: "o1",
      operationName: "Belt",
      workerId: "w2",
      workerName: "Bilal",
      pieces: 50,
      rate: 3,
      amount: 150,
      date: at(11),
      createdAt: at(11),
    },
  ];

  it("labels pay and works out the per-piece rate of a fixed amount", () => {
    expect(payLabel(entries[0])).toBe("60 pcs × Rs 3.5");
    expect(payLabel(entries[2])).toBe("120 pcs · Fixed Rs 1,000");
    expect(effectiveRate(1000, 120)).toBe(8.33);
    expect(effectiveRate(500, 0)).toBe(0);
  });

  it("groups by worker, invoice and save", () => {
    const one = entries.filter((e) => e.lotId === "l1");
    expect(workByWorker(one).map((w) => [w.workerName, w.operations, w.pieces, w.amount, w.payTypes])).toEqual([
      ["Akram", ["Belt", "Pocket"], 180, 1210, ["piece", "fixed"]],
      ["Bilal", ["Belt"], 60, 210, ["piece"]],
    ]);
    expect(
      workByInvoice(entries).map((r) => [r.lotNumber, r.workerCount, r.operationCount, r.amount, r.payTypes])
    ).toEqual([
      ["INV-1001", 2, 2, 1420, ["piece", "fixed"]],
      ["INV-1002", 1, 1, 150, ["piece"]],
    ]);
    const [akram, bilal] = workByWorker(one);
    expect(workerWorkLine(akram), "pieces of different operations are not added up").toBe("2 operations: Belt, Pocket");
    expect(workerWorkLine(bilal)).toBe("Belt · 60 pcs");
    // entries saved before batches existed are grouped by their save time
    expect(workBatches(entries).map((b) => [b.by, b.workers, b.operations, b.amount])).toEqual([
      ["manager", 1, 1, 1000],
      ["", 1, 1, 150],
      ["admin", 2, 1, 420],
    ]);
  });
});

describe("summarizeWages", () => {
  it("sums per worker; advance cuts, deductions and bonuses change the net, an advance given does not", () => {
    const entries = [
      { workerId: "w1", workerName: "Akram", pieces: 240, amount: 840 },
      { workerId: "w1", workerName: "Akram", pieces: 100, amount: 400 },
      { workerId: "w2", workerName: "Bilal", pieces: 50, amount: 200 },
    ];
    const adjustments = [
      { workerId: "w1", workerName: "Akram", type: "advance", amount: 500 },
      { workerId: "w1", workerName: "Akram", type: "recovery", amount: 200 },
      { workerId: "w1", workerName: "Akram", type: "deduction", amount: 40 },
      { workerId: "w2", workerName: "Bilal", type: "bonus", amount: 100 },
      { workerId: "w3", workerName: "Chand", type: "advance", amount: 300 },
    ];
    const { workers, totals } = summarizeWages(entries, adjustments);
    expect(workers.map((w) => w.workerName)).toEqual(["Akram", "Bilal", "Chand"]);
    expect(workers[0]).toMatchObject({
      entries: 2,
      pieces: 340,
      amount: 1240,
      advances: 500,
      recoveries: 200,
      deductions: 40,
      net: 1000, // 1240 − 200 cut − 40; the 500 given stays in the advance account
    });
    expect(workers[1]).toMatchObject({ pieces: 50, amount: 200, bonuses: 100, net: 300 });
    expect(workers[2]).toMatchObject({ entries: 0, amount: 0, advances: 300, net: 0 });
    expect(totals).toEqual({
      workers: 3,
      pieces: 390,
      amount: 1440,
      leaveDays: 0,
      leaves: 0,
      absentDays: 0,
      absents: 0,
      advances: 800,
      recoveries: 200,
      deductions: 40,
      bonuses: 100,
      net: 1300,
    });
    expect(summarizeWages([], []).totals.workers).toBe(0);
  });

  it("cuts leave days at the per-day salary", () => {
    const entries = [{ workerId: "w1", workerName: "Akram", pieces: 100, amount: 6000 }];
    const adjustments = [
      { workerId: "w1", workerName: "Akram", type: "leave", days: 1, rate: 1000, amount: 1000 },
      { workerId: "w1", workerName: "Akram", type: "leave", days: 0.5, rate: 1000, amount: 500 },
      { workerId: "w2", workerName: "Bilal", type: "leave", days: 2, rate: 800, amount: 1600 },
    ];
    const { workers, totals } = summarizeWages(entries, adjustments);
    expect(workers[0]).toMatchObject({ amount: 6000, leaveDays: 1.5, leaves: 1500, net: 4500 });
    expect(workers[1]).toMatchObject({ amount: 0, leaveDays: 2, leaves: 1600, net: -1600 });
    expect(totals).toMatchObject({ leaveDays: 3.5, leaves: 3100, net: 2900 });
  });
});

describe("leave entries", () => {
  const worker = { _id: "W1", name: "Akram", dailyRate: 1000 };
  const now = new Date("2026-10-22T08:00:00Z");

  it("multiplies days by the per-day salary", () => {
    expect(leaveAmount(1, 1000)).toBe(1000);
    expect(leaveAmount("0.5", "1000")).toBe(500);
    expect(leaveAmount(2, 0)).toBe(0);
  });

  it("snapshots days and rate; the rate defaults to the worker's per-day salary", () => {
    const fromProfile = buildWageAdjustment({ worker, input: { type: "leave", days: 2 }, session, now });
    expect(fromProfile).toMatchObject({ type: "leave", days: 2, rate: 1000, amount: 2000, workerName: "Akram" });
    const custom = buildWageAdjustment({ worker, input: { type: "leave", days: 0.5, rate: 800 }, session, now });
    expect(custom).toMatchObject({ days: 0.5, rate: 800, amount: 400 });
    const advance = buildWageAdjustment({ worker, input: { type: "advance", amount: 3000 }, session, now });
    expect(advance).toMatchObject({ type: "advance", amount: 3000 });
    expect(advance.days).toBeUndefined();
  });
});

describe("work entry documents", () => {
  const lot = { _id: "L1", lotNumber: "LOT-1001", productName: "Slim Fit Denim" };
  const operation = { _id: "O1", name: "Belt", rate: 3.5 };
  const worker = { _id: "W1", name: "Akram" };
  const now = new Date("2026-10-21T08:00:00Z");

  it("snapshots names and the rate and computes the amount", () => {
    const doc = buildWorkEntry({ lot, operation, worker, pieces: "120", session, now });
    expect(doc).toMatchObject({
      lotNumber: "LOT-1001",
      operationName: "Belt",
      workerName: "Akram",
      pieces: 120,
      rate: 3.5,
      amount: 420,
      date: now,
      by: { id: "u1", name: "Admin" },
    });
    expect(buildWorkEntry({ lot, operation, worker, pieces: 10, rate: 4, session, now }).amount).toBe(40);
  });

  it("recomputes the amount on edit", () => {
    const existing = { pieces: 120, rate: 3.5, amount: 420 };
    expect(workEntryEditOps(existing, { pieces: 100 }, now).$set).toMatchObject({
      pieces: 100,
      rate: 3.5,
      amount: 350,
    });
    expect(workEntryEditOps(existing, { rate: 4, note: "x" }, now).$set).toMatchObject({ amount: 480, note: "x" });
  });

  it("keeps a fixed amount: the rate is what it works out to per piece", () => {
    const doc = buildWorkEntry({
      lot,
      operation,
      worker,
      pieces: 120,
      payType: "fixed",
      amount: 1000,
      batchId: "b1",
      session,
      now,
    });
    expect(doc).toMatchObject({ payType: "fixed", amount: 1000, rate: 8.33, batchId: "b1" });
    expect(buildWorkEntry({ lot, operation, worker, pieces: 10, session, now })).toMatchObject({
      payType: "piece",
      batchId: null,
    });
    const existing = { pieces: 120, rate: 8.33, amount: 1000, payType: "fixed" };
    expect(workEntryEditOps(existing, { pieces: 100 }, now).$set).toMatchObject({
      pieces: 100,
      amount: 1000,
      rate: 10,
    });
    expect(workEntryEditOps(existing, { amount: 1200 }, now).$set).toMatchObject({
      pieces: 120,
      amount: 1200,
      rate: 10,
    });
  });
});

describe("wage schemas and periods", () => {
  const id = "64b000000000000000000001";

  it("fills defaults and rejects bad input", () => {
    expect(workerSchema.parse({ name: "Akram" })).toMatchObject({ type: "stitching", active: true, phone: "" });
    expect(operationSchema.parse({ name: "Belt", rate: "3.5" })).toMatchObject({ rate: 3.5, order: 0, active: true });
    expect(() => operationSchema.parse({ name: "Belt", rate: -1 })).toThrow();
    expect(() => workAssignmentSchema.parse({ lotId: id, operationId: id, rows: [] })).toThrow();
    const twice = [
      { workerId: id, pieces: 1 },
      { workerId: id, pieces: 2 },
    ];
    expect(() => workAssignmentSchema.parse({ lotId: id, operationId: id, rows: twice })).toThrow(/only appear once/);
    const parsed = workAssignmentSchema.parse({ lotId: id, operationId: id, rows: [{ workerId: id, pieces: "12" }] });
    expect(parsed.operations[0].rows[0]).toEqual({ workerId: id, pieces: 12, payType: "piece" });
    const other = "64b000000000000000000002";
    const sheet = workAssignmentSchema.parse({
      lotId: id,
      operations: [
        { operationId: id, rows: [{ workerId: id, pieces: 5 }] },
        { operationId: other, rows: [{ workerId: id, pieces: 5, payType: "fixed", amount: "300" }] },
      ],
    });
    expect(sheet.operations[1].rows[0]).toMatchObject({ payType: "fixed", amount: 300 });
    expect(sheet.rememberTeam, "an API call remembers nothing unless asked").toBe(false);
    const fixedNoAmount = {
      lotId: id,
      operations: [{ operationId: id, rows: [{ workerId: id, pieces: 5, payType: "fixed" }] }],
    };
    expect(() => workAssignmentSchema.parse(fixedNoAmount)).toThrow(/fixed amount/);
    const sameOp = { operationId: id, rows: [{ workerId: id, pieces: 5 }] };
    expect(() => workAssignmentSchema.parse({ lotId: id, operations: [sameOp, sameOp] })).toThrow(
      /operation can only appear once/
    );
    expect(() => workAssignmentSchema.parse({ lotId: id, operations: [] })).toThrow();
    expect(() => wageAdjustmentSchema.parse({ workerId: id, type: "loan", amount: 5 })).toThrow();
    expect(wageAdjustmentSchema.parse({ workerId: id, type: "advance", amount: "500" }).amount).toBe(500);
    expect(() => wageAdjustmentSchema.parse({ workerId: id, type: "advance" })).toThrow(/Amount must be more than 0/);
    expect(wageAdjustmentSchema.parse({ workerId: id, type: "leave", days: "0.5" }).days).toBe(0.5);
    expect(() => wageAdjustmentSchema.parse({ workerId: id, type: "leave" })).toThrow(/Leave days/);
    expect(workerSchema.parse({ name: "Akram", dailyRate: "1000" }).dailyRate).toBe(1000);
    expect(workerSchema.parse({ name: "Akram" }).dailyRate).toBe(0);
  });

  it("knows wage periods: this week (Mon–Sun), last week, 15 days", () => {
    const wed = new Date("2026-10-21T12:00:00"); // Wednesday
    const week = dateRangeFromFilter({ filter: "thisweek" }, wed);
    expect(week.start.getDay()).toBe(1);
    expect(week.start.getDate()).toBe(19);
    expect(week.end.getDate()).toBe(25);
    const last = dateRangeFromFilter({ filter: "lastweek" }, wed);
    expect([last.start.getDate(), last.end.getDate()]).toEqual([12, 18]);
    const fifteen = dateRangeFromFilter({ filter: "last15days" }, wed);
    expect(fifteen.start.getDate()).toBe(7);
  });
});

describe("advance account (khata)", () => {
  const day = (d) => new Date(2026, 9, d);
  const rows = [
    { _id: "a1", workerId: "w1", workerName: "Akram", type: "advance", amount: 5000, date: day(1) },
    { _id: "r1", workerId: "w1", workerName: "Akram", type: "recovery", amount: 1000, date: day(9) },
    { _id: "a2", workerId: "w1", workerName: "Akram", type: "advance", amount: 2000, date: day(12) },
    { _id: "r2", workerId: "w1", workerName: "Akram", type: "recovery", amount: 2500, date: day(20) },
    { _id: "b1", workerId: "w2", workerName: "Bilal", type: "advance", amount: 800, date: day(3) },
    { _id: "b2", workerId: "w2", workerName: "Bilal", type: "recovery", amount: 800, date: day(10) },
    { _id: "x1", workerId: "w2", workerName: "Bilal", type: "bonus", amount: 300, date: day(10) },
  ];

  it("keeps a running balance: given, cut whenever, the rest carries forward", () => {
    const account = advanceAccount([...rows].reverse().filter((r) => r.workerId === "w1"));
    expect(account).toMatchObject({ given: 7000, recovered: 3500, balance: 3500 });
    expect(account.history.map((h) => [h._id, h.balance])).toEqual([
      ["a1", 5000],
      ["r1", 4000],
      ["a2", 6000],
      ["r2", 3500],
    ]);
  });

  it("lists accounts per worker, most outstanding first, with totals", () => {
    const { accounts, totals } = advanceAccounts(rows);
    expect(accounts.map((a) => [a.workerName, a.balance])).toEqual([
      ["Akram", 3500],
      ["Bilal", 0],
    ]);
    expect(totals).toEqual({ workers: 1, given: 7800, recovered: 4300, balance: 3500 });
    expect(advanceAccounts([]).accounts).toEqual([]);
  });

  it("never cuts more than what is left, and keeps an advance that was already cut", () => {
    expect(recoveryProblem(3500, 3500)).toBe("");
    expect(recoveryProblem(1000, 3500)).toBe("");
    expect(recoveryProblem(3600, 3500)).toMatch(/Only Rs 3,500 of advance is left/);
    expect(recoveryProblem(100, 0)).toMatch(/no advance left/);
    expect(advanceDeleteProblem(3500, 2000)).toBe("");
    expect(advanceDeleteProblem(1500, 2000)).toMatch(/Rs 500 of this advance was already cut/);
  });

  it("accepts an advance cut like any amount entry", () => {
    const id = "64b000000000000000000001";
    expect(wageAdjustmentSchema.parse({ workerId: id, type: "recovery", amount: "750" }).amount).toBe(750);
    expect(() => wageAdjustmentSchema.parse({ workerId: id, type: "recovery" })).toThrow(/Amount must be more than 0/);
  });
});
