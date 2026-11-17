import { withTransaction } from "@/lib/mongodb";
import { route, ok, requireObjectId, notFound } from "@/lib/api";
import { WAGE_PAYMENTS, removePayment } from "@/lib/wages";

/** DELETE /api/wage-payments/:id — admin only. Removes a payment; the work it paid is unpaid again. */
export const DELETE = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  await withTransaction(async (db, tx) => {
    const payment = await db.collection(WAGE_PAYMENTS).findOne({ _id }, { session: tx });
    if (!payment) throw notFound("Payment");
    await removePayment(db, tx, payment);
  });
  return ok({ deleted: true });
});
