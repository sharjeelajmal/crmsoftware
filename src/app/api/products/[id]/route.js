import { getDb } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound, conflict } from "@/lib/api";
import { productUpdateSchema } from "@/lib/validation";
import { withSizeTotals } from "@/lib/inventory";

/**
 * Updates a product. Sending `sizes` replaces the size list and recomputes `remaining`;
 * sending only `remaining` adjusts the total of an unsized product (inventory +/- popup).
 */
export const PUT = route(async (request, context) => {
  const _id = await requireObjectId(context);
  const changes = withSizeTotals(await parseBody(request, productUpdateSchema));
  const db = await getDb();
  const products = db.collection("products");

  if (changes.name) {
    const clash = await products.findOne({ _id: { $ne: _id }, name: changes.name });
    if (clash) throw conflict(`Product "${changes.name}" already exists`);
  }

  const { matchedCount } = await products.updateOne({ _id }, { $set: { ...changes, updatedAt: new Date() } });
  if (matchedCount === 0) throw notFound("Product");
  return ok({ updated: true, ...changes });
});

export const DELETE = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  const db = await getDb();

  const openLots = await db.collection("lots").countDocuments({ productId: _id, stage: { $ne: "ready" } });
  if (openLots > 0) throw conflict(`This product has ${openLots} invoice(s) in production and cannot be deleted`);

  const { deletedCount } = await db.collection("products").deleteOne({ _id });
  if (deletedCount === 0) throw notFound("Product");
  return ok({ deleted: true });
});
