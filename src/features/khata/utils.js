/** Pure helpers for the stitching khata pages (client, 2026-11-19). */

import { format } from "date-fns";
import { isPaid, rowAmount, round2 } from "@/constants/wages";

const today = () => format(new Date(), "yyyy-MM-dd");

/**
 * Cut picker options: the khata's own cuts first (as listed, newest first), then the invoices. Values are
 * "cut:<id>" / "lot:<id>" (see cutRefOf).
 */
export const cutOptions = (cuts = [], lots = []) => [
  ...cuts.map((cut) => ({
    value: `cut:${cut._id}`,
    label: `Cut ${cut.cutNumber}${cut.article ? ` · ${cut.article}` : ""}`,
  })),
  ...lots.map((lot) => ({
    value: `lot:${lot._id}`,
    label: `${lot.lotNumber}${lot.bundleNumber ? ` · Cut ${lot.bundleNumber}` : ""}${lot.productName ? ` · ${lot.productName}` : ""}`,
  })),
];

/** `{ cutId }` or `{ lotId }` for a cut picker value, `{}` when none is picked. */
export const cutRefOf = (value) => {
  const [kind, id] = String(value || "").split(":");
  if (kind === "cut" && id) return { cutId: id };
  if (kind === "lot" && id) return { lotId: id };
  return {};
};

/** Operation picker: the worker's usual operations first, then the other active ones — "overlock · Rs 3.5". */
export const operationOptionsFor = (operations = [], usualIds = []) => {
  const usual = new Set(usualIds.map(String));
  const active = operations.filter((op) => op.active !== false || usual.has(String(op._id)));
  const first = active.filter((op) => usual.has(String(op._id)));
  const rest = active.filter((op) => !usual.has(String(op._id)));
  return [...first, ...rest].map((op) => ({
    value: String(op._id),
    label: `${op.name} · Rs ${Number(op.rate) || 0}`,
  }));
};

/**
 * Blank khata entry form; `cut` / `operationId` (and a rate typed by hand) carry over between entries so the next one
 * is quicker. Until the rate is typed (`rateEdited`), it is the suggested one (see khataRateFor).
 */
export const emptyKhataEntry = ({ workerId = "", cut = "", operationId = "", rate = "", rateEdited = false } = {}) => ({
  workerId,
  cut,
  operationId,
  rate,
  rateEdited,
  pieces: "",
  payType: "piece",
  amount: "",
  date: today(),
  note: "",
});

/**
 * Suggested rate for an operation: on an invoice, its category's rate card (`lotOperations`, from
 * /api/lots/:id/operations — the same rate the work sheet uses), else the operation's own rate.
 */
export const khataRateFor = (operationId, { operations = [], lotOperations = [] } = {}) => {
  const onCard = lotOperations.find((item) => String(item.operationId) === String(operationId));
  const operation = operations.find((op) => String(op._id) === String(operationId));
  const rate = onCard?.rate ?? operation?.rate;
  return rate === undefined || rate === null ? "" : String(Number(rate) || 0);
};

/** The form with its suggested rate filled in, unless the rate was typed by hand. */
export const withSuggestedRate = (form, options) =>
  form.rateEdited || !form.operationId ? form : { ...form, rate: khataRateFor(form.operationId, options) };

/** The wage the form will save: pieces × rate, or the fixed amount. */
export const khataEntryAmount = (form) => rowAmount(form);

/** Why the entry can't be saved yet, or "". */
export const khataEntryProblem = (form) => {
  if (!form.workerId) return "Choose the worker.";
  if (!form.cut) return "Choose the cut.";
  if (!form.operationId) return "Choose the operation.";
  if (!(Math.trunc(Number(form.pieces)) > 0)) return "Pieces must be more than 0.";
  if (form.payType === "fixed") {
    if (form.amount === "" || !(Number(form.amount) >= 0)) return "Type the fixed amount.";
  } else if (form.rate === "" || !(Number(form.rate) >= 0)) return "Rate must be 0 or more.";
  return "";
};

/** POST /api/khata/entries body. */
export const toKhataEntryPayload = (form) => ({
  workerId: form.workerId,
  operationId: form.operationId,
  ...cutRefOf(form.cut),
  pieces: Math.trunc(Number(form.pieces)) || 0,
  payType: form.payType === "fixed" ? "fixed" : "piece",
  ...(form.payType === "fixed" ? { amount: Number(form.amount) || 0 } : { rate: Number(form.rate) || 0 }),
  date: form.date,
  note: String(form.note || "").trim(),
});

/**
 * A worker's khata in sections, newest first: first what is not paid yet ("since the last lock"), then each payment
 * (a lock, work paid early, the rest of a period) with the work it paid.
 */
export const khataSections = (entries = [], payments = []) => {
  const unpaid = entries.filter((entry) => !isPaid(entry));
  const byPayment = new Map(payments.map((payment) => [String(payment._id), []]));
  const orphans = [];
  for (const entry of entries) {
    if (!isPaid(entry)) continue;
    const list = byPayment.get(String(entry.paymentId));
    if (list) list.push(entry);
    else orphans.push(entry);
  }
  const amountOf = (list) => round2(list.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0));
  return [
    { key: "unpaid", kind: "unpaid", entries: unpaid, amount: amountOf(unpaid) },
    ...payments.map((payment) => ({
      key: String(payment._id),
      kind: payment.kind,
      payment,
      entries: byPayment.get(String(payment._id)),
      amount: Number(payment.amount) || 0,
    })),
    ...(orphans.length ? [{ key: "paid", kind: "paid", entries: orphans, amount: amountOf(orphans) }] : []),
  ];
};
