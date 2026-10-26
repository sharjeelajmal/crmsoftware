/** Pure helpers for the inventory module (also reused by the dashboard, sales and purchasing modules). */

import { createdAtOf, inDayRange } from "@/constants/datePresets";

export const STOCK_FILTERS = {
  ALL: "All",
  LOW: "Low Stock (<10)",
  OUT: "Out of Stock (0)",
};

export const STOCK_FILTER_OPTIONS = [STOCK_FILTERS.ALL, STOCK_FILTERS.LOW, STOCK_FILTERS.OUT];

export const LOW_STOCK_THRESHOLD = 10;

/** Sizes a new product starts with when size tracking is switched on. */
export const DEFAULT_SIZES = ["30", "32", "34", "36"];

/** "Low" = 1..9 pcs, "Out" = 0 pcs, "All" matches everything. */
export const matchesStockFilter = (product, filter) => {
  const remaining = Number(product.remaining) || 0;
  if (filter === STOCK_FILTERS.LOW) return remaining > 0 && remaining < LOW_STOCK_THRESHOLD;
  if (filter === STOCK_FILTERS.OUT) return remaining === 0;
  return true;
};

/** When the product was added (`createdAt`, or the time inside its id for the oldest products). */
export const productAddedAt = createdAtOf;

/** True when the product was added inside `range` (whole days, both ends included); no range = every product. */
export const addedInRange = (product, range) => inDayRange(productAddedAt(product), range);

export const filterProducts = (
  products,
  { searchTerm = "", category = "All", stockFilter = STOCK_FILTERS.ALL, addedRange = null }
) => {
  const query = searchTerm.toLowerCase();
  return products.filter(
    (product) =>
      (category === "All" || product.category === category) &&
      product.name.toLowerCase().includes(query) &&
      matchesStockFilter(product, stockFilter) &&
      addedInRange(product, addedRange)
  );
};

// ---- Sizes ----------------------------------------------------------------

export const hasSizes = (product) => Array.isArray(product?.sizes) && product.sizes.length > 0;

/** Editable size rows for a new product (quantities left blank). */
export const blankSizeRows = () => DEFAULT_SIZES.map((size) => ({ size, remaining: "" }));

/** Editable copy of a product's size list for the edit popup. */
export const sizeRowsOf = (product) =>
  (product?.sizes ?? []).map((row) => ({ size: row.size, remaining: String(row.remaining ?? 0) }));

export const sumSizes = (sizes = []) => sizes.reduce((sum, row) => sum + (parseInt(row.remaining, 10) || 0), 0);

/** `{ value, label }` options for a size picker, e.g. "32 (8 left)". */
export const sizeOptions = (product) =>
  (product?.sizes ?? []).map((row) => ({
    value: row.size,
    label: `${row.size} (${Number(row.remaining) || 0} left)`,
  }));

/** Returns a hint when the size rows are not usable, or null. */
export const validateSizeRows = (sizes) => {
  if (!Array.isArray(sizes) || sizes.length === 0) return "Add at least one size.";
  const names = sizes.map((row) =>
    String(row.size ?? "")
      .trim()
      .toLowerCase()
  );
  if (names.some((name) => !name)) return "Every size row needs a size.";
  if (new Set(names).size !== names.length) return "Sizes must be unique.";
  if (sizes.some((row) => (parseInt(row.remaining, 10) || 0) < 0)) return "Size quantities cannot be negative.";
  return null;
};

/**
 * Hint shown while switching an existing product to per-size stock: the rows' total replaces the
 * old total, so the user sees how far the split is from the current stock.
 * @returns {{ total: number, current: number, diff: number, message: string }}
 */
export const sizeSplitHint = (product, rows) => {
  const total = sumSizes(rows);
  const current = Number(product?.remaining) || 0;
  const diff = total - current;
  const message =
    diff === 0
      ? `Sizes add up to the current stock (${current} pcs).`
      : diff > 0
        ? `Sizes add up to ${total} pcs, ${diff} more than the current stock (${current} pcs). Total becomes ${total}.`
        : `Sizes add up to ${total} pcs, ${-diff} less than the current stock (${current} pcs). Total becomes ${total}.`;
  return { total, current, diff, message };
};

/**
 * New size list after adding (`delta` > 0) or removing (`delta` < 0) pieces of one size.
 * Returns null when that size is unknown or would drop below zero.
 */
export const sizesWithChange = (sizes, size, delta) => {
  const next = sizes.map((row) => ({ size: row.size, remaining: parseInt(row.remaining, 10) || 0 }));
  const row = next.find((item) => item.size === size);
  if (!row || row.remaining + delta < 0) return null;
  row.remaining += delta;
  return next;
};

// ---- Product forms --------------------------------------------------------

/** Name, category and both prices are always required. */
export const validateProductDetails = (product) =>
  !product.name || !product.purchasePrice || !product.salePrice ? "Please fill all fields." : null;

/** Returns a validation hint for the add-product form, or null when it is complete. */
export const validateProductInput = (product) => {
  const problem = validateProductDetails(product);
  if (problem) return problem;
  if (product.sizes) return validateSizeRows(product.sizes);
  return product.remaining === "" || product.remaining === undefined ? "Please fill all fields." : null;
};

const toSizesPayload = (sizes) =>
  sizes.map((row) => ({ size: String(row.size).trim(), remaining: parseInt(row.remaining, 10) || 0 }));

/** Shape accepted by POST /api/products (see productSchema); `sizes` only when the product tracks them. */
export const toProductPayload = (product) => {
  const payload = {
    name: product.name,
    category: product.category,
    purchasePrice: parseFloat(product.purchasePrice),
    salePrice: parseFloat(product.salePrice),
    remaining: parseInt(product.remaining, 10) || 0,
  };
  if (!product.sizes) return payload;
  const sizes = toSizesPayload(product.sizes);
  return { ...payload, remaining: sumSizes(sizes), sizes };
};

/** Shape sent to PUT /api/products/:id from the edit popup (the server recomputes `remaining` from `sizes`). */
export const toProductUpdatePayload = (product) => {
  const payload = {
    name: product.name,
    category: product.category,
    purchasePrice: parseFloat(product.purchasePrice),
    salePrice: parseFloat(product.salePrice),
  };
  return product.sizes ? { ...payload, sizes: toSizesPayload(product.sizes) } : payload;
};
