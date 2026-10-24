import { ObjectId } from "mongodb";
import { changedFields } from "@/constants/ledger";

/**
 * Loose Items & B-Pair register — server-side helpers for the `ledger_entries` collection.
 *
 * GUARANTEE: this module and the /api/ledger routes never touch `products`, `stock_movements`,
 * src/lib/inventory.js or src/lib/production.js. The register is a standalone notebook; the only
 * other collection it reads is `lots` (to resolve the optional lot link). tests/unit/ledger.test.js
 * fails if that ever changes.
 */

export const LEDGER_COLLECTION = "ledger_entries";

export const ledgerActor = (session) => ({ id: session?.sub ?? null, name: session?.name ?? "" });

const EMPTY_LINK = Object.freeze({ lotId: null, lotNumber: null, lotProductName: null });

/**
 * Resolves the optional lot link for an entry.
 * @returns `{ lotId, lotNumber, lotProductName }` (all null without a link), or `null` when the lot does not exist.
 */
export async function resolveLotLink(db, lotId, session) {
  if (!lotId) return { ...EMPTY_LINK };
  const lot = await db
    .collection("lots")
    .findOne({ _id: new ObjectId(lotId) }, { projection: { lotNumber: 1, productName: 1 }, session });
  if (!lot) return null;
  return { lotId: lot._id, lotNumber: lot.lotNumber, lotProductName: lot.productName ?? null };
}

/** New entry document from validated input and a resolved lot link. */
export function buildLedgerEntry({ input, link = EMPTY_LINK, session, now = new Date() }) {
  return {
    type: input.type,
    item: input.item,
    qty: Number(input.qty),
    unit: input.unit || "pcs",
    note: input.note || "",
    lotId: link.lotId ?? null,
    lotNumber: link.lotNumber ?? null,
    lotProductName: link.lotProductName ?? null,
    by: ledgerActor(session),
    createdAt: now,
    updatedAt: now,
    history: [], // append-only: one snapshot per edit
  };
}

/**
 * Mongo update for an edit: the new values plus a history snapshot of what changed.
 * `link` is passed only when the request changed the lot link. Returns null when nothing changed.
 */
export function ledgerEditOps({ existing, changes, link, session, now = new Date() }) {
  const { lotId: _ignored, ...values } = changes; // the link fields come from `link`, never raw from the body
  const $set = { ...values, ...(link ?? {}) };
  const next = { ...existing, ...$set };
  const fields = changedFields(existing, next);
  if (fields.length === 0) return null;
  const before = Object.fromEntries(fields.map((key) => [key, existing?.[key] ?? null]));
  const after = Object.fromEntries(fields.map((key) => [key, next[key] ?? null]));
  return {
    $set: { ...$set, updatedAt: now },
    $push: { history: { at: now, by: ledgerActor(session), before, after } },
  };
}

/** Rows for the CSV export (one line per entry, newest first as listed). */
export const ledgerCsvRows = (entries) =>
  entries.map((entry) => ({
    date: new Date(entry.createdAt).toLocaleString(),
    type: entry.type,
    item: entry.item,
    qty: entry.qty,
    unit: entry.unit,
    lotNumber: entry.lotNumber ?? "",
    note: entry.note ?? "",
    by: entry.by?.name ?? "",
    edits: Array.isArray(entry.history) ? entry.history.length : 0,
  }));
