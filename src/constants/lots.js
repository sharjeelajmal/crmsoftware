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

/**
 * What a cutting master may see of a lot after cutting (client, 2026-10-29): only its own history entries and the
 * cutting gate pass — never where the pieces went next.
 */
export const CUTTING_EVENT_TYPES = Object.freeze(["created", "edited"]);
export const CUTTING_GATE_PASS_TYPES = Object.freeze(["cutting"]);

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
  ready: {
    from: "packing",
    to: "ready",
    label: "Mark Ready for Sale",
    eventType: "ready",
    needsQty: true,
    qtyField: "readyQty",
    maxField: "washedQty",
    addsStock: true,
  },
});

export const STAGE_ACTION_KEYS = Object.freeze(Object.keys(STAGE_ACTIONS));

/** The action available at the lot's current stage, or null once the lot is ready. */
export const nextActionFor = (lot) => STAGE_ACTION_KEYS.find((key) => STAGE_ACTIONS[key].from === lot?.stage) ?? null;

/** Pieces already sent out of stitching with partial gate passes (Phase 7b). */
export const stitchOutQtyOf = (lot) => Math.max(0, Math.trunc(Number(lot?.stitchOutQty)) || 0);

/** Pieces still lying in stitching ("padi hui"): received (cut) minus sent out; 0 outside the stitching stage. */
export const stitchBalanceOf = (lot) =>
  lot?.stage === "stitching" ? Math.max(0, (Number(lot?.cutQty) || 0) - stitchOutQtyOf(lot)) : 0;

/** Lower limit for an action's quantity: closing stitching can't record fewer pieces than were already sent out. */
export const minQtyFor = (lot, actionKey) => (actionKey === "stitched" ? stitchOutQtyOf(lot) : 0);

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
    const min = minQtyFor(lot, actionKey);
    if (pieces < min) throw new Error(`${min} pieces already went out with gate passes — enter at least ${min}`);
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

// ---- Ready for sale: size distribution (Phase 3) ------------------------------
/**
 * Splits `qty` pieces across the lot's sizes in proportion to what was cut (largest remainder
 * method, so the parts always add up exactly to `qty`). Used to prefill the Ready form.
 */
export function distributeBySizes(sizes = [], qty) {
  const total = cutQtyOf(sizes);
  const pieces = Math.max(0, Math.trunc(Number(qty)) || 0);
  if (sizes.length === 0 || total === 0) return sizes.map((s) => ({ size: s.size, qty: 0 }));
  const raw = sizes.map((s) => ({ size: s.size, exact: (pieces * (Math.trunc(Number(s.qty)) || 0)) / total }));
  const parts = raw.map((r) => ({ size: r.size, qty: Math.floor(r.exact), frac: r.exact - Math.floor(r.exact) }));
  let remainder = pieces - parts.reduce((sum, p) => sum + p.qty, 0);
  for (const part of [...parts].sort((a, b) => b.frac - a.frac)) {
    if (remainder <= 0) break;
    part.qty += 1;
    remainder -= 1;
  }
  return parts.map(({ size, qty: q }) => ({ size, qty: q }));
}

/** Validates the per-size ready quantities against the lot; returns a message or null. */
export function readySizesProblem(lot, sizes, qty) {
  if (!Array.isArray(sizes) || sizes.length === 0) return "Enter the pieces per size";
  const lotSizes = new Set((lot?.sizes || []).map((s) => s.size));
  for (const row of sizes) {
    if (!lotSizes.has(row.size)) return `Size "${row.size}" is not part of this lot`;
    const n = Math.trunc(Number(row.qty));
    if (!Number.isFinite(n) || n < 0) return `Invalid pieces for size ${row.size}`;
  }
  const sum = cutQtyOf(sizes);
  if (sum !== Math.trunc(Number(qty))) return `Sizes add up to ${sum}, but ${qty} pieces were entered`;
  return null;
}
