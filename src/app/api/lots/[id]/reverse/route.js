import { withTransaction } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound, conflict } from "@/lib/api";
import { lotReverseSchema } from "@/lib/validation";
import { buildLotEvent, lotEvents, reversePlan } from "@/lib/lots";
import { STAGE_LABELS } from "@/constants/lots";
import { reverseLotReady } from "@/lib/production";
import { cancelGatePasses, lotGatePasses } from "@/lib/gatepass";

/**
 * POST /api/lots/:id/reverse  { reason }
 * Admin only. Takes the invoice back one stage from wherever it is (client, 2026-11-09), undoing the last move:
 * at ready the pieces go back out of stock (not once any were dispatched); earlier, the quantities that move recorded
 * are cleared and the gate passes it issued are marked cancelled (see reversePlan). Work entries stay. The reason is
 * kept in the history. Works on a stopped invoice too.
 */
export const POST = route(async (request, context) => {
  const _id = await requireObjectId(context);
  const { reason } = await parseBody(request, lotReverseSchema);
  const { session } = context;

  const updated = await withTransaction(async (db, tx) => {
    const lot = await db.collection("lots").findOne({ _id }, { session: tx });
    if (!lot) throw notFound("Invoice");
    if (lot.stage === "ready") {
      const $set = await reverseLotReady(db, tx, { lot, reason, session });
      return { ...lot, ...$set, events: await lotEvents(db, _id, tx), gatePasses: await lotGatePasses(db, _id, tx) };
    }

    const [passes, events] = [await lotGatePasses(db, _id, tx), await lotEvents(db, _id, tx)];
    const plan = reversePlan(lot, passes, events);
    if (plan.problem) throw conflict(plan.problem);

    const $set = { ...plan.set, updatedAt: new Date() };
    await db.collection("lots").updateOne({ _id }, { $set }, { session: tx });
    await cancelGatePasses(db, tx, plan.cancel, { reason, session });
    const cancelled = plan.cancel.map((pass) => pass.number).join(", ");
    const note = [`Back to ${STAGE_LABELS[plan.to]}`, cancelled && `cancelled ${cancelled}`, reason]
      .filter(Boolean)
      .join(" · ");
    await db.collection("lot_events").insertOne(buildLotEvent(_id, "stepped_back", session, { note }), { session: tx });
    return { ...lot, ...$set, events: await lotEvents(db, _id, tx), gatePasses: await lotGatePasses(db, _id, tx) };
  });

  return ok(updated);
});
