import { round2 } from "@/constants/wages";

/**
 * Operations & category rate cards — pure, client-safe rules.
 *
 * Every operation (Overlock, Safety, Belt …) is part of a main operation, the production step it belongs to
 * (stitching, washing …). A category (the article's inventory category, e.g. "Baggy Pent") gets a rate card
 * (`operation_sets`): which operations a garment of that category needs and the rate of each for it, prefilled from
 * the operation's own rate. Work on a lot offers the operations of its article's category at those rates; a
 * category without a rate card offers every active operation at its own rate.
 */

export const MAIN_OPERATIONS = Object.freeze(["cutting", "stitching", "washing", "finishing", "packing"]);

export const MAIN_OPERATION_LABELS = Object.freeze({
  cutting: "Cutting",
  stitching: "Stitching",
  washing: "Washing",
  finishing: "Finishing",
  packing: "Packing",
});

export const DEFAULT_MAIN_OPERATION = "stitching";

/** The main operation an operation belongs to (operations saved before main operations existed are stitching). */
export const mainOperationOf = (operation) =>
  MAIN_OPERATIONS.includes(operation?.stage) ? operation.stage : DEFAULT_MAIN_OPERATION;

/** Operations grouped by main operation, in production order; empty groups are left out. */
export const groupOperations = (operations = []) =>
  MAIN_OPERATIONS.map((stage) => ({
    stage,
    label: MAIN_OPERATION_LABELS[stage],
    operations: operations.filter((operation) => mainOperationOf(operation) === stage),
  })).filter((group) => group.operations.length > 0);

const stageRank = (stage) => MAIN_OPERATIONS.indexOf(stage);

const asItem = (operation, rate) => ({
  operationId: String(operation._id),
  name: operation.name,
  stage: mainOperationOf(operation),
  rate: round2(rate),
  defaultRate: round2(operation.rate),
  active: operation.active !== false,
});

/**
 * A rate card joined with the operations: every listed operation that still exists, with the card's rate, in
 * production order (main operation, then the operations' own order). `operations` come sorted by order, name.
 */
export function rateCardItems(set, operations = []) {
  const position = new Map(operations.map((operation, index) => [String(operation._id), index]));
  const byId = new Map(operations.map((operation) => [String(operation._id), operation]));
  return (set?.items || [])
    .map((item) => {
      const operation = byId.get(String(item.operationId));
      return operation ? asItem(operation, item.rate) : null;
    })
    .filter(Boolean)
    .sort(
      (a, b) => stageRank(a.stage) - stageRank(b.stage) || position.get(a.operationId) - position.get(b.operationId)
    );
}

/** Labour for one piece: the sum of the (active) rates. */
export const rateCardTotal = (items = []) =>
  round2(items.filter((item) => item.active !== false).reduce((sum, item) => sum + (Number(item.rate) || 0), 0));

/** What assigning work on a lot offers: its category's rate card, or every active operation when there is none. */
export function lotOperations({ set, operations = [] }) {
  const fromCard = rateCardItems(set, operations).filter((item) => item.active);
  if (fromCard.length > 0) return { fromCard: true, operations: fromCard, perPiece: rateCardTotal(fromCard) };
  const all = operations
    .filter((operation) => operation.active !== false)
    .map((operation) => asItem(operation, operation.rate))
    .sort((a, b) => stageRank(a.stage) - stageRank(b.stage));
  return { fromCard: false, operations: all, perPiece: rateCardTotal(all) };
}

/** The rate of `operationId` on a category's card, or null when the card doesn't list it. */
export const cardRateOf = (set, operationId) => {
  const item = (set?.items || []).find((row) => String(row.operationId) === String(operationId));
  return item ? round2(item.rate) : null;
};

/** Pieces assigned so far per offered operation, out of the lot's pieces ("Overlock 98 / 98"). */
export function operationProgress(offered = [], entries = [], lotPieces = 0) {
  const done = new Map();
  for (const entry of entries) {
    const key = String(entry.operationId);
    done.set(key, (done.get(key) || 0) + (Math.trunc(Number(entry.pieces)) || 0));
  }
  return offered.map((operation) => {
    const pieces = done.get(operation.operationId) || 0;
    return { ...operation, pieces, complete: lotPieces > 0 && pieces >= lotPieces };
  });
}

/** Why a rate card can't be saved, or "". `rows` are the chosen operations with the rate typed for each. */
export const rateCardProblem = (rows = []) =>
  rows.some((row) => row.rate === "" || row.rate === null || !(Number(row.rate) >= 0))
    ? "Every chosen operation needs a rate (0 or more)."
    : "";
