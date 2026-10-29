import { getDb } from "@/lib/mongodb";
import { route, created, parseBody } from "@/lib/api";
import { fabricReceiptSchema } from "@/lib/validation";
import { RECEIPTS, buildFabricReceipt, resolveHolder } from "@/lib/fabric";
import { ALL_ROLES } from "@/constants/roles";

/**
 * POST /api/fabric/receipts  { day, name, qty, rolls?, unit?, note?, holderId? } — fabric received from the store.
 * Cutting master: always for themselves. Admin: for the cutting master in `holderId` (default: themselves).
 */
export const POST = route(
  async (request, { session }) => {
    const input = await parseBody(request, fabricReceiptSchema);
    const db = await getDb();
    const holder = await resolveHolder(db, session, input.holderId);
    const doc = buildFabricReceipt({ input, holder, session });
    const { insertedId } = await db.collection(RECEIPTS).insertOne(doc);
    return created({ _id: insertedId, ...doc });
  },
  { roles: ALL_ROLES }
);
