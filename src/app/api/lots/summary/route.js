import { startOfDay } from "date-fns";
import { getDb } from "@/lib/mongodb";
import { route, ok } from "@/lib/api";
import { STAGES } from "@/lib/lots";

/** Dashboard widget numbers: lots per stage, today's new lots and pieces cut. */
export const GET = route(async () => {
  const db = await getDb();
  const lots = db.collection("lots");
  const today = startOfDay(new Date());

  const [byStage, todayLots] = await Promise.all([
    lots.aggregate([{ $group: { _id: "$stage", count: { $sum: 1 }, pieces: { $sum: "$cutQty" } } }]).toArray(),
    lots
      .aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: null, count: { $sum: 1 }, pieces: { $sum: "$cutQty" } } },
      ])
      .toArray(),
  ]);

  const stages = Object.fromEntries(STAGES.map((s) => [s, { count: 0, pieces: 0 }]));
  for (const row of byStage) if (stages[row._id]) stages[row._id] = { count: row.count, pieces: row.pieces };

  const inProcess = STAGES.filter((s) => s !== "ready").reduce((sum, s) => sum + stages[s].count, 0);

  return ok({
    stages,
    newLots: stages.cutting.count,
    inProcess,
    ready: stages.ready.count,
    today: { count: todayLots[0]?.count || 0, pieces: todayLots[0]?.pieces || 0 },
  });
});
