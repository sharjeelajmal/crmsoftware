import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { route, ok, created, parseBody, parseQuery } from "@/lib/api";
import { workAssignmentSchema, workEntriesQuerySchema } from "@/lib/validation";
import { dateRangeFromFilter, dateQuery } from "@/lib/dates";
import { buildWorkEntry, requireLot, requireOperation, requireWorker } from "@/lib/wages";

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
 * POST /api/work-entries  { lotId, operationId, rate?, date?, note?, rows: [{ workerId, pieces }] }
 * Assigns one operation of a lot to one or more workers; one work entry per row, amount = pieces × rate.
 */
export const POST = route(async (request, { session }) => {
  const input = await parseBody(request, workAssignmentSchema);
  const db = await getDb();
  const [lot, operation] = await Promise.all([requireLot(db, input.lotId), requireOperation(db, input.operationId)]);
  const workers = await Promise.all(input.rows.map((row) => requireWorker(db, row.workerId)));

  const now = new Date();
  const docs = input.rows.map((row, i) =>
    buildWorkEntry({
      lot,
      operation,
      worker: workers[i],
      pieces: row.pieces,
      rate: input.rate,
      date: input.date,
      note: input.note,
      session,
      now,
    })
  );
  const { insertedIds } = await db.collection("work_entries").insertMany(docs);
  return created(docs.map((doc, i) => ({ _id: insertedIds[i], ...doc })));
});
