import { getDb } from "@/lib/mongodb";
import { route, ok } from "@/lib/api";

const COLLECTIONS = [
  { name: "Sales", collection: "sales" },
  { name: "Customers", collection: "customers" },
  { name: "Products", collection: "products" },
  { name: "Categories", collection: "categories" },
  { name: "Salesmen", collection: "salesmen" },
];

export const GET = route(async () => {
  const db = await getDb();
  const stats = await Promise.all(
    COLLECTIONS.map(async ({ name, collection }) => ({ name, count: await db.collection(collection).countDocuments() }))
  );
  return ok(stats);
});
