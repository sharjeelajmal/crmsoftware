/**
 * Workers & wages (Phase 6) — pure, client-safe rules.
 *
 * Every stitching operation has a per-piece rate (e.g. 70 Rs per pant = 3.5 + 4 + …). Work is assigned
 * per lot: operation → worker(s) → pieces. The rate is copied onto each work entry when it is saved, so
 * changing an operation's rate later never rewrites old wages. Wages are summed per worker per period.
 */

/** Money rounded to 2 decimals (rates like 3.5 are common). */
export const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const rupeesOf = (value) => `Rs ${round2(value).toLocaleString("en-US")}`;

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

/**
 * Types the "Advance / Deduction" popup records. Leave and absent days come from the attendance register
 * (src/constants/attendance.js); old "leave" entries still count.
 */
export const MANUAL_ADJUSTMENT_TYPES = Object.freeze(["advance", "recovery", "deduction", "bonus"]);

/** What an adjustment does to the period's net pay: −1 cut, +1 added, 0 nothing (an advance only fills the account). */
export const PAY_EFFECT = Object.freeze({ leave: -1, absent: -1, advance: 0, recovery: -1, deduction: -1, bonus: 1 });

/** Adjustment types that make up the advance account. */
export const ADVANCE_TYPES = Object.freeze(["advance", "recovery"]);

/** Leave cut: days off × the worker's per-day salary (half days allowed). */
export const leaveAmount = (days, rate) => round2((Number(days) || 0) * (Number(rate) || 0));

/** Wage for a work entry. */
export const entryAmount = (pieces, rate) => round2((Math.trunc(Number(pieces)) || 0) * (Number(rate) || 0));

/**
 * How a worker is paid for a piece of work on an invoice (client, 2026-11-06: "unki payments method"):
 * `piece` = pieces × rate (the normal way); `fixed` = an agreed amount for the job (theka / dihari), typed in.
 * Entries saved before pay types existed are `piece`.
 */
export const PAY_TYPES = Object.freeze(["piece", "fixed"]);

export const PAY_TYPE_LABELS = Object.freeze({ piece: "Per piece", fixed: "Fixed amount" });

export const payTypeOf = (entry) => (entry?.payType === "fixed" ? "fixed" : "piece");

/** Wage of one worker row: pieces × rate, or the fixed amount. */
export const rowAmount = ({ payType, pieces, rate, amount }) =>
  payType === "fixed" ? round2(amount) : entryAmount(pieces, rate);

/** Rate per piece a fixed amount works out to (kept on the entry so per-piece labour stays comparable). */
export const effectiveRate = (amount, pieces) => {
  const qty = Math.trunc(Number(pieces)) || 0;
  return qty > 0 ? round2((Number(amount) || 0) / qty) : 0;
};

/** "40 pcs × Rs 3.5" or "40 pcs · Fixed Rs 2,000". */
export const payLabel = (entry) =>
  payTypeOf(entry) === "fixed"
    ? `${entry.pieces} pcs · Fixed ${rupeesOf(entry.amount)}`
    : `${entry.pieces} pcs × Rs ${Number(entry.rate) || 0}`;

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

// ---- Work sheet: every operation of an invoice assigned in one go ---------------------------------------------

const blankAmount = (value) => value === "" || value === null || value === undefined;

/** The rows of a sheet operation that will be saved: the ones with a worker picked. */
export const filledRows = (operation) => (operation?.rows || []).filter((row) => row.workerId);

/**
 * Why a work sheet (`{ operations: [{ name, rate, rows: [{ workerId, pieces, payType, amount }] }] }`) cannot be saved,
 * or "". Rows without a worker are left out; at least one row must have one.
 */
export const workSheetProblem = ({ operations = [] } = {}) => {
  const used = operations.filter((operation) => filledRows(operation).length > 0);
  if (used.length === 0) return "Pick a worker for at least one operation.";
  for (const operation of used) {
    const rows = filledRows(operation);
    const name = operation.name || "an operation";
    if (rows.some((row) => row.payType !== "fixed") && !(Number(operation.rate) >= 0 && operation.rate !== ""))
      return `${name}: rate must be 0 or more.`;
    if (new Set(rows.map((row) => row.workerId)).size !== rows.length) return `${name}: a worker can only appear once.`;
    if (rows.some((row) => !(Math.trunc(Number(row.pieces)) > 0))) return `${name}: pieces must be more than 0.`;
    if (rows.some((row) => row.payType === "fixed" && (blankAmount(row.amount) || !(Number(row.amount) >= 0))))
      return `${name}: type the fixed amount.`;
  }
  return "";
};

