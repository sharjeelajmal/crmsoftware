import { errorMessage } from "@/lib/api-client";
import { itemsTotal } from "@/lib/format";
import { hasSizes } from "@/features/inventory/utils";

const INITIAL_ROWS = 4;

/** Key used to tell whether a sale's customer already exists in the customers list. */
export const customerKey = (name, phone) => `${String(name ?? "").trim()}-${String(phone ?? "").trim()}`;

export const blankItem = () => ({ desc: "", qty: "", price: "" });

export const blankItems = (count = INITIAL_ROWS) => Array.from({ length: count }, blankItem);

/** A row counts as filled when it has a description, a quantity and a price. */
export const isFilledItem = (item) => Boolean(item.desc && item.qty && item.price);

/** The product a row was picked from (undefined for hand-typed rows or products no longer in the list). */
export const productOfItem = (item, products = []) =>
  item.productId ? products.find((product) => product._id === item.productId) : undefined;

/** A filled row is complete only when a product that tracks sizes also has its size chosen. */
export const isCompleteItem = (item, products) =>
  isFilledItem(item) && (Boolean(item.size) || !hasSizes(productOfItem(item, products)));

/** Message for the first filled row that still needs a size, or null when every row is ready. */
export const missingSizeMessage = (items, products) => {
  const index = items.findIndex((item) => isFilledItem(item) && !isCompleteItem(item, products));
  return index === -1 ? null : `Please select a size for "${items[index].desc}" (row ${index + 1}).`;
};

/** subTotal / total / balance derived from items and the extra charges. */
export const computeTotals = (items, { others, discount, receivedAmount }) => {
  const subTotal = itemsTotal(items);
  const total = subTotal + (parseFloat(others) || 0) - (parseFloat(discount) || 0);
  const balance = total - (parseFloat(receivedAmount) || 0);
  return { subTotal, total, balance };
};

/** Only the fields the sales API accepts for an item; `productId` and `size` only when present. */
export const toApiItem = ({ desc, qty, price, productId, size }) => ({
  desc,
  qty,
  price,
  ...(productId ? { productId } : {}),
  ...(size ? { size } : {}),
});

/** Readable message for a failed sales request, listing validation issues when the API returns them. */
export const saleErrorMessage = (err, fallback) => {
  const issues = err?.data?.issues;
  if (Array.isArray(issues) && issues.length > 0) {
    return issues.map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message)).join(", ");
  }
  return errorMessage(err, fallback);
};
