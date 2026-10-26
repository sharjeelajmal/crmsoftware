import { getDb } from "@/lib/mongodb";
import { route, ok, parseBody, requireParam } from "@/lib/api";
import { rateCardSchema } from "@/lib/validation";
import { allOperations, saveRateCard } from "@/lib/operations";
import { rateCardItems, rateCardTotal } from "@/constants/operations";

/**
 * PUT /api/operation-sets/:category  { items: [{ operationId, rate }] } — sets the category's rate card: the
 * operations a garment of this category needs and the rate of each (admin). An empty list removes the card.
 * New work entries use these rates; saved wages keep theirs.
 */
export const PUT = route(async (request, { session, ...context }) => {
  const category = await requireParam(context, "category");
  const { items } = await parseBody(request, rateCardSchema);
  const db = await getDb();
  const set = await saveRateCard(db, { category, items, session });
  const joined = rateCardItems(set, await allOperations(db));
  return ok({ category, items: joined, perPiece: rateCardTotal(joined) });
});
