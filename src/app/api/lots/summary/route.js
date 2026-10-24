import { startOfDay, startOfMonth } from "date-fns";
import { getDb } from "@/lib/mongodb";
import { route, ok } from "@/lib/api";
import { STAGES } from "@/lib/lots";
import { producedPiecesInRange } from "@/lib/production";

/**
 * Dashboard widget numbers: lots per stage, today's new lots and pieces cut, lots marked ready today
 * (with the pieces that went into stock) and the net pieces produced this month.
 */
export const GET = route(async () => {
  const db = await getDb();
  const lots = db.collection("lots");
  const now = new Date();
  const today = startOfDay(now);

  const [byStage, todayLots, readyToday, producedThisMonth, inStitching] = await Promise.all([
    lots.aggregate([{ $group: { _id: "$stage", count: { $sum: 1 }, pieces: { $sum: "$cutQty" } } }]).toArray(),
    lots
      .aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: null, count: { $sum: 1 }, pieces: { $sum: "$cutQty" } } },
      ])
      .toArray(),
    lots
      .aggregate([
        { $match: { stage: "ready", stockApplied: true, stockAppliedAt: { $gte: today } } },
        { $group: { _id: null, count: { $sum: 1 }, pieces: { $sum: "$readyQty" } } },
      ])
      .toArray(),
    producedPiecesInRange(db, { start: startOfMonth(now), end: now }),
    lots
      .aggregate([
        { $match: { stage: "stitching" } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            received: { $sum: "$cutQty" },
            out: { $sum: { $ifNull: ["$stitchOutQty", 0] } },
          },
        },
      ])
      .toArray(),
  ]);
  const stitching = inStitching[0] || { count: 0, received: 0, out: 0 };

  const stages = Object.fromEntries(STAGES.map((s) => [s, { count: 0, pieces: 0 }]));
  for (const row of byStage) if (stages[row._id]) stages[row._id] = { count: row.count, pieces: row.pieces };

  const inProcess = STAGES.filter((s) => s !== "ready").reduce((sum, s) => sum + stages[s].count, 0);

  return ok({
    stages,
    newLots: stages.cutting.count,
    inProcess,
    ready: stages.ready.count,
    today: { count: todayLots[0]?.count || 0, pieces: todayLots[0]?.pieces || 0 },
    readyToday: { count: readyToday[0]?.count || 0, pieces: readyToday[0]?.pieces || 0 },
    producedThisMonth,
    // Pieces still lying in stitching ("padi hui"): received minus sent out with gate passes.
    stitching: {
      lots: stitching.count,
      received: stitching.received,
      out: stitching.out,
      lying: stitching.received - stitching.out,
    },
  });
});
