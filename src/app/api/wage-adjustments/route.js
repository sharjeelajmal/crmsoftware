import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { route, ok, created, parseBody, parseQuery, conflict } from "@/lib/api";
import { wageAdjustmentSchema, wagesQuerySchema } from "@/lib/validation";
import { dateRangeFromFilter, dateQuery } from "@/lib/dates";
import { advanceAccount, recoveryProblem } from "@/constants/wages";
import { advanceEntries, buildWageAdjustment, requireWorker } from "@/lib/wages";

/** GET /api/wage-adjustments?workerId=&filter=&from=&to= — leave / advances / advance cuts / deductions / bonuses (admin). */
export const GET = route(async (request) => {
  const { filter = "all", from, to, workerId } = parseQuery(request, wagesQuerySchema);
  const range = dateRangeFromFilter({ filter, from, to });
  const query = { ...dateQuery("date", range) };
  if (workerId) query.workerId = new ObjectId(workerId);
  const db = await getDb();
  return ok(await db.collection("wage_adjustments").find(query).sort({ date: -1 }).toArray());
});

/**
 * POST /api/wage-adjustments  { workerId, type, amount | days (+ rate), date?, note? }
 * An advance cut (`recovery`) may not be more than the advance still outstanding for that worker (409).
 */
export const POST = route(async (request, { session }) => {
  const input = await parseBody(request, wageAdjustmentSchema);
  const db = await getDb();
  const worker = await requireWorker(db, input.workerId);
  if (input.type === "recovery") {
    const { balance } = advanceAccount(await advanceEntries(db, { workerId: worker._id }));
    const problem = recoveryProblem(input.amount, balance);
    if (problem) throw conflict(`${worker.name}: ${problem}`);
  }
  const doc = buildWageAdjustment({ worker, input, session });
  const { insertedId } = await db.collection("wage_adjustments").insertOne(doc);
  return created({ _id: insertedId, ...doc });
});
