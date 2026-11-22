import { ObjectId } from "mongodb";
import { ROLES, normalizeRole } from "@/constants/roles";
import { conflict } from "@/lib/api";

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
  isStopped,
  stoppedProblem,
  previousStage,
  reversePlan,
  deleteProblem,
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
  isStopped,
  stoppedProblem,
  previousStage,
  reversePlan,
  deleteProblem,
};

export const isAdmin = (session) => normalizeRole(session?.role) === ROLES.ADMIN;

export const isOwner = (lot, session) => Boolean(session && lot?.createdBy?.id === session.sub);

/** Admin sees every lot; a cutting master only their own. */
export const canViewLot = (lot, session) => isAdmin(session) || isOwner(lot, session);

/** Cutting data may only change while the lot is still at the cutting stage. */
export const canEditCutting = (lot, session) => lot?.stage === "cutting" && (isAdmin(session) || isOwner(lot, session));

/** Only admins delete; any stage, unless pieces were dispatched (see deleteProblem). */
export const canDeleteLot = (lot, session) => isAdmin(session) && !deleteProblem(lot);

/** 409 while the invoice is stopped: every action that moves it on or adds to it calls this first. */
export function requireRunning(lot) {
  const problem = stoppedProblem(lot);
  if (problem) throw conflict(problem);
}

/** Same cut number ignoring case ("155a" = "155A"), as the stitching khata compares its cuts. */
const SAME_CUT_NUMBER = { locale: "en", strength: 2 };

/**
 * 409 when an invoice's cut number (`bundleNumber`) is already used — by another invoice, or by a stitching-khata cut
 * (client, 2026-11-22: a cut number is never added twice). Empty = no check. `exceptId` = the invoice being edited.
 */
export async function requireFreeLotCutNumber(db, cutNumber, { exceptId = null, session } = {}) {
  const number = String(cutNumber || "").trim();
  if (!number) return;
  const invoice = await db
    .collection("lots")
    .findOne(
      { bundleNumber: number, ...(exceptId ? { _id: { $ne: new ObjectId(exceptId) } } : {}) },
      { collation: SAME_CUT_NUMBER, session, projection: { lotNumber: 1 } }
    );
  if (invoice) throw conflict(`Cut ${number} is already invoice ${invoice.lotNumber} — check the cut number`);
  const cut = await db
    .collection("stitch_cuts") // STITCH_CUTS in src/lib/khata.js
    .findOne({ cutNumber: number }, { collation: SAME_CUT_NUMBER, session, projection: { _id: 1 } });
  if (cut) throw conflict(`Cut ${number} is already a cut in the Stitching Khata — check the cut number`);
}

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
