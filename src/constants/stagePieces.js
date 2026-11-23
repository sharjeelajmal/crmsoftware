/**
 * Pieces per stage for the boxes on top of the Invoices page (client, 2026-11-23) — pure, client-safe.
 *
 * On a stage tab the owner sees, for that stage, what came in, what has gone on, and what is still lying there
 * ("jo chala gaya woh alag, jo pada hua hai woh alag"). Every invoice that has reached the stage counts — stopped ones
 * too, where they lie — so "received" and "out" are totals so far, while "lying" and "invoices" are now:
 *
 *  - invoices: invoices at the stage now (the rows of that tab);
 *  - received: pieces that came into the stage so far;
 *  - out:      pieces that went on from it so far (for Ready for Sale: dispatched out of the factory);
 *  - lying:    pieces still at the stage ("padi hui");
 *  - short:    pieces lost at the stage — came in, never went on, and the invoice has moved past it.
 * Always received = out + lying + short, and nothing is ever negative.
 *
 * Per stage:
 *  - cutting:   received = pieces cut; out = invoices sent to stitching (everything goes); lying = invoices at cutting.
 *  - stitching: received = pieces cut of invoices sent to stitching; out = pieces sent out early with "gate pass out"
 *               (stitchOutQty) while the invoice is in stitching, the stitched pieces once stitching was received;
 *               lying = cut − sent out of invoices still in stitching (same as the Stitching page and the dashboard).
 *  - washing:   received = pieces that reached washing — the early outs of invoices still in stitching, the stitched
 *               pieces after that; out = washed pieces (to packing); lying = what washing has not sent back yet.
 *  - packing:   received = washed pieces; out = pieces marked ready; lying = washed pieces of invoices in packing.
 *  - ready:     received = pieces marked ready; out = pieces dispatched; lying = ready pieces not dispatched yet.
 */
import { STAGES, nextStage, stageIndex, stitchOutQtyOf } from "./lots";

const whole = (value) => Math.max(0, Math.trunc(Number(value)) || 0);

/** Pieces of one invoice that came into `stage` so far (0 when they never got there). */
export function piecesInto(lot, stage) {
  const at = stageIndex(lot?.stage);
  if (at < 0) return 0;
  switch (stage) {
    case "cutting":
      return whole(lot.cutQty);
    case "stitching":
      return at >= 1 ? whole(lot.cutQty) : 0;
    case "washing":
      // Pieces sent out of stitching early are already at washing while the invoice is still in stitching.
      if (at === 1) return stitchOutQtyOf(lot);
      return at >= 2 ? whole(lot.stitchedQty) : 0;
    case "packing":
      return at >= 3 ? whole(lot.washedQty) : 0;
    case "ready":
      return at >= 4 ? whole(lot.readyQty) : 0;
    default:
      return 0;
  }
}

const NO_FLOW = Object.freeze({ received: 0, out: 0, lying: 0, short: 0 });

/** One invoice's pieces at `stage`: `{ received, out, lying, short }` (see the top of this file). */
export function stageFlowOf(lot, stage) {
  if (!STAGES.includes(stage)) return { ...NO_FLOW };
  const received = piecesInto(lot, stage);
  const wentOn = stage === "ready" ? whole(lot?.dispatchQty) : piecesInto(lot, nextStage(stage));
  const out = Math.min(received, wentOn);
  const rest = received - out;
  const movedPast = stageIndex(lot?.stage) > stageIndex(stage);
  return { received, out, lying: movedPast ? 0 : rest, short: movedPast ? rest : 0 };
}

/** The Invoices page boxes for a stage tab: `{ invoices, received, out, lying, short }` over every invoice. */
export function stagePieces(lots = [], stage) {
  const totals = { invoices: 0, ...NO_FLOW };
  if (!STAGES.includes(stage)) return totals;
  for (const lot of Array.isArray(lots) ? lots : []) {
    if (lot?.stage === stage) totals.invoices += 1;
    const flow = stageFlowOf(lot, stage);
    totals.received += flow.received;
    totals.out += flow.out;
    totals.lying += flow.lying;
    totals.short += flow.short;
  }
  return totals;
}

/** Box titles per stage tab, in the order the boxes are shown. */
export const STAGE_PIECE_LABELS = Object.freeze({
  cutting: {
    invoices: "Invoices at cutting",
    received: "Cut so far",
    out: "Sent to stitching",
    lying: "Lying at cutting",
  },
  stitching: {
    invoices: "Invoices in stitching",
    received: "Received so far",
    out: "Sent to washing",
    lying: "Lying in stitching",
  },
  washing: {
    invoices: "Invoices in washing",
    received: "Received so far",
    out: "Sent to packing",
    lying: "Lying at washing",
  },
  packing: {
    invoices: "Invoices in packing",
    received: "Received so far",
    out: "Sent to ready",
    lying: "Lying in packing",
  },
  ready: {
    invoices: "Invoices ready",
    received: "Ready so far",
    out: "Dispatched",
    lying: "Not dispatched yet",
  },
});

export const STAGE_PIECE_KEYS = Object.freeze(["invoices", "received", "out", "lying"]);
