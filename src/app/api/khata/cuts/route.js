import { getDb } from "@/lib/mongodb";
import { route, ok, created, parseBody } from "@/lib/api";
import { stitchCutSchema } from "@/lib/validation";
import { STITCH_CUTS, buildCut, cutTotals, requireFreeCutNumber } from "@/lib/khata";

/** GET /api/khata/cuts — every cut of the stitching khata, newest first, with its work so far. Admin only. */
export const GET = route(async () => {
  const db = await getDb();
  const cuts = await db.collection(STITCH_CUTS).find({}).sort({ date: -1, createdAt: -1 }).toArray();
  const totals = await cutTotals(
    db,
    cuts.map((cut) => cut._id)
  );
  const none = { entries: 0, workers: 0, amount: 0, unpaid: 0 };
  return ok(cuts.map((cut) => ({ ...cut, ...(totals.get(String(cut._id)) ?? none) })));
});

/** POST /api/khata/cuts  { cutNumber, article?, pieces?, date?, note? } — the owner adds a cut himself. */
export const POST = route(async (request, { session }) => {
  const input = await parseBody(request, stitchCutSchema);
  const db = await getDb();
  await requireFreeCutNumber(db, input.cutNumber);
  const doc = buildCut({ input, session });
  const { insertedId } = await db.collection(STITCH_CUTS).insertOne(doc);
  return created({ _id: insertedId, ...doc, entries: 0, workers: 0, amount: 0, unpaid: 0 });
});
