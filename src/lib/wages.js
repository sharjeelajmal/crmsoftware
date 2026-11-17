import { ObjectId } from "mongodb";
import { notFound, conflict } from "@/lib/api";
import { dateQuery } from "@/lib/dates";
import { ATTENDANCE } from "@/lib/attendance";
import { attendanceAdjustments } from "@/constants/attendance";
import {
  ADVANCE_TYPES,
  effectiveRate,
  entryAmount,
  leaveAmount,
  payTypeOf,
  round2,
  settleDate,
  settleProblem,
  summarizeWages,
  workPaymentsFor,
} from "@/constants/wages";

/**
 * Workers & wages — server helpers.
 * Collections: `workers`, `operations` (per-piece rates), `work_entries` (one worker × one operation × one
 * lot, with the rate copied at save time), `wage_adjustments` (leave / advance / advance cut / deduction / bonus per
 * worker; advances and advance cuts together form the worker's advance account, see constants/wages.js),
 * `wage_payments` (money paid to a worker: work paid early, or the rest of a period; see the payment rules in
 * constants/wages.js). Wages never touch products or stock.
 */

export const WAGE_PAYMENTS = "wage_payments";

export const actorOf = (session) => ({ id: session?.sub ?? null, name: session?.name ?? "" });

/** Advance and advance-cut entries (all time) for one worker, or for every worker when `workerId` is omitted. */
export const advanceEntries = (db, { workerId, session } = {}) =>
  db
    .collection("wage_adjustments")
    .find({ type: { $in: [...ADVANCE_TYPES] }, ...(workerId ? { workerId: new ObjectId(workerId) } : {}) }, { session })
    .sort({ date: 1, createdAt: 1 })
    .toArray();

export async function requireWorker(db, workerId, session) {
  const worker = await db.collection("workers").findOne({ _id: new ObjectId(workerId) }, { session });
  if (!worker) throw notFound("Worker");
  if (worker.active === false) throw conflict(`${worker.name} is inactive`);
  return worker;
}

export async function requireLot(db, lotId, session) {
  const lot = await db.collection("lots").findOne({ _id: new ObjectId(lotId) }, { session });
  if (!lot) throw notFound("Invoice");
  return lot;
}

/**
 * Work entry document: names and the rate are snapshotted so later edits never change old wages. A `fixed` entry
 * keeps the agreed amount and the rate it works out to per piece. Entries saved together share `batchId`.
 */
export function buildWorkEntry({
  lot,
  operation,
  worker,
  pieces,
  rate,
  payType = "piece",
  amount,
  batchId = null,
  date,
  note,
  session,
  now = new Date(),
}) {
  const qty = Math.trunc(Number(pieces)) || 0;
  const fixed = payType === "fixed";
  const finalRate = fixed
    ? effectiveRate(amount, qty)
    : rate === undefined || rate === null
      ? Number(operation.rate) || 0
      : Number(rate) || 0;
  return {
    lotId: lot._id,
    lotNumber: lot.lotNumber,
    productName: lot.productName ?? "",
    operationId: operation._id,
    operationName: operation.name,
    workerId: worker._id,
    workerName: worker.name,
    pieces: qty,
    payType: fixed ? "fixed" : "piece",
    rate: finalRate,
    amount: fixed ? round2(amount) : entryAmount(qty, finalRate),
    batchId,
    date: date ? new Date(date) : now,
    note: note || "",
    by: actorOf(session),
    createdAt: now,
    updatedAt: now,
  };
}

/** $set for an edited entry: a per-piece amount is recomputed from pieces × rate; a fixed one keeps its amount. */
export function workEntryEditOps(existing, changes, now = new Date()) {
  const pieces = changes.pieces === undefined ? existing.pieces : Math.trunc(Number(changes.pieces)) || 0;
  if (payTypeOf(existing) === "fixed") {
    const amount = changes.amount === undefined ? Number(existing.amount) || 0 : round2(changes.amount);
    const $set = { pieces, amount, rate: effectiveRate(amount, pieces), updatedAt: now };
    if (changes.date !== undefined) $set.date = new Date(changes.date);
    if (changes.note !== undefined) $set.note = changes.note;
    return { $set };
  }
  const rate = changes.rate === undefined ? existing.rate : Number(changes.rate) || 0;
  const $set = { pieces, rate, amount: entryAmount(pieces, rate), updatedAt: now };
  if (changes.date !== undefined) $set.date = new Date(changes.date);
  if (changes.note !== undefined) $set.note = changes.note;
  return { $set };
}

