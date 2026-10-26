import { getDb } from "@/lib/mongodb";
import { route, ok, parseQuery } from "@/lib/api";
import { attendanceMonthQuerySchema } from "@/lib/validation";
import { loadWorkers, monthMarks } from "@/lib/attendance";
import { monthDays, monthRegister } from "@/constants/attendance";

/** GET /api/attendance/month?month=yyyy-mm — the attendance register: every worker × every day, counts and cuts (admin). */
export const GET = route(async (request) => {
  const { month } = parseQuery(request, attendanceMonthQuerySchema);
  const db = await getDb();
  const [workers, records] = await Promise.all([loadWorkers(db), monthMarks(db, monthDays(month))]);
  return ok(monthRegister(workers, records, month));
});
