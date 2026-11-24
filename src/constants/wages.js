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
 * Why a work sheet (`{ operations: [{ name, rate, limit, done, rows: [{ workerId, pieces, payType, amount }] }] }`)
 * cannot be saved, or "". Rows without a worker are left out; at least one row must have one. An operation's rows may
 * not go past the invoice's pieces cut (`limit`) less what is already entered (`done`; client, 2026-11-21).
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
    const adding = rows.reduce((sum, row) => sum + (Math.trunc(Number(row.pieces)) || 0), 0);
    const limit = Math.trunc(Number(operation.limit)) || 0;
    const done = Math.trunc(Number(operation.done)) || 0;
    if (limit > 0 && done + adding > limit) {
      return done < limit
        ? `${name}: only ${limit - done} of ${limit} pcs left (${done} already entered), not ${adding}.`
        : `${name}: all ${limit} pcs are already entered.`;
    }
    if (rows.some((row) => row.payType === "fixed" && (blankAmount(row.amount) || !(Number(row.amount) >= 0))))
      return `${name}: type the fixed amount.`;
  }
  return "";
};

/** Live totals of a work sheet: distinct workers, operations used, rows, amount, and what is paid on the spot. */
export const workSheetTotals = ({ operations = [] } = {}) => {
  const workers = new Set();
  let used = 0;
  let rows = 0;
  let amount = 0;
  let payingNow = 0;
  for (const operation of operations) {
    const filled = filledRows(operation);
    if (filled.length) used += 1;
    for (const row of filled) {
      workers.add(row.workerId);
      rows += 1;
      const wage = rowAmount({ ...row, rate: operation.rate });
      amount = round2(amount + wage);
      if (row.paid) payingNow = round2(payingNow + wage);
    }
  }
  return { workers: workers.size, operations: used, rows, amount, payingNow };
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

// ---- Paying work: early, right where it is assigned, and the rest with the wages --------------------------------
// Client (Rashid, 2026-11-17): some operations are paid as soon as they are done, from where the work is assigned;
// the rest is paid later with the wages. A wage payment (`wage_payments`) pays one worker:
// - "work": chosen work entries paid early; amount = their wages, dated on their (latest) work day, so it counts in
//   the same wage period as the work (one per worker per work day);
// - "settle": "Pay the rest" for a wage period: what is still to pay (net payable − already paid), covering the
//   period's unpaid entries.
// A work entry is paid while it carries the `paymentId` of its payment (and `paymentKind`); a paid entry can't be
// edited or removed, and an invoice with paid work can't be deleted, until it is marked unpaid again.

export const PAYMENT_KINDS = Object.freeze(["work", "settle", "lock"]);

export const PAYMENT_KIND_LABELS = Object.freeze({
  work: "Paid early",
  settle: "Rest of the period",
  lock: "Paid up to a day",
});

/**
 * Payment kinds whose amount is exactly the wages of the work they pay ("work", "lock"): what they paid counts in a
 * wage period by the date of that work, not of the payment — a lock pays weeks of work at once. A "settle" payment is
 * the rest of one period (adjustments included) and counts by its own date, inside that period.
 */
export const ENTRY_PAID_KINDS = Object.freeze(["work", "lock"]);

export const isPaid = (entry) => Boolean(entry?.paymentId);

/** Why a paid work entry can't be changed, or "". */
export const paidEntryProblem = (entry) => (isPaid(entry) ? "This work was already paid — mark it unpaid first" : "");

/** Wages of a set of work entries (an invoice, an operation, a worker) split into paid and still unpaid. */
export const paidSplit = (entries = []) =>
  entries.reduce(
    (sum, entry) => {
      const amount = Number(entry.amount) || 0;
      return isPaid(entry)
        ? { ...sum, paid: round2(sum.paid + amount) }
        : { ...sum, unpaid: round2(sum.unpaid + amount) };
    },
    { paid: 0, unpaid: 0 }
  );

const localDay = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/**
 * "Work" payments for the chosen entries: one per worker per work day, for the entries not paid yet, with their
 * wages and invoices. One per day keeps every payment in the wage period of the work it pays (a payment counts in a
 * period by its date): "Pay all" over two weeks must not make last week look unpaid and pay it twice.
 */
export const workPaymentsFor = (entries = []) => {
  const groups = new Map();
  for (const entry of entries) {
    if (isPaid(entry)) continue;
    const key = `${entry.workerId}|${localDay(entry.date)}`;
    if (!groups.has(key)) {
      groups.set(key, {
        workerId: String(entry.workerId),
        workerName: entry.workerName || "",
        amount: 0,
        date: entry.date,
        entries: [],
        lotNumbers: [],
      });
    }
    const group = groups.get(key);
    group.amount = round2(group.amount + (Number(entry.amount) || 0));
    group.entries.push(entry);
    pushUnique(group.lotNumbers, entry.lotNumber);
  }
  return [...groups.values()];
};

/** Why "Pay the rest" can't pay a worker's period summary row, or "". */
export const settleProblem = (row) =>
  !(round2(row?.due) > 0) ? `Nothing is left to pay ${row?.workerName || "this worker"} for this period` : "";

/** Day a "Pay the rest" payment is dated: today, or the period's last day when the period is already over. */
export const settleDate = (range, now = new Date()) => (range?.end && range.end < now ? range.end : now);

// ---- Stitching khata (client, 2026-11-19) ------------------------------------------------------------------------
// The owner keeps the stitching khata by hand: each evening a worker tells what he did, and the owner adds it —
// worker, operation (its rate already there), cut, pieces; the wage is worked out at once and each worker's balance
// grows with it. A cut is added in the khata itself (`stitch_cuts`: cut number, article, pieces), or is an invoice.
// "Lock" pays everything a worker has not been paid for up to a day; the khata starts again after it.

/**
 * Where a piece of work was done: "INV-1015 · Cut 2" (an invoice with its cut number), "INV-1015", or "Cut 20" for a
 * cut added in the khata. An invoice entry's `cutNumber` is its invoice's cut number, attached when it is read
 * (attachCutNumbers), so it follows an edit of the invoice.
 */
export const workRefLabel = (entry) => {
  const cut = entry?.cutNumber ? `Cut ${entry.cutNumber}` : "";
  if (!entry?.lotNumber) return cut;
  return cut ? `${entry.lotNumber} · ${cut}` : entry.lotNumber;
};

/**
 * What one piece of each article costs to stitch (client, 2026-11-24: "ek-ek article ka ke saare operation saare
 * workers ke daal ke per piece mujhe kitne ka padta hai"). From the work entered, per article and operation:
 * `rows` = `[{ article, operationId, operationName, amount, pieces, lastDate }]` (one per article × operation). Each
 * operation's rate is what was paid per piece for it (amount ÷ pieces — so fixed pay counts too); the article's cost
 * per piece is the sum of its operations' rates. Articles are matched ignoring case and spaces; most operations first.
 */
export const articleStitchCosts = (rows = []) => {
  const byArticle = new Map();
  for (const row of rows) {
    const name = String(row.article || "").trim();
    if (!name) continue;
    const key = name.toLowerCase().replace(/\s+/g, " ");
    if (!byArticle.has(key)) byArticle.set(key, { article: name, operations: new Map(), lastDate: null });
    const group = byArticle.get(key);
    const opKey = String(row.operationId);
    const op = group.operations.get(opKey) ?? {
      operationId: opKey,
      name: row.operationName || "",
      amount: 0,
      pieces: 0,
    };
    op.amount += Number(row.amount) || 0;
    op.pieces += Math.trunc(Number(row.pieces)) || 0;
    group.operations.set(opKey, op);
    if (row.lastDate && (!group.lastDate || new Date(row.lastDate) > new Date(group.lastDate))) {
      group.lastDate = row.lastDate;
    }
  }
  return [...byArticle.values()]
    .map((group) => {
      const operations = [...group.operations.values()]
        .filter((op) => op.pieces > 0)
        .map((op) => ({
          operationId: op.operationId,
          name: op.name,
          pieces: op.pieces,
          rate: round2(op.amount / op.pieces),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return {
        article: group.article,
        operations,
        perPiece: round2(operations.reduce((sum, op) => sum + op.rate, 0)),
        lastDate: group.lastDate,
      };
    })
    .filter((group) => group.operations.length > 0)
    .sort((a, b) => b.operations.length - a.operations.length || a.article.localeCompare(b.article));
};

/**
 * The pieces a cut or invoice has — each operation's limit (client: "cut 240 piece ki hai", so an invoice's pieces
 * cut, `cutQty`; a khata cut: its pieces, 0 when not given) — and how it is named in messages.
 */
export const workRefOf = ({ lot = null, cut = null } = {}) =>
  lot
    ? {
        limit: Math.trunc(Number(lot.cutQty)) || 0,
        label: workRefLabel({ lotNumber: lot.lotNumber, cutNumber: lot.bundleNumber }),
      }
    : { limit: Math.trunc(Number(cut?.pieces)) || 0, label: cut ? `Cut ${cut.cutNumber}` : "" };

/**
 * Pieces of one operation already entered on a cut or invoice — every worker's, paid or not (`exceptId`: an entry
 * being edited) — in total and per worker, most first: `{ total, byWorker: [{ workerId, workerName, pieces }] }`.
 */
export const operationPieces = (entries = [], operationId, { exceptId = null } = {}) => {
  const byWorker = new Map();
  let total = 0;
  for (const entry of entries) {
    if (String(entry.operationId) !== String(operationId)) continue;
    if (exceptId && String(entry._id) === String(exceptId)) continue;
    const pieces = Math.trunc(Number(entry.pieces)) || 0;
    total += pieces;
    const key = String(entry.workerId);
    const row = byWorker.get(key) ?? { workerId: key, workerName: entry.workerName || "", pieces: 0 };
    row.pieces += pieces;
    byWorker.set(key, row);
  }
  return { total, byWorker: [...byWorker.values()].sort((a, b) => b.pieces - a.pieces) };
};

/**
 * Client, 2026-11-21: an operation can't be entered for more pieces than its cut has, whoever does it (four workers
 * sharing the back pockets of a 240-piece cut write 240 between them, not 300) — and so a cut's work can't be paid
 * twice. Why `adding` more pieces of `operationName` on `label` (a cut of `limit` pieces, `done` from
 * operationPieces) can't be saved, naming who wrote what, or "". No limit (a cut without its pieces) checks nothing.
 */
export const piecesLeftProblem = ({
  limit = 0,
  done = { total: 0, byWorker: [] },
  adding = 0,
  operationName = "",
  label = "",
}) => {
  const cap = Math.trunc(Number(limit)) || 0;
  if (!(cap > 0)) return "";
  const entered = Number(done.total) || 0;
  if (entered + (Math.trunc(Number(adding)) || 0) <= cap) return "";
  const left = Math.max(0, cap - entered);
  const who = done.byWorker.map((w) => `${w.workerName} ${w.pieces}`).join(", ");
  const where = [operationName, label].filter(Boolean).join(" on ");
  return (
    `${where}: the cut has ${cap} pcs and ${entered} are already entered${who ? ` (${who})` : ""} — ` +
    (left > 0 ? `only ${left} left.` : "nothing is left. Check who wrote more pieces.")
  );
};

const endOfLocalDay = (value) => {
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
};

/** What a lock up to `upTo` pays: the worker's unpaid work done on or before that day, and its wages. */
export const lockPreview = (entries = [], upTo = new Date()) => {
  const last = endOfLocalDay(upTo);
  const covered = entries.filter((entry) => !isPaid(entry) && new Date(entry.date) <= last);
  return { entries: covered, amount: round2(covered.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)) };
};

/** Why a lock can't be made, or "". */
export const lockProblem = (preview) =>
  preview.entries.length === 0 ? "Nothing unpaid up to that day — there is nothing to lock" : "";

/**
 * Advance cut at a lock (client, 2026-11-19: the advance is cut as he is paid): why `cut` can't be taken out of a
 * lock of `work` with `advanceLeft` outstanding, or "". The cash given is work − cut (`lockCash`).
 */
export const lockCutProblem = (cut, { work = 0, advanceLeft = 0 } = {}) => {
  const amount = round2(cut);
  if (!(amount > 0)) return "";
  const advance = recoveryProblem(amount, advanceLeft);
  if (advance) return advance;
  return amount > round2(work) ? `The advance cut can't be more than the work (${rupeesOf(work)}).` : "";
};

/** What the worker gets in hand at a lock: the work's wages less the advance cut there. */
export const lockCash = (work, cut = 0) => round2((Number(work) || 0) - (Number(cut) || 0));

// ---- Baqaya: what is left between the owner and a worker (client, 2026-11-22) -------------------------------------
// A signed running balance per worker, beside his work and his advance: + the owner still owes him, − he owes the
// owner (was given extra). It is made of old balances written in from the notebook and of what each lock left:
// the cash handed over can be less than due (no change in hand) or more.

/** A worker's baqaya: his old balances (signed `amount`) plus what each of his locks left (`balanceChange`). */
export const baqayaOf = ({ balances = [], payments = [] } = {}) =>
  round2(
    balances.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) +
      payments.reduce((sum, p) => sum + (p.kind === "lock" ? Number(p.balanceChange) || 0 : 0), 0)
  );

/**
 * A lock's settlement: what is due (the work − the advance cut there + the baqaya brought in), the cash given (by
 * default all that is due, never below 0), the baqaya left after it and the change the lock makes to it, and the
 * `extra` given beyond what was due — that is not baqaya but an advance he has to give back (client, 2026-11-23:
 * "jiski taraf mere izafi gaye hain" belongs in the advance). Baqaya after a lock is never below 0; a baqaya below 0
 * from before (kept from earlier) is settled the same way: what he owes moves to his advance.
 */
export const lockSettlement = ({ work = 0, advanceCut = 0, baqaya = 0, cash } = {}) => {
  const before = Number(baqaya) || 0;
  const due = round2((Number(work) || 0) - (Number(advanceCut) || 0) + before);
  const given = cash === undefined || cash === null || cash === "" ? Math.max(0, due) : round2(cash);
  const after = round2(Math.max(0, due - given));
  return { due, cash: given, after, change: round2(after - before), extra: round2(Math.max(0, given - due)) };
};

/**
 * The two figures the owner keeps apart (client, 2026-11-23): the baqaya — money he still owes the worker — and the
 * advance — money the worker has to give back (advances given, extra cash given, less advance cut). A baqaya below 0
 * kept from before counts as advance.
 */
export const baqayaAndAdvance = ({ baqaya = 0, advanceLeft = 0 } = {}) => ({
  baqaya: round2(Math.max(0, Number(baqaya) || 0)),
  advance: round2((Number(advanceLeft) || 0) + Math.max(0, -(Number(baqaya) || 0))),
});

/** "You owe him Rs 270" / "He owes you Rs 300" / "Settled" — a signed baqaya in words. */
export const baqayaLabel = (amount) => {
  const value = round2(amount);
  if (value > 0) return `You owe him ${rupeesOf(value)}`;
  if (value < 0) return `He owes you ${rupeesOf(-value)}`;
  return "Settled";
};

/** What a worker comes to overall: his unpaid work plus his baqaya, less the advance he still has. Signed. */
export const overallBalance = ({ toPay = 0, baqaya = 0, advanceLeft = 0 } = {}) =>
  round2((Number(toPay) || 0) + (Number(baqaya) || 0) - (Number(advanceLeft) || 0));

/**
 * A cut's work per operation: pieces done (out of the cut's pieces), who did them and their wages, in first-seen
 * order; plus the cut's labour paid and still to pay.
 */
export const cutProgress = (cut, entries = []) => {
  const byOperation = new Map();
  for (const entry of entries) {
    const key = String(entry.operationId);
    if (!byOperation.has(key)) {
      byOperation.set(key, { operationId: key, name: entry.operationName || "", pieces: 0, amount: 0, workers: [] });
    }
    const row = byOperation.get(key);
    row.pieces += Math.trunc(Number(entry.pieces)) || 0;
    row.amount = round2(row.amount + (Number(entry.amount) || 0));
    pushUnique(row.workers, entry.workerName);
  }
  const pieces = Math.trunc(Number(cut?.pieces)) || 0;
  const operations = [...byOperation.values()].map((row) => ({
    ...row,
    complete: pieces > 0 && row.pieces >= pieces,
  }));
  return { pieces, operations, ...paidSplit(entries) };
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
        paid: 0,
        unpaid: 0,
        entries: [],
      });
    }
    const row = byWorker.get(key);
    pushUnique(row.operations, entry.operationName);
    pushUnique(row.payTypes, payTypeOf(entry));
    row.pieces += Math.trunc(Number(entry.pieces)) || 0;
    row.amount = round2(row.amount + (Number(entry.amount) || 0));
    if (isPaid(entry)) row.paid = round2(row.paid + (Number(entry.amount) || 0));
    else row.unpaid = round2(row.unpaid + (Number(entry.amount) || 0));
    row.entries.push(entry);
  }
  return [...byWorker.values()].sort((a, b) => b.amount - a.amount || a.workerName.localeCompare(b.workerName));
};

