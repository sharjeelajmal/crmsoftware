import { getDb } from "@/lib/mongodb";
import { route, ok, created, parseBody } from "@/lib/api";
import { vendorSchema } from "@/lib/validation";

export const GET = route(async () => {
  const db = await getDb();
  const vendors = await db.collection("vendors").find({}).sort({ name: 1 }).toArray();
  return ok(vendors);
});

export const POST = route(async (request) => {
  const vendor = await parseBody(request, vendorSchema);
  const db = await getDb();
  const doc = { ...vendor, createdAt: new Date() };
  const { insertedId } = await db.collection("vendors").insertOne(doc);
  return created({ _id: insertedId, ...doc });
});
