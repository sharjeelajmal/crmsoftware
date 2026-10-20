import { getDb } from "@/lib/mongodb";
import { route, ok, created, parseBody, conflict } from "@/lib/api";
import { expenseCategorySchema } from "@/lib/validation";

const COLLECTION = "expense_categories";

export const GET = route(async () => {
  const db = await getDb();
  const categories = await db.collection(COLLECTION).find({}).sort({ name: 1 }).toArray();
  return ok(categories);
});

export const POST = route(async (request) => {
  const { name } = await parseBody(request, expenseCategorySchema);
  const db = await getDb();
  const categories = db.collection(COLLECTION);

  if (await categories.findOne({ name })) throw conflict("Category already exists");

  const doc = { name, createdAt: new Date() };
  const { insertedId } = await categories.insertOne(doc);
  return created({ _id: insertedId, ...doc });
});
