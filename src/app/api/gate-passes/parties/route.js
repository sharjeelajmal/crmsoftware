import { getDb } from "@/lib/mongodb";
import { route, ok } from "@/lib/api";
import { dispatchParties } from "@/lib/dispatch";

/** GET /api/gate-passes/parties — parties / shops goods were dispatched to before, for the suggestion list (admin). */
export const GET = route(async () => {
  const db = await getDb();
  return ok(await dispatchParties(db));
});
