/**
 * Quick ranges for the date range picker (client-safe, pure). Every range is whole days at local midnight,
 * which is what react-day-picker selects, so a preset and a hand-picked range compare equal.
 */
import {
  differenceInCalendarDays,
  endOfMonth,
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

/** Number of calendar days in a complete range, both ends included (0 when incomplete). */
export const rangeDays = (range) =>
  range?.from && range?.to ? Math.abs(differenceInCalendarDays(range.to, range.from)) + 1 : 0;

/**
 * Range-mode click handling: once a range is complete, the next click starts a new range instead of
 * stretching the old one (what people expect from booking-style pickers).
 */
export const nextRange = (current, proposed, clicked) => {
  if (current?.from && current?.to && clicked) return { from: day(clicked), to: undefined };
  return { from: proposed?.from, to: proposed?.to };
};
