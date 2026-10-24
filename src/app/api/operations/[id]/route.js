import { getDb } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound, conflict } from "@/lib/api";
import { operationUpdateSchema } from "@/lib/validation";

/** PUT /api/operations/:id — rename, change the rate (future entries only) or (de)activate. */
export const PUT = route(async (request, context) => {
  const _id = await requireObjectId(context);
  const changes = await parseBody(request, operationUpdateSchema);
  const db = await getDb();
  const operations = db.collection("operations");

  if (changes.name) {
    const clash = await operations.findOne({ _id: { $ne: _id }, name: changes.name });
    if (clash) throw conflict(`Operation "${changes.name}" already exists`);
  }
  const { matchedCount } = await operations.updateOne({ _id }, { $set: { ...changes, updatedAt: new Date() } });
  if (matchedCount === 0) throw notFound("Operation");
  return ok({ updated: true });
});

/** DELETE /api/operations/:id — only while no work entry uses it; otherwise deactivate. */
export const DELETE = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  const db = await getDb();
  const used = await db.collection("work_entries").countDocuments({ operationId: _id });
  if (used > 0) throw conflict(`This operation is used by ${used} work entries. Mark it inactive instead.`);
  const { deletedCount } = await db.collection("operations").deleteOne({ _id });
  if (deletedCount === 0) throw notFound("Operation");
  return ok({ deleted: true });
});
