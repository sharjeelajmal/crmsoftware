import { getDb } from "@/lib/mongodb";
import { route, ok } from "@/lib/api";
import { loadDashboard } from "@/lib/dashboard";

/** GET /api/dashboard — the factory dashboard in one call (production, stock, spending, wages). Admin only. */
export const GET = route(async (request, { session }) => {
  const db = await getDb();
  const data = await loadDashboard(db);
  return ok({ ...data, viewer: { name: session.name ?? "" } });
});
