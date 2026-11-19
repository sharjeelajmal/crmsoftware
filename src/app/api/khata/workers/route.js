import { getDb } from "@/lib/mongodb";
import { route, ok } from "@/lib/api";
import { workerTotals } from "@/lib/khata";

/**
 * GET /api/khata/workers — the khata's worker boxes (admin): every worker (active first) with what is still unpaid,
 * all-time wages, entries, the last work day and the last lock.
 */
export const GET = route(async () => {
  const db = await getDb();
  const [workers, totals] = await Promise.all([
    db.collection("workers").find({}).sort({ active: -1, name: 1 }).toArray(),
    workerTotals(db),
  ]);
  const none = { entries: 0, amount: 0, unpaid: 0, lastWork: null, lastLock: null };
  return ok(workers.map((worker) => ({ ...worker, ...(totals.get(String(worker._id)) ?? none) })));
});
