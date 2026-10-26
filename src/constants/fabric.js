import { addDays } from "date-fns";
import { dayKey } from "@/constants/dashboard";
import { valueToDate } from "@/constants/datePresets";

/**
 * Fabric khata (the cutting master's fabric account) — pure, client-safe rules.
 *
 * Fabric comes in from the store as receipts (`fabric_receipts`); every cutting entry (lot) uses `lot.fabric.qty` of
 * its fabric. Balance in hand = received − used, per fabric. A fabric is its name + unit; names match regardless of
 * case and extra spaces ("Denim 12oz" = "denim  12OZ"). The "used" side is never stored: it is read from the lots,
 * so editing or deleting a cutting entry corrects the balance by itself.
 */

export const FABRIC_UNITS = Object.freeze(["m", "yards", "kg", "pcs"]);

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const toDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? null : at;
};

const unitOrder = (a, b) => {
  const rank = (unit) => (FABRIC_UNITS.includes(unit) ? FABRIC_UNITS.indexOf(unit) : FABRIC_UNITS.length);
  return rank(a) - rank(b) || String(a).localeCompare(String(b));
};

export const cleanFabricName = (name) =>
  String(name ?? "")
    .trim()
    .replace(/\s+/g, " ");

/** "denim 12oz|m" — what makes two entries the same fabric. */
export const fabricKey = (name, unit) => `${cleanFabricName(name).toLowerCase()}|${unit || "m"}`;

/** "1,250 m", "12.5 yards" */
export const formatFabricQty = (qty, unit = "m") =>
  `${(Number(qty) || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${unit || "m"}`;

/** One figure per unit ("1,250 m · 40 kg"), units at zero left out; `empty` when there is nothing. */
export const formatUnitTotals = (totals = [], field, empty = "0 m") => {
  const shown = totals.filter((row) => row[field] !== 0);
  const rows = shown.length ? shown : totals.slice(0, 1);
  // A no-break space keeps the "·" on the first line when a narrow card wraps the figures.
  return rows.length ? rows.map((row) => formatFabricQty(row[field], row.unit)).join(" · ") : empty;
};

/** A receipt as a movement (fabric in). */
export const receiptMovement = (receipt) => ({
  kind: "received",
  _id: String(receipt._id ?? ""),
  date: toDate(receipt.date) ?? toDate(receipt.createdAt),
  key: fabricKey(receipt.name, receipt.unit),
  name: cleanFabricName(receipt.name),
  unit: receipt.unit || "m",
  qty: round2(receipt.qty),
});

/** A cutting entry as a movement (fabric used). */
export const cuttingMovement = (lot) => ({
  kind: "used",
  _id: String(lot._id ?? ""),
  date: toDate(lot.createdAt),
  key: fabricKey(lot.fabric?.name, lot.fabric?.unit),
  name: cleanFabricName(lot.fabric?.name),
  unit: lot.fabric?.unit || "m",
  qty: round2(lot.fabric?.qty),
  lotNumber: lot.lotNumber || "",
});

/** Every receipt and cutting entry that moved fabric, oldest first (entries without a fabric or quantity are skipped). */
export const fabricMovements = ({ receipts = [], lots = [] }) =>
  [...receipts.map(receiptMovement), ...lots.map(cuttingMovement)]
    .filter((m) => m.date && m.name && m.qty > 0)
    .sort((a, b) => a.date - b.date || (a.kind === b.kind ? 0 : a.kind === "received" ? -1 : 1));

/** All-time balance of each fabric, by name. The latest receipt's spelling of the name is the one shown. */
export function fabricBalances(movements) {
  const byKey = new Map();
  for (const m of movements) {
    if (!byKey.has(m.key)) {
      byKey.set(m.key, {
        key: m.key,
        name: m.name,
        unit: m.unit,
        received: 0,
        used: 0,
        cuts: 0,
        lastReceivedAt: null,
        lastUsedAt: null,
      });
    }
    const row = byKey.get(m.key);
    if (m.kind === "received") {
      row.received = round2(row.received + m.qty);
      row.lastReceivedAt = m.date;
      row.name = m.name;
    } else {
      row.used = round2(row.used + m.qty);
      row.cuts += 1;
      row.lastUsedAt = m.date;
    }
  }
  return [...byKey.values()]
    .map((row) => ({ ...row, balance: round2(row.received - row.used) }))
    .sort((a, b) => a.name.localeCompare(b.name) || unitOrder(a.unit, b.unit));
}

/** Received / used / in hand added up per unit (metres and kilos are never added together). */
export function totalsByUnit(balances) {
  const byUnit = new Map();
  for (const row of balances) {
    if (!byUnit.has(row.unit)) byUnit.set(row.unit, { unit: row.unit, received: 0, used: 0, balance: 0 });
    const total = byUnit.get(row.unit);
    total.received = round2(total.received + row.received);
    total.used = round2(total.used + row.used);
    total.balance = round2(total.balance + row.balance);
  }
  return [...byUnit.values()].sort((a, b) => unitOrder(a.unit, b.unit));
}

/**
 * Day-by-day khata for one fabric (`key`) or all of them, one block per unit. `from` / `to` are Dates (inclusive) or
 * null for open ends; movements before `from` only add up to the opening balance. Each day shows what came in, what
 * was cut and the balance in hand at the end of that day, oldest first.
 */
