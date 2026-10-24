import { getDb } from "@/lib/mongodb";
import { route, ok, parseQuery } from "@/lib/api";
import { wagesQuerySchema } from "@/lib/validation";
import { advanceAccounts } from "@/constants/wages";
import { advanceEntries } from "@/lib/wages";

/**
 * GET /api/wages/advances[?workerId=] — the advance account (khata) of every worker who ever got an advance:
 * given, cut, left and each entry with the balance after it. All time: an advance is not tied to a wage period.
 */
export const GET = route(async (request) => {
  const { workerId } = parseQuery(request, wagesQuerySchema);
  const db = await getDb();
  return ok(advanceAccounts(await advanceEntries(db, { workerId })));
});
