import { ObjectId } from "mongodb";
import { conflict, notFound } from "@/lib/api";
import { addStock, recordStockMovement } from "@/lib/inventory";
import { buildLotEvent } from "@/lib/lots";
import { issueGatePass } from "@/lib/gatepass";
import {
  addDispatched,
  dispatchBalance,
  dispatchCost,
  dispatchOutProblem,
  dispatchRows,
  piecesOf,
} from "@/constants/dispatch";

/**
 * Dispatch of finished goods — server side, inside the caller's transaction. Takes the pieces out of the Ready
 * stock (per size when the article tracks sizes), issues the dispatch gate pass with the labour cost of those pieces,
 * adds them to the lot's `dispatchQty` / `dispatchSizes` and records a "dispatched_out" event. The rules live in
 * src/constants/dispatch.js.
 */

const tracksSizes = (product) => Array.isArray(product.sizes) && product.sizes.length > 0;

/** Wages paid on the lot so far (all its work entries). */
export async function lotLabour(db, lotId, session) {
  const [row] = await db
    .collection("work_entries")
    .aggregate([{ $match: { lotId: new ObjectId(lotId) } }, { $group: { _id: null, amount: { $sum: "$amount" } } }], {
      session,
    })
    .toArray();
  return Number(row?.amount) || 0;
}

/** The parties / shops goods were sent to before (for the suggestion list), A–Z. */
export async function dispatchParties(db) {
  const parties = await db.collection("gate_passes").distinct("party", { type: "dispatch" });
  return parties.filter((name) => typeof name === "string" && name.trim()).sort((a, b) => a.localeCompare(b));
}

export async function dispatchReadyLot(db, tx, { lot, party, sizes, note, session }) {
  const problem = dispatchOutProblem(lot, { sizes, party });
  if (problem) throw conflict(problem);
  const rows = dispatchRows(sizes);
  const pieces = piecesOf(rows);

  const product = await db.collection("products").findOne({ _id: new ObjectId(lot.productId) }, { session: tx });
  if (!product) throw notFound("Product of this lot");

  // What leaves must still be in the Ready stock (it may have been sold or corrected since the lot was ready).
  const by = { id: session?.sub ?? null, name: session?.name ?? "" };
  const movement = { productId: product._id, productName: product.name, reason: "lot_dispatch", lotId: lot._id };
  if (tracksSizes(product)) {
    for (const row of rows) {
      const inStock = Number(product.sizes.find((s) => String(s.size) === row.size)?.remaining) || 0;
      if (row.qty > inStock) throw conflict(`Only ${inStock} pieces of size ${row.size} are in stock`);
    }
    for (const row of rows) {
      await addStock(db, product._id, -row.qty, { size: row.size, session: tx });
      await recordStockMovement(
        db,
        { ...movement, qty: -row.qty, size: row.size, lotNumber: lot.lotNumber, by, note: party },
        tx
      );
    }
  } else {
    const inStock = Number(product.remaining) || 0;
    if (pieces > inStock) throw conflict(`Only ${inStock} pieces of ${product.name} are in stock`);
    await addStock(db, product._id, -pieces, { session: tx });
    await recordStockMovement(db, { ...movement, qty: -pieces, lotNumber: lot.lotNumber, by, note: party }, tx);
  }

  const balance = dispatchBalance(lot);
  const cost = dispatchCost({ labour: await lotLabour(db, lot._id, tx), readyQty: balance.ready, pieces });
  const pass = await issueGatePass(db, tx, {
    lot,
    type: "dispatch",
    pieces,
    partial: pieces < balance.left,
    sizes: rows,
    party: party.trim(),
    cost,
    note,
    session,
  });

  const $set = { dispatchSizes: addDispatched(lot.dispatchSizes, rows), updatedAt: new Date() };
  await db.collection("lots").updateOne({ _id: lot._id }, { $inc: { dispatchQty: pieces }, $set }, { session: tx });
  await db
    .collection("lot_events")
    .insertOne(
      buildLotEvent(lot._id, "dispatched_out", session, {
        qty: pieces,
        note: [pass.number, party, note].filter(Boolean).join(" · "),
      }),
      { session: tx }
    );
  return { pass, dispatchQty: (Number(lot.dispatchQty) || 0) + pieces, ...$set };
}
