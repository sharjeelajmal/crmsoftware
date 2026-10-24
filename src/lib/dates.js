import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfWeek,
  endOfWeek,
  subWeeks,
} from "date-fns";

// Factory wage weeks run Monday → Sunday.
const WEEK = { weekStartsOn: 1 };
import { badRequest } from "@/lib/api";

/**
 * Maps the `filter` query param used across the app to a concrete date range.
 * Returns `null` when the filter means "no date restriction" (all / lifetime).
 *
 * Supported: today | daily | last7days | thisweek | lastweek | last15days | monthly | thisyear | yearly |
 *            custom(from,to) | all | lifetime
 * Note: "monthly" means "this year" on the analytics page but "this month" on expenses/purchases,
 * so callers pass `monthlyMeans` to keep their historical behaviour.
 */
export function dateRangeFromFilter({ filter = "all", from, to, monthlyMeans = "month" }, now = new Date()) {
  switch (filter) {
    case "today":
    case "daily":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "last7days":
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case "thisweek":
      return { start: startOfWeek(now, WEEK), end: endOfWeek(now, WEEK) };
    case "lastweek": {
      const previous = subWeeks(now, 1);
      return { start: startOfWeek(previous, WEEK), end: endOfWeek(previous, WEEK) };
    }
    case "last15days":
      return { start: startOfDay(subDays(now, 14)), end: endOfDay(now) };
    case "monthly":
      return monthlyMeans === "year"
        ? { start: startOfYear(now), end: endOfDay(now) }
        : { start: startOfMonth(now), end: endOfMonth(now) };
    case "thisyear":
      return { start: startOfYear(now), end: endOfDay(now) };
    case "yearly":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "custom": {
      if (!from || !to) throw badRequest("Custom filter requires 'from' and 'to' dates");
      const start = startOfDay(new Date(from));
      const end = endOfDay(new Date(to));
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw badRequest("Invalid custom date range");
      if (start > end) throw badRequest("'from' must be before 'to'");
      return { start, end };
    }
    case "all":
    case "lifetime":
      return null;
    default:
      throw badRequest(`Unknown filter "${filter}"`);
  }
}

/** Builds `{ [field]: { $gte, $lte } }` or `{}` for a Mongo query. */
export function dateQuery(field, range) {
  return range ? { [field]: { $gte: range.start, $lte: range.end } } : {};
}
