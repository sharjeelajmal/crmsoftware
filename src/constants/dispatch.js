import { round2 } from "@/constants/wages";

/**
 * Dispatch of finished goods (client, 2026-10-29) — pure, client-safe rules.
 *
 * A Ready lot sends its pieces out of the factory in one go or in parts (any number, e.g. 10), each time with a
 * dispatch gate pass naming the party / shop it goes to. What leaves is taken out of the Ready stock. The pass carries
 * the labour cost of those pieces: the wages paid on the lot ÷ the pieces that came out ready, × the pieces going out.
 * (What else belongs in the cost is still to be decided with the client.)
 */

const whole = (value) => Math.max(0, Math.trunc(Number(value)) || 0);

/** Per size: ready, already sent, still in the factory — plus the totals. */
export function dispatchBalance(lot) {
  const sent = new Map((lot?.dispatchSizes || []).map((row) => [String(row.size), whole(row.qty)]));
  const rows = (lot?.readySizes || []).map((row) => {
    const ready = whole(row.qty);
    const out = sent.get(String(row.size)) || 0;
    return { size: String(row.size), ready, sent: out, left: Math.max(0, ready - out) };
  });
  const ready = whole(lot?.readyQty) || rows.reduce((sum, row) => sum + row.ready, 0);
  const sentTotal = whole(lot?.dispatchQty);
  return { rows, ready, sent: sentTotal, left: Math.max(0, ready - sentTotal) };
}

/** Pieces in `sizes` ([{ size, qty }]). */
export const piecesOf = (sizes = []) => sizes.reduce((sum, row) => sum + whole(row.qty), 0);

/** Why this dispatch can't go out, or "" when it can. */
export function dispatchOutProblem(lot, { sizes = [], party = "" } = {}) {
  if (lot?.stage !== "ready") return "Only a lot that is Ready can be dispatched";
  if (!String(party).trim()) return "Write where the goods are going (party or shop)";
  const left = new Map(dispatchBalance(lot).rows.map((row) => [row.size, row.left]));
  for (const row of sizes) {
    const size = String(row.size);
    const qty = Math.trunc(Number(row.qty));
    if (!Number.isFinite(qty) || qty < 0) return `Invalid pieces for size ${size}`;
    if (!left.has(size)) return `Size "${size}" is not part of this lot`;
    if (qty > left.get(size)) return `Only ${left.get(size)} pieces of size ${size} are left to dispatch`;
  }
  if (piecesOf(sizes) <= 0) return "Enter the pieces going out (more than 0)";
  return "";
}

/** Labour cost for `pieces` of this lot: wages on the lot ÷ pieces ready = per piece, × pieces. */
export const dispatchCost = ({ labour = 0, readyQty = 0, pieces = 0 }) => {
  const perPiece = whole(readyQty) > 0 ? round2((Number(labour) || 0) / whole(readyQty)) : 0;
  return { labour: round2(labour), perPiece, amount: round2(perPiece * whole(pieces)) };
};

/** The sizes going out, as typed (rows with 0 dropped) — used for the pass and the stock. */
export const dispatchRows = (sizes = []) =>
  sizes.map((row) => ({ size: String(row.size), qty: whole(row.qty) })).filter((row) => row.qty > 0);

/** `dispatchSizes` after this dispatch: what was already sent plus `rows`. */
export const addDispatched = (already = [], rows = []) => {
  const bySize = new Map(already.map((row) => [String(row.size), whole(row.qty)]));
  for (const row of rows) bySize.set(String(row.size), (bySize.get(String(row.size)) || 0) + whole(row.qty));
  return [...bySize.entries()].map(([size, qty]) => ({ size, qty }));
};
