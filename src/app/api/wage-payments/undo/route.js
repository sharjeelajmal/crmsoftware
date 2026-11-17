import { ObjectId } from "mongodb";
import { withTransaction } from "@/lib/mongodb";
import { route, ok, parseBody, notFound, conflict } from "@/lib/api";
import { wageUnpaySchema } from "@/lib/validation";
import { unpayEntries } from "@/lib/wages";

/**
 * POST /api/wage-payments/undo  { entryIds }
 * Admin only. Marks chosen work entries unpaid again. An early payment gives back just these entries; a "Pay the
 * rest" payment is undone as a whole (its amount was the period's remainder). Returns { changed, removed }.
 */
export const POST = route(async (request) => {
  const { entryIds } = await parseBody(request, wageUnpaySchema);
  const result = await withTransaction(async (db, tx) => {
    const entries = await db
      .collection("work_entries")
      .find({ _id: { $in: entryIds.map((id) => new ObjectId(id)) } }, { session: tx })
      .toArray();
    if (entries.length !== entryIds.length) throw notFound("Work entry");
    if (!entries.some((entry) => entry.paymentId)) throw conflict("This work is not paid");
    return unpayEntries(db, tx, { entries });
  });
  return ok(result);
});
