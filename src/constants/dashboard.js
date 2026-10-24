/**
 * Factory dashboard — pure, client-safe rules. `src/lib/dashboard.js` loads the data and uses these to shape it;
 * the dashboard components use the same helpers for labels, so server and page always agree.
 */
import { format, subDays } from "date-fns";
import { stitchBalanceOf, stitchOutQtyOf } from "./lots";

/** Days shown in the production trend chart (today included). */
export const TREND_DAYS = 14;

/** Rows in the "waiting longest", restock, activity and gate pass lists. */
export const LIST_LIMIT = 5;

/** A lot that has not moved for this many days is flagged in "waiting longest". */
export const IDLE_WARN_DAYS = 7;

/** Stages a lot passes before it is ready, in order (the pipeline on the dashboard). */
export const PIPELINE_STAGES = Object.freeze(["cutting", "stitching", "washing", "packing"]);

const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-10-23" in the server's / browser's local time (same format Mongo's $dateToString gives us). */
export const dayKey = (date) => format(date, "yyyy-MM-dd");

/** Day keys for the last `days` days, oldest first, ending with today. */
export const lastDayKeys = (now, days = TREND_DAYS) =>
  Array.from({ length: days }, (_, i) => dayKey(subDays(now, days - 1 - i)));

/** "+05:00" for Mongo's `timezone` option, so day buckets match the local day boundaries used everywhere else. */
export const utcOffsetOf = (date) => {
  const minutes = -date.getTimezoneOffset();
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
};

/**
 * Merges per-day aggregate rows into one row per day (missing days become 0).
 * `series` maps an output field to its rows: `{ cut: [{ _id: "2026-10-23", pieces: 40 }], … }`.
 */
export const fillDailySeries = (keys, series) => {
  const lookups = Object.entries(series).map(([field, rows]) => [
    field,
    new Map((rows || []).map((row) => [row._id, Number(row.pieces) || 0])),
  ]);
  return keys.map((date) => {
    const row = { date };
    for (const [field, values] of lookups) row[field] = values.get(date) ?? 0;
    return row;
  });
};

/** Whole-number % change, or null when there is nothing to compare with. */
export const percentChange = (current, previous) => {
  const now = Number(current) || 0;
  const before = Number(previous) || 0;
  if (before <= 0) return null;
  return Math.round(((now - before) / before) * 100);
};

/** Pieces physically at each pipeline stage. Pieces sent out of stitching early are already at washing. */
export const piecesByLocation = (lot) => {
  switch (lot?.stage) {
    case "cutting":
      return { cutting: Number(lot.cutQty) || 0 };
    case "stitching":
      return { stitching: stitchBalanceOf(lot), washing: stitchOutQtyOf(lot) };
    case "washing":
      return { washing: Number(lot.stitchedQty) || 0 };
    case "packing":
      return { packing: Number(lot.washedQty) || 0 };
    default:
      return {};
  }
};

/** Lots and pieces per pipeline stage for lots that are not ready yet. */
export const pipelineLoad = (lots = []) => {
  const load = Object.fromEntries(PIPELINE_STAGES.map((stage) => [stage, { lots: 0, pieces: 0 }]));
  for (const lot of lots) {
    if (load[lot.stage]) load[lot.stage].lots += 1;
    for (const [stage, pieces] of Object.entries(piecesByLocation(lot))) {
      if (load[stage]) load[stage].pieces += pieces;
    }
  }
  return load;
};

/** Whole days since the lot last changed (stage move, dispatch or edit). */
export const idleDays = (lot, now = new Date()) => {
  const since = new Date(lot?.updatedAt ?? lot?.createdAt ?? now).getTime();
  return Math.max(0, Math.floor((now.getTime() - since) / DAY_MS));
};

/** Active lots that have waited longest at their stage, longest first. */
export const waitingLongest = (lots = [], now = new Date(), limit = LIST_LIMIT) =>
  lots
    .filter((lot) => PIPELINE_STAGES.includes(lot.stage))
    .map((lot) => ({
      _id: lot._id,
      lotNumber: lot.lotNumber,
      productName: lot.productName ?? "",
      stage: lot.stage,
      pieces: Object.values(piecesByLocation(lot)).reduce((sum, n) => sum + n, 0),
      idleDays: idleDays(lot, now),
    }))
    .sort((a, b) => b.idleDays - a.idleDays || String(a.lotNumber).localeCompare(String(b.lotNumber)))
    .slice(0, limit);

/** Share of each part in a total, for the spending bar. Parts with 0 stay (legend), share 0. */
export const shareParts = (parts) => {
  const total = parts.reduce((sum, part) => sum + (Number(part.value) || 0), 0);
  return {
    total,
    parts: parts.map((part) => ({
      ...part,
      value: Number(part.value) || 0,
      share: total > 0 ? (Number(part.value) || 0) / total : 0,
    })),
  };
};

/** Biggest categories first; the rest folded into "Other" so the list never grows past `limit` rows. */
export const topWithOther = (rows = [], limit = 4) => {
  const sorted = [...rows].filter((row) => Number(row.amount) > 0).sort((a, b) => b.amount - a.amount);
  if (sorted.length <= limit) return sorted;
  const rest = sorted.slice(limit - 1).reduce((sum, row) => sum + row.amount, 0);
  return [...sorted.slice(0, limit - 1), { category: "Other", amount: rest }];
};

/** "Good morning" / "Good afternoon" / "Good evening" for the viewer's local hour. */
export const greetingFor = (date = new Date()) => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
};

/**
 * Round axis ticks for whole pieces (0, 10, 20, 30, 40 instead of 0, 9, 18, 27, 36): the smallest 1/2/2.5/5 × 10ⁿ
 * step that covers the data in at most `maxIntervals` steps; goes below 0 when a day was negative (a reversal).
 */
export const niceTicks = (min, max, maxIntervals = 5) => {
  const low = Math.min(0, Number(min) || 0);
  const high = Math.max(1, Number(max) || 0);
  const span = high - low;
  let pow = 10 ** Math.floor(Math.log10(span / maxIntervals));
  let step = null;
  while (step === null) {
    step =
      [1, 2, 2.5, 5]
        .map((m) => m * pow)
        .find((s) => Number.isInteger(s) && s >= 1 && Math.ceil(span / s) <= maxIntervals) ?? null;
    pow *= 10;
  }
  const from = Math.floor(low / step) * step;
  const to = Math.ceil(high / step) * step;
  return Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) => from + i * step);
};

/** "1 lot" / "3 lots". */
export const plural = (count, one, many = `${one}s`) => (Number(count) === 1 ? one : many);

/** 1,284 · 12.9K · 4.2M (stat tiles and axis ticks). */
export const compactNumber = (value) => {
  const n = Number(value) || 0;
  if (Math.abs(n) < 10_000) return n.toLocaleString("en-US");
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
};
