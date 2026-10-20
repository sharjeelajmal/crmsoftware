import { getDb } from "@/lib/mongodb";
import { route, ok, created, parseBody, conflict } from "@/lib/api";
import { categorySchema } from "@/lib/validation";

export const GET = route(async () => {
  const db = await getDb();
  const categories = await db.collection("categories").find({}).toArray();
  return ok(categories);
});

export const POST = route(async (request) => {
  const { name } = await parseBody(request, categorySchema);
  const db = await getDb();
  const categories = db.collection("categories");

  if (await categories.findOne({ name })) throw conflict(`Category "${name}" already exists`);

  const { insertedId } = await categories.insertOne({ name, createdAt: new Date() });
  return created({ _id: insertedId, name });
});
