import { ObjectId } from "mongodb";
import { getDb, withTransaction } from "@/lib/mongodb";
import { route, ok, created, parseBody, parseQuery } from "@/lib/api";
import { workAssignmentSchema, workEntriesQuerySchema } from "@/lib/validation";
import { dateRangeFromFilter, dateQuery } from "@/lib/dates";
import {
  actorOf,
  attachCutNumbers,
  buildWorkEntry,
  payEntries,
  requireLot,
  requireOperations,
  requirePiecesLeft,
  requireWorkers,
} from "@/lib/wages";
import { requireRunning } from "@/lib/lots";
import { lotCategory, rateCardOf, rememberTeam } from "@/lib/operations";
import { cardRateOf } from "@/constants/operations";
import { teamFromSheet, workRefOf } from "@/constants/wages";

/**
 * GET /api/work-entries?lotId=&cutId=&workerId=&operationId=&filter=&from=&to=
 * Admin only. Work entries newest first (default: all time), each invoice entry with its invoice's cut number.
 */
export const GET = route(async (request) => {
  const { lotId, cutId, workerId, operationId, filter = "all", from, to } = parseQuery(request, workEntriesQuerySchema);
  const range = dateRangeFromFilter({ filter, from, to });
  const query = { ...dateQuery("date", range) };
  if (lotId) query.lotId = new ObjectId(lotId);
  if (cutId) query.cutId = new ObjectId(cutId);
  if (workerId) query.workerId = new ObjectId(workerId);
  if (operationId) query.operationId = new ObjectId(operationId);

  const db = await getDb();
  const entries = await db.collection("work_entries").find(query).sort({ date: -1, createdAt: -1 }).toArray();
  return ok(await attachCutNumbers(db, entries));
});

/**
 * POST /api/work-entries
 *   { lotId, date?, note?, operations: [{ operationId, rate?, rows: [{ workerId, pieces, payType?, amount? }] }] }
 * The work sheet: every operation of an invoice with its workers, saved in one go (one transaction, one `batchId`).
 * One work entry per row: pieces × rate, or the fixed amount. Without a rate: the rate on the invoice's category
 * rate card, else the operation's own rate. With `rememberTeam`, the rows become the team of the invoice's category,
 * so the next invoice of that category opens with them (see rememberTeam). Rows with `paid: true` are paid in the
 * same save (one early payment per worker). No operation may go past the invoice's pieces, every worker's work
 * counted (409, naming who wrote what). The older `{ lotId, operationId, rate?, rows }` body still works (and
 * remembers nothing).
 */
export const POST = route(async (request, { session }) => {
  const input = await parseBody(request, workAssignmentSchema);
  const docs = await withTransaction(async (db, txn) => {
    // One after the other: operations of a transaction share its session and must not run in parallel.
    const lot = await requireLot(db, input.lotId, txn);
    requireRunning(lot);
    const operations = await requireOperations(
      db,
      input.operations.map((op) => op.operationId),
      txn
    );
    const workers = await requireWorkers(
      db,
      input.operations.flatMap((op) => op.rows.map((row) => row.workerId)),
      txn
    );
    const { limit, label } = workRefOf({ lot });
    for (const item of input.operations) {
      await requirePiecesLeft(db, txn, {
        ref: { lotId: lot._id },
        operationId: item.operationId,
        operationName: operations.get(item.operationId).name,
        pieces: item.rows.reduce((sum, row) => sum + (Math.trunc(Number(row.pieces)) || 0), 0),
        limit,
        label,
      });
    }
    const category = await lotCategory(db, lot, txn);
    const card = await rateCardOf(db, category, txn);

    const now = new Date();
    const batchId = new ObjectId();
    const entries = input.operations.flatMap((item) => {
      const operation = operations.get(item.operationId);
      const rate = item.rate ?? cardRateOf(card, operation._id) ?? undefined;
      return item.rows.map((row) =>
        buildWorkEntry({
          lot,
          operation,
          worker: workers.get(row.workerId),
          pieces: row.pieces,
          rate,
          payType: row.payType,
          amount: row.amount,
          batchId,
          date: input.date,
          note: input.note,
          session,
          now,
        })
      );
    });
    const { insertedIds } = await db.collection("work_entries").insertMany(entries, { session: txn });
    const saved = entries.map((doc, i) => ({ _id: insertedIds[i], ...doc }));
    const paidNow = input.operations.flatMap((item) => item.rows.map((row) => row.paid));
    const toPay = saved.filter((_, i) => paidNow[i]);
    const payments = toPay.length ? await payEntries(db, txn, { entries: toPay, session }) : [];
    const paymentOf = new Map(payments.flatMap((p) => p.entryIds.map((id) => [String(id), p])));
    if (input.rememberTeam) {
      await rememberTeam(db, {
        category,
        items: teamFromSheet(input.operations),
        lot,
        actor: actorOf(session),
        session: txn,
      });
    }
    return saved.map((doc) => {
      const payment = paymentOf.get(String(doc._id));
      return payment ? { ...doc, paymentId: payment._id, paymentKind: payment.kind, paidAt: payment.createdAt } : doc;
    });
  });
  return created(docs);
});
