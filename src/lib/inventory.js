import { ObjectId } from "mongodb";

/**
 * Stock helpers. A product keeps a total `remaining` and, optionally, per-size stock in
 * `sizes: [{ size, remaining }]`. Every change goes through here so total and sizes stay in sync.
 *
 * Sale items carry `productId` (new records) or only the product name in `desc` (legacy),
 * and optionally a `size`.
 */

export const totalOfSizes = (sizes = []) => sizes.reduce((sum, s) => sum + (Math.trunc(Number(s.remaining)) || 0), 0);

/** Normalises a product's sizes array; when sizes exist the total is derived from them. */
export function withSizeTotals(product) {
  if (!Array.isArray(product.sizes) || product.sizes.length === 0) return product;
  const sizes = product.sizes.map((s) => ({
    size: String(s.size).trim(),
    remaining: Math.trunc(Number(s.remaining)) || 0,
  }));
  return { ...product, sizes, remaining: totalOfSizes(sizes) };
}

const productFilter = (item) =>
  item.productId && ObjectId.isValid(item.productId) ? { _id: new ObjectId(item.productId) } : { name: item.desc };

const sellableItems = (items = []) => items.filter((item) => item.desc && Number(item.qty) > 0);

/**
 * Builds the bulkWrite operations for a stock change (pure, so it is unit-testable).
 * @param {Array} items  [{ desc, qty, productId?, size? }]
 * @param {1|-1} direction  -1 when selling, +1 when reverting / receiving
 */
export function stockChangeOps(items, direction) {
  const ops = [];
  for (const item of sellableItems(items)) {
    const qty = direction * Math.trunc(Number(item.qty));
    const filter = productFilter(item);
    ops.push({ updateOne: { filter, update: { $inc: { remaining: qty } } } });
    if (item.size) {
      ops.push({
        updateOne: {
          filter: { ...filter, "sizes.size": item.size },
          update: { $inc: { "sizes.$.remaining": qty } },
        },
      });
    }
  }
  return ops;
}

/**
 * @param {import("mongodb").Db} db
 * @param {Array} items
 * @param {1|-1} direction
 * @param {import("mongodb").ClientSession=} session
 */
export async function applyStockChange(db, items, direction, session) {
  const ops = stockChangeOps(items, direction);
  if (ops.length === 0) return;
  await db.collection("products").bulkWrite(ops, { session, ordered: true });
}

export const deductStock = (db, items, session) => applyStockChange(db, items, -1, session);
export const restoreStock = (db, items, session) => applyStockChange(db, items, +1, session);

/**
 * Adds `qty` to one product (purchases, production). With a `size`, the matching size row is
 * incremented, or created when the product tracks sizes but doesn't have this one yet.
 */
export async function addStock(db, productId, qty, { size, session } = {}) {
  const _id = new ObjectId(productId);
  const products = db.collection("products");
  const amount = Math.trunc(Number(qty)) || 0;
  if (amount === 0) return;

  await products.updateOne({ _id }, { $inc: { remaining: amount }, $set: { updatedAt: new Date() } }, { session });
  if (!size) return;

  const { matchedCount } = await products.updateOne(
    { _id, "sizes.size": size },
    { $inc: { "sizes.$.remaining": amount } },
    { session }
  );
  if (matchedCount === 0) {
    await products.updateOne({ _id }, { $push: { sizes: { size, remaining: amount } } }, { session });
  }
}

/**
 * Append-only audit trail of stock changes made by production (and, later, other sources).
 * `movement`: { productId, productName, qty (+/-), size?, reason: "lot_ready" | "lot_reversed" | "lot_dispatch",
 *               lotId, lotNumber, by: { id, name } }
 */
export async function recordStockMovement(db, movement, session) {
  await db.collection("stock_movements").insertOne({ ...movement, at: new Date() }, { session });
}
