import { ObjectId } from "mongodb";
import { withTransaction } from "@/lib/mongodb";
import { route, ok, parseBody, notFound, conflict } from "@/lib/api";
import { saleLinkSchema } from "@/lib/validation";

/** Assigns an existing invoice to a salesman and credits its amount to their totals. */
export const POST = route(async (request) => {
  const { invoiceNumber, salesmanId } = await parseBody(request, saleLinkSchema);
  const salesmanObjectId = new ObjectId(salesmanId);

  await withTransaction(async (db, session) => {
    const [sale, salesman] = await Promise.all([
      db.collection("sales").findOne({ invoiceNumber }, { session }),
      db.collection("salesmen").findOne({ _id: salesmanObjectId }, { session, projection: { _id: 1 } }),
    ]);
    if (!sale) throw notFound("Sale with this invoice number");
    if (!salesman) throw notFound("Salesman");
    if (sale.salesmanId) throw conflict("This sale is already assigned to another salesman.");

    await db.collection("sales").updateOne({ _id: sale._id }, { $set: { salesmanId } }, { session });
    await db
      .collection("salesmen")
      .updateOne({ _id: salesmanObjectId }, { $inc: { totalSales: Number(sale.subTotal) || 0 } }, { session });
  });

  return ok({ message: "Sale linked successfully!" });
});
