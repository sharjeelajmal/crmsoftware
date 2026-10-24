/**
 * Workers & wages (Phase 6) — pure, client-safe rules.
 *
 * Every stitching operation has a per-piece rate (e.g. 70 Rs per pant = 3.5 + 4 + …). Work is assigned
 * per lot: operation → worker(s) → pieces. The rate is copied onto each work entry when it is saved, so
 * changing an operation's rate later never rewrites old wages. Wages are summed per worker per period.
 */

/** Money rounded to 2 decimals (rates like 3.5 are common). */
export const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const WAGE_PERIODS = Object.freeze([
  { value: "today", label: "Today" },
  { value: "thisweek", label: "This Week" },
  { value: "lastweek", label: "Last Week" },
  { value: "last15days", label: "15 Days" },
  { value: "monthly", label: "This Month" },
]);

export const DEFAULT_WAGE_PERIOD = "thisweek";

/**
 * Wage adjustments.
 * - `leave`: days off, cut at the worker's per-day salary (days × rate).
 * - `advance`: money given ahead of pay. It goes into the worker's advance account (khata) and is never cut from a
 *   salary by itself (client, 2026-10-24: "jab hum minus karein tab hi minus ho").
 * - `recovery` ("Advance cut"): the part of the outstanding advance cut from a salary, whenever the admin decides
 *   (after 8 days, 10 days, a month…). Never more than what is still outstanding; the rest stays in the account.
 * - `deduction`: one-time cut (e.g. damaged pieces). `bonus`: added.
 */
export const ADJUSTMENT_TYPES = Object.freeze(["leave", "advance", "recovery", "deduction", "bonus"]);

export const ADJUSTMENT_LABELS = Object.freeze({
  leave: "Leave",
  advance: "Advance",
  recovery: "Advance cut",
  deduction: "Deduction",
  bonus: "Bonus",
});

/** What an adjustment does to the period's net pay: −1 cut, +1 added, 0 nothing (an advance only fills the account). */
export const PAY_EFFECT = Object.freeze({ leave: -1, advance: 0, recovery: -1, deduction: -1, bonus: 1 });

/** Adjustment types that make up the advance account. */
export const ADVANCE_TYPES = Object.freeze(["advance", "recovery"]);

/** Leave cut: days off × the worker's per-day salary (half days allowed). */
export const leaveAmount = (days, rate) => round2((Number(days) || 0) * (Number(rate) || 0));

/** Wage for a work entry. */
export const entryAmount = (pieces, rate) => round2((Math.trunc(Number(pieces)) || 0) * (Number(rate) || 0));

/** Labour cost of one finished piece = sum of all active operation rates. */
export const perPieceLabour = (operations = []) =>
  round2(operations.filter((op) => op?.active !== false).reduce((sum, op) => sum + (Number(op.rate) || 0), 0));

/** Splits `total` pieces evenly over `count` workers; the first rows get the remainder. */
export const splitEvenly = (total, count) => {
  const pieces = Math.max(0, Math.trunc(Number(total)) || 0);
  const n = Math.max(0, Math.trunc(Number(count)) || 0);
  if (n === 0) return [];
  const base = Math.floor(pieces / n);
  const extra = pieces - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
};

/** Pieces available for stitching work on a lot: what reached stitching, else what was cut. */
export const workPiecesOf = (lot) => {
  const stitched = Number(lot?.stitchedQty);
  if (Number.isFinite(stitched) && lot?.stitchedQty !== null && lot?.stitchedQty !== undefined) return stitched;
  return Number(lot?.cutQty) || 0;
};

/** Totals of a lot's work entries: amount, pieces per operation, labour per piece actually paid. */
export const lotWorkTotals = (entries = [], lot) => {
  const amount = round2(entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0));
  const byOperation = {};
  for (const entry of entries) {
    const key = entry.operationName || entry.operationId;
    byOperation[key] = (byOperation[key] || 0) + (Math.trunc(Number(entry.pieces)) || 0);
  }
  const pieces = workPiecesOf(lot);
  return { amount, byOperation, perPiece: pieces > 0 ? round2(amount / pieces) : 0, entries: entries.length };
};

/** Why a work assignment cannot be saved yet, or "" when it is valid. */
export const assignmentProblem = ({ operationId, rate, rows = [] }) => {
  if (!operationId) return "Please choose an operation.";
  if (!(Number(rate) >= 0)) return "Rate must be 0 or more.";
  if (rows.length === 0) return "Add at least one worker.";
  if (rows.some((row) => !row.workerId)) return "Every row needs a worker.";
  if (new Set(rows.map((row) => row.workerId)).size !== rows.length) return "A worker can only appear once.";
  if (rows.some((row) => !(Math.trunc(Number(row.pieces)) > 0))) return "Pieces must be more than 0 for every worker.";
  return "";
};

/**
 * Per-worker wage summary for a period: pieces, amount, leave (days + cut), advances given, advance cuts, deductions,
 * bonuses and the net payable (= wages + bonuses − leave − advance cuts − deductions). Advances given are reported
 * but not subtracted: they only change the advance account until an advance cut is recorded.
 * `entries` are work entries, `adjustments` are wage adjustments of the same period.
 */
