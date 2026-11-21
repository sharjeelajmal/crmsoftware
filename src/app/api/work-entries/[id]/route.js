import { getDb } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound, conflict } from "@/lib/api";
import { workEntryUpdateSchema } from "@/lib/validation";
import { requirePiecesLeft, workEntryEditOps } from "@/lib/wages";
import { paidEntryProblem, workRefOf } from "@/constants/wages";

/**
 * PUT /api/work-entries/:id  { pieces?, rate?, amount?, date?, note? } — amount is recomputed. A paid entry can't be
 * changed (its payment is for what it was): mark it unpaid first. More pieces may not go past the cut's (409).
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
  if (changes.pieces !== undefined) {
    const lot = existing.lotId ? await db.collection("lots").findOne({ _id: existing.lotId }) : null;
    const cut = existing.cutId ? await db.collection("stitch_cuts").findOne({ _id: existing.cutId }) : null;
    const { limit, label } = workRefOf({ lot, cut });
    await requirePiecesLeft(db, undefined, {
      ref: existing.lotId ? { lotId: existing.lotId } : { cutId: existing.cutId },
      operationId: existing.operationId,
      operationName: existing.operationName,
      pieces: changes.pieces,
      limit,
      label,
      exceptId: _id,
    });
  }
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
