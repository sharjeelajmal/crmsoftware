/** Display helpers shared by pages. */

export const formatMoney = (value) => `${(Number(value) || 0).toLocaleString()}/-`;

export const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "—");

export const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : "—");

export const padInvoiceNumber = (n) => String(n ?? 0).padStart(3, "0");

/** Sum of qty * price for sale items. */
export const itemsTotal = (items = []) =>
  items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0), 0);
