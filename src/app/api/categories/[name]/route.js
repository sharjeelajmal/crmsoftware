import { getDb } from "@/lib/mongodb";
import { route, ok, requireParam, notFound } from "@/lib/api";

export const DELETE = route(async (_request, context) => {
  const name = await requireParam(context, "name");
  const db = await getDb();
  const { deletedCount } = await db.collection("categories").deleteOne({ name });
  if (deletedCount === 0) throw notFound("Category");
  return ok({ deleted: true });
});
