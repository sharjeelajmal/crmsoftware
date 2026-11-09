import { ObjectId } from "mongodb";
import { getDb, withTransaction } from "@/lib/mongodb";
import { route, ok, created, parseBody, parseQuery } from "@/lib/api";
import { workAssignmentSchema, workEntriesQuerySchema } from "@/lib/validation";
import { dateRangeFromFilter, dateQuery } from "@/lib/dates";
import { actorOf, buildWorkEntry, requireLot, requireOperations, requireWorkers } from "@/lib/wages";
import { requireRunning } from "@/lib/lots";
import { lotCategory, rateCardOf, rememberTeam } from "@/lib/operations";
import { cardRateOf } from "@/constants/operations";
import { teamFromSheet } from "@/constants/wages";

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
 * rate card, else the operation's own rate. With `rememberTeam`, the rows become the team of the invoice's category,
 * so the next invoice of that category opens with them (see rememberTeam). The older
 * `{ lotId, operationId, rate?, rows }` body still works (and remembers nothing).
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
    if (input.rememberTeam) {
      await rememberTeam(db, {
        category,
        items: teamFromSheet(input.operations),
        lot,
        actor: actorOf(session),
        session: txn,
      });
    }
    return entries.map((doc, i) => ({ _id: insertedIds[i], ...doc }));
  });
  return created(docs);
});
