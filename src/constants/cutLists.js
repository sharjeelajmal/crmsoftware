/**
 * Cut lists (client, 2026-11-23) — pure rules, shared by the server (src/lib/cutLists.js) and the cutting form.
 *
 * Cutting comes from a fabric "list"; its cuts are numbered 1…200/300/400, and when the list is finished the owner
 * closes it himself and the next list starts again from cut 1. So a cut number is unique only inside its list: every
 * invoice (`lots.cutList`) and every stitching-khata cut (`stitch_cuts.cutList`) carries the list it was entered in.
 * Documents from before lists existed have no `cutList` and count as list 1.
 */

export const FIRST_CUT_LIST = 1;

const listNumber = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= FIRST_CUT_LIST ? n : FIRST_CUT_LIST;
};

/** The list an invoice or khata cut belongs to (none stored = list 1). */
export const cutListOf = (doc) => listNumber(doc?.cutList);

/** The open list from the settings document (no document yet = list 1). */
export const currentListOf = (settings) => listNumber(settings?.current);

/**
 * Mongo filter for the invoices / khata cuts of one list. List 1 also holds the old documents without `cutList`
 * (`$in` with null matches a missing field too).
 */
export const cutListFilter = (list) => {
  const n = listNumber(list);
  return { cutList: n === FIRST_CUT_LIST ? { $in: [FIRST_CUT_LIST, null] } : n };
};

/** The newer of two `{ cutNumber, createdAt }` (either may be null) — the last cut entered in a list. */
export const newerCut = (a, b) => {
  if (!a) return b ?? null;
  if (!b) return a;
  return new Date(b.createdAt) > new Date(a.createdAt) ? b : a;
};

/**
 * The hint under the cutting form's cut number. New entry: the open list and the last cut entered in it
 * ("List 2 · next after cut 155"). Editing (`lotList`): the invoice's own list, where its number is checked.
 */
export const cutListHint = ({ current, lastCutNumber = "", lotList = null } = {}) => {
  if (lotList !== null && lotList !== undefined) {
    const own = listNumber(lotList);
    return `List ${own}${current && own !== listNumber(current) ? " (closed)" : ""} · this invoice's cut list`;
  }
  const open = listNumber(current);
  return lastCutNumber
    ? `List ${open} · next after cut ${lastCutNumber}`
    : `List ${open} · no cuts yet — numbers start from 1`;
};

/** Why the open list can't be closed now, or null. `expected` = the list the person saw when he pressed Close. */
export const closeListProblem = ({ current, expected = null, cuts = 0 }) => {
  const open = listNumber(current);
  if (expected !== null && expected !== undefined && Number(expected) !== open) {
    return `List ${expected} is already closed — list ${open} is open now`;
  }
  if (!(cuts > 0)) return `List ${open} has no cuts yet — there is nothing to close`;
  return null;
};

/** The history row written when a list is closed. */
export const closedListEntry = ({ number, startedAt = null, closedAt, by, lastCut = "", cuts = 0 }) => ({
  number: listNumber(number),
  startedAt: startedAt ?? null,
  closedAt,
  by,
  lastCut: lastCut || "",
  cuts,
});
