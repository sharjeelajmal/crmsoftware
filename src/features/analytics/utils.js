/** Pure helpers for the Analytics page. */

export const PERIODS = [
  { value: "today", label: "Today" },
  { value: "last7days", label: "Last 7 Days" },
  { value: "monthly", label: "This Year" },
];

export const EMPTY_RANGE = { from: undefined, to: undefined };

export const isCompleteRange = (range) => Boolean(range?.from && range?.to);

/** `YYYY-MM-DD` for the query string. */
const toIsoDate = (date) => date.toISOString().split("T")[0];

export const analyticsUrl = (filter, range) => {
  if (filter === "custom" && isCompleteRange(range)) {
    return `/api/analytics?filter=custom&from=${toIsoDate(range.from)}&to=${toIsoDate(range.to)}`;
  }
  return `/api/analytics?filter=${filter}`;
};

/** Period name as shown in card titles ("last7days" → "7 Days"). */
export const periodLabel = (filter) => filter.replace("last7days", "7 Days");
