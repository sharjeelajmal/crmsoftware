import { withTransaction } from "@/lib/mongodb";
import { route, ok, requireObjectId, notFound } from "@/lib/api";
import { addStock } from "@/lib/inventory";

/** Deletes a purchase and takes its quantity (per size when recorded) back out of stock atomically. */
export const DELETE = route(async (_request, context) => {
  const _id = await requireObjectId(context);

  await withTransaction(async (db, session) => {
    const purchase = await db.collection("purchases").findOne({ _id }, { session });
    if (!purchase) throw notFound("Purchase");

    await db.collection("purchases").deleteOne({ _id }, { session });
    await addStock(db, purchase.productId, -(Number(purchase.quantity) || 0), { size: purchase.size, session });
  });

  return ok({ deleted: true });
});
