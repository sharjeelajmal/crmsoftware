import { format } from "date-fns";
import { cleanFabricName, fabricKey, formatFabricQty } from "@/constants/fabric";
import { dateToValue } from "@/constants/datePresets";

/** Client helpers for the fabric khata and the daily cutting report (the maths is in src/constants/fabric.js). */

export const todayValue = () => format(new Date(), "yyyy-MM-dd");

export const EMPTY_RECEIPT = { day: "", name: "", qty: "", rolls: "", unit: "m", note: "", holderId: "" };

/** Form state for a new receipt (today) or for editing one. */
export const receiptForm = (receipt = null) =>
  receipt
    ? {
        _id: receipt._id,
        day: dateToValue(receipt.date),
        name: receipt.name || "",
        qty: String(receipt.qty ?? ""),
        rolls: receipt.rolls ? String(receipt.rolls) : "",
        unit: receipt.unit || "m",
        note: receipt.note || "",
        holderId: receipt.holder?.id || "",
      }
    : { ...EMPTY_RECEIPT, day: todayValue() };

/** Shape accepted by POST/PUT /api/fabric/receipts (see fabricReceiptSchema). */
export const toReceiptPayload = ({ day, name, qty, rolls, unit, note, holderId }) => ({
  day,
  name: cleanFabricName(name),
  qty: Number(qty),
  rolls: Math.trunc(Number(rolls)) || 0,
  unit: unit || "m",
  note: String(note || "").trim(),
  ...(holderId ? { holderId } : {}),
});

const query = (base, params) => {
  const search = new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString();
  return search ? `${base}?${search}` : base;
};

/** GET /api/fabric for a cutting master (admin filter), one fabric (key) and a day range. */
export const khataUrl = ({ holderId = "", fabric = "", range = null } = {}) =>
  query("/api/fabric", {
    holderId,
    fabric,
    from: range?.from && range?.to ? dateToValue(range.from) : "",
    to: range?.from && range?.to ? dateToValue(range.to) : "",
  });

export const reportUrl = ({ day, holderId = "" }) => query("/api/fabric/report", { day, holderId });

/** Fabrics from the khata as suggestions for a fabric name field ("Denim 12oz" · "180 m in hand"). */
export const fabricSuggestions = (balances = []) =>
  balances.map((row) => ({
    value: row.key,
    label: row.name,
    hint: `${formatFabricQty(row.balance, row.unit)} in hand`,
    name: row.name,
    unit: row.unit,
  }));

/** The khata row of the fabric typed in a form, or null. */
export const balanceOf = (balances = [], name, unit) =>
  balances.find((row) => row.key === fabricKey(name, unit)) ?? null;

/** "Sizes 30: 40 · 32: 45" for the report. */
export const sizesText = (sizes = []) => sizes.map((row) => `${row.size}: ${row.qty}`).join(" · ");
