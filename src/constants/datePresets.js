/**
 * Quick ranges for the date range picker (client-safe, pure). Every range is whole days at local midnight,
 * which is what react-day-picker selects, so a preset and a hand-picked range compare equal.
 */
import {
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";

const day = (date) => startOfDay(date);

export const DATE_PRESETS = Object.freeze([
  { key: "today", label: "Today", range: (now) => ({ from: day(now), to: day(now) }) },
  { key: "yesterday", label: "Yesterday", range: (now) => ({ from: day(subDays(now, 1)), to: day(subDays(now, 1)) }) },
  { key: "last7", label: "Last 7 days", range: (now) => ({ from: day(subDays(now, 6)), to: day(now) }) },
  { key: "last30", label: "Last 30 days", range: (now) => ({ from: day(subDays(now, 29)), to: day(now) }) },
  { key: "thisMonth", label: "This month", range: (now) => ({ from: startOfMonth(now), to: day(now) }) },
  {
    key: "lastMonth",
    label: "Last month",
    range: (now) => ({ from: startOfMonth(subMonths(now, 1)), to: day(endOfMonth(subMonths(now, 1))) }),
  },
  { key: "thisYear", label: "This year", range: (now) => ({ from: startOfYear(now), to: day(now) }) },
]);

/** The preset's `{ from, to }` for `now`, or null for an unknown key. */
export const presetRange = (key, now = new Date()) => DATE_PRESETS.find((p) => p.key === key)?.range(now) ?? null;

/** Key of the preset that exactly matches a complete range (first match wins), else null. */
export const activePresetKey = (range, now = new Date()) => {
  if (!range?.from || !range?.to) return null;
  const hit = DATE_PRESETS.find((preset) => {
    const r = preset.range(now);
    return isSameDay(r.from, range.from) && isSameDay(r.to, range.to);
  });
  return hit?.key ?? null;
};

/** "This month" when a complete range is a preset, else "1 Oct – 26 Oct 2026"; `allLabel` without a range. */
export const rangeLabel = (range, allLabel = "All time", now = new Date()) => {
  if (!range?.from || !range?.to) return allLabel;
  const preset = DATE_PRESETS.find((p) => p.key === activePresetKey(range, now));
  if (preset) return preset.label;
  const sameYear = range.from.getFullYear() === range.to.getFullYear();
  return `${format(range.from, sameYear ? "d MMM" : "d MMM yyyy")} – ${format(range.to, "d MMM yyyy")}`;
};

/** True when `date` falls inside the range's whole days (both ends included); no range = always true. */
export const inDayRange = (date, range) => {
  if (!range?.from || !range?.to) return true;
  if (!date) return false;
  const at = new Date(date);
  return at >= startOfDay(range.from) && at <= endOfDay(range.to);
};

/**
 * When a saved record was created: its `createdAt`, else the time stored inside its Mongo id (records saved before
 * `createdAt` existed). null when neither is readable.
 */
export const createdAtOf = (doc) => {
  if (doc?.createdAt) {
    const at = new Date(doc.createdAt);
    if (!Number.isNaN(at.getTime())) return at;
  }
  const id = String(doc?._id ?? "");
  return /^[a-f\d]{24}$/i.test(id) ? new Date(parseInt(id.slice(0, 8), 16) * 1000) : null;
};

/** Date (or ISO string) → "yyyy-MM-dd" for a date field; "" when empty or invalid. */
export const dateToValue = (date) => {
  if (!date) return "";
  const at = new Date(date);
  return Number.isNaN(at.getTime()) ? "" : format(at, "yyyy-MM-dd");
};

/** "yyyy-MM-dd" → that day at local midnight; null when empty or not in that format. */
export const valueToDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return null;
  const at = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(at.getTime()) ? null : at;
};

/** Number of calendar days in a complete range, both ends included (0 when incomplete). */
export const rangeDays = (range) =>
  range?.from && range?.to ? Math.abs(differenceInCalendarDays(range.to, range.from)) + 1 : 0;

/**
 * Two clicks pick a range: the first click sets the start (also when a range is already complete, e.g. a preset),
 * the second click sets the end. An end before the start swaps them; the same day twice picks that single day.
 * Only our own state is used: react-day-picker 9 already treats the first click as a finished one-day range, which
 * used to make the second click start over (the start date had to be clicked twice).
 */
export const pickRangeDay = (current, clicked) => {
  if (!clicked) return current;
  const picked = day(clicked);
  if (!current?.from || current?.to) return { from: picked, to: undefined };
  return picked < current.from ? { from: picked, to: day(current.from) } : { from: day(current.from), to: picked };
};
