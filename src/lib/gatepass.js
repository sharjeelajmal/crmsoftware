import { ObjectId } from "mongodb";
import { FIRST_GATE_PASS_SEQ, formatGatePassNumber, gatePassPiecesFor, sizeRangeOf } from "@/constants/gatepass";

/**
 * Gate passes — server helpers for the `gate_passes` collection. Every pass is a snapshot of the lot at
 * the moment it was issued (numbers on paper must never change afterwards). Nothing here touches stock.
 */

export async function nextGatePassSeq(db, session) {
  const [latest] = await db
    .collection("gate_passes")
    .find({}, { projection: { seq: 1 }, session })
    .sort({ seq: -1 })
    .limit(1)
    .toArray();
  const seq = latest?.seq || 0;
  return seq >= FIRST_GATE_PASS_SEQ ? seq + 1 : FIRST_GATE_PASS_SEQ;
}

/**
 * `pieces` overrides the default (partial passes); `partial: true` marks a pass that carried only part of the lot.
 * A dispatch pass brings its own `sizes` (what goes out), the `party` it goes to, its `cost` and a `note`.
 */
export function buildGatePass({
  lot,
  type,
  seq,
  washType = "",
  pieces,
  partial = false,
  sizes: onPass,
  party = "",
  cost = null,
  note = "",
  session,
  now = new Date(),
}) {
  const sizes = (onPass ?? lot.sizes ?? []).map((row) => ({
    size: String(row.size),
    qty: Math.trunc(Number(row.qty)) || 0,
  }));
  return {
    seq,
    number: formatGatePassNumber(seq),
    type,
    lotId: new ObjectId(lot._id),
    lotNumber: lot.lotNumber,
    productName: lot.productName ?? "",
    bundleNumber: lot.bundleNumber ?? "",
    shrinkage: lot.shrinkage ?? null,
    sizes,
    sizeRange: sizeRangeOf(sizes),
    pieces: pieces === undefined || pieces === null ? gatePassPiecesFor(lot, type) : Math.trunc(Number(pieces)) || 0,
    partial: Boolean(partial),
    fabric: lot.fabric
      ? { name: lot.fabric.name, qty: Number(lot.fabric.qty) || 0, unit: lot.fabric.unit || "m" }
      : null,
    washType: type === "washing" ? washType || lot.washType || "" : "",
    ...(type === "dispatch" ? { party, cost, note } : {}),
    issuedBy: { id: session?.sub ?? null, name: session?.name ?? "" },
    issuedAt: now,
  };
}

/** Issues (inserts) a pass for the lot inside the caller's transaction and returns it. */
export async function issueGatePass(db, tx, { lot, type, session, ...details }) {
  const seq = await nextGatePassSeq(db, tx);
  const doc = buildGatePass({ lot, type, seq, session, ...details });
  const { insertedId } = await db.collection("gate_passes").insertOne(doc, { session: tx });
  return { _id: insertedId, ...doc };
}

export const lotGatePasses = (db, lotId, session) =>
  db
    .collection("gate_passes")
    .find({ lotId: new ObjectId(lotId) }, { session })
    .sort({ seq: 1 })
    .toArray();
