/** Pure helpers for the cutting portal (also reused by the admin lots pages). */

import { STAGES, STAGE_LABELS, cutQtyOf } from "@/constants/lots";
import { FABRIC_UNITS } from "@/constants/fabric";

export { STAGES, STAGE_LABELS, cutQtyOf, FABRIC_UNITS };

/** Shorter stage names for phone-width filter pills ("Ready for Sale" → "Ready"). */
const STAGE_SHORT_LABELS = { ready: "Ready" };

/** "All" first, then one filter per pipeline stage. `value: ""` means no stage filter; `short` is the phone label. */
export const STAGE_FILTERS = [
  { value: "", label: "All", short: "All" },
  ...STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s], short: STAGE_SHORT_LABELS[s] || STAGE_LABELS[s] })),
];

/** Badge colours per stage (neutral/state palette; brand blue for washing). */
export const STAGE_BADGE_CLASS = {
  cutting: "bg-gray-100 text-gray-700",
  stitching: "bg-yellow-100 text-yellow-800",
  washing: "bg-primary-soft text-primary",
  packing: "bg-purple-100 text-purple-700",
  ready: "bg-green-100 text-green-700",
};

export const stageLabel = (stage) => STAGE_LABELS[stage] || stage || "—";

/** Readable label for a lot history event type. */
export const EVENT_LABELS = {
  created: "Cutting entry saved",
  edited: "Cutting entry edited",
  sent_stitching: "Sent to stitching",
  dispatched: "Gate pass out to washing",
  stitched: "Stitching received",
  washed: "Washing entry",
  packing: "In packing",
  ready: "Ready for sale — stock added",
  reversed: "Ready reversed",
  dispatched_out: "Dispatched (gate pass out)",
};

export const eventLabel = (type) => EVENT_LABELS[type] || type;

/** Rows shown when the chosen article has no size list of its own. */
export const DEFAULT_SIZES = ["30", "32", "34", "36"];

export const EMPTY_LOT_FORM = {
  productId: "",
  fabricName: "",
  fabricQty: "",
  fabricUnit: "m",
  sizes: DEFAULT_SIZES.map((size) => ({ size, qty: "" })),
  bundleNumber: "",
  shrinkage: "",
  note: "",
};

/** One editable row per product size (qty 0), or the common defaults when the product has none. */
export const initialSizeRows = (product) => {
  const sizes =
    Array.isArray(product?.sizes) && product.sizes.length > 0 ? product.sizes.map((s) => s.size) : DEFAULT_SIZES;
  return sizes.map((size) => ({ size: String(size), qty: "" }));
};

/** Form state for editing an existing lot. */
export const formFromLot = (lot) => ({
  productId: lot.productId ? String(lot.productId) : "",
  fabricName: lot.fabric?.name || "",
  fabricQty: lot.fabric?.qty ?? "",
  fabricUnit: lot.fabric?.unit || "m",
  sizes: (lot.sizes || []).map((s) => ({ size: String(s.size), qty: s.qty === 0 ? "" : String(s.qty) })),
  bundleNumber: lot.bundleNumber || "",
  shrinkage: lot.shrinkage === null || lot.shrinkage === undefined ? "" : String(lot.shrinkage),
  note: lot.note || "",
});

export const totalPieces = (rows = []) => cutQtyOf(rows);

/** Returns a hint for the cutting form, or null when it can be submitted. */
export const validateLotInput = (form) => {
  if (!form.productId) return "Please choose an article";
  if (!form.fabricName.trim()) return "Please enter the fabric name";
  const rows = form.sizes.filter((row) => row.size.trim());
  if (rows.length === 0) return "Please add at least one size";
  const names = new Set(rows.map((row) => row.size.trim().toLowerCase()));
  if (names.size !== rows.length) return "Sizes must be unique";
  if (totalPieces(rows) <= 0) return "Enter the cut quantity for at least one size";
  return null;
};

/** Shape accepted by POST/PUT /api/lots (see lotCreateSchema). */
export const toLotPayload = (form) => ({
  productId: form.productId,
  fabric: { name: form.fabricName.trim(), qty: parseFloat(form.fabricQty) || 0, unit: form.fabricUnit || "m" },
  sizes: form.sizes
    .filter((row) => row.size.trim())
    .map((row) => ({ size: row.size.trim(), qty: Math.trunc(Number(row.qty)) || 0 })),
  bundleNumber: String(form.bundleNumber || "").trim(),
  shrinkage: String(form.shrinkage ?? "").trim(),
  note: form.note.trim(),
});

/** Lot number / product search plus optional stage filter. */
export const filterLots = (lots, { searchTerm = "", stage = "" } = {}) => {
  const query = searchTerm.trim().toLowerCase();
  return lots.filter(
    (lot) =>
      (!stage || lot.stage === stage) &&
      (!query ||
        (lot.lotNumber || "").toLowerCase().includes(query) ||
        (lot.productName || "").toLowerCase().includes(query) ||
        (lot.createdBy?.name || "").toLowerCase().includes(query))
  );
};

/** Counters for the "My Lots" stat cards: only the cutting side (no stages — the cutting master doesn't see them). */
export const lotStats = (lots, now = new Date()) => {
  const month = `${now.getFullYear()}-${now.getMonth()}`;
  const inMonth = (lot) => {
    const at = new Date(lot.createdAt);
    return `${at.getFullYear()}-${at.getMonth()}` === month;
  };
  return {
    total: lots.length,
    pieces: lots.reduce((sum, lot) => sum + (Number(lot.cutQty) || 0), 0),
    thisMonth: lots.filter(inMonth).length,
  };
};

export const formatPieces = (qty) => `${Number(qty) || 0} pcs`;