/** Active workers by id; throws like requireWorker when one is missing or inactive. */
export async function requireWorkers(db, workerIds, session) {
  const ids = [...new Set(workerIds.map(String))];
  const found = await db
    .collection("workers")
    .find({ _id: { $in: ids.map((id) => new ObjectId(id)) } }, { session })
    .toArray();
  const byId = new Map(found.map((worker) => [String(worker._id), worker]));
  for (const id of ids) {
    const worker = byId.get(id);
    if (!worker) throw notFound("Worker");
    if (worker.active === false) throw conflict(`${worker.name} is inactive`);
  }
  return byId;
}

/** Operations by id; throws when one is missing. */
export async function requireOperations(db, operationIds, session) {
  const ids = [...new Set(operationIds.map(String))];
  const found = await db
    .collection("operations")
    .find({ _id: { $in: ids.map((id) => new ObjectId(id)) } }, { session })
    .toArray();
  if (found.length !== ids.length) throw notFound("Operation");
  return new Map(found.map((operation) => [String(operation._id), operation]));
}

/** Adjustment document. Leave snapshots days × rate (rate = the worker's per-day salary unless given). */
export function buildWageAdjustment({ worker, input, session, now = new Date() }) {
  const isLeave = input.type === "leave";
  const rate = isLeave ? Number(input.rate ?? worker.dailyRate ?? 0) || 0 : undefined;
  return {
    workerId: worker._id,
    workerName: worker.name,
    type: input.type,
    amount: isLeave ? leaveAmount(input.days, rate) : Number(input.amount) || 0,
    ...(isLeave ? { days: Number(input.days) || 0, rate } : {}),
    date: input.date ? new Date(input.date) : now,
    note: input.note || "",
    by: actorOf(session),
    createdAt: now,
  };
}

/** Rows for the wages CSV. */
export const wageCsvRows = (workers) =>
  workers.map((w) => ({
    worker: w.workerName,
    entries: w.entries,
    pieces: w.pieces,
    amount: w.amount,
    leaveDays: w.leaveDays,
    leaves: w.leaves,
    absentDays: w.absentDays,
    absents: w.absents,
    bonuses: w.bonuses,
    advances: w.advances,
    recoveries: w.recoveries,
    advanceLeft: w.advanceLeft ?? 0,
    deductions: w.deductions,
    net: w.net,
    paid: w.paid ?? 0,
    due: w.due ?? w.net,
  }));

// ---- Wage payments -----------------------------------------------------------------------------------------------

/**
 * Everything the wages of a period are made of, for every worker or one (`workerId`): work entries, adjustments plus
 * the attendance marks as adjustments, the wage payments, and the per-worker summary (net payable, paid, due).
 */
export async function periodWages(db, { range, workerId, tx } = {}) {
  const scope = workerId ? { workerId: new ObjectId(workerId) } : {};
  const inPeriod = { ...scope, ...dateQuery("date", range) };
  // One after the other: inside a transaction the reads share its session.
  const entries = await db
    .collection("work_entries")
    .find(inPeriod, { session: tx })
    .sort({ date: -1, createdAt: -1 })
    .toArray();
  const adjustments = await db
    .collection("wage_adjustments")
    .find(inPeriod, { session: tx })
    .sort({ date: -1 })
    .toArray();
  const marks = await db.collection(ATTENDANCE).find(inPeriod, { session: tx }).toArray();
  const payments = await db
    .collection(WAGE_PAYMENTS)
    .find(inPeriod, { session: tx })
    .sort({ date: -1, createdAt: -1 })
    .toArray();
  const summary = summarizeWages(entries, [...adjustments, ...attendanceAdjustments(marks)], payments);
  return { entries, adjustments, payments, summary };
}

/** Payment document; `entries` are the work entries it pays (none for a "Pay the rest" of adjustments only). */
export function buildWagePayment({ worker, amount, date, kind, entries = [], note = "", session, now = new Date() }) {
  const lots = new Map();
  for (const entry of entries) if (entry.lotId) lots.set(String(entry.lotId), entry.lotNumber || "");
  return {
    workerId: new ObjectId(worker.workerId),
    workerName: worker.workerName || "",
    amount: round2(amount),
    date: date ? new Date(date) : now,
    kind,
    entryIds: entries.map((entry) => entry._id),
    lotIds: [...lots.keys()].map((id) => new ObjectId(id)),
    lotNumbers: [...lots.values()].filter(Boolean),
    note: note || "",
    by: actorOf(session),
    createdAt: now,
  };
}

