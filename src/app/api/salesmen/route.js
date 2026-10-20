import { getDb } from "@/lib/mongodb";
import { route, ok, created, parseBody } from "@/lib/api";
import { salesmanSchema } from "@/lib/validation";

export const GET = route(async () => {
  const db = await getDb();
  const salesmen = await db.collection("salesmen").find({}).sort({ createdAt: -1 }).toArray();
  return ok(salesmen);
});

export const POST = route(async (request) => {
  const salesman = await parseBody(request, salesmanSchema);
  const db = await getDb();
  const doc = { ...salesman, totalSales: 0, commissionEarned: 0, createdAt: new Date() };
  const { insertedId } = await db.collection("salesmen").insertOne(doc);
  return created({ _id: insertedId, ...doc });
});
