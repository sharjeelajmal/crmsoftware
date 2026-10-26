import { getDb } from "@/lib/mongodb";
import { route, ok, parseQuery, badRequest } from "@/lib/api";
import { cuttingReportQuerySchema } from "@/lib/validation";
import { isAdmin } from "@/lib/lots";
import { fabricHolders, fabricScope, loadFabricData } from "@/lib/fabric";
import { dailyCuttingReport } from "@/constants/fabric";
import { ALL_ROLES } from "@/constants/roles";

/**
 * GET /api/fabric/report?day=yyyy-mm-dd&holderId= — the daily cutting report: that day's cutting entries with their
 * remarks, fabric received, and per fabric the opening balance, received, used and in hand at the end of the day.
 */
export const GET = route(
  async (request, { session }) => {
    const { day, holderId } = parseQuery(request, cuttingReportQuerySchema);
    const db = await getDb();
    const [data, holders] = await Promise.all([
      loadFabricData(db, fabricScope(session, holderId)),
      isAdmin(session) ? fabricHolders(db) : [],
    ]);
    const report = dailyCuttingReport({ ...data, day });
    if (!report) throw badRequest("Use a valid yyyy-mm-dd date");
    return ok({ ...report, admin: isAdmin(session), holders });
  },
  { roles: ALL_ROLES }
);
