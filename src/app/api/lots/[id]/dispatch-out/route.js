import { withTransaction } from "@/lib/mongodb";
import { route, created, parseBody, requireObjectId, notFound } from "@/lib/api";
import { dispatchOutSchema } from "@/lib/validation";
import { dispatchReadyLot } from "@/lib/dispatch";

/**
 * POST /api/lots/:id/dispatch-out  { party, sizes: [{ size, qty }], note? } — admin.
 * Ready pieces leave the factory (all of them or a part): out of the Ready stock, with a dispatch gate pass for the
 * party / shop carrying the labour cost of those pieces. Returns the pass and the lot's new dispatch totals.
 */
export const POST = route(async (request, { session, ...context }) => {
  const _id = await requireObjectId(context);
  const { party, sizes, note } = await parseBody(request, dispatchOutSchema);

  const result = await withTransaction(async (db, tx) => {
    const lot = await db.collection("lots").findOne({ _id }, { session: tx });
    if (!lot) throw notFound("Invoice");
    return dispatchReadyLot(db, tx, { lot, party, sizes, note, session });
  });

  return created(result);
});
