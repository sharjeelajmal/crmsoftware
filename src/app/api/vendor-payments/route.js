import { getDb } from "@/lib/mongodb";
import { route, created, parseBody } from "@/lib/api";
import { vendorPaymentSchema } from "@/lib/validation";
import { buildVendorPayment, requireVendor } from "@/lib/purchasingLedger";

/** POST /api/vendor-payments  { vendorId, amount, date?, method?, note? } — money paid to a vendor (admin). */
export const POST = route(async (request, { session }) => {
  const input = await parseBody(request, vendorPaymentSchema);
  const db = await getDb();
  const vendor = await requireVendor(db, input.vendorId);
  const doc = buildVendorPayment({ vendor, input, session });
  const { insertedId } = await db.collection("vendor_payments").insertOne(doc);
  return created({ _id: insertedId, ...doc });
});
