import { getDb } from "@/lib/mongodb";
import { route, ok } from "@/lib/api";
import { workerBaqayas, workerTotals } from "@/lib/khata";

/**
 * GET /api/khata/workers — the khata's worker boxes (admin): every worker (active first) with what is still unpaid,
 * all-time wages, entries, the last work day, the last lock and his baqaya.
 */
export const GET = route(async () => {
  const db = await getDb();
  const [workers, totals, baqayas] = await Promise.all([
    db.collection("workers").find({}).sort({ active: -1, name: 1 }).toArray(),
    workerTotals(db),
    workerBaqayas(db),
  ]);
  const none = { entries: 0, amount: 0, unpaid: 0, lastWork: null, lastLock: null };
  return ok(
    workers.map((worker) => ({
      ...worker,
      ...(totals.get(String(worker._id)) ?? none),
      baqaya: baqayas.get(String(worker._id)) ?? 0,
    }))
  );
});
