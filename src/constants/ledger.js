/**
 * Loose Items & B-Pair register (Phase 4) — pure, client-safe rules.
 *
 * A manual register for pieces that never reached stock (B-pair / seconds), accessories and leftover
 * fabric. It is deliberately NOT linked to products or stock: nothing in this register ever changes a
 * product quantity. `src/lib/ledger.js` and the /api/ledger routes keep that guarantee (checked by
 * tests/unit/ledger.test.js).
 */
import { lotShortfall } from "./lots";

export const LEDGER_TYPES = Object.freeze(["bpair", "accessory", "fabric"]);

export const LEDGER_TYPE_LABELS = Object.freeze({
  bpair: "B-Pair",
  accessory: "Accessory",
  fabric: "Fabric",
});

/** Units offered in the entry form; anything up to 20 chars is accepted by the API. */
export const LEDGER_UNITS = Object.freeze(["pcs", "pair", "dozen", "m", "yards", "kg", "box", "roll"]);

export const DEFAULT_UNIT_BY_TYPE = Object.freeze({ bpair: "pcs", accessory: "pcs", fabric: "m" });

export const ledgerTypeLabel = (type) => LEDGER_TYPE_LABELS[type] || type || "—";

export const isLedgerType = (type) => LEDGER_TYPES.includes(type);

/** The user-visible fields of an entry; edits are tracked field by field. */
export const LEDGER_FIELDS = Object.freeze(["type", "item", "qty", "unit", "note", "lotNumber"]);

/**
 * Prefilled B-pair entry for "record this lot's shortfall in the register".
 * Returns null while the lot has no shortfall yet.
 */
export const shortfallEntryFor = (lot) => {
  const { total } = lotShortfall(lot);
  if (!lot || !(Number(total) > 0)) return null;
  return {
    type: "bpair",
    item: lot.productName || "",
    qty: Number(total),
    unit: "pcs",
    note: `Shortfall of ${lot.lotNumber}`,
    lotId: lot._id ? String(lot._id) : null,
    lotNumber: lot.lotNumber || null,
  };
};

/** `{ count, byType: { bpair: { count, qty }, ... } }` for a list of entries. */
export const ledgerTotals = (entries = []) => {
  const byType = Object.fromEntries(LEDGER_TYPES.map((type) => [type, { count: 0, qty: 0 }]));
  for (const entry of entries) {
    const bucket = byType[entry?.type];
    if (!bucket) continue;
    bucket.count += 1;
    bucket.qty += Number(entry.qty) || 0;
  }
  return { count: entries.length, byType };
};

/** Case-insensitive search over item, note and lot number; `type` "" (or "All") keeps every type. */
export const filterLedgerEntries = (entries = [], { search = "", type = "" } = {}) => {
  const needle = String(search || "")
    .trim()
    .toLowerCase();
  const wantedType = type && type !== "All" ? type : "";
  return entries.filter((entry) => {
    if (wantedType && entry?.type !== wantedType) return false;
    if (!needle) return true;
    return [entry?.item, entry?.note, entry?.lotNumber].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(needle)
    );
  });
};

/** Names of the user-visible fields whose value differs between two entries. */
export const changedFields = (before, after) =>
  LEDGER_FIELDS.filter((key) => String(before?.[key] ?? "") !== String(after?.[key] ?? ""));
