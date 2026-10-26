import { ObjectId } from "mongodb";
import { getDb, withTransaction } from "@/lib/mongodb";
import { route, ok, created, parseBody, parseQuery, notFound } from "@/lib/api";
import { lotCreateSchema, lotsQuerySchema } from "@/lib/validation";
import { buildLot, buildLotEvent, isAdmin, nextLotSeq } from "@/lib/lots";
import { issueGatePass } from "@/lib/gatepass";
import { ALL_ROLES } from "@/constants/roles";

/**
 * GET /api/lots?stage=&mine=1&productId=
 * Admin: all lots (or own with mine=1). Cutting master: always only own lots.
 */
export const GET = route(
  async (request, { session }) => {
    const { stage, mine, productId } = parseQuery(request, lotsQuerySchema);
    const query = {};
    if (stage) query.stage = stage;
    if (productId) query.productId = new ObjectId(productId);
    if (!isAdmin(session) || mine) query["createdBy.id"] = session.sub;

    const db = await getDb();
    const lots = await db.collection("lots").find(query).sort({ createdAt: -1 }).toArray();
    return ok(lots);
  },
  { roles: ALL_ROLES }
);

/** POST /api/lots — cutting entry (cutting master or admin). Issues the lot's cutting gate pass with it. */
export const POST = route(
  async (request, { session }) => {
    const input = await parseBody(request, lotCreateSchema);

    const lot = await withTransaction(async (db, session_) => {
      const product = await db
        .collection("products")
        .findOne({ _id: new ObjectId(input.productId) }, { session: session_ });
      if (!product) throw notFound("Product");

      const seq = await nextLotSeq(db, session_);
      const doc = buildLot({ input, product, seq, session });
      const { insertedId } = await db.collection("lots").insertOne(doc, { session: session_ });
      await db
        .collection("lot_events")
        .insertOne(buildLotEvent(insertedId, "created", session, { qty: doc.cutQty, note: doc.note }), {
          session: session_,
        });
      const lot = { _id: insertedId, ...doc };
      const pass = await issueGatePass(db, session_, { lot, type: "cutting", session });
      return { ...lot, gatePasses: [pass] };
    });

    return created(lot);
  },
  { roles: ALL_ROLES }
);
