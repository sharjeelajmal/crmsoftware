import { ObjectId } from "mongodb";
import { getDb, withTransaction } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound, forbidden, conflict } from "@/lib/api";
import { lotUpdateSchema } from "@/lib/validation";
import {
  buildLotEvent,
  canEditCutting,
  canViewLot,
  cutQtyOf,
  deleteProblem,
  isAdmin,
  lotEvents,
  requireRunning,
} from "@/lib/lots";
import { returnReadyStock } from "@/lib/production";
import { CUTTING_EVENT_TYPES } from "@/constants/lots";
import { issueGatePass } from "@/lib/gatepass";
import { cuttingPassChanged } from "@/constants/gatepass";
import { ALL_ROLES } from "@/constants/roles";

/** GET /api/lots/:id — lot with its history (owner or admin; a cutting master only gets the cutting entries). */
export const GET = route(
  async (_request, { session, ...context }) => {
    const _id = await requireObjectId(context);
    const db = await getDb();
    const lot = await db.collection("lots").findOne({ _id });
    if (!lot) throw notFound("Invoice");
    if (!canViewLot(lot, session)) throw forbidden();
    const events = await lotEvents(db, _id);
    return ok({
      ...lot,
      events: isAdmin(session) ? events : events.filter((event) => CUTTING_EVENT_TYPES.includes(event.type)),
    });
  },
  { roles: ALL_ROLES }
);

/**
 * PUT /api/lots/:id — edit cutting data while the lot is still at the cutting stage.
 * A change to anything printed on the cutting gate pass issues a fresh one (printed numbers never change).
 */
export const PUT = route(
  async (request, { session, ...context }) => {
    const _id = await requireObjectId(context);
    const input = await parseBody(request, lotUpdateSchema);

    const updated = await withTransaction(async (db, tx) => {
      const lot = await db.collection("lots").findOne({ _id }, { session: tx });
      if (!lot) throw notFound("Invoice");
      if (!canViewLot(lot, session)) throw forbidden();
      requireRunning(lot);
      if (!canEditCutting(lot, session)) throw conflict("Invoice can only be edited before stitching starts");

      const $set = { updatedAt: new Date() };
      if (input.productId) {
        const product = await db
          .collection("products")
          .findOne({ _id: new ObjectId(input.productId) }, { session: tx });
        if (!product) throw notFound("Product");
        $set.productId = product._id;
        $set.productName = product.name;
      }
      if (input.fabric)
        $set.fabric = { name: input.fabric.name, qty: Number(input.fabric.qty) || 0, unit: input.fabric.unit || "m" };
      if (input.sizes) {
        $set.sizes = input.sizes.map((s) => ({ size: s.size, qty: Math.trunc(Number(s.qty)) || 0 }));
        $set.cutQty = cutQtyOf($set.sizes);
      }
      if (input.bundleNumber !== undefined) $set.bundleNumber = input.bundleNumber;
      if (input.shrinkage !== undefined) $set.shrinkage = input.shrinkage;
      if (input.note !== undefined) $set.note = input.note;

      await db.collection("lots").updateOne({ _id }, { $set }, { session: tx });
      await db
        .collection("lot_events")
        .insertOne(buildLotEvent(_id, "edited", session, { qty: $set.cutQty ?? lot.cutQty }), { session: tx });
      const next = { ...lot, ...$set };
      const gatePasses = cuttingPassChanged(lot, next)
        ? [await issueGatePass(db, tx, { lot: next, type: "cutting", action: "cutting", session })]
        : [];
      return { ...next, gatePasses };
    });

    return ok(updated);
  },
  { roles: ALL_ROLES }
);

/**
 * DELETE /api/lots/:id — admin only, at any stage (client, 2026-11-09), in one transaction: pieces still in stock go
 * back out, and its history, gate passes and work entries (wages) are removed. Loose items / B-pair entries stay in
 * the register without the link. Refused once pieces were dispatched (deleteProblem). Returns what was removed.
 */
export const DELETE = route(async (_request, { session, ...context }) => {
  const _id = await requireObjectId(context);

  const removed = await withTransaction(async (db, tx) => {
    const lot = await db.collection("lots").findOne({ _id }, { session: tx });
    if (!lot) throw notFound("Invoice");
    const problem = deleteProblem(lot);
    if (problem) throw conflict(problem);

    const stockReturned = lot.stockApplied
      ? await returnReadyStock(db, tx, { lot, note: `${lot.lotNumber} deleted`, session, ifArticleExists: true })
      : 0;
    const passes = await db.collection("gate_passes").deleteMany({ lotId: _id }, { session: tx });
    const work = await db.collection("work_entries").deleteMany({ lotId: _id }, { session: tx });
    await db.collection("lot_events").deleteMany({ lotId: _id }, { session: tx });
    await db
      .collection("ledger_entries")
      .updateMany({ lotId: _id }, { $set: { lotId: null, updatedAt: new Date() } }, { session: tx });
    await db
      .collection("products")
      .updateMany({ "lastProduction.lotId": _id }, { $unset: { lastProduction: "" } }, { session: tx });
    await db.collection("lots").deleteOne({ _id }, { session: tx });
    return { gatePasses: passes.deletedCount, workEntries: work.deletedCount, stockReturned };
  });

  return ok({ deleted: true, ...removed });
});
