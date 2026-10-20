/** Pure helpers for the admin lots pages (stage actions, shortfall, report). */

import { format } from "date-fns";
import { BRAND } from "@/constants/brand";
import { STAGES, STAGE_LABELS } from "@/constants/lots";
import { EMPTY_RANGE, isCompleteRange } from "@/features/analytics/utils";

export { EMPTY_RANGE, isCompleteRange };

/** Period pills on the lot report ("monthly" means "this year", like analytics). */
export const REPORT_PERIODS = [
  { value: "today", label: "Today" },
  { value: "last7days", label: "Last 7 Days" },
  { value: "monthly", label: "This Year" },
  { value: "all", label: "All Time" },
];

export const DEFAULT_REPORT_FILTER = "all";

/** `YYYY-MM-DD` for the query string. */
const toIsoDate = (date) => format(date, "yyyy-MM-dd");

/** Query string for GET /api/lots/report (also used as part of the cache key). */
export const lotReportUrl = (filter, range, { csv = false } = {}) => {
  const params = new URLSearchParams();
  if (filter === "custom" && isCompleteRange(range)) {
    params.set("filter", "custom");
    params.set("from", toIsoDate(range.from));
    params.set("to", toIsoDate(range.to));
  } else {
    params.set("filter", filter === "custom" ? DEFAULT_REPORT_FILTER : filter);
  }
  if (csv) params.set("format", "csv");
  return `/api/lots/report?${params.toString()}`;
};

export const reportFileName = (filter) => `${BRAND.slug}_lot_report_${filter}_${format(new Date(), "yyyy-MM-dd")}.csv`;

/** Stage key for a report row whose `stage` is the human label ("Cutting" → "cutting"). */
export const stageKeyFromLabel = (label) =>
  STAGES.find((key) => STAGE_LABELS[key] === label || key === label) ?? "cutting";

/** Rows for the stage-wise report table, in pipeline order. */
export const stageRows = (byStage = {}) =>
  STAGES.map((key) => ({
    key,
    label: STAGE_LABELS[key],
    count: byStage[key]?.count ?? 0,
    cutQty: byStage[key]?.cutQty ?? 0,
    stitchedQty: byStage[key]?.stitchedQty ?? 0,
    washedQty: byStage[key]?.washedQty ?? 0,
  }));

/** Quantity shown under each pipeline step (null when that stage has no entry yet). */
export const pipelineQtyFor = (lot, stage) => {
  if (!lot) return null;
  const value = {
    cutting: lot.cutQty,
    stitching: lot.stitchedQty,
    washing: lot.washedQty,
    packing: lot.washedQty,
    ready: lot.readyQty,
  }[stage];
  return value === null || value === undefined ? null : Number(value) || 0;
};

/** "—" for an empty value, otherwise the number (report rows carry "" for missing qtys). */
export const formatQty = (value) => (value === null || value === undefined || value === "" ? "—" : Number(value) || 0);

/** Shortfall numbers > 0 are highlighted everywhere. */
export const isShortfall = (value) => Number(value) > 0;
