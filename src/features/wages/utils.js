/** Pure helpers for the Workers, Operations and Wages pages. */

import { format } from "date-fns";
import { BRAND } from "@/constants/brand";
import { WAGE_PERIODS, DEFAULT_WAGE_PERIOD, splitEvenly } from "@/constants/wages";
import { EMPTY_RANGE, isCompleteRange } from "@/features/analytics/utils";
import { DEFAULT_MAIN_OPERATION, MAIN_OPERATION_LABELS, mainOperationOf } from "@/constants/operations";

export { EMPTY_RANGE, isCompleteRange, WAGE_PERIODS, DEFAULT_WAGE_PERIOD };

const toIsoDate = (date) => format(date, "yyyy-MM-dd");

/** Query string for GET /api/wages/report (also used in the cache key). */
export const wagesUrl = (filter, range, { workerId = "", csv = false } = {}) => {
  const params = new URLSearchParams();
  if (filter === "custom" && isCompleteRange(range)) {
    params.set("filter", "custom");
    params.set("from", toIsoDate(range.from));
    params.set("to", toIsoDate(range.to));
  } else {
    params.set("filter", filter === "custom" ? DEFAULT_WAGE_PERIOD : filter);
  }
  if (workerId) params.set("workerId", workerId);
  if (csv) params.set("format", "csv");
  return `/api/wages/report?${params.toString()}`;
};

export const wagesFileName = (filter) => `${BRAND.slug}_wages_${filter}_${format(new Date(), "yyyy-MM-dd")}.csv`;

export const periodLabel = (filter, range) => {
  if (filter === "custom" && isCompleteRange(range)) {
    return `${format(range.from, "dd MMM")} – ${format(range.to, "dd MMM yyyy")}`;
  }
  return WAGE_PERIODS.find((p) => p.value === filter)?.label || "";
};

/** "Mon 19 Oct – Sun 25 Oct" from the report's from/to. */
export const rangeLabel = (from, to) =>
  from && to ? `${format(new Date(from), "EEE d MMM")} – ${format(new Date(to), "EEE d MMM yyyy")}` : "All time";

export const WORKER_TYPES = ["stitching", "washing", "packing", "helper", "other"];

export const EMPTY_WORKER_FORM = { name: "", phone: "", type: "stitching", dailyRate: "", note: "" };

export const workerFormFrom = (worker) => ({
  ...EMPTY_WORKER_FORM,
  ...(worker?._id ? { _id: worker._id } : {}),
  name: worker?.name || "",
  phone: worker?.phone || "",
  type: worker?.type || "stitching",
  dailyRate: Number(worker?.dailyRate) > 0 ? String(worker.dailyRate) : "",
  note: worker?.note || "",
});

export const EMPTY_OPERATION_FORM = { name: "", rate: "", stage: DEFAULT_MAIN_OPERATION };

export const operationFormFrom = (operation) => ({
  ...EMPTY_OPERATION_FORM,
  ...(operation?._id ? { _id: operation._id } : {}),
  name: operation?.name || "",
  rate: operation?.rate === undefined || operation?.rate === null ? "" : String(operation.rate),
  stage: operation ? mainOperationOf(operation) : DEFAULT_MAIN_OPERATION,
});

/** `{ value, label }` options for the worker picker (active workers only). */
export const workerOptions = (workers = []) =>
  workers.filter((w) => w.active !== false).map((w) => ({ value: String(w._id), label: w.name }));

/**
 * `{ value, label }` options for the operation picker from a lot's offered operations (GET /api/lots/:id/operations):
 * "Overlock · Stitching · Rs 3.5/pc".
 */
export const operationOptions = (offered = []) =>
  offered.map((op) => ({
    value: op.operationId,
    label: `${op.name} · ${MAIN_OPERATION_LABELS[op.stage] ?? ""} · Rs ${Number(op.rate) || 0}/pc`,
  }));

/** Rate card editor rows: every active operation (plus inactive ones already on the card), chosen or not. */
export const rateCardRows = (operations = [], items = []) => {
  const onCard = new Map(items.map((item) => [item.operationId, item]));
  return operations
    .filter((op) => op.active !== false || onCard.has(String(op._id)))
    .map((op) => {
      const item = onCard.get(String(op._id));
      return {
        operationId: String(op._id),
        name: op.name,
        stage: mainOperationOf(op),
        defaultRate: Number(op.rate) || 0,
        chosen: Boolean(item),
        rate: String(item ? item.rate : Number(op.rate) || 0),
      };
    });
};

/** Form state for assigning one operation of a lot to workers. */
export const emptyAssignment = (pieces) => ({
  operationId: "",
  rate: "",
  rows: [{ workerId: "", pieces: String(pieces || "") }],
  date: new Date(),
  note: "",
});

/** Re-splits the lot's pieces evenly over the current rows. */
export const splitRows = (rows, totalPieces) => {
  const split = splitEvenly(totalPieces, rows.length);
  return rows.map((row, i) => ({ ...row, pieces: String(split[i] ?? 0) }));
};

export const toAssignmentPayload = (lotId, form) => ({
  lotId,
  operationId: form.operationId,
  ...(form.rate === "" ? {} : { rate: Number(form.rate) }),
  date: form.date,
  note: String(form.note || "").trim(),
  rows: form.rows.map((row) => ({ workerId: row.workerId, pieces: Math.trunc(Number(row.pieces)) || 0 })),
});

/** Live total of the assignment form (pieces × rate). */
export const assignmentTotal = (form) => {
  const rate = Number(form.rate) || 0;
  const pieces = form.rows.reduce((sum, row) => sum + (Math.trunc(Number(row.pieces)) || 0), 0);
  return { pieces, amount: Math.round(pieces * rate * 100) / 100 };
};

/** Entries grouped by operation name, in first-seen order. */
export const groupByOperation = (entries = []) => {
  const groups = new Map();
  for (const entry of entries) {
    const key = entry.operationName || "—";
    if (!groups.has(key)) groups.set(key, { operationName: key, entries: [], pieces: 0, amount: 0 });
    const group = groups.get(key);
    group.entries.push(entry);
    group.pieces += Math.trunc(Number(entry.pieces)) || 0;
    group.amount = Math.round((group.amount + (Number(entry.amount) || 0)) * 100) / 100;
  }
  return [...groups.values()];
};
