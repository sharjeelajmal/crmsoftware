import { describe, expect, it } from "vitest";
import {
  advanceAccount,
  advanceAccounts,
  advanceDeleteProblem,
  assignmentProblem,
  entryAmount,
  leaveAmount,
  lotWorkTotals,
  perPieceLabour,
  recoveryProblem,
  splitEvenly,
  summarizeWages,
  workPiecesOf,
} from "@/constants/wages";
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

  it("validates an assignment form", () => {
    const ok = { operationId: "a", rate: 3.5, rows: [{ workerId: "w1", pieces: 120 }] };
    expect(assignmentProblem(ok)).toBe("");
    expect(assignmentProblem({ ...ok, operationId: "" })).toMatch(/operation/);
    expect(assignmentProblem({ ...ok, rows: [] })).toMatch(/at least one worker/);
    expect(assignmentProblem({ ...ok, rows: [{ workerId: "", pieces: 1 }] })).toMatch(/needs a worker/);
    const twice = [
      { workerId: "w1", pieces: 1 },
      { workerId: "w1", pieces: 1 },
    ];
    expect(assignmentProblem({ ...ok, rows: twice })).toMatch(/only appear once/);
    expect(assignmentProblem({ ...ok, rows: [{ workerId: "w1", pieces: 0 }] })).toMatch(/more than 0/);
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
    expect(parsed.rows[0].pieces).toBe(12);
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
