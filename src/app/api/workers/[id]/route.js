import { getDb } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound, conflict } from "@/lib/api";
import { workerUpdateSchema } from "@/lib/validation";

/** PUT /api/workers/:id — edit details or set `active: false` (the safe way to retire a worker). */
export const PUT = route(async (request, context) => {
  const _id = await requireObjectId(context);
  const changes = await parseBody(request, workerUpdateSchema);
  const db = await getDb();
  const workers = db.collection("workers");

  if (changes.name) {
    const clash = await workers.findOne({ _id: { $ne: _id }, name: changes.name });
    if (clash) throw conflict(`Worker "${changes.name}" already exists`);
  }
  const { matchedCount } = await workers.updateOne({ _id }, { $set: { ...changes, updatedAt: new Date() } });
  if (matchedCount === 0) throw notFound("Worker");
  return ok({ updated: true });
});

/** DELETE /api/workers/:id — only when the worker has no work entries (their attendance marks go too); else deactivate. */
export const DELETE = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  const db = await getDb();
  const used = await db.collection("work_entries").countDocuments({ workerId: _id });
  if (used > 0) throw conflict(`This worker has ${used} work entries. Mark them inactive instead of deleting.`);
  const { deletedCount } = await db.collection("workers").deleteOne({ _id });
  if (deletedCount === 0) throw notFound("Worker");
  await db.collection("attendance").deleteMany({ workerId: _id });
  return ok({ deleted: true });
});
