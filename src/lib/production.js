import { ObjectId } from "mongodb";
import { addStock, recordStockMovement } from "@/lib/inventory";
import { conflict, notFound } from "@/lib/api";
import { buildLotEvent, distributeBySizes, readySizesProblem } from "@/lib/lots";

/**
 * Production → stock (Phase 3). Both functions run inside a transaction passed by the route.
 *
 * - markLotReady: packing → ready; adds `readyQty` pieces to the product (per size when the
 *   product tracks sizes), once only (`stockApplied`), with a stock movement and a lot event.
 * - reverseLotReady: ready → packing; takes the same pieces back out, records the reason.
 */

const actor = (session) => ({ id: session.sub, name: session.name });

const productTracksSizes = (product) => Array.isArray(product.sizes) && product.sizes.length > 0;

export async function markLotReady(db, tx, { lot, qty, sizes, note, session }) {
  if (lot.stage !== "packing")
    throw conflict(`"Mark Ready for Sale" is only possible at the packing stage (now: ${lot.stage})`);
  if (lot.stockApplied) throw conflict(`${lot.lotNumber} has already been added to stock`);

  const pieces = Math.trunc(Number(qty));
  const max = Number(lot.washedQty) || 0;
  if (!Number.isFinite(pieces) || pieces < 0) throw conflict("Enter the number of pieces (0 or more)");
  if (pieces > max) throw conflict(`Cannot mark ${pieces} pieces ready: only ${max} came back from washing`);

  const readySizes = (sizes?.length ? sizes : distributeBySizes(lot.sizes, pieces)).map((s) => ({
    size: s.size,
    qty: Math.trunc(Number(s.qty)) || 0,
  }));
  const problem = readySizesProblem(lot, readySizes, pieces);
  if (problem) throw conflict(problem);

  const product = await db.collection("products").findOne({ _id: new ObjectId(lot.productId) }, { session: tx });
  if (!product) throw notFound("Product of this lot");

  const now = new Date();
  const by = actor(session);
  if (productTracksSizes(product)) {
    for (const row of readySizes) {
      if (row.qty === 0) continue;
      await addStock(db, product._id, row.qty, { size: row.size, session: tx });
      await recordStockMovement(
        db,
        {
          productId: product._id,
          productName: product.name,
          qty: row.qty,
          size: row.size,
          reason: "lot_ready",
          lotId: lot._id,
          lotNumber: lot.lotNumber,
          by,
        },
        tx
      );
    }
  } else if (pieces > 0) {
    await addStock(db, product._id, pieces, { session: tx });
    await recordStockMovement(
      db,
      {
        productId: product._id,
        productName: product.name,
        qty: pieces,
        reason: "lot_ready",
        lotId: lot._id,
        lotNumber: lot.lotNumber,
        by,
      },
      tx
    );
  }
  await db
    .collection("products")
    .updateOne(
      { _id: product._id },
      { $set: { lastProduction: { lotId: lot._id, lotNumber: lot.lotNumber, qty: pieces, at: now } } },
      { session: tx }
    );

  const $set = {
    stage: "ready",
    readyQty: pieces,
    readySizes,
    stockApplied: true,
    stockAppliedAt: now,
    stockAppliedBy: by,
    updatedAt: now,
  };
  await db
    .collection("lots")
    .updateOne({ _id: lot._id }, { $set, $unset: { reversedAt: "", reverseReason: "" } }, { session: tx });
  await db
    .collection("lot_events")
    .insertOne(buildLotEvent(lot._id, "ready", session, { qty: pieces, note }), { session: tx });
  return $set;
}

export async function reverseLotReady(db, tx, { lot, reason, session }) {
  if (lot.stage !== "ready" || !lot.stockApplied)
    throw conflict(`${lot.lotNumber} is not in stock, nothing to reverse`);
  if ((Number(lot.dispatchQty) || 0) > 0) {
    throw conflict(`${lot.dispatchQty} pieces of ${lot.lotNumber} were already dispatched — it can't be reversed`);
  }

  const product = await db.collection("products").findOne({ _id: new ObjectId(lot.productId) }, { session: tx });
  if (!product) throw notFound("Product of this lot");

  const by = actor(session);
  const readySizes = Array.isArray(lot.readySizes) ? lot.readySizes : [];
  if (productTracksSizes(product) && readySizes.length > 0) {
    for (const row of readySizes) {
      if (!row.qty) continue;
      await addStock(db, product._id, -row.qty, { size: row.size, session: tx });
      await recordStockMovement(
        db,
        {
          productId: product._id,
          productName: product.name,
          qty: -row.qty,
          size: row.size,
          reason: "lot_reversed",
          lotId: lot._id,
          lotNumber: lot.lotNumber,
          by,
          note: reason,
        },
        tx
      );
    }
  } else if (lot.readyQty > 0) {
    await addStock(db, product._id, -lot.readyQty, { session: tx });
    await recordStockMovement(
      db,
      {
        productId: product._id,
        productName: product.name,
        qty: -lot.readyQty,
        reason: "lot_reversed",
        lotId: lot._id,
        lotNumber: lot.lotNumber,
        by,
        note: reason,
      },
      tx
    );
  }

  const now = new Date();
  const $set = { stage: "packing", stockApplied: false, reversedAt: now, reverseReason: reason, updatedAt: now };
  await db.collection("lots").updateOne({ _id: lot._id }, { $set }, { session: tx });
  await db
    .collection("lot_events")
    .insertOne(buildLotEvent(lot._id, "reversed", session, { qty: -(Number(lot.readyQty) || 0), note: reason }), {
      session: tx,
    });
  return $set;
}

/** Stock movement reasons written by production (ready adds pieces, a reversal takes them back). A dispatch
 * ("lot_dispatch") takes ready pieces out of stock but is not production, so it is not counted here. */
export const PRODUCTION_REASONS = Object.freeze(["lot_ready", "lot_reversed"]);

/** Net pieces that production put into stock: ready movements minus reversals (pure, for tests and widgets). */
export const producedPieces = (movements = []) =>
  movements.filter((m) => PRODUCTION_REASONS.includes(m?.reason)).reduce((sum, m) => sum + (Number(m.qty) || 0), 0);

/**
 * Net pieces produced in a period (`range` = { start, end } or null for all time), straight from the
 * `stock_movements` audit trail, so reversals are already subtracted.
 */
export async function producedPiecesInRange(db, range, session) {
  const match = { reason: { $in: PRODUCTION_REASONS } };
  if (range?.start || range?.end) {
    match.at = {};
    if (range.start) match.at.$gte = range.start;
    if (range.end) match.at.$lte = range.end;
  }
  const [row] = await db
    .collection("stock_movements")
    .aggregate([{ $match: match }, { $group: { _id: null, pieces: { $sum: "$qty" } } }], { session })
    .toArray();
  return row?.pieces || 0;
}