/** Live totals of a work sheet: distinct workers, operations used, rows, amount. */
export const workSheetTotals = ({ operations = [] } = {}) => {
  const workers = new Set();
  let used = 0;
  let rows = 0;
  let amount = 0;
  for (const operation of operations) {
    const filled = filledRows(operation);
    if (filled.length) used += 1;
    for (const row of filled) {
      workers.add(row.workerId);
      rows += 1;
      amount = round2(amount + rowAmount({ ...row, rate: operation.rate }));
    }
  }
  return { workers: workers.size, operations: used, rows, amount };
};

// ---- Category team: last time's workers fill the next invoice of the same category -----------------------------
// Client (Rashid, 2026-11-06): once the workers of a Simple Pent are assigned, the next Simple Pent invoice should
// come with them. Each save of a work sheet (with "remember") stores, per operation, who did it and in what share
// (`weight` = their pieces) and how they were paid; the next sheet of that category opens with those rows filled in,
// the pieces left split in the same proportion. The admin still checks and saves; nothing is paid automatically.

/** Splits `total` pieces in proportion to `weights` (largest remainder); equal weights split evenly. */
export const splitByWeight = (total, weights = []) => {
  const pieces = Math.max(0, Math.trunc(Number(total)) || 0);
  const w = weights.map((value) => Math.max(0, Number(value) || 0));
  const sum = w.reduce((a, b) => a + b, 0);
  if (w.length === 0) return [];
  if (sum === 0) return splitEvenly(pieces, w.length);
  const exact = w.map((value) => (pieces * value) / sum);
  const shares = exact.map(Math.floor);
  let left = pieces - shares.reduce((a, b) => a + b, 0);
  const order = exact.map((value, i) => [value - shares[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of order) {
    if (left <= 0) break;
    shares[i] += 1;
    left -= 1;
  }
  return shares;
};

/** Team items from the operations of a saved sheet (the validated POST body). */
export const teamFromSheet = (operations = []) =>
  operations.map((op) => ({
    operationId: String(op.operationId),
    rows: op.rows.map((row) => ({
      workerId: String(row.workerId),
      weight: Math.trunc(Number(row.pieces)) || 0,
      payType: row.payType === "fixed" ? "fixed" : "piece",
      ...(row.payType === "fixed" ? { amount: round2(row.amount) } : {}),
    })),
  }));

/** The category team after a save: the saved operations replace theirs, the other operations keep their team. */
export const mergeTeam = (previous = [], saved = []) => {
  const savedIds = new Set(saved.map((item) => String(item.operationId)));
  return [...previous.filter((item) => !savedIds.has(String(item.operationId))), ...saved];
};

/**
 * Sheet rows for one operation from its team item: the workers who are still active, with `left` pieces split by
 * their weights (a fixed amount comes back as it was). Null when none of them can work any more.
 */
export const teamRowsFor = (item, left, activeIds) => {
  const rows = (item?.rows || []).filter((row) => !activeIds || activeIds.has(String(row.workerId)));
  if (rows.length === 0) return null;
  const pieces = splitByWeight(
    left,
    rows.map((row) => row.weight)
  );
  return rows.map((row, i) => ({
    workerId: String(row.workerId),
    pieces: pieces[i] > 0 ? String(pieces[i]) : "",
    payType: row.payType === "fixed" ? "fixed" : "piece",
    amount: row.payType === "fixed" ? String(round2(row.amount)) : "",
  }));
};

// ---- Work history (who worked on which invoice, how they were paid) -------------------------------------------

const pushUnique = (list, value) => {
  if (value && !list.includes(value)) list.push(value);
};

/** Work entries per worker (one invoice, or a period): operations, pieces, amount and pay types. Most paid first. */
export const workByWorker = (entries = []) => {
  const byWorker = new Map();
  for (const entry of entries) {
    const key = String(entry.workerId);
    if (!byWorker.has(key)) {
      byWorker.set(key, {
        workerId: key,
        workerName: entry.workerName || "",
        operations: [],
        payTypes: [],
        pieces: 0,
        amount: 0,
        entries: [],
      });
    }
    const row = byWorker.get(key);
    pushUnique(row.operations, entry.operationName);
    pushUnique(row.payTypes, payTypeOf(entry));
    row.pieces += Math.trunc(Number(entry.pieces)) || 0;
    row.amount = round2(row.amount + (Number(entry.amount) || 0));
    row.entries.push(entry);
  }
  return [...byWorker.values()].sort((a, b) => b.amount - a.amount || a.workerName.localeCompare(b.workerName));
};

/**
 * Work entries per invoice: how many workers and operations, labour, pay types, last work date, and the workers
 * (see workByWorker). Latest work first.
 */
export const workByInvoice = (entries = []) => {
  const byLot = new Map();
  for (const entry of entries) {
    const key = String(entry.lotId);
    if (!byLot.has(key)) {
      byLot.set(key, { lotId: key, lotNumber: entry.lotNumber || "", productName: entry.productName || "", list: [] });
    }
    byLot.get(key).list.push(entry);
  }
  return [...byLot.values()]
    .map(({ list, ...lot }) => {
      const workers = workByWorker(list);
      const payTypes = [];
      for (const entry of list) pushUnique(payTypes, payTypeOf(entry));
      return {
        ...lot,
        workers,
        workerCount: workers.length,
        operationCount: new Set(list.map((entry) => entry.operationName || String(entry.operationId))).size,
        amount: round2(list.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)),
        payTypes,
        lastDate: list.reduce(
          (latest, entry) => (new Date(entry.date) > new Date(latest) ? entry.date : latest),
          list[0].date
        ),
      };
    })
    .sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
};

/**
 * Each save of work on an invoice ("history"): when, by whom, workers, operations, amount. Entries saved together
 * share a `batchId`; older ones are grouped by their save time. Newest first.
 */
export const workBatches = (entries = []) => {
  const batches = new Map();
  for (const entry of entries) {
    const key = entry.batchId ? String(entry.batchId) : `at:${new Date(entry.createdAt ?? entry.date).toISOString()}`;
    if (!batches.has(key)) {
      batches.set(key, { key, savedAt: entry.createdAt ?? entry.date, by: entry.by?.name || "", entries: [] });
    }
    batches.get(key).entries.push(entry);
  }
  return [...batches.values()]
    .map((batch) => ({
      ...batch,
      workers: new Set(batch.entries.map((entry) => String(entry.workerId))).size,
      operations: new Set(batch.entries.map((entry) => String(entry.operationId))).size,
      amount: round2(batch.entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)),
    }))
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
};

