/** Sale-related server helpers shared by several routes. */

/** Highest invoice number so far (0 when there are no sales). */
export async function latestInvoiceNumber(db, session) {
  const [latest] = await db
    .collection("sales")
    .find({}, { projection: { invoiceNumber: 1 }, session })
    .sort({ invoiceNumber: -1 })
    .limit(1)
    .toArray();
  return latest?.invoiceNumber || 0;
}

export const nextInvoiceNumber = async (db, session) => (await latestInvoiceNumber(db, session)) + 1;

export const invoiceNumberExists = async (db, invoiceNumber, session) =>
  Boolean(await db.collection("sales").findOne({ invoiceNumber }, { projection: { _id: 1 }, session }));

/** Profit of one sale = Σ (sale price − purchase price) × qty − discount. */
export function saleProfit(sale, purchasePriceByProductName) {
  const itemsProfit = (sale.items || []).reduce((sum, item) => {
    const purchasePrice = purchasePriceByProductName.get(item.desc) || 0;
    return sum + ((Number(item.price) || 0) - purchasePrice) * (Number(item.qty) || 0);
  }, 0);
  return itemsProfit - (Number(sale.discount) || 0);
}

export const saleRevenue = (sale) => Number(sale.total ?? sale.subTotal) || 0;
