import { withTransaction } from "@/lib/mongodb";
import { route, ok, parseBody } from "@/lib/api";
import { saleAdjustSchema } from "@/lib/validation";
import { currentCustomerBalance } from "@/lib/balances";
import { nextInvoiceNumber } from "@/lib/sales";

const TOLERANCE = 0.01;

/**
 * Sets a customer's total balance to `newTotalBalance` by recording a zero-value
 * "adjustment" sale whose balance is the difference. Keeps the ledger append-only.
 */
export const POST = route(async (request) => {
  const { customerName, customerPhone, newTotalBalance } = await parseBody(request, saleAdjustSchema);

  const result = await withTransaction(async (db, session) => {
    const current = await currentCustomerBalance(db, { customerName, customerPhone });
    const adjustment = newTotalBalance - current;
    if (Math.abs(adjustment) < TOLERANCE) return { adjusted: false };

    const adjustmentSale = {
      invoiceNumber: await nextInvoiceNumber(db, session),
      customerName,
      customerPhone,
      items: [{ desc: "Manual Balance Adjustment", qty: 1, price: 0 }],
      total: 0,
      subTotal: 0,
      others: 0,
      discount: 0,
      receivedAmount: -adjustment,
      balance: adjustment,
      invoiceDate: new Date(),
      isAdjustment: true,
      createdAt: new Date(),
    };
    await db.collection("sales").insertOne(adjustmentSale, { session });
    return { adjusted: true, adjustment };
  });

  return ok({ message: result.adjusted ? "Balance adjusted successfully!" : "No adjustment needed.", ...result });
});
