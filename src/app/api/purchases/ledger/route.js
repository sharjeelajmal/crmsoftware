import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { route, ok, parseQuery } from "@/lib/api";
import { purchaseLedgerQuerySchema } from "@/lib/validation";
import { buildVendorLedger, vendorBalances } from "@/constants/purchasingLedger";
import { dayEnd, dayStart } from "@/lib/purchasingLedger";

/**
 * GET /api/purchases/ledger?vendorId=&from=yyyy-mm-dd&to=yyyy-mm-dd — vendor khata (admin).
 * Opening balance before `from`, every purchase (debit) and payment (credit) in the period with the running balance,
 * period totals, and what is payable to each vendor (all time). Dates are filtered in code so purchases saved with
 * older date formats still count.
 */
export const GET = route(async (request) => {
  const { vendorId, from, to } = parseQuery(request, purchaseLedgerQuerySchema);
  // Purchases keep the vendor id as the string the form sent; payments store an ObjectId. Match both.
  const purchaseScope = vendorId ? { vendorId: { $in: [vendorId, new ObjectId(vendorId)] } } : {};
  const paymentScope = vendorId ? { vendorId: new ObjectId(vendorId) } : {};
  const db = await getDb();
  const [purchases, payments, allPurchases, allPayments] = await Promise.all([
    db.collection("purchases").find(purchaseScope).toArray(),
    db.collection("vendor_payments").find(paymentScope).toArray(),
    vendorId
      ? db
          .collection("purchases")
          .find({}, { projection: { vendorId: 1, vendorName: 1, totalCost: 1, quantity: 1, costPerItem: 1 } })
          .toArray()
      : null,
    vendorId ? db.collection("vendor_payments").find({}).toArray() : null,
  ]);
  const ledger = buildVendorLedger({ purchases, payments, from: dayStart(from), to: dayEnd(to) });
  const balances = vendorBalances({ purchases: allPurchases ?? purchases, payments: allPayments ?? payments });
  return ok({ vendorId: vendorId ?? null, from: from ?? null, to: to ?? null, ...ledger, balances });
});
