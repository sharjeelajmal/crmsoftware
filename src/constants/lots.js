// Pure production-lot constants, safe to import from client components.
// "Lot" is the name in the code and the database; on screen the same record is an "Invoice".
// (src/lib/lots.js adds the server-side rules on top and re-exports these.)

export const LOT_PREFIX = "INV-";
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
// "stopped" / "resumed" are shown too: a stopped entry can't be edited, and the cutting master should know why.
export const CUTTING_EVENT_TYPES = Object.freeze(["created", "edited", "stopped", "resumed"]);
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
      `"${action.label}" is only possible while the invoice is at the ${action.from} stage (now: ${lot.stage})`
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

// ---- Stop, reverse and delete from any stage (client, Rashid, 2026-11-09) -------------------------------------
// The admin can stop an invoice wherever it is, take it back one stage, or delete it at any stage.

/** A stopped invoice: no stage move, gate pass, gate pass out, dispatch, work or cutting edit until it is resumed. */
export const isStopped = (lot) => Boolean(lot?.hold);

/** Why an action can't run on a stopped invoice, or "" while it runs. */
export const stoppedProblem = (lot) => (isStopped(lot) ? `${lot.lotNumber} is stopped — resume it first` : "");

/** The stage "Reverse" takes an invoice back to, or null at the first stage. */
export const previousStage = (stage) => (stageIndex(stage) > 0 ? STAGES[stageIndex(stage) - 1] : null);

const dispatchedOf = (lot) => Number(lot?.dispatchQty) || 0;

// Washing passes that belong to the move into washing: the one issued when stitching was received and any reissue by
// hand (only possible once the invoice reached washing). "stitch_out" passes carried pieces that are still out.
const WASHING_MOVE_ACTIONS = Object.freeze(["stitched", "manual"]);

const latestEventAt = (events, type) =>
  events
    .filter((event) => event.type === type)
    .reduce((latest, event) => (!latest || new Date(event.at) > latest ? new Date(event.at) : latest), null);

/**
 * What "Reverse" undoes at the invoice's stage — the last move forward:
 * - stitching → cutting: back before "Send to stitching"; its stitching gate pass and any washing passes for pieces
 *   sent out of stitching are cancelled, and nothing counts as sent out any more;
 * - washing → stitching: the stitched pieces are cleared and the washing pass issued with them is cancelled, and so
 *   is a washing pass reissued by hand since (passes for pieces sent out earlier stay — those pieces are still out);
 * - packing → washing: the washed pieces are cleared;
 * - ready → packing: the pieces go back out of stock (`stock: true`), not once any of them were dispatched.
 * Gate passes are never deleted, only marked cancelled. Work entries are not touched.
 * `passes` are the invoice's gate passes and `events` its history (for passes issued before passes kept their action).
 * Returns `{ to, set, cancel, stock }` or `{ problem }`.
 */
export function reversePlan(lot, passes = [], events = []) {
  const to = previousStage(lot?.stage);
  if (!to) return { problem: "The invoice is at the first stage — there is nothing to reverse" };
  const open = passes.filter((pass) => !pass.cancelled);
  switch (lot.stage) {
    case "stitching":
      return {
        to,
        set: { stage: to, stitchOutQty: 0 },
        cancel: open.filter((pass) => pass.type === "stitching" || pass.type === "washing"),
        stock: false,
      };
    case "washing": {
      const stitchedAt = latestEventAt(events, "stitched");
      const issuedWithStitched = (pass) =>
        pass.action
          ? WASHING_MOVE_ACTIONS.includes(pass.action)
          : Boolean(stitchedAt) && new Date(pass.issuedAt) >= stitchedAt;
      return {
        to,
        set: { stage: to, stitchedQty: null },
        cancel: open.filter((pass) => pass.type === "washing" && issuedWithStitched(pass)),
        stock: false,
      };
    }
    case "packing":
      return { to, set: { stage: to, washedQty: null }, cancel: [], stock: false };
    case "ready":
      if (dispatchedOf(lot) > 0) {
        return {
          problem: `${dispatchedOf(lot)} pieces of ${lot.lotNumber} were already dispatched — it can't be reversed`,
        };
      }
      return { to, set: null, cancel: [], stock: Boolean(lot.stockApplied) };
    default:
      return { problem: `Unknown stage "${lot.stage}"` };
  }
}

/**
 * Why an invoice can't be deleted, or "". Any stage can be deleted (its gate passes, history and work entries go,
 * pieces in stock come back out), except once pieces were dispatched: the record of what left the factory stays.
 */
export const deleteProblem = (lot) =>
  dispatchedOf(lot) > 0
    ? `${dispatchedOf(lot)} pieces of ${lot.lotNumber} were dispatched — the invoice stays as the record of what left the factory`
    : "";

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
    if (!lotSizes.has(row.size)) return `Size "${row.size}" is not part of this invoice`;
    const n = Math.trunc(Number(row.qty));
    if (!Number.isFinite(n) || n < 0) return `Invalid pieces for size ${row.size}`;
  }
  const sum = cutQtyOf(sizes);
  if (sum !== Math.trunc(Number(qty))) return `Sizes add up to ${sum}, but ${qty} pieces were entered`;
  return null;
}
