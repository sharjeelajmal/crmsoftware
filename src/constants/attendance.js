import { eachDayOfInterval, endOfMonth, format } from "date-fns";
import { round2 } from "@/constants/wages";

/**
 * Attendance — pure, client-safe rules.
 *
 * Every worker gets one mark per day: present, absent or leave. Absent and leave cut one day's pay at the worker's
 * per-day salary (`dailyRate`, the same rule as the old leave entries); the rate is copied onto the mark when it is
 * saved, so changing a worker's rate later never rewrites old cuts. Workers with no per-day salary (piece rate only)
 * get the days counted but nothing cut. The marks flow into the wages report as "absent" and "leave" cuts.
 */

export const ATTENDANCE_STATUSES = Object.freeze(["present", "absent", "leave"]);

export const ATTENDANCE_LABELS = Object.freeze({ present: "Present", absent: "Absent", leave: "Leave" });

export const ATTENDANCE_SHORT = Object.freeze({ present: "P", absent: "A", leave: "L" });

/** Statuses that cut one day's pay. */
export const CUT_STATUSES = Object.freeze(["absent", "leave"]);

/** What one mark cuts from the pay. */
export const cutFor = (status, rate) => (CUT_STATUSES.includes(status) ? round2(rate) : 0);

const emptyCounts = () => ({ present: 0, absent: 0, leave: 0, unmarked: 0, cut: 0 });

const byName = (a, b) => a.name.localeCompare(b.name);

/** Workers to list: active ones, plus inactive ones that already have a mark in `records`. */
const listedWorkers = (workers, records) => {
  const marked = new Set(records.map((r) => String(r.workerId)));
  return workers.filter((w) => w.active !== false || marked.has(String(w._id)));
};

/** The sheet for one day: every listed worker with their mark ("" = not marked yet) and the day's counts. */
export function daySheet(workers = [], records = []) {
  const markOf = new Map(records.map((r) => [String(r.workerId), r]));
  const rows = listedWorkers(workers, records)
    .map((worker) => {
      const mark = markOf.get(String(worker._id));
      return {
        workerId: String(worker._id),
        name: worker.name || "",
        type: worker.type || "",
        active: worker.active !== false,
        dailyRate: Number(worker.dailyRate) || 0,
        status: mark?.status ?? "",
        cut: mark ? Number(mark.cut) || 0 : 0,
      };
    })
    .sort(byName);
  return { rows, counts: countsOf(rows) };
}

/** Present / absent / leave / not marked and the pay cut of a day's rows. */
export const countsOf = (rows = []) => {
  const counts = emptyCounts();
  for (const row of rows) {
    if (row.status) counts[row.status] += 1;
    else counts.unmarked += 1;
    counts.cut = round2(counts.cut + (Number(row.cut) || 0));
  }
  return counts;
};

/** The sheet with `marks` ({ workerId, status }) applied — what the page shows while the save is on its way. */
export function applyMarks(sheet, marks = []) {
  const next = new Map(marks.map((mark) => [mark.workerId, mark.status]));
  const rows = sheet.rows.map((row) =>
    next.has(row.workerId)
      ? { ...row, status: next.get(row.workerId), cut: cutFor(next.get(row.workerId), row.dailyRate) }
      : row
  );
  return { ...sheet, rows, counts: countsOf(rows) };
}

/** Marks that set every worker not marked yet to present ("Mark everyone present"). */
export const presentForUnmarked = (sheet) =>
  sheet.rows.filter((row) => !row.status && row.active).map((row) => ({ workerId: row.workerId, status: "present" }));

/** "2026-10" → ["2026-10-01", …, "2026-10-31"]; [] for anything else. */
export const monthDays = (month) => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(month ?? ""));
  if (!match) return [];
  const start = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return eachDayOfInterval({ start, end: endOfMonth(start) }).map((day) => format(day, "yyyy-MM-dd"));
};

/** The month register: one row per worker with the mark of every day, the counts and the pay cut. */
export function monthRegister(workers = [], records = [], month) {
  const days = monthDays(month);
  const inMonth = records.filter((r) => days.includes(r.day));
  const rows = listedWorkers(workers, inMonth)
    .map((worker) => {
      const id = String(worker._id);
      const marks = {};
      const counts = emptyCounts();
      for (const record of inMonth) {
        if (String(record.workerId) !== id) continue;
        marks[record.day] = record.status;
        counts[record.status] += 1;
        counts.cut = round2(counts.cut + (Number(record.cut) || 0));
      }
      counts.unmarked = days.length - counts.present - counts.absent - counts.leave;
      return { workerId: id, name: worker.name || "", type: worker.type || "", marks, ...counts };
    })
    .sort(byName);
  const totals = rows.reduce(
    (sum, row) => ({
      present: sum.present + row.present,
      absent: sum.absent + row.absent,
      leave: sum.leave + row.leave,
      cut: round2(sum.cut + row.cut),
    }),
    { present: 0, absent: 0, leave: 0, cut: 0 }
  );
  return { month, days, rows, totals };
}

/** Attendance marks as wage adjustments: every absent / leave day cuts its snapshotted rate (present cuts nothing). */
export const attendanceAdjustments = (records = []) =>
  records
    .filter((record) => CUT_STATUSES.includes(record.status))
    .map((record) => ({
      _id: String(record._id ?? ""),
      workerId: record.workerId,
      workerName: record.workerName || "",
      type: record.status,
      days: 1,
      rate: Number(record.rate) || 0,
      amount: Number(record.cut) || 0,
      date: record.date,
      source: "attendance",
    }));

/** "October 2026" for "2026-10". */
export const monthLabel = (month) => {
  const [first] = monthDays(month);
  return first ? format(new Date(`${first}T12:00:00`), "MMMM yyyy") : month;
};

/** The month before / after "yyyy-MM". */
export const shiftMonth = (month, step) => {
  const [first] = monthDays(month);
  if (!first) return month;
  const at = new Date(`${first}T12:00:00`);
  return format(new Date(at.getFullYear(), at.getMonth() + step, 1), "yyyy-MM");
};
