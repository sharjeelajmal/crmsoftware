import { getDb } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound } from "@/lib/api";
import { workEntryUpdateSchema } from "@/lib/validation";
import { workEntryEditOps } from "@/lib/wages";

/** PUT /api/work-entries/:id  { pieces?, rate?, date?, note? } — amount is recomputed. */
export const PUT = route(async (request, context) => {
  const _id = await requireObjectId(context);
  const changes = await parseBody(request, workEntryUpdateSchema);
  const db = await getDb();
  const entries = db.collection("work_entries");
  const existing = await entries.findOne({ _id });
  if (!existing) throw notFound("Work entry");
  await entries.updateOne({ _id }, workEntryEditOps(existing, changes));
  return ok({ updated: true });
});

/** DELETE /api/work-entries/:id */
export const DELETE = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  const db = await getDb();
  const { deletedCount } = await db.collection("work_entries").deleteOne({ _id });
  if (deletedCount === 0) throw notFound("Work entry");
  return ok({ deleted: true });
});
