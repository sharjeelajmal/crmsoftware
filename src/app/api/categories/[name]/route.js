import { getDb } from "@/lib/mongodb";
import { route, ok, requireParam, notFound } from "@/lib/api";
import { OPERATION_SETS } from "@/lib/operations";

export const DELETE = route(async (_request, context) => {
  const name = await requireParam(context, "name");
  const db = await getDb();
  const { deletedCount } = await db.collection("categories").deleteOne({ name });
  if (deletedCount === 0) throw notFound("Category");
  await db.collection(OPERATION_SETS).deleteOne({ category: name }); // its rate card goes with it
  return ok({ deleted: true });
});
