import { getDb } from "@/lib/mongodb";
import { route, ok, created, parseBody, parseQuery } from "@/lib/api";
import { expenseSchema, periodQuerySchema } from "@/lib/validation";
import { dateRangeFromFilter, dateQuery } from "@/lib/dates";

/** GET /api/expenses?filter=daily|monthly|yearly|custom&from&to  (default: all) */
export const GET = route(async (request) => {
  const { filter = "all", from, to } = parseQuery(request, periodQuerySchema);
  // A half-filled custom range means "no filter yet" for this page.
  const range = filter === "custom" && !(from && to) ? null : dateRangeFromFilter({ filter, from, to });

  const db = await getDb();
  const expenses = await db.collection("expenses").find(dateQuery("date", range)).sort({ date: -1 }).toArray();
  const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  return ok({ expenses, totalAmount });
});

export const POST = route(async (request) => {
  const expense = await parseBody(request, expenseSchema);
  const db = await getDb();
  const doc = { ...expense, createdAt: new Date() };
  const { insertedId } = await db.collection("expenses").insertOne(doc);
  return created({ _id: insertedId, ...doc });
});
