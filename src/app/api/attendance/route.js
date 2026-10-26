import { getDb } from "@/lib/mongodb";
import { route, ok, parseBody, parseQuery } from "@/lib/api";
import { attendanceDayQuerySchema, attendanceSaveSchema } from "@/lib/validation";
import { dayMarks, loadWorkers, saveMarks } from "@/lib/attendance";
import { daySheet } from "@/constants/attendance";

/** GET /api/attendance?day=yyyy-mm-dd — the day's sheet: every worker with their mark and the day's counts (admin). */
export const GET = route(async (request) => {
  const { day } = parseQuery(request, attendanceDayQuerySchema);
  const db = await getDb();
  const [workers, records] = await Promise.all([loadWorkers(db), dayMarks(db, day)]);
  return ok({ day, ...daySheet(workers, records) });
});

/**
 * PUT /api/attendance  { day, marks: [{ workerId, status: "present" | "absent" | "leave" | "" }] } — marks (or clears)
 * workers for the day and returns the updated sheet (admin). Absent and leave cut a day at the worker's per-day salary.
 */
export const PUT = route(async (request, { session }) => {
  const { day, marks } = await parseBody(request, attendanceSaveSchema);
  const db = await getDb();
  await saveMarks(db, { day, marks, session });
  const [workers, records] = await Promise.all([loadWorkers(db), dayMarks(db, day)]);
  return ok({ day, ...daySheet(workers, records) });
});
