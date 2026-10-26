/** Pure helpers for the purchasing page. */

import { format } from "date-fns";
import { hasSizes } from "@/features/inventory/utils";
import { createdAtOf, inDayRange } from "@/constants/datePresets";
import { BRAND } from "@/constants/brand";

export const DATE_FILTERS = [
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "all", label: "All Time" },
];

export const VIEWS = { PURCHASES: "purchases", VENDORS: "vendors", LEDGER: "ledger" };

export const VIEW_TABS = [
  { value: VIEWS.PURCHASES, label: "Purchase History" },
  { value: VIEWS.VENDORS, label: "Manage Vendors" },
  { value: VIEWS.LEDGER, label: "Ledger" },
];

export const EMPTY_VENDOR = { name: "", contactPerson: "", phone: "" };

export const isPurchaseComplete = (purchase) =>
  Boolean(purchase.productId && purchase.vendorId && purchase.quantity && purchase.costPerItem);

/** Validation hint for the new-purchase form, or null when it can be saved. */
export const purchaseProblem = (purchase, products = []) => {
  if (!isPurchaseComplete(purchase)) return "Please fill all fields";
  const product = products.find((item) => item._id === purchase.productId);
  if (hasSizes(product) && !purchase.size) return "Please select a size for this product";
  return null;
};

/** Shape accepted by POST /api/purchases (see purchaseSchema); `size` only for sized products. */
export const toPurchasePayload = ({ productId, vendorId, quantity, costPerItem, purchaseDate, size }) => ({
  productId,
  vendorId,
  quantity,
  costPerItem,
  purchaseDate,
  ...(size ? { size } : {}),
});

/** Shape accepted by POST/PUT /api/vendors (see vendorSchema). */
export const toVendorPayload = ({ name, contactPerson, phone }) => ({ name, contactPerson, phone });

/** Stat-card numbers for the purchases currently loaded (already filtered by period on the server). */
export const purchaseStats = (purchases, products) => {
  const latest = purchases[0];
  return {
    totalPurchaseValue: purchases.reduce((sum, purchase) => sum + (purchase.totalCost || 0), 0),
    activeVendorsCount: new Set(purchases.map((purchase) => purchase.vendorId)).size,
    recentPurchase: latest ? products.find((product) => product._id === latest.productId)?.name : "N/A",
  };
};

export const filterPurchases = (purchases, products, searchTerm) => {
  const query = searchTerm.toLowerCase();
  return purchases.filter((purchase) => {
    const product = products.find((item) => item._id === purchase.productId);
    return product?.name?.toLowerCase().includes(query) ?? false;
  });
};

/** Vendors matching the search (name / contact person) and, when given, added inside `addedRange`. */
export const filterVendors = (vendors, searchTerm, addedRange = null) => {
  const query = searchTerm.toLowerCase();
  return vendors.filter(
    (vendor) =>
      (vendor.name.toLowerCase().includes(query) || (vendor.contactPerson || "").toLowerCase().includes(query)) &&
      inDayRange(createdAtOf(vendor), addedRange)
  );
};

// ---- Purchasing ledger ---------------------------------------------------------

const day = (date) => format(date, "yyyy-MM-dd");

/** GET /api/purchases/ledger URL for a vendor ("" = all) and an optional day range. */
export const ledgerUrl = ({ vendorId = "", range = null } = {}) => {
  const params = new URLSearchParams();
  if (vendorId) params.set("vendorId", vendorId);
  if (range?.from && range?.to) {
    params.set("from", day(range.from));
    params.set("to", day(range.to));
  }
  const query = params.toString();
  return `/api/purchases/ledger${query ? `?${query}` : ""}`;
};

export const EMPTY_PAYMENT = { vendorId: "", amount: "", date: "", method: "cash", note: "" };

/** Shape accepted by POST /api/vendor-payments. */
export const toPaymentPayload = ({ vendorId, amount, date, method, note }) => ({
  vendorId,
  amount: Number(amount),
  ...(date ? { date } : {}),
  method,
  note: String(note || "").trim(),
});

const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** CSV of the ledger on screen: opening line, every row with its balance, and the closing line. */
export const ledgerCsv = (ledger) => {
  const lines = [["Date", "Vendor", "Details", "Purchase", "Payment", "Balance"]];
  lines.push(["", "", "Opening balance", "", "", ledger.opening]);
  for (const row of ledger.rows) {
    lines.push([
      format(new Date(row.date), "yyyy-MM-dd"),
      row.vendorName,
      row.detail,
      row.debit || "",
      row.credit || "",
      row.balance,
    ]);
  }
  lines.push(["", "", "Closing balance", ledger.totals.purchases, ledger.totals.payments, ledger.totals.closing]);
  return lines.map((line) => line.map(csvCell).join(",")).join("\n");
};

export const ledgerFileName = (vendorName) =>
  `${BRAND.slug}_purchasing_ledger_${(vendorName || "all-vendors").toLowerCase().replace(/[^a-z0-9]+/g, "-")}_${format(
    new Date(),
    "yyyy-MM-dd"
  )}.csv`;
