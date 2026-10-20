import { getClient } from "@/lib/mongodb";
import { route, ok } from "@/lib/api";

/** Health check: pings the database. */
export const GET = route(async () => {
  const client = await getClient();
  await client.db("admin").command({ ping: 1 });
  return ok({ ok: true, message: "Successfully connected to MongoDB" });
});
