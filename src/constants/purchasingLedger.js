/**
 * Purchasing ledger (vendor khata) — pure, client-safe rules.
 *
 * Every purchase is a debit (we owe the vendor its total cost); every payment recorded for the vendor is a credit.
 * The balance is what is still payable: opening (everything before the period) + purchases − payments, row by row.
 * A negative balance means the vendor was paid in advance. Purchases and stock are never changed from here.
 */

export const PAYMENT_METHODS = Object.freeze(["cash", "bank", "cheque", "other"]);

export const PAYMENT_METHOD_LABELS = Object.freeze({
  cash: "Cash",
  bank: "Bank transfer",
  cheque: "Cheque",
  other: "Other",
});

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const toDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? null : at;
};

/** A purchase as a ledger entry (debit = total cost). */
export const purchaseEntry = (purchase) => {
  const qty = Number(purchase.quantity) || 0;
  const rate = Number(purchase.costPerItem) || 0;
  const total = Number(purchase.totalCost);
  return {
    _id: String(purchase._id ?? ""),
    kind: "purchase",
    date: toDate(purchase.purchaseDate) ?? toDate(purchase.createdAt),
    createdAt: toDate(purchase.createdAt),
    vendorId: String(purchase.vendorId ?? ""),
    vendorName: purchase.vendorName || "",
    detail: `${purchase.productName || "Item"}${purchase.size ? ` (Size ${purchase.size})` : ""} · ${qty} × ${rate}`,
    debit: round2(Number.isFinite(total) ? total : qty * rate),
    credit: 0,
  };
};

/** A payment to a vendor as a ledger entry (credit = amount paid). */
export const paymentEntry = (payment) => ({
  _id: String(payment._id ?? ""),
  kind: "payment",
  date: toDate(payment.date) ?? toDate(payment.createdAt),
  createdAt: toDate(payment.createdAt),
  vendorId: String(payment.vendorId ?? ""),
  vendorName: payment.vendorName || "",
  detail: `Payment · ${PAYMENT_METHOD_LABELS[payment.method] || "Other"}${payment.note ? ` · ${payment.note}` : ""}`,
  debit: 0,
  credit: round2(payment.amount),
});

const byTime = (a, b) =>
  a.date - b.date ||
  (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0) ||
  (a.kind === b.kind ? 0 : a.kind === "purchase" ? -1 : 1);

/**
 * Ledger for a period. `from` / `to` are Dates (inclusive bounds) or null for open ends. Entries before `from` only
 * add up to the opening balance; entries after `to` are left out. Rows are oldest first with the balance after each.
 */
export function buildVendorLedger({ purchases = [], payments = [], from = null, to = null }) {
  const entries = [...purchases.map(purchaseEntry), ...payments.map(paymentEntry)]
    .filter((entry) => entry.date)
    .sort(byTime);
  let opening = 0;
  let balance = 0;
  let purchased = 0;
  let paid = 0;
  const rows = [];
  for (const entry of entries) {
    if (from && entry.date < from) {
      opening = round2(opening + entry.debit - entry.credit);
      continue;
    }
    if (to && entry.date > to) continue;
    if (rows.length === 0) balance = opening;
    balance = round2(balance + entry.debit - entry.credit);
    purchased = round2(purchased + entry.debit);
    paid = round2(paid + entry.credit);
    rows.push({ ...entry, balance });
  }
  return {
    opening,
    rows,
    totals: { purchases: purchased, payments: paid, closing: rows.length ? balance : opening },
  };
}

/** What is payable to each vendor (all time), most owed first. Vendors with no entries are left out. */
export function vendorBalances({ purchases = [], payments = [] }) {
  const byVendor = new Map();
  const bucket = (id, name) => {
    const key = String(id ?? "");
    if (!byVendor.has(key)) byVendor.set(key, { vendorId: key, vendorName: name || "", purchases: 0, payments: 0 });
    const row = byVendor.get(key);
    if (!row.vendorName && name) row.vendorName = name;
    return row;
  };
  for (const entry of purchases.map(purchaseEntry)) {
    const row = bucket(entry.vendorId, entry.vendorName);
    row.purchases = round2(row.purchases + entry.debit);
  }
  for (const entry of payments.map(paymentEntry)) {
    const row = bucket(entry.vendorId, entry.vendorName);
    row.payments = round2(row.payments + entry.credit);
  }
  return [...byVendor.values()]
    .map((row) => ({ ...row, balance: round2(row.purchases - row.payments) }))
    .sort((a, b) => b.balance - a.balance || a.vendorName.localeCompare(b.vendorName));
}

/** Why a payment form can't be saved, or "". */
export const paymentProblem = ({ vendorId, amount, method }) => {
  if (!vendorId) return "Please choose a vendor.";
  if (!(Number(amount) > 0)) return "Amount must be more than 0.";
  if (method && !PAYMENT_METHODS.includes(method)) return "Choose how it was paid.";
  return "";
};
