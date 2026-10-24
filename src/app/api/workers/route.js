import { getDb } from "@/lib/mongodb";
import { route, ok, created, parseBody, conflict } from "@/lib/api";
import { workerSchema } from "@/lib/validation";

/** GET /api/workers — every worker (active first, then by name). Admin only. */
export const GET = route(async () => {
  const db = await getDb();
  const workers = await db.collection("workers").find({}).sort({ active: -1, name: 1 }).toArray();
  return ok(workers);
});

/** POST /api/workers  { name, phone?, type?, note?, active? } */
export const POST = route(async (request) => {
  const input = await parseBody(request, workerSchema);
  const db = await getDb();
  const clash = await db.collection("workers").findOne({ name: input.name });
  if (clash) throw conflict(`Worker "${input.name}" already exists`);
  const now = new Date();
  const doc = { ...input, createdAt: now, updatedAt: now };
  const { insertedId } = await db.collection("workers").insertOne(doc);
  return created({ _id: insertedId, ...doc });
});
