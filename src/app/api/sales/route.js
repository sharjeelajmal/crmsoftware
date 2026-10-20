import { getDb, withTransaction } from "@/lib/mongodb";
import { route, ok, created, parseBody, parseQuery, escapeRegex } from "@/lib/api";
import { saleSchema, salesQuerySchema, cleanSaleItems } from "@/lib/validation";
import { deductStock } from "@/lib/inventory";
import { invoiceNumberExists, nextInvoiceNumber } from "@/lib/sales";

/** GET /api/sales?customerName=&salesmanId=  (newest first) */
export const GET = route(async (request) => {
  const { customerName, salesmanId } = parseQuery(request, salesQuerySchema);
  const query = {};
  if (customerName) query.customerName = { $regex: `^${escapeRegex(customerName)}$`, $options: "i" };
  if (salesmanId) query.salesmanId = salesmanId;

  const db = await getDb();
  const sales = await db.collection("sales").find(query).sort({ invoiceDate: -1 }).toArray();
  return ok(sales);
});

/**
 * Creates a sale and deducts stock in one transaction.
 * If the client-side invoice number is already taken (two cashiers at once),
 * the next free number is assigned and returned in the response.
 */
export const POST = route(async (request) => {
  const input = await parseBody(request, saleSchema);
  const items = cleanSaleItems(input.items);

  const sale = await withTransaction(async (db, session) => {
    const invoiceNumber = (await invoiceNumberExists(db, input.invoiceNumber, session))
      ? await nextInvoiceNumber(db, session)
      : input.invoiceNumber;

    const doc = { ...input, invoiceNumber, items, createdAt: new Date() };
    const { insertedId } = await db.collection("sales").insertOne(doc, { session });
    await deductStock(db, items, session);
    return { _id: insertedId, ...doc };
  });

  return created(sale);
});
