import { Parser } from "json2csv";
import { getDb } from "@/lib/mongodb";
import { route, ok, parseQuery } from "@/lib/api";
import { wagesQuerySchema } from "@/lib/validation";
import { dateRangeFromFilter } from "@/lib/dates";
import { advanceAccounts, round2, DEFAULT_WAGE_PERIOD } from "@/constants/wages";
import { advanceEntries, periodWages, wageCsvRows } from "@/lib/wages";

const CSV_FIELDS = [
  { label: "Worker", value: "worker" },
  { label: "Entries", value: "entries" },
  { label: "Pieces", value: "pieces" },
  { label: "Wages", value: "amount" },
  { label: "Bonus", value: "bonuses" },
  { label: "Leave days", value: "leaveDays" },
  { label: "Leave cut", value: "leaves" },
  { label: "Absent days", value: "absentDays" },
  { label: "Absent cut", value: "absents" },
  { label: "Advance given", value: "advances" },
  { label: "Advance cut", value: "recoveries" },
  { label: "Advance left (today)", value: "advanceLeft" },
  { label: "Deduction", value: "deductions" },
  { label: "Net payable", value: "net" },
  { label: "Paid", value: "paid" },
  { label: "To pay", value: "due" },
];

/**
 * GET /api/wages/report?filter=today|thisweek|lastweek|last15days|monthly|custom&from&to[&workerId][&format=csv]
 * Admin only. Per-worker wages for the period (work entries + leave / absent days from the attendance register +
 * advance cuts / deductions / bonuses; advances given are listed but not subtracted), each worker's advance still
 * outstanding today (`advanceLeft`), what was already paid in the period (`paid`: work paid early and "Pay the rest")
 * and what is still to pay (`due`), and the entries, adjustments and payments themselves, so the page can expand a
 * worker's rows.
 */
export const GET = route(async (request) => {
  const { filter = DEFAULT_WAGE_PERIOD, from, to, workerId } = parseQuery(request, wagesQuerySchema);
  const format = new URL(request.url).searchParams.get("format");
  const range = dateRangeFromFilter({ filter, from, to });

  const db = await getDb();
  const [{ entries, adjustments, payments, summary }, advanceRows] = await Promise.all([
    periodWages(db, { range, workerId }),
    advanceEntries(db, { workerId }),
  ]);
  const left = new Map(advanceAccounts(advanceRows).accounts.map((a) => [a.workerId, a.balance]));
  const workers = summary.workers.map((w) => ({ ...w, advanceLeft: left.get(w.workerId) ?? 0 }));
  const totals = { ...summary.totals, advanceLeft: round2(workers.reduce((sum, w) => sum + w.advanceLeft, 0)) };

  if (format === "csv") {
    const csv = new Parser({ fields: CSV_FIELDS }).parse(wageCsvRows(workers));
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="wages_${filter}.csv"`,
      },
    });
  }

  return ok({
    filter,
    from: range?.start ?? null,
    to: range?.end ?? null,
    workers,
    totals,
    entries,
    adjustments,
    payments,
  });
});
