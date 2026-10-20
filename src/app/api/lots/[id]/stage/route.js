import { withTransaction } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound, conflict } from "@/lib/api";
import { lotStageActionSchema } from "@/lib/validation";
import { STAGE_ACTIONS, applyStageAction, buildLotEvent, lotEvents } from "@/lib/lots";

/**
 * POST /api/lots/:id/stage  { action: "send_stitching" | "stitched" | "washed", qty?, note? }
 * Admin only. Moves the lot one stage forward and records the event atomically.
 */
export const POST = route(async (request, context) => {
  const _id = await requireObjectId(context);
  const { action, qty, note } = await parseBody(request, lotStageActionSchema);
  const { session } = context;

  const updated = await withTransaction(async (db, tx) => {
    const lot = await db.collection("lots").findOne({ _id }, { session: tx });
    if (!lot) throw notFound("Lot");

    let $set;
    try {
      $set = applyStageAction(lot, action, { qty });
    } catch (err) {
      throw conflict(err.message);
    }
    $set.updatedAt = new Date();

    await db.collection("lots").updateOne({ _id }, { $set }, { session: tx });
    const event = buildLotEvent(_id, STAGE_ACTIONS[action].eventType, session, {
      qty: STAGE_ACTIONS[action].needsQty ? $set[STAGE_ACTIONS[action].qtyField] : null,
      note,
    });
    await db.collection("lot_events").insertOne(event, { session: tx });
    return { ...lot, ...$set, events: await lotEvents(db, _id, tx) };
  });

  return ok(updated);
});
