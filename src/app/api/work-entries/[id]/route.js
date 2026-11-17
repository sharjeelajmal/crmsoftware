import { getDb } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound, conflict } from "@/lib/api";
import { workEntryUpdateSchema } from "@/lib/validation";
import { workEntryEditOps } from "@/lib/wages";
import { paidEntryProblem } from "@/constants/wages";

/**
 * PUT /api/work-entries/:id  { pieces?, rate?, amount?, date?, note? } — amount is recomputed. A paid entry can't be
 * changed (its payment is for what it was): mark it unpaid first.
 */
export const PUT = route(async (request, context) => {
  const _id = await requireObjectId(context);
  const changes = await parseBody(request, workEntryUpdateSchema);
  const db = await getDb();
  const entries = db.collection("work_entries");
  const existing = await entries.findOne({ _id });
  if (!existing) throw notFound("Work entry");
  const problem = paidEntryProblem(existing);
  if (problem) throw conflict(problem);
  await entries.updateOne({ _id }, workEntryEditOps(existing, changes));
  return ok({ updated: true });
});

/** DELETE /api/work-entries/:id — not while it is paid (mark it unpaid first). */
export const DELETE = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  const db = await getDb();
  const existing = await db.collection("work_entries").findOne({ _id }, { projection: { paymentId: 1 } });
  if (!existing) throw notFound("Work entry");
  const problem = paidEntryProblem(existing);
  if (problem) throw conflict(problem);
  await db.collection("work_entries").deleteOne({ _id });
  return ok({ deleted: true });
});