export function fabricDayLedger(movements, { key = "", from = null, to = null } = {}) {
  const byUnit = new Map();
  for (const m of key ? movements.filter((row) => row.key === key) : movements) {
    if (!byUnit.has(m.unit)) byUnit.set(m.unit, { unit: m.unit, opening: 0, received: 0, used: 0, days: new Map() });
    const block = byUnit.get(m.unit);
    const signed = m.kind === "received" ? m.qty : -m.qty;
    if (from && m.date < from) {
      block.opening = round2(block.opening + signed);
      continue;
    }
    if (to && m.date > to) continue;
    const day = dayKey(m.date);
    if (!block.days.has(day)) block.days.set(day, { day, received: 0, used: 0, receipts: 0, cuts: 0 });
    const row = block.days.get(day);
    if (m.kind === "received") {
      row.received = round2(row.received + m.qty);
      row.receipts += 1;
      block.received = round2(block.received + m.qty);
    } else {
      row.used = round2(row.used + m.qty);
      row.cuts += 1;
      block.used = round2(block.used + m.qty);
    }
  }
  return [...byUnit.values()]
    .sort((a, b) => unitOrder(a.unit, b.unit))
    .map(({ days, ...block }) => {
      let balance = block.opening;
      const rows = [...days.values()].map((row) => {
        balance = round2(balance + row.received - row.used);
        return { ...row, balance };
      });
      return { ...block, closing: balance, days: rows };
    });
}

const pickLot = (lot) => ({
  _id: String(lot._id ?? ""),
  lotNumber: lot.lotNumber || "",
  productName: lot.productName || "",
  fabric: lot.fabric
    ? { name: cleanFabricName(lot.fabric.name), qty: round2(lot.fabric.qty), unit: lot.fabric.unit || "m" }
    : null,
  sizes: (lot.sizes || []).filter((row) => (Number(row.qty) || 0) > 0),
  cutQty: Number(lot.cutQty) || 0,
  bundleNumber: lot.bundleNumber || "",
  shrinkage: lot.shrinkage ?? null,
  note: lot.note || "",
  stage: lot.stage || "",
  createdBy: lot.createdBy ?? null,
  createdAt: lot.createdAt,
});

/**
 * The daily cutting report for `day` ("yyyy-MM-dd", local time): the cutting entries of that day with their remarks,
 * the fabric received that day, and per fabric the balance at the start of the day, what came in, what was cut and
 * what is in hand at the end of the day (every fabric still in hand is listed, even on a day it was not touched).
 */
export function dailyCuttingReport({ receipts = [], lots = [], day }) {
  const start = valueToDate(day);
  if (!start) return null;
  const end = addDays(start, 1);
  const inDay = (value) => {
    const at = toDate(value);
    return Boolean(at) && at >= start && at < end;
  };

  const byKey = new Map();
  for (const m of fabricMovements({ receipts, lots })) {
    if (m.date >= end) continue;
    if (!byKey.has(m.key))
      byKey.set(m.key, { key: m.key, name: m.name, unit: m.unit, opening: 0, received: 0, used: 0 });
    const row = byKey.get(m.key);
    if (m.kind === "received") row.name = m.name;
    if (m.date < start) row.opening = round2(row.opening + (m.kind === "received" ? m.qty : -m.qty));
    else if (m.kind === "received") row.received = round2(row.received + m.qty);
    else row.used = round2(row.used + m.qty);
  }
  const fabrics = [...byKey.values()]
    .map((row) => ({ ...row, closing: round2(row.opening + row.received - row.used) }))
    .filter((row) => row.closing !== 0 || row.received > 0 || row.used > 0)
    .sort((a, b) => a.name.localeCompare(b.name) || unitOrder(a.unit, b.unit));

  const dayLots = lots
    .filter((lot) => inDay(lot.createdAt))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(pickLot);
  const dayReceipts = receipts
    .filter((receipt) => inDay(receipt.date ?? receipt.createdAt))
    .sort((a, b) => new Date(a.date ?? a.createdAt) - new Date(b.date ?? b.createdAt));

  const sumBy = (field) =>
    totalsByUnit(
      fabrics.map((row) => ({ unit: row.unit, received: row.received, used: row.used, balance: row.closing }))
    )
      .filter((row) => row[field] !== 0)
      .map((row) => ({ unit: row.unit, qty: row[field] }));

  return {
    day,
    lots: dayLots,
    receipts: dayReceipts,
    fabrics,
    totals: {
      lots: dayLots.length,
      pieces: dayLots.reduce((sum, lot) => sum + lot.cutQty, 0),
      received: sumBy("received"),
      used: sumBy("used"),
      inHand: sumBy("balance"),
    },
  };
}

/** What a cutting entry leaves in hand of its fabric. `originalLot` (edit mode) gives back what that entry used. */
export function balanceAfterCut(balances, { name, unit, qty }, originalLot = null) {
  const key = fabricKey(name, unit);
  const row = balances.find((b) => b.key === key);
  if (!cleanFabricName(name) || !row) return null;
  const giveBack =
    originalLot && fabricKey(originalLot.fabric?.name, originalLot.fabric?.unit) === key
      ? round2(originalLot.fabric?.qty)
      : 0;
  const before = round2(row.balance + giveBack);
  return { ...row, usedBefore: round2(row.used - giveBack), before, after: round2(before - (Number(qty) || 0)) };
}

/** Why a fabric receipt can't be saved, or "". */
export const receiptProblem = ({ name, qty, unit, day }) => {
  if (!cleanFabricName(name)) return "Please enter the fabric name.";
  if (!(Number(qty) > 0)) return "Quantity must be more than 0.";
  if (unit && !FABRIC_UNITS.includes(unit)) return "Choose a unit.";
  if (!valueToDate(day)) return "Please choose the date.";
  return "";
};
