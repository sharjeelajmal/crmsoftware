import { getDb } from "@/lib/mongodb";
import { route, ok, created, parseBody, conflict } from "@/lib/api";
import { categorySchema } from "@/lib/validation";

export const GET = route(async () => {
  const db = await getDb();
  const categories = await db.collection("categories").find({}).toArray();
  return ok(categories);
});

/** Same name ignoring case ("Baggy Pent" = "baggy pent"). */
const SAME_NAME = { locale: "en", strength: 2 };

/**
 * POST /api/categories { name } — an article category (Inventory) and, on the Workers page, an operation category
 * that gets its own rate card. A name that differs only in case from an existing one is refused.
 */
export const POST = route(async (request) => {
  const { name } = await parseBody(request, categorySchema);
  const db = await getDb();
  const categories = db.collection("categories");

  const existing = await categories.findOne({ name }, { collation: SAME_NAME });
  if (existing) throw conflict(`Category "${existing.name}" already exists`);

  const { insertedId } = await categories.insertOne({ name, createdAt: new Date() });
  return created({ _id: insertedId, name });
});
