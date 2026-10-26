import { getDb } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId } from "@/lib/api";
import { fabricReceiptUpdateSchema } from "@/lib/validation";
import { isAdmin } from "@/lib/lots";
import { RECEIPTS, receiptDate, requireEditableReceipt, resolveHolder, roundQty } from "@/lib/fabric";
import { cleanFabricName } from "@/constants/fabric";
import { ALL_ROLES } from "@/constants/roles";

/** PUT /api/fabric/receipts/:id — corrects a receipt (admin, or the cutting master it belongs to). */
export const PUT = route(
  async (request, { session, ...context }) => {
    const _id = await requireObjectId(context);
    const changes = await parseBody(request, fabricReceiptUpdateSchema);
    const db = await getDb();
    const receipt = await requireEditableReceipt(db, _id, session);

    const $set = { updatedAt: new Date() };
    if (changes.day) $set.date = receiptDate(changes.day);
    if (changes.name !== undefined) $set.name = cleanFabricName(changes.name);
    if (changes.qty !== undefined) $set.qty = roundQty(changes.qty);
    if (changes.unit) $set.unit = changes.unit;
    if (changes.note !== undefined) $set.note = changes.note;
    if (changes.holderId && isAdmin(session)) $set.holder = await resolveHolder(db, session, changes.holderId);

    await db.collection(RECEIPTS).updateOne({ _id }, { $set });
    return ok({ ...receipt, ...$set });
  },
  { roles: ALL_ROLES }
);

/** DELETE /api/fabric/receipts/:id — removes a receipt recorded by mistake (admin, or its cutting master). */
export const DELETE = route(
  async (_request, { session, ...context }) => {
    const _id = await requireObjectId(context);
    const db = await getDb();
    await requireEditableReceipt(db, _id, session);
    await db.collection(RECEIPTS).deleteOne({ _id });
    return ok({ deleted: true });
  },
  { roles: ALL_ROLES }
);
