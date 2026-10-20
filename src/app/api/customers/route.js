import { getDb } from "@/lib/mongodb";
import { route, ok, created, parseBody, conflict } from "@/lib/api";
import { customerSchema } from "@/lib/validation";
import { customerKey, fetchNormalCustomers, fetchRegisteredCustomers } from "@/lib/balances";

/**
 * GET /api/customers              -> registered customers with sales totals
 * GET /api/customers?view=normal  -> walk-in customers that only exist in sales
 */
export const GET = route(async (request) => {
  const view = new URL(request.url).searchParams.get("view");
  const db = await getDb();

  if (view === "normal") {
    const registered = await db
      .collection("customers")
      .find({}, { projection: { name: 1, phone: 1 } })
      .toArray();
    const registeredKeys = new Set(registered.map((c) => customerKey(c.name, c.phone)));
    return ok(await fetchNormalCustomers(db, registeredKeys));
  }
  return ok(await fetchRegisteredCustomers(db));
});

export const POST = route(async (request) => {
  const customer = await parseBody(request, customerSchema);
  const db = await getDb();
  const customers = db.collection("customers");

  if (await customers.findOne({ name: customer.name, phone: customer.phone })) {
    throw conflict("A customer with this name and phone already exists");
  }

  const doc = { ...customer, createdAt: new Date() };
  const { insertedId } = await customers.insertOne(doc);
  return created({ _id: insertedId, ...doc });
});
