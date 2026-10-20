import { getDb } from "@/lib/mongodb";
import { route, ok, created, parseBody, conflict } from "@/lib/api";
import { productSchema } from "@/lib/validation";
import { withSizeTotals } from "@/lib/inventory";
import { ALL_ROLES } from "@/constants/roles";

/** Product list is readable by every role (the cutting form needs the article list). */
export const GET = route(
  async () => {
    const db = await getDb();
    const products = await db.collection("products").find({}).toArray();
    return ok(products);
  },
  { roles: ALL_ROLES }
);

export const POST = route(async (request) => {
  const product = withSizeTotals(await parseBody(request, productSchema));
  const db = await getDb();
  const products = db.collection("products");

  // Product names are used as the key on sale items, so they must be unique.
  if (await products.findOne({ name: product.name })) throw conflict(`Product "${product.name}" already exists`);

  const doc = { ...product, createdAt: new Date() };
  const { insertedId } = await products.insertOne(doc);
  return created({ _id: insertedId, ...doc });
});
