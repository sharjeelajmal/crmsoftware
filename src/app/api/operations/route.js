import { getDb } from "@/lib/mongodb";
import { route, ok, created, parseBody, conflict } from "@/lib/api";
import { operationSchema } from "@/lib/validation";
import { perPieceLabour } from "@/constants/wages";

/** GET /api/operations — stitching operations with their per-piece rates, plus the labour cost per piece. */
export const GET = route(async () => {
  const db = await getDb();
  const operations = await db.collection("operations").find({}).sort({ order: 1, name: 1 }).toArray();
  return ok({ operations, perPiece: perPieceLabour(operations) });
});

/** POST /api/operations  { name, rate, order?, active? } */
export const POST = route(async (request) => {
  const input = await parseBody(request, operationSchema);
  const db = await getDb();
  const operations = db.collection("operations");
  const clash = await operations.findOne({ name: input.name });
  if (clash) throw conflict(`Operation "${input.name}" already exists`);
  const now = new Date();
  const order = input.order || (await operations.countDocuments()) + 1;
  const doc = { ...input, order, createdAt: now, updatedAt: now };
  const { insertedId } = await operations.insertOne(doc);
  return created({ _id: insertedId, ...doc });
});
