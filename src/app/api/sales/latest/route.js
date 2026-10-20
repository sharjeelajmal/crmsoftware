import { getDb } from "@/lib/mongodb";
import { route, ok } from "@/lib/api";
import { latestInvoiceNumber } from "@/lib/sales";

export const GET = route(async () => {
  const db = await getDb();
  return ok({ latestInvoiceNumber: await latestInvoiceNumber(db) });
});
