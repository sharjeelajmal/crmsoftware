import { Parser } from "json2csv";
import { getDb } from "@/lib/mongodb";
import { route, parseQuery, notFound } from "@/lib/api";
import { periodQuerySchema } from "@/lib/validation";
import { dateRangeFromFilter, dateQuery } from "@/lib/dates";

/** GET /api/backup?filter=today|last7days|thisyear|lifetime -> CSV download of sales line items. */
export const GET = route(async (request) => {
  const { filter = "lifetime" } = parseQuery(request, periodQuerySchema);
  const range = dateRangeFromFilter({ filter });

  const db = await getDb();
  const sales = await db.collection("sales").find(dateQuery("invoiceDate", range)).sort({ invoiceDate: -1 }).toArray();
  if (sales.length === 0) throw notFound("Sales data for the selected period");

  const rows = sales.flatMap((sale) =>
    (sale.items || []).map((item) => ({
      "Invoice #": sale.invoiceNumber,
      Date: new Date(sale.invoiceDate).toLocaleString(),
      "Customer Name": sale.customerName,
      "Customer Phone": sale.customerPhone,
      "Item Description": item.desc,
      Quantity: item.qty,
      Price: item.price,
      "Item Total": (Number(item.qty) || 0) * (Number(item.price) || 0),
      "Sub Total": sale.subTotal,
      Discount: sale.discount,
      "Received Amount": sale.receivedAmount,
      Balance: sale.balance,
    }))
  );

  const csv = new Parser().parse(rows);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales_backup_${filter}.csv"`,
    },
  });
});
