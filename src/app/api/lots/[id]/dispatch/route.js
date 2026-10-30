import { withTransaction } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound, conflict } from "@/lib/api";
import { lotDispatchSchema } from "@/lib/validation";
import { buildLotEvent, lotEvents } from "@/lib/lots";
import { dispatchProblem } from "@/constants/gatepass";
import { issueGatePass, lotGatePasses } from "@/lib/gatepass";

/**
 * POST /api/lots/:id/dispatch  { pieces, washType?, note? }
 * Admin only. Sends part of a lot out of stitching to washing: issues a washing gate pass for `pieces`,
 * adds them to `stitchOutQty` and records a "dispatched" event. The lot stays in stitching until
 * "Stitching received" closes it; the balance (cut − sent out) is what is still lying in stitching.
 */
export const POST = route(async (request, context) => {
  const _id = await requireObjectId(context);
  const { pieces, washType, note } = await parseBody(request, lotDispatchSchema);
  const { session } = context;

  const result = await withTransaction(async (db, tx) => {
    const lot = await db.collection("lots").findOne({ _id }, { session: tx });
    if (!lot) throw notFound("Invoice");
    const problem = dispatchProblem(lot, pieces);
    if (problem) throw conflict(problem);

    const pass = await issueGatePass(db, tx, {
      lot: { ...lot, washType: washType || lot.washType || "" },
      type: "washing",
      washType,
      pieces,
      partial: true,
      session,
    });
    const $set = { updatedAt: new Date(), ...(washType ? { washType } : {}) };
    await db.collection("lots").updateOne({ _id }, { $inc: { stitchOutQty: pieces }, $set }, { session: tx });
    const eventNote = [pass.number, washType, note].filter(Boolean).join(" · ");
    await db
      .collection("lot_events")
      .insertOne(buildLotEvent(_id, "dispatched", session, { qty: pieces, note: eventNote }), { session: tx });

    const stitchOutQty = (Number(lot.stitchOutQty) || 0) + pieces;
    return {
      lot: {
        ...lot,
        ...$set,
        stitchOutQty,
        events: await lotEvents(db, _id, tx),
        gatePasses: await lotGatePasses(db, _id, tx),
      },
      pass,
    };
  });

  return ok(result);
});