export const summarizeWages = (entries = [], adjustments = []) => {
  const byWorker = new Map();
  const bucket = (id, name) => {
    const key = String(id);
    if (!byWorker.has(key)) {
      byWorker.set(key, {
        workerId: key,
        workerName: name || "",
        entries: 0,
        pieces: 0,
        amount: 0,
        leaveDays: 0,
        leaves: 0,
        advances: 0,
        recoveries: 0,
        deductions: 0,
        bonuses: 0,
        net: 0,
      });
    }
    const row = byWorker.get(key);
    if (!row.workerName && name) row.workerName = name;
    return row;
  };
  for (const entry of entries) {
    const row = bucket(entry.workerId, entry.workerName);
    row.entries += 1;
    row.pieces += Math.trunc(Number(entry.pieces)) || 0;
    row.amount = round2(row.amount + (Number(entry.amount) || 0));
  }
  for (const adj of adjustments) {
    const row = bucket(adj.workerId, adj.workerName);
    const amount = Number(adj.amount) || 0;
    if (adj.type === "leave") {
      row.leaves = round2(row.leaves + amount);
      row.leaveDays = round2(row.leaveDays + (Number(adj.days) || 0));
    } else if (adj.type === "advance") row.advances = round2(row.advances + amount);
    else if (adj.type === "recovery") row.recoveries = round2(row.recoveries + amount);
    else if (adj.type === "deduction") row.deductions = round2(row.deductions + amount);
    else if (adj.type === "bonus") row.bonuses = round2(row.bonuses + amount);
  }
  const workers = [...byWorker.values()]
    .map((row) => ({ ...row, net: round2(row.amount + row.bonuses - row.leaves - row.recoveries - row.deductions) }))
    .sort((a, b) => a.workerName.localeCompare(b.workerName));
  const totals = workers.reduce(
    (sum, row) => ({
      workers: sum.workers + 1,
      pieces: sum.pieces + row.pieces,
      amount: round2(sum.amount + row.amount),
      leaveDays: round2(sum.leaveDays + row.leaveDays),
      leaves: round2(sum.leaves + row.leaves),
      advances: round2(sum.advances + row.advances),
      recoveries: round2(sum.recoveries + row.recoveries),
      deductions: round2(sum.deductions + row.deductions),
      bonuses: round2(sum.bonuses + row.bonuses),
      net: round2(sum.net + row.net),
    }),
    {
      workers: 0,
      pieces: 0,
      amount: 0,
      leaveDays: 0,
      leaves: 0,
      advances: 0,
      recoveries: 0,
      deductions: 0,
      bonuses: 0,
      net: 0,
    }
  );
  return { workers, totals };
};

// ---- Advance account (khata) -------------------------------------------------

const byDateThenCreated = (a, b) =>
  new Date(a.date) - new Date(b.date) || new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0);

/**
 * One worker's advance account from their advance / advance-cut entries (any order): totals given and cut, what is
 * left, and every entry oldest first with the balance after it ("itne iske minus ho gaye, itne reh gaye").
 */
export const advanceAccount = (adjustments = []) => {
  let given = 0;
  let recovered = 0;
  const history = adjustments
    .filter((adj) => ADVANCE_TYPES.includes(adj.type))
    .sort(byDateThenCreated)
    .map((adj) => {
      const amount = Number(adj.amount) || 0;
      if (adj.type === "advance") given = round2(given + amount);
      else recovered = round2(recovered + amount);
      return { ...adj, balance: round2(given - recovered) };
    });
  return { given, recovered, balance: round2(given - recovered), history };
};

/** Advance accounts per worker (only workers who ever got an advance), most outstanding first. */
export const advanceAccounts = (adjustments = []) => {
  const byWorker = new Map();
  for (const adj of adjustments) {
    if (!ADVANCE_TYPES.includes(adj.type)) continue;
    const key = String(adj.workerId);
    if (!byWorker.has(key)) byWorker.set(key, { workerId: key, workerName: adj.workerName || "", rows: [] });
    byWorker.get(key).rows.push(adj);
  }
  const accounts = [...byWorker.values()]
    .map(({ rows, ...worker }) => ({ ...worker, ...advanceAccount(rows) }))
    .filter((account) => account.given > 0)
    .sort((a, b) => b.balance - a.balance || a.workerName.localeCompare(b.workerName));
  const totals = accounts.reduce(
    (sum, a) => ({
      workers: sum.workers + (a.balance > 0 ? 1 : 0),
      given: round2(sum.given + a.given),
      recovered: round2(sum.recovered + a.recovered),
      balance: round2(sum.balance + a.balance),
    }),
    { workers: 0, given: 0, recovered: 0, balance: 0 }
  );
  return { accounts, totals };
};

const rupees = (value) => `Rs ${round2(value).toLocaleString("en-US")}`;

/** Why an advance cut of `amount` can't be recorded against `balance` outstanding, or "" when it can. */
export const recoveryProblem = (amount, balance) => {
  const left = round2(balance);
  if (!(left > 0)) return "This worker has no advance left to cut.";
  if (round2(amount) > left) return `Only ${rupees(left)} of advance is left to cut.`;
  return "";
};

/** Why an advance can't be deleted (part of it was already cut), or "" when it can. */
export const advanceDeleteProblem = (balance, amount) =>
  round2(balance) - round2(amount) < 0
    ? `${rupees(round2(amount) - round2(balance))} of this advance was already cut. Delete those advance cuts first.`
    : "";
