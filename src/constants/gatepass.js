/**
 * Gate passes (Phase 7) — pure, client-safe rules.
 *
 * Every unit has its own pass:
 *  - "cutting": issued when the cutting entry is saved (lot created), and again whenever the cutting details on it
 *    are edited — cut/lot number, bundle number, sizes (range + per size), total pieces, shrinkage %, fabric.
 *  - "stitching": issued when the cut pieces go to stitching — the same cutting details.
 *  - "washing": issued when the stitched pieces go to washing — lot number, pieces and the wash type.
 *  - "dispatch": issued when ready pieces leave the factory (all or a part) — party / shop, pieces per size and the
 *    labour cost of those pieces (see src/constants/dispatch.js).
 * All of them carry the factory phone numbers (BUSINESS.gatePass) on top and at the bottom.
 */

export const GATE_PASS_PREFIX = "GP";
export const FIRST_GATE_PASS_SEQ = 1001;

export const GATE_PASS_TYPES = Object.freeze(["cutting", "stitching", "washing", "dispatch"]);

/** Types the admin can issue again by hand ("Issue …"); a dispatch pass only comes from a dispatch. */
export const ISSUABLE_GATE_PASS_TYPES = Object.freeze(["cutting", "stitching", "washing"]);

export const GATE_PASS_LABELS = Object.freeze({
  cutting: "Cutting gate pass",
  stitching: "Stitching gate pass",
  washing: "Washing gate pass",
  dispatch: "Dispatch gate pass",
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

/** Pieces printed on a pass: everything cut for cutting and stitching, what came back stitched for washing. */
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

/** The lot fields printed on the cutting pass, in a comparable form. */
const cuttingPassFields = (lot) =>
  JSON.stringify([
    lot?.productName ?? "",
    lot?.bundleNumber ?? "",
    lot?.shrinkage ?? null,
    (lot?.sizes || []).map((row) => [String(row.size), Math.trunc(Number(row.qty)) || 0]),
    lot?.fabric ? [lot.fabric.name, Number(lot.fabric.qty) || 0, lot.fabric.unit || "m"] : null,
  ]);

/** True when an edit changed anything printed on the cutting pass (so a fresh pass is needed). */
export const cuttingPassChanged = (before, after) => cuttingPassFields(before) !== cuttingPassFields(after);

/** The earliest stage from which a pass type can be issued. */
const MIN_STAGE_INDEX = Object.freeze({ cutting: 0, stitching: 1, washing: 2, dispatch: 4 });
const STAGE_ORDER = Object.freeze(["cutting", "stitching", "washing", "packing", "ready"]);

export const canIssueGatePass = (lot, type) =>
  isGatePassType(type) && STAGE_ORDER.indexOf(lot?.stage) >= MIN_STAGE_INDEX[type];

/**
 * Shrinkage as written on the cutting entry ("2 inch", "3-4"); "—" when empty. Entries from before it became free text
 * (client, 2026-10-29) stored a percent number, shown as "12%".
 */
export const formatShrinkage = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "number" ? `${value}%` : String(value);
};
