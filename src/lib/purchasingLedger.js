import { ObjectId } from "mongodb";
import { notFound } from "@/lib/api";

/**
 * Purchasing ledger — server helpers. Collections: `purchases` (debits, untouched here) and `vendor_payments`
 * (credits: money paid to a vendor). The ledger maths lives in src/constants/purchasingLedger.js.
 */

export const actorOf = (session) => ({ id: session?.sub ?? null, name: session?.name ?? "" });

export async function requireVendor(db, vendorId) {
  const vendor = await db.collection("vendors").findOne({ _id: new ObjectId(vendorId) });
  if (!vendor) throw notFound("Vendor");
  return vendor;
}

/** Payment document; the vendor name is copied so the ledger still reads well if the vendor is renamed. */
export const buildVendorPayment = ({ vendor, input, session, now = new Date() }) => ({
  vendorId: vendor._id,
  vendorName: vendor.name,
  amount: Math.round(Number(input.amount) * 100) / 100,
  date: input.date ? new Date(input.date) : now,
  method: input.method || "cash",
  note: input.note || "",
  by: actorOf(session),
  createdAt: now,
});

/** "yyyy-mm-dd" → local midnight / end of that day (server local time, like every other report). */
export const dayStart = (day) => (day ? new Date(`${day}T00:00:00`) : null);
export const dayEnd = (day) => (day ? new Date(`${day}T23:59:59.999`) : null);
