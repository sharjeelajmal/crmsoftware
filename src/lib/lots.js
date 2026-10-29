import { ObjectId } from "mongodb";
import { ROLES, normalizeRole } from "@/constants/roles";

/**
 * Production lots: one lot = one article (product), cut into sizes, moving through
 * cutting → stitching → washing → packing → ready. This module holds the pure rules;
 * routes do the I/O.
 *
 * Collections: `lots` (one doc per lot) and `lot_events` (append-only history).
 */

import {
  LOT_PREFIX,
  FIRST_LOT_SEQ,
  STAGES,
  STAGE_LABELS,
  formatLotNumber,
  cutQtyOf,
  stageIndex,
  nextStage,
  STAGE_ACTIONS,
  STAGE_ACTION_KEYS,
  nextActionFor,
  maxQtyFor,
  applyStageAction,
  lotShortfall,
  distributeBySizes,
  readySizesProblem,
} from "@/constants/lots";

export {
  LOT_PREFIX,
  FIRST_LOT_SEQ,
  STAGES,
  STAGE_LABELS,
  formatLotNumber,
  cutQtyOf,
  stageIndex,
  nextStage,
  STAGE_ACTIONS,
  STAGE_ACTION_KEYS,
  nextActionFor,
  maxQtyFor,
  applyStageAction,
  lotShortfall,
  distributeBySizes,
  readySizesProblem,
};

export const isAdmin = (session) => normalizeRole(session?.role) === ROLES.ADMIN;

export const isOwner = (lot, session) => Boolean(session && lot?.createdBy?.id === session.sub);

/** Admin sees every lot; a cutting master only their own. */
export const canViewLot = (lot, session) => isAdmin(session) || isOwner(lot, session);

/** Cutting data may only change while the lot is still at the cutting stage. */
export const canEditCutting = (lot, session) => lot?.stage === "cutting" && (isAdmin(session) || isOwner(lot, session));

/** Only admins delete, and only before production started. */
export const canDeleteLot = (lot, session) => lot?.stage === "cutting" && isAdmin(session);

/** Highest lot sequence so far, 0 when there are no lots. */
export async function latestLotSeq(db, session) {
  const [latest] = await db
    .collection("lots")
    .find({}, { projection: { seq: 1 }, session })
    .sort({ seq: -1 })
    .limit(1)
    .toArray();
  return latest?.seq || 0;
}

export async function nextLotSeq(db, session) {
  const latest = await latestLotSeq(db, session);
  return latest >= FIRST_LOT_SEQ ? latest + 1 : FIRST_LOT_SEQ;
}

/** Builds a new lot document from validated input. */
export function buildLot({ input, product, seq, session }) {
  const sizes = input.sizes.map((s) => ({ size: s.size, qty: Math.trunc(Number(s.qty)) || 0 }));
  const now = new Date();
  return {
    seq,
    lotNumber: formatLotNumber(seq),
    productId: new ObjectId(product._id),
    productName: product.name,
    fabric: { name: input.fabric.name, qty: Number(input.fabric.qty) || 0, unit: input.fabric.unit || "m" },
    sizes,
    cutQty: cutQtyOf(sizes),
    bundleNumber: input.bundleNumber || "", // the "Cut number" on screen and on the gate passes
    shrinkage: input.shrinkage ?? "", // free text
    washType: "",
    note: input.note || "",
    stage: "cutting",
    stitchedQty: null,
    washedQty: null,
    packedQty: null,
    readyQty: null,
    stockApplied: false,
    createdBy: { id: session.sub, name: session.name, role: normalizeRole(session.role) },
    createdAt: now,
    updatedAt: now,
  };
}

/** Append-only history entry. */
export function buildLotEvent(lotId, type, session, { qty = null, note = "" } = {}) {
  return {
    lotId: new ObjectId(lotId),
    type,
    qty,
    note,
    by: { id: session.sub, name: session.name, role: normalizeRole(session.role) },
    at: new Date(),
  };
}

export const lotEvents = (db, lotId, session) =>
  db
    .collection("lot_events")
    .find({ lotId: new ObjectId(lotId) }, { session })
    .sort({ at: 1 })
    .toArray();
