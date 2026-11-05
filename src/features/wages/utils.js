/** Pure helpers for the Workers, Operations and Wages pages. */

import { format } from "date-fns";
import { BRAND } from "@/constants/brand";
import { WAGE_PERIODS, DEFAULT_WAGE_PERIOD, filledRows, splitEvenly } from "@/constants/wages";
import { EMPTY_RANGE, isCompleteRange } from "@/features/analytics/utils";
import { DEFAULT_MAIN_OPERATION, mainOperationOf, operationProgress } from "@/constants/operations";

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

// ---- Work sheet (every operation of an invoice assigned in one go) --------------------------------------------

/** A worker row of a sheet operation; `pieces` starts at what is still left of the operation. */
export const sheetRow = (pieces = 0) => ({
  workerId: "",
  pieces: pieces > 0 ? String(pieces) : "",
  payType: "piece",
  amount: "",
});

/**
 * The work sheet of an invoice: one block per offered operation (its rate card, else every active operation) with
 * the pieces already assigned and what is left, and one empty worker row.
 */
export const emptyWorkSheet = (offered = [], entries = [], lotPieces = 0) => ({
  date: toIsoDate(new Date()),
  note: "",
  operations: operationProgress(offered, entries, lotPieces).map((op) => {
    const left = Math.max(0, lotPieces - op.pieces);
    return {
      operationId: op.operationId,
      name: op.name,
      stage: op.stage,
      rate: String(op.rate),
      done: op.pieces,
      left,
      rows: [sheetRow(left)],
    };
  }),
});

/** Gives every operation that still has pieces left, and no worker picked yet, to `workerId` ("one karigar"). */
export const fillWorker = (sheet, workerId) => ({
  ...sheet,
  operations: sheet.operations.map((op) =>
    op.left > 0 && filledRows(op).length === 0
      ? { ...op, rows: op.rows.map((row, i) => (i === 0 ? { ...row, workerId } : row)) }
      : op
  ),
});

/** Splits what is left of an operation evenly over its worker rows. */
export const splitOperation = (op) => {
  const split = splitEvenly(op.left, op.rows.length);
  return { ...op, rows: op.rows.map((row, i) => ({ ...row, pieces: split[i] > 0 ? String(split[i]) : "" })) };
};

/**
 * What a worker did on an invoice, for the worker lists: "front pocket · 60 pcs", or "14 operations: overlock, …"
 * (pieces of different operations are not added up — 14 × 120 is not 1,680 garments).
 */
export const workerWorkLine = (row) =>
  row.operations.length === 1
    ? `${row.operations[0]} · ${row.pieces} pcs`
    : `${row.operations.length} operations: ${row.operations.join(", ")}`;

/** POST /api/work-entries body: only the operations and rows with a worker picked. */
export const toWorkSheetPayload = (lotId, sheet) => ({
  lotId,
  date: sheet.date,
  note: String(sheet.note || "").trim(),
  operations: sheet.operations
    .filter((op) => filledRows(op).length > 0)
    .map((op) => ({
      operationId: op.operationId,
      ...(op.rate === "" ? {} : { rate: Number(op.rate) }),
      rows: filledRows(op).map((row) => ({
        workerId: row.workerId,
        pieces: Math.trunc(Number(row.pieces)) || 0,
        payType: row.payType === "fixed" ? "fixed" : "piece",
        ...(row.payType === "fixed" ? { amount: Number(row.amount) || 0 } : {}),
      })),
    })),
});

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