/**
 * Per-worker wage summary for a period: pieces, amount, leave and absent (days + cut), advances given, advance cuts,
 * deductions, bonuses and the net payable (= wages + bonuses − leave − absent − advance cuts − deductions). Advances
 * given are reported but not subtracted: they only change the advance account until an advance cut is recorded.
 * `entries` are work entries, `adjustments` are wage adjustments of the same period plus the attendance marks as
 * adjustments ("leave" / "absent", see attendanceAdjustments).
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
        absentDays: 0,
        absents: 0,
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
    } else if (adj.type === "absent") {
      row.absents = round2(row.absents + amount);
      row.absentDays = round2(row.absentDays + (Number(adj.days) || 0));
    } else if (adj.type === "advance") row.advances = round2(row.advances + amount);
    else if (adj.type === "recovery") row.recoveries = round2(row.recoveries + amount);
    else if (adj.type === "deduction") row.deductions = round2(row.deductions + amount);
    else if (adj.type === "bonus") row.bonuses = round2(row.bonuses + amount);
  }
  const workers = [...byWorker.values()]
    .map((row) => ({
      ...row,
      net: round2(row.amount + row.bonuses - row.leaves - row.absents - row.recoveries - row.deductions),
    }))
    .sort((a, b) => a.workerName.localeCompare(b.workerName));
  const totals = workers.reduce(
    (sum, row) => ({
      workers: sum.workers + 1,
      pieces: sum.pieces + row.pieces,
      amount: round2(sum.amount + row.amount),
      leaveDays: round2(sum.leaveDays + row.leaveDays),
      leaves: round2(sum.leaves + row.leaves),
      absentDays: round2(sum.absentDays + row.absentDays),
      absents: round2(sum.absents + row.absents),
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
      absentDays: 0,
      absents: 0,
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

/** Why an advance cut of `amount` can't be recorded against `balance` outstanding, or "" when it can. */
export const recoveryProblem = (amount, balance) => {
  const left = round2(balance);
  if (!(left > 0)) return "This worker has no advance left to cut.";
  if (round2(amount) > left) return `Only ${rupeesOf(left)} of advance is left to cut.`;
  return "";
};

/** Why an advance can't be deleted (part of it was already cut), or "" when it can. */
export const advanceDeleteProblem = (balance, amount) =>
  round2(balance) - round2(amount) < 0
    ? `${rupeesOf(round2(amount) - round2(balance))} of this advance was already cut. Delete those advance cuts first.`
    : "";
