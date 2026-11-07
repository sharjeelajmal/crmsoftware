import { ObjectId } from "mongodb";
import { badRequest } from "@/lib/api";
import { mergeTeam } from "@/constants/wages";

/**
 * Category rate cards — server helpers. Collection `operation_sets`: one document per category
 * `{ category, items: [{ operationId, rate }], updatedAt, updatedBy }`. The category is the article's inventory
 * category name (products keep it as a string). The rules live in src/constants/operations.js.
 */

export const OPERATION_SETS = "operation_sets";

export const allOperations = (db, session) =>
  db.collection("operations").find({}, { session }).sort({ order: 1, name: 1 }).toArray();

export const rateCardOf = (db, category, session) =>
  category ? db.collection(OPERATION_SETS).findOne({ category }, { session }) : null;

/** Every category name: the inventory list plus any category an article uses that is missing from it. */
export async function categoryNames(db) {
  const [listed, used] = await Promise.all([
    db
      .collection("categories")
      .find({}, { projection: { name: 1 } })
      .toArray(),
    db.collection("products").distinct("category"),
  ]);
  const names = new Set([...listed.map((c) => c.name), ...used].filter((name) => typeof name === "string" && name));
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** The category of the lot's article ("" when the article is gone or has none). */
export async function lotCategory(db, lot, session) {
  if (!lot?.productId) return "";
  const product = await db
    .collection("products")
    .findOne({ _id: new ObjectId(lot.productId) }, { projection: { category: 1 }, session });
  return product?.category || "";
}

/**
 * Category teams (`work_teams`): one document per category `{ category, items: [{ operationId, rows: [{ workerId,
 * weight, payType, amount? }] }], lotNumber, updatedAt, updatedBy }` — the workers last saved for each operation of
 * that category (see the team rules in src/constants/wages.js). Ids are kept as strings.
 */
export const WORK_TEAMS = "work_teams";

export const teamOf = (db, category, session) =>
  category ? db.collection(WORK_TEAMS).findOne({ category }, { session }) : null;

/** Stores the operations of a saved sheet as the category's team; the category's other operations keep theirs. */
export async function rememberTeam(db, { category, items, lot, actor, session }) {
  if (!category || items.length === 0) return;
  const previous = await teamOf(db, category, session);
  await db.collection(WORK_TEAMS).updateOne(
    { category },
    {
      $set: {
        category,
        items: mergeTeam(previous?.items, items),
        lotNumber: lot.lotNumber,
        updatedAt: new Date(),
        updatedBy: actor,
      },
    },
    { upsert: true, session }
  );
}

/** Replaces a category's rate card (an empty list removes it). Every operation must exist. */
export async function saveRateCard(db, { category, items, session }) {
  const ids = items.map((item) => new ObjectId(item.operationId));
  const found = ids.length ? await db.collection("operations").countDocuments({ _id: { $in: ids } }) : 0;
  if (found !== ids.length) throw badRequest("Operation not found");
  const sets = db.collection(OPERATION_SETS);
  if (items.length === 0) {
    await sets.deleteOne({ category });
    return null;
  }
  const doc = {
    category,
    items: items.map((item) => ({ operationId: new ObjectId(item.operationId), rate: Number(item.rate) || 0 })),
    updatedAt: new Date(),
    updatedBy: { id: session?.sub ?? null, name: session?.name ?? "" },
  };
  await sets.updateOne({ category }, { $set: doc }, { upsert: true });
  return doc;
}
