import { getDb } from "@/lib/mongodb";
import { route, ok, requireObjectId, notFound } from "@/lib/api";
import { KHATA_BALANCES, WAGE_PAYMENTS, advanceEntries, attachCutNumbers } from "@/lib/wages";
import { advanceAccount, baqayaOf, paidSplit } from "@/constants/wages";

/**
 * GET /api/khata/workers/:id — one worker's khata (admin): every piece of work (newest first) with Paid / Unpaid, the
 * payments (locks, early payments, rest of a period), what is paid and still unpaid, the advance still left, his old
 * balances from the notebook and his baqaya (signed: + the owner owes him, − he owes the owner; see baqayaOf).
 */
export const GET = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  const db = await getDb();
  const worker = await db.collection("workers").findOne({ _id });
  if (!worker) throw notFound("Worker");
  const [entries, payments, advances, balances] = await Promise.all([
    db.collection("work_entries").find({ workerId: _id }).sort({ date: -1, createdAt: -1 }).toArray(),
    db.collection(WAGE_PAYMENTS).find({ workerId: _id }).sort({ date: -1, createdAt: -1 }).toArray(),
    advanceEntries(db, { workerId: String(_id) }),
    db.collection(KHATA_BALANCES).find({ workerId: _id }).sort({ date: -1, createdAt: -1 }).toArray(),
  ]);
  return ok({
    worker,
    entries: await attachCutNumbers(db, entries),
    payments,
    totals: paidSplit(entries),
    advanceLeft: advanceAccount(advances).balance,
    balances,
    baqaya: baqayaOf({ balances, payments }),
  });
});
