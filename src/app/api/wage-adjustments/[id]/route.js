import { getDb } from "@/lib/mongodb";
import { route, ok, requireObjectId, notFound, conflict } from "@/lib/api";
import { advanceAccount, advanceDeleteProblem } from "@/constants/wages";
import { advanceEntries } from "@/lib/wages";

/**
 * DELETE /api/wage-adjustments/:id
 * An advance can't be deleted once part of it was cut (the account would go below zero): delete the cuts first.
 */
export const DELETE = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  const db = await getDb();
  const adjustment = await db.collection("wage_adjustments").findOne({ _id });
  if (!adjustment) throw notFound("Adjustment");
  if (adjustment.type === "advance") {
    const { balance } = advanceAccount(await advanceEntries(db, { workerId: adjustment.workerId }));
    const problem = advanceDeleteProblem(balance, adjustment.amount);
    if (problem) throw conflict(problem);
  }
  await db.collection("wage_adjustments").deleteOne({ _id });
  return ok({ deleted: true });
});
