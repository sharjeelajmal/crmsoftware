import { getDb } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound } from "@/lib/api";
import { customerUpdateSchema } from "@/lib/validation";

export const PUT = route(async (request, context) => {
  const _id = await requireObjectId(context);
  const changes = await parseBody(request, customerUpdateSchema);
  const db = await getDb();

  const { matchedCount } = await db
    .collection("customers")
    .updateOne({ _id }, { $set: { ...changes, updatedAt: new Date() } });
  if (matchedCount === 0) throw notFound("Customer");
  return ok({ updated: true });
});

export const DELETE = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  const db = await getDb();
  const { deletedCount } = await db.collection("customers").deleteOne({ _id });
  if (deletedCount === 0) throw notFound("Customer");
  return ok({ deleted: true });
});