const markEntriesPaid = (db, tx, payment, insertedId) =>
  payment.entryIds.length === 0
    ? null
    : db
        .collection("work_entries")
        .updateMany(
          { _id: { $in: payment.entryIds } },
          { $set: { paymentId: insertedId, paymentKind: payment.kind, paidAt: payment.createdAt } },
          { session: tx }
        );

/**
 * Pays the given work entries early: one "work" payment per worker for the entries not paid yet. Refused when every
 * one of them is already paid. Returns the payments.
 */
export async function payEntries(db, tx, { entries, note = "", session }) {
  const groups = workPaymentsFor(entries);
  if (groups.length === 0) throw conflict("This work is already paid");
  const now = new Date();
  const payments = [];
  for (const group of groups) {
    const doc = buildWagePayment({
      worker: group,
      amount: group.amount,
      date: group.date,
      kind: "work",
      entries: group.entries,
      note,
      session,
      now,
    });
    const { insertedId } = await db.collection(WAGE_PAYMENTS).insertOne(doc, { session: tx });
    await markEntriesPaid(db, tx, doc, insertedId);
    payments.push({ _id: insertedId, ...doc });
  }
  return payments;
}

/** Removes a payment: its work entries are unpaid again. */
export async function removePayment(db, tx, payment) {
  if (payment.entryIds?.length) {
    await db
      .collection("work_entries")
      .updateMany(
        { _id: { $in: payment.entryIds }, paymentId: payment._id },
        { $unset: { paymentId: "", paymentKind: "", paidAt: "" } },
        { session: tx }
      );
  }
  await db.collection(WAGE_PAYMENTS).deleteOne({ _id: payment._id }, { session: tx });
}

/**
 * Marks work entries unpaid. An early ("work") payment gives back just those entries and shrinks by their wages (it
 * goes when nothing is left); a "Pay the rest" payment is undone as a whole — its amount was the period's remainder,
 * not these entries'. Returns how many payments were changed and removed.
 */
export async function unpayEntries(db, tx, { entries }) {
  const byPayment = new Map();
  for (const entry of entries) {
    if (!entry.paymentId) continue;
    const key = String(entry.paymentId);
    if (!byPayment.has(key)) byPayment.set(key, []);
    byPayment.get(key).push(entry);
  }
  let changed = 0;
  let removed = 0;
  for (const [id, paidEntries] of byPayment) {
    const payment = await db.collection(WAGE_PAYMENTS).findOne({ _id: new ObjectId(id) }, { session: tx });
    if (!payment) {
      // a payment that is gone already: just clear the mark
      await db
        .collection("work_entries")
        .updateMany(
          { _id: { $in: paidEntries.map((e) => e._id) } },
          { $unset: { paymentId: "", paymentKind: "", paidAt: "" } },
          { session: tx }
        );
      continue;
    }
    const left = payment.entryIds.filter((entryId) => !paidEntries.some((e) => String(e._id) === String(entryId)));
    if (payment.kind === "settle" || left.length === 0) {
      await removePayment(db, tx, payment);
      removed += 1;
      continue;
    }
    const amount = round2(payment.amount - paidEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0));
    await db
      .collection(WAGE_PAYMENTS)
      .updateOne({ _id: payment._id }, { $set: { entryIds: left, amount } }, { session: tx });
    await db
      .collection("work_entries")
      .updateMany(
        { _id: { $in: paidEntries.map((e) => e._id) } },
        { $unset: { paymentId: "", paymentKind: "", paidAt: "" } },
        { session: tx }
      );
    changed += 1;
  }
  return { changed, removed };
}

/**
 * "Pay the rest": pays a worker what is still due for the period (net payable − already paid) in one "settle"
 * payment, covering the period's unpaid work entries. Refused when nothing is left to pay.
 */
export async function settleWorker(db, tx, { workerId, range, note = "", session, now = new Date() }) {
  const worker = await db.collection("workers").findOne({ _id: new ObjectId(workerId) }, { session: tx });
  if (!worker) throw notFound("Worker");
  const { entries, summary } = await periodWages(db, { range, workerId, tx });
  const row = summary.workers[0] ?? { workerId, workerName: worker.name, due: 0 };
  const problem = settleProblem({ ...row, workerName: row.workerName || worker.name });
  if (problem) throw conflict(problem);
  const doc = buildWagePayment({
    worker: { workerId, workerName: worker.name },
    amount: row.due,
    date: settleDate(range, now),
    kind: "settle",
    entries: entries.filter((entry) => !entry.paymentId),
    note,
    session,
    now,
  });
  const { insertedId } = await db.collection(WAGE_PAYMENTS).insertOne(doc, { session: tx });
  await markEntriesPaid(db, tx, doc, insertedId);
  return { _id: insertedId, ...doc };
}
