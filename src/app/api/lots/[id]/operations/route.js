import { getDb } from "@/lib/mongodb";
import { route, ok, requireObjectId, notFound } from "@/lib/api";
import { allOperations, lotCategory, rateCardOf } from "@/lib/operations";
import { lotOperations } from "@/constants/operations";

/**
 * GET /api/lots/:id/operations — the operations to assign on this lot (admin): the rate card of its article's
 * category, or every active operation when the category has no card (`fromCard: false`).
 */
export const GET = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  const db = await getDb();
  const lot = await db.collection("lots").findOne({ _id }, { projection: { productId: 1 } });
  if (!lot) throw notFound("Invoice");
  const category = await lotCategory(db, lot);
  const [set, operations] = await Promise.all([rateCardOf(db, category), allOperations(db)]);
  return ok({ category, ...lotOperations({ set, operations }) });
});
