import { ObjectId } from "mongodb";
import { forbidden, notFound } from "@/lib/api";
import { isAdmin } from "@/lib/lots";
import { ROLES } from "@/constants/roles";
import { cleanFabricName } from "@/constants/fabric";
import { dayNoon } from "@/lib/dates";

/**
 * Fabric khata — server helpers. Collection `fabric_receipts` holds the fabric received from the store (one document
 * per receipt); the fabric used is read from the lots (`lot.fabric`). A cutting master sees the fabric they hold:
 * their own receipts and their own cutting entries. Admin sees everyone's, or one cutting master's with `holderId`.
 * The khata maths lives in src/constants/fabric.js.
 */

export const RECEIPTS = "fabric_receipts";

const LOT_FIELDS = {
  lotNumber: 1,
  productName: 1,
  fabric: 1,
  sizes: 1,
  cutQty: 1,
  bundleNumber: 1,
  shrinkage: 1,
  note: 1,
  stage: 1,
  createdBy: 1,
  createdAt: 1,
};

/** Mongo filters for the receipts and lots in view (cutting master: always their own). */
export const fabricScope = (session, holderId) => {
  const id = isAdmin(session) ? holderId : session.sub;
  return id ? { receipts: { "holder.id": id }, lots: { "createdBy.id": id } } : { receipts: {}, lots: {} };
};

export async function loadFabricData(db, scope) {
  const [receipts, lots] = await Promise.all([
    db.collection(RECEIPTS).find(scope.receipts).toArray(),
    db.collection("lots").find(scope.lots, { projection: LOT_FIELDS }).toArray(),
  ]);
  return { receipts, lots };
}

/** Cutting masters the admin can record fabric for and filter by. */
export async function fabricHolders(db) {
  const users = await db
    .collection("users")
    .find({ role: ROLES.CUTTING_MASTER }, { projection: { name: 1, active: 1 } })
    .sort({ name: 1 })
    .toArray();
  return users.map((user) => ({ id: String(user._id), name: user.name ?? "", active: user.active !== false }));
}

/** Who holds the fabric of a receipt: the cutting master the admin picked, else whoever records it. */
export async function resolveHolder(db, session, holderId) {
  if (!isAdmin(session) || !holderId || holderId === session.sub) return { id: session.sub, name: session.name ?? "" };
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(holderId), role: ROLES.CUTTING_MASTER }, { projection: { name: 1 } });
  if (!user) throw notFound("Cutting master");
  return { id: String(user._id), name: user.name ?? "" };
}

/** Receipt day "yyyy-mm-dd" → the stored date (noon of that day). */
export const receiptDate = dayNoon;

export const roundQty = (qty) => Math.round(Number(qty) * 100) / 100;

export const buildFabricReceipt = ({ input, holder, session, now = new Date() }) => ({
  date: receiptDate(input.day),
  name: cleanFabricName(input.name),
  qty: roundQty(input.qty),
  rolls: Math.max(0, Math.trunc(Number(input.rolls)) || 0),
  unit: input.unit || "m",
  note: input.note || "",
  holder,
  createdBy: { id: session?.sub ?? null, name: session?.name ?? "" },
  createdAt: now,
});

/** The receipt, if this user may change it (admin, the cutting master holding it, or whoever recorded it). */
export async function requireEditableReceipt(db, _id, session) {
  const receipt = await db.collection(RECEIPTS).findOne({ _id });
  if (!receipt) throw notFound("Fabric receipt");
  if (!isAdmin(session) && receipt.holder?.id !== session.sub && receipt.createdBy?.id !== session.sub) {
    throw forbidden();
  }
  return receipt;
}
