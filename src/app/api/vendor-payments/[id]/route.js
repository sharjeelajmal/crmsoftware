import { getDb } from "@/lib/mongodb";
import { route, ok, requireObjectId, notFound } from "@/lib/api";

/** DELETE /api/vendor-payments/:id — removes a payment recorded by mistake (admin). */
export const DELETE = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  const db = await getDb();
  const { deletedCount } = await db.collection("vendor_payments").deleteOne({ _id });
  if (deletedCount === 0) throw notFound("Payment");
  return ok({ deleted: true });
});
