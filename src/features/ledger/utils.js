/** Pure helpers for the Loose Items & B-Pair register page. */

import { format } from "date-fns";
import { BRAND } from "@/constants/brand";
import { DEFAULT_UNIT_BY_TYPE, LEDGER_TYPES, LEDGER_TYPE_LABELS } from "@/constants/ledger";
import { EMPTY_RANGE, isCompleteRange } from "@/features/analytics/utils";

export { EMPTY_RANGE, isCompleteRange };

/** "All" first, then one chip per register type. `value: ""` means no type filter. */
export const TYPE_FILTERS = [
  { value: "", label: "All" },
  ...LEDGER_TYPES.map((type) => ({ value: type, label: LEDGER_TYPE_LABELS[type] })),
];

/** Badge colours per type (neutral palette; brand blue for accessories). */
export const TYPE_BADGE_CLASS = {
  bpair: "bg-yellow-100 text-yellow-800",
  accessory: "bg-primary-soft text-primary",
  fabric: "bg-purple-100 text-purple-700",
};

export const LEDGER_PERIODS = [
  { value: "today", label: "Today" },
  { value: "last7days", label: "Last 7 Days" },
  { value: "monthly", label: "This Year" },
  { value: "all", label: "All Time" },
];

export const DEFAULT_LEDGER_FILTER = "all";

const toIsoDate = (date) => format(date, "yyyy-MM-dd");

/** Query string for GET /api/ledger (also part of the cache key). Search is applied client-side. */
export const ledgerUrl = (filter, range, { type = "", csv = false } = {}) => {
  const params = new URLSearchParams();
  if (filter === "custom" && isCompleteRange(range)) {
    params.set("filter", "custom");
    params.set("from", toIsoDate(range.from));
    params.set("to", toIsoDate(range.to));
  } else {
    params.set("filter", filter === "custom" ? DEFAULT_LEDGER_FILTER : filter);
  }
  if (type) params.set("type", type);
  if (csv) params.set("format", "csv");
  return `/api/ledger?${params.toString()}`;
};

export const ledgerFileName = (filter, type) =>
  `${BRAND.slug}_ledger_${type || "all"}_${filter}_${format(new Date(), "yyyy-MM-dd")}.csv`;

export const EMPTY_LEDGER_FORM = {
  type: "bpair",
  item: "",
  qty: "",
  unit: DEFAULT_UNIT_BY_TYPE.bpair,
  note: "",
  lotId: "",
};

/** Form state from an existing entry (edit) or a prefilled draft (lot shortcut). */
export const formFromEntry = (entry) => ({
  ...EMPTY_LEDGER_FORM,
  ...(entry?._id ? { _id: entry._id } : {}),
  type: entry?.type || EMPTY_LEDGER_FORM.type,
  item: entry?.item || "",
  qty: entry?.qty === null || entry?.qty === undefined || entry?.qty === "" ? "" : String(entry.qty),
  unit: entry?.unit || DEFAULT_UNIT_BY_TYPE[entry?.type] || "pcs",
  note: entry?.note || "",
  lotId: entry?.lotId ? String(entry.lotId) : "",
});

/** Request body for POST/PUT /api/ledger — numbers as numbers, an empty lot as `null` (unlinks). */
export const toLedgerPayload = (form) => ({
  type: form.type,
  item: String(form.item || "").trim(),
  qty: Number(form.qty),
  unit: String(form.unit || "").trim() || "pcs",
  note: String(form.note || "").trim(),
  lotId: form.lotId ? form.lotId : null,
});

/** Why the form cannot be submitted yet, or "" when it is valid. */
export const ledgerFormProblem = (form) => {
  if (!String(form.item || "").trim()) return "Please enter the item name.";
  const qty = Number(form.qty);
  if (!Number.isFinite(qty) || qty <= 0) return "Quantity must be more than 0.";
  if (!String(form.unit || "").trim()) return "Please choose a unit.";
  return "";
};

/** "3 pcs", "4.5 m" */
export const formatQtyUnit = (qty, unit) => `${Number(qty) || 0} ${unit || ""}`.trim();

/** Dropdown options for the lot link: "LOT-1001 · Article". */
export const lotOptions = (lots = []) =>
  lots.map((lot) => ({ value: String(lot._id), label: `${lot.lotNumber} · ${lot.productName || ""}`.trim() }));

/** Readable "field: before → after" lines for one history snapshot. */
export const historyLines = (snapshot) =>
  Object.keys(snapshot?.after ?? {}).map((key) => ({
    key,
    label: key === "lotNumber" ? "Invoice" : key[0].toUpperCase() + key.slice(1),
    before: snapshot.before?.[key] ?? "—",
    after: snapshot.after?.[key] ?? "—",
  }));
