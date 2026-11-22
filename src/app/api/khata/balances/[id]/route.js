import { getDb } from "@/lib/mongodb";
import { route, ok, requireObjectId, notFound } from "@/lib/api";
import { KHATA_BALANCES } from "@/lib/wages";

/** DELETE /api/khata/balances/:id — admin only. Removes an old balance written in by mistake. */
export const DELETE = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  const db = await getDb();
  const { deletedCount } = await db.collection(KHATA_BALANCES).deleteOne({ _id });
  if (!deletedCount) throw notFound("Balance");
  return ok({ deleted: true });
});
