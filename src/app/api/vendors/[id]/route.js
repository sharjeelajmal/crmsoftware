import { getDb } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound } from "@/lib/api";
import { vendorUpdateSchema } from "@/lib/validation";

export const PUT = route(async (request, context) => {
  const _id = await requireObjectId(context);
  const changes = await parseBody(request, vendorUpdateSchema);
  const db = await getDb();

  const { matchedCount } = await db
    .collection("vendors")
    .updateOne({ _id }, { $set: { ...changes, updatedAt: new Date() } });
  if (matchedCount === 0) throw notFound("Vendor");
  return ok({ updated: true });
});

export const DELETE = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  const db = await getDb();
  const { deletedCount } = await db.collection("vendors").deleteOne({ _id });
  if (deletedCount === 0) throw notFound("Vendor");
  return ok({ deleted: true });
});
