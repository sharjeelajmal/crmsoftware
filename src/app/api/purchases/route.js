import { ObjectId } from "mongodb";
import { getDb, withTransaction } from "@/lib/mongodb";
import { route, ok, created, parseBody, parseQuery, notFound } from "@/lib/api";
import { purchaseSchema, periodQuerySchema } from "@/lib/validation";
import { dateRangeFromFilter, dateQuery } from "@/lib/dates";
import { addStock } from "@/lib/inventory";

/** GET /api/purchases?filter=daily|monthly|yearly  (default: all) */
export const GET = route(async (request) => {
  const { filter = "all" } = parseQuery(request, periodQuerySchema);
  const range = dateRangeFromFilter({ filter });
  const db = await getDb();
  const purchases = await db
    .collection("purchases")
    .find(dateQuery("purchaseDate", range))
    .sort({ purchaseDate: -1 })
    .toArray();
  return ok(purchases);
});

/** Records a purchase and adds the quantity to the product's stock (per size when given) atomically. */
export const POST = route(async (request) => {
  const input = await parseBody(request, purchaseSchema);
  const productId = new ObjectId(input.productId);
  const vendorId = new ObjectId(input.vendorId);

  const purchase = await withTransaction(async (db, session) => {
    const [product, vendor] = await Promise.all([
      db.collection("products").findOne({ _id: productId }, { session }),
      db.collection("vendors").findOne({ _id: vendorId }, { session }),
    ]);
    if (!product) throw notFound("Product");
    if (!vendor) throw notFound("Vendor");

    const doc = {
      ...input,
      productName: product.name,
      vendorName: vendor.name,
      totalCost: input.quantity * input.costPerItem,
      createdAt: new Date(),
    };
    const { insertedId } = await db.collection("purchases").insertOne(doc, { session });
    await addStock(db, productId, input.quantity, { size: input.size, session });
    await db
      .collection("products")
      .updateOne({ _id: productId }, { $set: { purchasePrice: input.costPerItem } }, { session });
    return { _id: insertedId, ...doc };
  });

  return created(purchase);
});
