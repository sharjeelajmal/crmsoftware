import { withTransaction } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound } from "@/lib/api";
import { lotReverseSchema } from "@/lib/validation";
import { lotEvents } from "@/lib/lots";
import { reverseLotReady } from "@/lib/production";

/**
 * POST /api/lots/:id/reverse  { reason }
 * Admin only. Undoes "Ready for Sale": stock goes back out, lot returns to packing, reason kept in history.
 */
export const POST = route(async (request, context) => {
  const _id = await requireObjectId(context);
  const { reason } = await parseBody(request, lotReverseSchema);
  const { session } = context;

  const updated = await withTransaction(async (db, tx) => {
    const lot = await db.collection("lots").findOne({ _id }, { session: tx });
    if (!lot) throw notFound("Invoice");
    const $set = await reverseLotReady(db, tx, { lot, reason, session });
    return { ...lot, ...$set, events: await lotEvents(db, _id, tx) };
  });

  return ok(updated);
});
