/**
 * Gate passes (Phase 7) — pure, client-safe rules.
 *
 * A gate pass travels with the pieces when a lot leaves one unit for the next:
 *  - "stitching": issued when the cut pieces go to stitching — cut/lot number, bundle number, sizes
 *    (range + per size), total pieces, shrinkage %, fabric.
 *  - "washing": issued when the stitched pieces go to washing — lot number, pieces and the wash type.
 * Both carry the factory phone numbers (BUSINESS.gatePass) on top and at the bottom.
 */

export const GATE_PASS_PREFIX = "GP";
export const FIRST_GATE_PASS_SEQ = 1001;

export const GATE_PASS_TYPES = Object.freeze(["stitching", "washing"]);

export const GATE_PASS_LABELS = Object.freeze({
  stitching: "Stitching gate pass",
  washing: "Washing gate pass",
});

/** Which stage action issues which gate pass (null = none). */
export const GATE_PASS_FOR_ACTION = Object.freeze({
  send_stitching: "stitching",
  stitched: "washing",
});

export const formatGatePassNumber = (seq) => `${GATE_PASS_PREFIX}-${seq}`;

export const isGatePassType = (type) => GATE_PASS_TYPES.includes(type);

/** "30 – 36" from the lot's size rows (sizes with pieces only); "" when there are none. */
export const sizeRangeOf = (sizes = []) => {
  const names = sizes.filter((row) => (Math.trunc(Number(row?.qty)) || 0) > 0).map((row) => String(row.size).trim());
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  const numeric = names.every((name) => Number.isFinite(Number(name)));
  const ordered = numeric ? [...names].sort((a, b) => Number(a) - Number(b)) : names;
  return `${ordered[0]} – ${ordered[ordered.length - 1]}`;
};

/** Pieces printed on a pass: everything cut for stitching, what came back stitched for washing. */
export const gatePassPiecesFor = (lot, type) => {
  if (type === "washing") {
    const stitched = Number(lot?.stitchedQty);
    if (lot?.stitchedQty !== null && lot?.stitchedQty !== undefined && Number.isFinite(stitched)) return stitched;
  }
  return Number(lot?.cutQty) || 0;
};

/** Why a partial "gate pass out" (stitching → washing) can't be issued for `pieces`, or "". */
export const dispatchProblem = (lot, pieces) => {
  if (lot?.stage !== "stitching") return "Pieces can only be sent out while the lot is in stitching";
  const qty = Math.trunc(Number(pieces));
  if (!Number.isFinite(qty) || qty <= 0) return "Enter the pieces going out (more than 0)";
  const cut = Number(lot?.cutQty) || 0;
  const out = Math.max(0, Math.trunc(Number(lot?.stitchOutQty)) || 0);
  const balance = Math.max(0, cut - out);
  if (qty > balance) return `Only ${balance} pieces are left in stitching`;
  return "";
};

/** Pieces on the final washing pass when stitching is closed: whatever the partial passes did not carry. */
export const finalWashingPieces = (lot, stitchedQty) =>
  Math.max(0, (Math.trunc(Number(stitchedQty)) || 0) - Math.max(0, Math.trunc(Number(lot?.stitchOutQty)) || 0));

/** The earliest stage from which a pass type can be issued. */
const MIN_STAGE_INDEX = Object.freeze({ stitching: 1, washing: 2 });
const STAGE_ORDER = Object.freeze(["cutting", "stitching", "washing", "packing", "ready"]);

export const canIssueGatePass = (lot, type) =>
  isGatePassType(type) && STAGE_ORDER.indexOf(lot?.stage) >= MIN_STAGE_INDEX[type];

/** "12%" / "—" */
export const formatShrinkage = (value) =>
  value === null || value === undefined || value === "" ? "—" : `${Number(value) || 0}%`;
