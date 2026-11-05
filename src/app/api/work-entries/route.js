import { ObjectId } from "mongodb";
import { getDb, withTransaction } from "@/lib/mongodb";
import { route, ok, created, parseBody, parseQuery } from "@/lib/api";
import { workAssignmentSchema, workEntriesQuerySchema } from "@/lib/validation";
import { dateRangeFromFilter, dateQuery } from "@/lib/dates";
import { buildWorkEntry, requireLot, requireOperations, requireWorkers } from "@/lib/wages";
import { lotCategory, rateCardOf } from "@/lib/operations";
import { cardRateOf } from "@/constants/operations";

/**
 * GET /api/work-entries?lotId=&workerId=&operationId=&filter=&from=&to=
 * Admin only. Work entries newest first (default: all time).
 */
export const GET = route(async (request) => {
  const { lotId, workerId, operationId, filter = "all", from, to } = parseQuery(request, workEntriesQuerySchema);
  const range = dateRangeFromFilter({ filter, from, to });
  const query = { ...dateQuery("date", range) };
  if (lotId) query.lotId = new ObjectId(lotId);
  if (workerId) query.workerId = new ObjectId(workerId);
  if (operationId) query.operationId = new ObjectId(operationId);

  const db = await getDb();
  const entries = await db.collection("work_entries").find(query).sort({ date: -1, createdAt: -1 }).toArray();
  return ok(entries);
});

/**
 * POST /api/work-entries
 *   { lotId, date?, note?, operations: [{ operationId, rate?, rows: [{ workerId, pieces, payType?, amount? }] }] }
 * The work sheet: every operation of an invoice with its workers, saved in one go (one transaction, one `batchId`).
 * One work entry per row: pieces × rate, or the fixed amount. Without a rate: the rate on the invoice's category
 * rate card, else the operation's own rate. The older `{ lotId, operationId, rate?, rows }` body still works.
 */
export const POST = route(async (request, { session }) => {
  const input = await parseBody(request, workAssignmentSchema);
  const docs = await withTransaction(async (db, txn) => {
    // One after the other: operations of a transaction share its session and must not run in parallel.
    const lot = await requireLot(db, input.lotId, txn);
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
    const card = await rateCardOf(db, await lotCategory(db, lot, txn), txn);

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
    return entries.map((doc, i) => ({ _id: insertedIds[i], ...doc }));
  });
  return created(docs);
});
