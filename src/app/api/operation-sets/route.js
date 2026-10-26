import { getDb } from "@/lib/mongodb";
import { route, ok } from "@/lib/api";
import { OPERATION_SETS, allOperations, categoryNames } from "@/lib/operations";
import { rateCardItems, rateCardTotal } from "@/constants/operations";

/**
 * GET /api/operation-sets — every category with its rate card (operations, rate of each, labour per piece) and how
 * many articles use it (admin).
 */
export const GET = route(async () => {
  const db = await getDb();
  const [names, sets, operations, articles] = await Promise.all([
    categoryNames(db),
    db.collection(OPERATION_SETS).find({}).toArray(),
    allOperations(db),
    db
      .collection("products")
      .aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }])
      .toArray(),
  ]);
  const setOf = new Map(sets.map((set) => [set.category, set]));
  const articlesOf = new Map(articles.map((row) => [row._id, row.count]));
  const categories = names.map((category) => {
    const items = rateCardItems(setOf.get(category), operations);
    return { category, articles: articlesOf.get(category) ?? 0, items, perPiece: rateCardTotal(items) };
  });
  return ok({ categories });
});
