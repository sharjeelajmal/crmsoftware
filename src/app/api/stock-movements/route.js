import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { route, ok, parseQuery } from "@/lib/api";
import { objectId } from "@/lib/validation";

const querySchema = z.object({
  productId: objectId.optional(),
  lotId: objectId.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

/** GET /api/stock-movements?productId=&lotId=&limit=  — production stock audit trail (admin). */
export const GET = route(async (request) => {
  const { productId, lotId, limit } = parseQuery(request, querySchema);
  const query = {};
  if (productId) query.productId = new ObjectId(productId);
  if (lotId) query.lotId = new ObjectId(lotId);

  const db = await getDb();
  const movements = await db.collection("stock_movements").find(query).sort({ at: -1 }).limit(limit).toArray();
  return ok(movements);
});
