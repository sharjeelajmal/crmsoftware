import { getDb } from "@/lib/mongodb";
import { route, ok, requireParam, notFound, conflict } from "@/lib/api";

export const DELETE = route(async (_request, context) => {
  const name = await requireParam(context, "name");
  const db = await getDb();

  const linked = await db.collection("expenses").countDocuments({ category: name });
  if (linked > 0) throw conflict(`Cannot delete category "${name}" as it has ${linked} associated expenses.`);

  const { deletedCount } = await db.collection("expense_categories").deleteOne({ name });
  if (deletedCount === 0) throw notFound("Category");
  return ok({ deleted: true });
});
