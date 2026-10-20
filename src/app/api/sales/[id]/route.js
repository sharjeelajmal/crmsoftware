import { getDb, withTransaction } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound } from "@/lib/api";
import { saleUpdateSchema, cleanSaleItems } from "@/lib/validation";
import { deductStock, restoreStock } from "@/lib/inventory";

export const GET = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  const db = await getDb();
  const sale = await db.collection("sales").findOne({ _id });
  if (!sale) throw notFound("Sale");
  return ok(sale);
});

/** Edits a sale: old items go back to stock, new items come out, all in one transaction. */
export const PUT = route(async (request, context) => {
  const _id = await requireObjectId(context);
  const changes = await parseBody(request, saleUpdateSchema);
  if (changes.items) changes.items = cleanSaleItems(changes.items);

  await withTransaction(async (db, session) => {
    const existing = await db.collection("sales").findOne({ _id }, { session });
    if (!existing) throw notFound("Sale");

    if (changes.items) {
      await restoreStock(db, existing.items, session);
      await deductStock(db, changes.items, session);
    }
    await db.collection("sales").updateOne({ _id }, { $set: { ...changes, updatedAt: new Date() } }, { session });
  });

  return ok({ updated: true });
});

/** Deletes a sale and returns its items to stock. */
export const DELETE = route(async (_request, context) => {
  const _id = await requireObjectId(context);

  await withTransaction(async (db, session) => {
    const existing = await db.collection("sales").findOne({ _id }, { session });
    if (!existing) throw notFound("Sale");
    await restoreStock(db, existing.items, session);
    await db.collection("sales").deleteOne({ _id }, { session });
  });

  return ok({ deleted: true });
});
