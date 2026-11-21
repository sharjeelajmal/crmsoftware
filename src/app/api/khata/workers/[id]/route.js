import { getDb } from "@/lib/mongodb";
import { route, ok, requireObjectId, notFound } from "@/lib/api";
import { WAGE_PAYMENTS, advanceEntries, attachCutNumbers } from "@/lib/wages";
import { advanceAccount, paidSplit } from "@/constants/wages";

/**
 * GET /api/khata/workers/:id — one worker's khata (admin): every piece of work (newest first) with Paid / Unpaid, the
 * payments (locks, early payments, rest of a period), what is paid and still unpaid, and the advance still left.
 */
export const GET = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  const db = await getDb();
  const worker = await db.collection("workers").findOne({ _id });
  if (!worker) throw notFound("Worker");
  const [entries, payments, advances] = await Promise.all([
    db.collection("work_entries").find({ workerId: _id }).sort({ date: -1, createdAt: -1 }).toArray(),
    db.collection(WAGE_PAYMENTS).find({ workerId: _id }).sort({ date: -1, createdAt: -1 }).toArray(),
    advanceEntries(db, { workerId: String(_id) }),
  ]);
  return ok({
    worker,
    entries: await attachCutNumbers(db, entries),
    payments,
    totals: paidSplit(entries),
    advanceLeft: advanceAccount(advances).balance,
  });
});