/**
 * Work entries per invoice — or per khata cut for work entered against a cut (`key` tells them apart, `lotNumber`
 * is the label: "INV-1003" or "Cut 20"): how many workers and operations, labour, pay types, last work date, and the
 * workers (see workByWorker). Latest work first.
 */
export const workByInvoice = (entries = []) => {
  const byLot = new Map();
  for (const entry of entries) {
    const key = entry.lotId ? String(entry.lotId) : `cut:${entry.cutId}`;
    if (!byLot.has(key)) {
      byLot.set(key, {
        key,
        lotId: entry.lotId ? String(entry.lotId) : null,
        cutId: entry.cutId ? String(entry.cutId) : null,
        lotNumber: workRefLabel(entry),
        productName: entry.productName || "",
        list: [],
      });
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
        ...paidSplit(list),
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
 * `paid` is what is already paid of the period: its work paid early or locked (by the work's own date) plus its "Pay
 * the rest" payments; `due` what is still to pay (net payable − paid; below 0 when more was paid than earned).
 * `entries` are work entries, `adjustments` are wage adjustments of the same period plus the attendance marks as
 * adjustments ("leave" / "absent", see attendanceAdjustments), `payments` the wage payments of the period.
 */
export const summarizeWages = (entries = [], adjustments = [], payments = []) => {
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
        paid: 0,
        due: 0,
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
    if (isPaid(entry) && ENTRY_PAID_KINDS.includes(entry.paymentKind)) {
      row.paid = round2(row.paid + (Number(entry.amount) || 0));
    }
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
  for (const payment of payments) {
    const row = bucket(payment.workerId, payment.workerName);
    if (payment.kind === "settle") row.paid = round2(row.paid + (Number(payment.amount) || 0));
    // A lock's work counts above as paid, but the advance cut at the lock was not cash: it is in the net as an
    // advance cut (dated like the lock), so it comes off what was paid in the lock's period.
    else if (payment.kind === "lock") row.paid = round2(row.paid - (Number(payment.advanceCut) || 0));
  }
  const workers = [...byWorker.values()]
    .map((row) => {
      const net = round2(row.amount + row.bonuses - row.leaves - row.absents - row.recoveries - row.deductions);
      return { ...row, net, due: round2(net - row.paid) };
    })
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
      paid: round2(sum.paid + row.paid),
      due: round2(sum.due + row.due),
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
      paid: 0,
      due: 0,
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
