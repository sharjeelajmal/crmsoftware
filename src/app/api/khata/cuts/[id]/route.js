import { getDb, withTransaction } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound, conflict } from "@/lib/api";
import { stitchCutUpdateSchema } from "@/lib/validation";
import { STITCH_CUTS, requireFreeCutNumber } from "@/lib/khata";
import { cutListOf } from "@/constants/cutLists";

/** GET /api/khata/cuts/:id — the cut and every piece of work done on it (newest first). Admin only. */
export const GET = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  const db = await getDb();
  const cut = await db.collection(STITCH_CUTS).findOne({ _id });
  if (!cut) throw notFound("Cut");
  const entries = await db.collection("work_entries").find({ cutId: _id }).sort({ date: -1, createdAt: -1 }).toArray();
  return ok({ ...cut, entries });
});

/**
 * PUT /api/khata/cuts/:id  { cutNumber?, article?, pieces?, date?, note? } — a new number or article is written on
 * the cut's work entries too, so lists and wages show it.
 */
export const PUT = route(async (request, context) => {
  const _id = await requireObjectId(context);
  const changes = await parseBody(request, stitchCutUpdateSchema);
  const updated = await withTransaction(async (db, tx) => {
    const cut = await db.collection(STITCH_CUTS).findOne({ _id }, { session: tx });
    if (!cut) throw notFound("Cut");
    if (changes.pieces !== undefined) {
      const [most] = await db
        .collection("work_entries")
        .aggregate(
          [
            { $match: { cutId: _id } },
            { $group: { _id: "$operationId", name: { $first: "$operationName" }, pieces: { $sum: "$pieces" } } },
            { $sort: { pieces: -1 } },
            { $limit: 1 },
          ],
          { session: tx }
        )
        .toArray();
      if (most && most.pieces > changes.pieces) {
        throw conflict(`${most.name} already has ${most.pieces} pcs entered on this cut — it can't have fewer pieces`);
      }
    }
    if (changes.cutNumber !== undefined && changes.cutNumber !== cut.cutNumber) {
      // checked in the cut's own list, which never changes
      await requireFreeCutNumber(db, changes.cutNumber, { exceptId: _id, cutList: cutListOf(cut), session: tx });
    }
    const $set = { ...changes, updatedAt: new Date() };
    if (changes.date !== undefined) $set.date = new Date(changes.date);
    await db.collection(STITCH_CUTS).updateOne({ _id }, { $set }, { session: tx });
    const snapshot = {
      ...(changes.cutNumber !== undefined ? { cutNumber: changes.cutNumber } : {}),
      ...(changes.article !== undefined ? { productName: changes.article } : {}),
    };
    if (Object.keys(snapshot).length) {
      await db.collection("work_entries").updateMany({ cutId: _id }, { $set: snapshot }, { session: tx });
    }
    return { ...cut, ...$set };
  });
  return ok(updated);
});

/** DELETE /api/khata/cuts/:id — only while no work is entered on it. */
export const DELETE = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  const db = await getDb();
  const cut = await db.collection(STITCH_CUTS).findOne({ _id });
  if (!cut) throw notFound("Cut");
  const used = await db.collection("work_entries").countDocuments({ cutId: _id });
  if (used > 0)
    throw conflict(`Cut ${cut.cutNumber} has ${used} work ${used === 1 ? "entry" : "entries"} — remove them first`);
  await db.collection(STITCH_CUTS).deleteOne({ _id });
  return ok({ deleted: true });
});
