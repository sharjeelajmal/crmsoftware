/** Pure helpers for the purchasing page. */

import { hasSizes } from "@/features/inventory/utils";

export const DATE_FILTERS = [
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "all", label: "All Time" },
];

export const VIEWS = { PURCHASES: "purchases", VENDORS: "vendors" };

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

export const filterVendors = (vendors, searchTerm) => {
  const query = searchTerm.toLowerCase();
  return vendors.filter(
    (vendor) => vendor.name.toLowerCase().includes(query) || (vendor.contactPerson || "").toLowerCase().includes(query)
  );
};
