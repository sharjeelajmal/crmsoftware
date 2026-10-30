import { withTransaction } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound, conflict } from "@/lib/api";
import { lotStageActionSchema } from "@/lib/validation";
import { STAGE_ACTIONS, applyStageAction, buildLotEvent, lotEvents } from "@/lib/lots";
import { markLotReady } from "@/lib/production";
import { GATE_PASS_FOR_ACTION, finalWashingPieces } from "@/constants/gatepass";
import { issueGatePass, lotGatePasses } from "@/lib/gatepass";

/**
 * POST /api/lots/:id/stage  { action, qty?, sizes?, note? }
 * Admin only. Moves the lot one stage forward and records the event atomically.
 * `ready` also adds the pieces to the product's stock (see src/lib/production.js).
 * `send_stitching` issues the stitching gate pass, `stitched` the washing gate pass (with `washType`) for the
 * pieces not already sent out with partial passes (POST /api/lots/:id/dispatch); no pass when nothing is left.
 */
export const POST = route(async (request, context) => {
  const _id = await requireObjectId(context);
  const { action, qty, sizes, note, washType } = await parseBody(request, lotStageActionSchema);
  const { session } = context;

  const updated = await withTransaction(async (db, tx) => {
    const lot = await db.collection("lots").findOne({ _id }, { session: tx });
    if (!lot) throw notFound("Invoice");

    let $set;
    if (action === "ready") {
      $set = await markLotReady(db, tx, { lot, qty, sizes, note, session });
    } else {
      try {
        $set = applyStageAction(lot, action, { qty });
      } catch (err) {
        throw conflict(err.message);
      }
      $set.updatedAt = new Date();
      if (action === "stitched" && washType) $set.washType = washType;
      await db.collection("lots").updateOne({ _id }, { $set }, { session: tx });
      const spec = STAGE_ACTIONS[action];
      const event = buildLotEvent(_id, spec.eventType, session, {
        qty: spec.needsQty ? $set[spec.qtyField] : null,
        note,
      });
      await db.collection("lot_events").insertOne(event, { session: tx });
      const passType = GATE_PASS_FOR_ACTION[action];
      const next = { ...lot, ...$set };
      if (passType === "stitching") await issueGatePass(db, tx, { lot: next, type: passType, session });
      if (passType === "washing") {
        const pieces = finalWashingPieces(lot, $set.stitchedQty);
        const partial = pieces < $set.stitchedQty;
        if (pieces > 0) await issueGatePass(db, tx, { lot: next, type: passType, washType, pieces, partial, session });
      }
    }
    return { ...lot, ...$set, events: await lotEvents(db, _id, tx), gatePasses: await lotGatePasses(db, _id, tx) };
  });

  return ok(updated);
});
