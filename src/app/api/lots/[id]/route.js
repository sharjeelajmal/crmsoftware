import { ObjectId } from "mongodb";
import { getDb, withTransaction } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound, forbidden, conflict } from "@/lib/api";
import { lotUpdateSchema } from "@/lib/validation";
import { buildLotEvent, canDeleteLot, canEditCutting, canViewLot, cutQtyOf, lotEvents } from "@/lib/lots";
import { ALL_ROLES } from "@/constants/roles";

/** GET /api/lots/:id — lot with its history (owner or admin). */
export const GET = route(
  async (_request, { session, ...context }) => {
    const _id = await requireObjectId(context);
    const db = await getDb();
    const lot = await db.collection("lots").findOne({ _id });
    if (!lot) throw notFound("Lot");
    if (!canViewLot(lot, session)) throw forbidden();
    return ok({ ...lot, events: await lotEvents(db, _id) });
  },
  { roles: ALL_ROLES }
);

/** PUT /api/lots/:id — edit cutting data while the lot is still at the cutting stage. */
export const PUT = route(
  async (request, { session, ...context }) => {
    const _id = await requireObjectId(context);
    const input = await parseBody(request, lotUpdateSchema);

    const updated = await withTransaction(async (db, tx) => {
      const lot = await db.collection("lots").findOne({ _id }, { session: tx });
      if (!lot) throw notFound("Lot");
      if (!canViewLot(lot, session)) throw forbidden();
      if (!canEditCutting(lot, session)) throw conflict("Lot can only be edited before stitching starts");

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
      return { ...lot, ...$set };
    });

    return ok(updated);
  },
  { roles: ALL_ROLES }
);

/** DELETE /api/lots/:id — admin only, only before production started. */
export const DELETE = route(async (_request, { session, ...context }) => {
  const _id = await requireObjectId(context);

  await withTransaction(async (db, tx) => {
    const lot = await db.collection("lots").findOne({ _id }, { session: tx });
    if (!lot) throw notFound("Lot");
    if (!canDeleteLot(lot, session)) throw conflict("Only lots at the cutting stage can be deleted");
    await db.collection("lot_events").deleteMany({ lotId: _id }, { session: tx });
    await db.collection("lots").deleteOne({ _id }, { session: tx });
  });

  return ok({ deleted: true });
});
