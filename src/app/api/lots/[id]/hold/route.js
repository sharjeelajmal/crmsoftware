import { withTransaction } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound, conflict } from "@/lib/api";
import { lotHoldSchema } from "@/lib/validation";
import { buildLotEvent, isStopped, lotEvents } from "@/lib/lots";

/**
 * Stop and resume an invoice at any stage (client, 2026-11-09). While stopped nothing moves it on or adds to it:
 * stage actions, gate passes, gate pass out, dispatch, work and cutting edits answer 409 (requireRunning). Reverse
 * and delete still work. Admin only.
 */

/** POST /api/lots/:id/hold  { reason? } — stop the invoice. */
export const POST = route(async (request, context) => {
  const _id = await requireObjectId(context);
  const { reason } = await parseBody(request, lotHoldSchema);
  const { session } = context;

  const updated = await withTransaction(async (db, tx) => {
    const lot = await db.collection("lots").findOne({ _id }, { session: tx });
    if (!lot) throw notFound("Invoice");
    if (isStopped(lot)) throw conflict(`${lot.lotNumber} is already stopped`);
    const now = new Date();
    const hold = { at: now, by: { id: session.sub, name: session.name }, reason };
    await db.collection("lots").updateOne({ _id }, { $set: { hold, updatedAt: now } }, { session: tx });
    await db
      .collection("lot_events")
      .insertOne(buildLotEvent(_id, "stopped", session, { note: reason }), { session: tx });
    return { ...lot, hold, updatedAt: now, events: await lotEvents(db, _id, tx) };
  });

  return ok(updated);
});

/** DELETE /api/lots/:id/hold — resume the invoice where it stopped. */
export const DELETE = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  const { session } = context;

  const updated = await withTransaction(async (db, tx) => {
    const lot = await db.collection("lots").findOne({ _id }, { session: tx });
    if (!lot) throw notFound("Invoice");
    if (!isStopped(lot)) throw conflict(`${lot.lotNumber} is not stopped`);
    const now = new Date();
    await db.collection("lots").updateOne({ _id }, { $unset: { hold: "" }, $set: { updatedAt: now } }, { session: tx });
    await db.collection("lot_events").insertOne(buildLotEvent(_id, "resumed", session), { session: tx });
    return { ...lot, hold: null, updatedAt: now, events: await lotEvents(db, _id, tx) };
  });

  return ok(updated);
});
