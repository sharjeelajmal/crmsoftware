import { ObjectId } from "mongodb";
import { notFound, conflict } from "@/lib/api";
import { ADVANCE_TYPES, entryAmount, leaveAmount } from "@/constants/wages";

/**
 * Workers & wages — server helpers.
 * Collections: `workers`, `operations` (per-piece rates), `work_entries` (one worker × one operation × one
 * lot, with the rate copied at save time), `wage_adjustments` (leave / advance / advance cut / deduction / bonus per
 * worker; advances and advance cuts together form the worker's advance account, see constants/wages.js).
 * Wages never touch products or stock.
 */

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

export async function requireOperation(db, operationId, session) {
  const operation = await db.collection("operations").findOne({ _id: new ObjectId(operationId) }, { session });
  if (!operation) throw notFound("Operation");
  return operation;
}

export async function requireLot(db, lotId, session) {
  const lot = await db.collection("lots").findOne({ _id: new ObjectId(lotId) }, { session });
  if (!lot) throw notFound("Lot");
  return lot;
}

/** Work entry document: names and the rate are snapshotted so later edits never change old wages. */
export function buildWorkEntry({ lot, operation, worker, pieces, rate, date, note, session, now = new Date() }) {
  const finalRate = rate === undefined || rate === null ? Number(operation.rate) || 0 : Number(rate) || 0;
  const qty = Math.trunc(Number(pieces)) || 0;
  return {
    lotId: lot._id,
    lotNumber: lot.lotNumber,
    productName: lot.productName ?? "",
    operationId: operation._id,
    operationName: operation.name,
    workerId: worker._id,
    workerName: worker.name,
    pieces: qty,
    rate: finalRate,
    amount: entryAmount(qty, finalRate),
    date: date ? new Date(date) : now,
    note: note || "",
    by: actorOf(session),
    createdAt: now,
    updatedAt: now,
  };
}

/** $set for an edited entry: amount is recomputed from the new pieces/rate. */
export function workEntryEditOps(existing, changes, now = new Date()) {
  const pieces = changes.pieces === undefined ? existing.pieces : Math.trunc(Number(changes.pieces)) || 0;
  const rate = changes.rate === undefined ? existing.rate : Number(changes.rate) || 0;
  const $set = { pieces, rate, amount: entryAmount(pieces, rate), updatedAt: now };
  if (changes.date !== undefined) $set.date = new Date(changes.date);
  if (changes.note !== undefined) $set.note = changes.note;
  return { $set };
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
  }));
