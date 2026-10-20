/** Pure helpers for the customers module (no React, no API). */

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const ACTIVE_WINDOW_DAYS = 30;

/** Short id shown on the card: last 6 chars of _id (registered) or of the phone (normal). */
export const customerDisplayId = (customer, fallback = "N/A") => {
  if (customer._id) return String(customer._id).slice(-6).toUpperCase();
  if (customer.phone) return String(customer.phone).slice(-6);
  return fallback;
};

/** Activity badge derived from the last purchase date. */
export const customerStatus = (customer) => {
  if (!customer.lastPurchaseDate) return { text: "New", color: "bg-blue-100 text-blue-800" };
  const daysSinceLastPurchase = (Date.now() - new Date(customer.lastPurchaseDate).getTime()) / MS_PER_DAY;
  return daysSinceLastPurchase <= ACTIVE_WINDOW_DAYS
    ? { text: "Active", color: "bg-green-100 text-green-800" }
    : { text: "Inactive", color: "bg-gray-100 text-gray-800" };
};

/** Name / phone / short-id search used by the customers page. */
export const filterCustomers = (customers, searchTerm) => {
  const term = searchTerm.trim();
  if (!term) return customers;
  const lower = term.toLowerCase();
  const upper = term.toUpperCase();
  return customers.filter((customer) => {
    const displayId = customerDisplayId(customer, "");
    return (
      (customer.name || "").toLowerCase().includes(lower) ||
      (customer.phone && customer.phone.includes(term)) ||
      (displayId && displayId.includes(upper))
    );
  });
};

const sumBalances = (customers) => customers.reduce((sum, customer) => sum + (customer.totalBalance || 0), 0);

/** Figures for the three stat cards. */
export const customerStats = (registered, normal) => {
  const all = [...registered, ...normal];
  const topCustomer = all.length
    ? all.reduce((best, current) => ((best.amountSpent || 0) > (current.amountSpent || 0) ? best : current))
    : null;
  return {
    totalCustomers: all.length,
    totalDues: sumBalances(registered) + sumBalances(normal),
    topCustomerName: topCustomer?.name ?? "N/A",
  };
};

/**
 * A registered customer's total = openingBalance + sum of sale balances.
 * To make the total equal `newTotalBalance` we only move the opening balance.
 */
export const openingBalanceForTotal = (customer, newTotalBalance) => {
  const salesBalanceOnly = (customer.totalBalance || 0) - (customer.openingBalance || 0);
  return newTotalBalance - salesBalanceOnly;
};
