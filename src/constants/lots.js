// Pure production-lot constants, safe to import from client components.
// (src/lib/lots.js adds the server-side rules on top and re-exports these.)

export const LOT_PREFIX = "LOT-";
export const FIRST_LOT_SEQ = 1001;

export const STAGES = Object.freeze(["cutting", "stitching", "washing", "packing", "ready"]);

export const STAGE_LABELS = Object.freeze({
  cutting: "Cutting",
  stitching: "Stitching",
  washing: "Washing",
  packing: "Packing",
  ready: "Ready for Sale",
});

export const formatLotNumber = (seq) => `${LOT_PREFIX}${seq}`;

export const cutQtyOf = (sizes = []) => sizes.reduce((sum, s) => sum + (Math.trunc(Number(s.qty)) || 0), 0);

export const stageIndex = (stage) => STAGES.indexOf(stage);

/** Next stage in the pipeline, or null when the lot is already ready. */
export const nextStage = (stage) => STAGES[stageIndex(stage) + 1] ?? null;

// ---- Stage actions (Phase 2: operations pipeline) ---------------------------
// Each action moves a lot from one stage to the next. Quantities can only shrink along the
// pipeline (a stage never receives more pieces than the previous one sent).

export const STAGE_ACTIONS = Object.freeze({
  send_stitching: {
    from: "cutting",
    to: "stitching",
    label: "Send to stitching",
    eventType: "sent_stitching",
    needsQty: false,
  },
  stitched: {
    from: "stitching",
    to: "washing",
    label: "Stitching received",
    eventType: "stitched",
    needsQty: true,
    qtyField: "stitchedQty",
    maxField: "cutQty",
  },
  washed: {
    from: "washing",
    to: "packing",
    label: "Washing entry (pieces back)",
    eventType: "washed",
    needsQty: true,
    qtyField: "washedQty",
    maxField: "stitchedQty",
  },
  // "ready" (packing → ready, adds stock) arrives in Phase 3.
});

export const STAGE_ACTION_KEYS = Object.freeze(Object.keys(STAGE_ACTIONS));

/** The action available at the lot's current stage, or null (packing → ready comes in Phase 3). */
export const nextActionFor = (lot) => STAGE_ACTION_KEYS.find((key) => STAGE_ACTIONS[key].from === lot?.stage) ?? null;

/** Upper limit for the quantity an action may record (pieces that reached this stage). */
export const maxQtyFor = (lot, actionKey) => {
  const action = STAGE_ACTIONS[actionKey];
  return action?.maxField ? Number(lot?.[action.maxField]) || 0 : null;
};

/**
 * Pure transition: returns the fields to set on the lot, or throws an Error with a user-facing
 * message. Routes turn the error into a 409/400 response.
 */
export function applyStageAction(lot, actionKey, { qty } = {}) {
  const action = STAGE_ACTIONS[actionKey];
  if (!action) throw new Error(`Unknown action "${actionKey}"`);
  if (lot.stage !== action.from) {
    throw new Error(
      `"${action.label}" is only possible while the lot is at the ${action.from} stage (now: ${lot.stage})`
    );
  }
  const $set = { stage: action.to };
  if (action.needsQty) {
    const pieces = Math.trunc(Number(qty));
    if (!Number.isFinite(pieces) || pieces < 0) throw new Error("Enter the number of pieces (0 or more)");
    const max = maxQtyFor(lot, actionKey);
    if (pieces > max) throw new Error(`Cannot record ${pieces} pieces: only ${max} reached this stage`);
    $set[action.qtyField] = pieces;
  }
  return $set;
}

/** Pieces lost along the pipeline so far (null while a stage has no entry yet). */
export function lotShortfall(lot) {
  const cut = Number(lot?.cutQty) || 0;
  const stitched = lot?.stitchedQty ?? null;
  const washed = lot?.washedQty ?? null;
  return {
    afterStitching: stitched === null ? null : cut - stitched,
    afterWashing: stitched === null || washed === null ? null : stitched - washed,
    total: washed !== null ? cut - washed : stitched !== null ? cut - stitched : null,
    lastQty: washed ?? stitched ?? cut,
  };
}
