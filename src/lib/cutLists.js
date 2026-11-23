import { conflict } from "@/lib/api";
import { closeListProblem, closedListEntry, currentListOf, cutListFilter, newerCut } from "@/constants/cutLists";

/**
 * Cut lists (client, 2026-11-23) — server helpers; the rules are in src/constants/cutLists.js.
 *
 * Storage: one document in the `settings` collection,
 *   { _id: "cutList", current: 2, updatedAt, history: [{ number: 1, startedAt, closedAt, by: { id, name }, lastCut, cuts }] }
 * `current` is the open list; `history` has one row per closed list (oldest first). No document = list 1, never
 * closed. Every new invoice (`lots.cutList`) and stitching-khata cut (`stitch_cuts.cutList`) stores the list that was
 * open when it was entered, and keeps it on every edit; a cut number has to be free only inside that list
 * (requireFreeLotCutNumber in src/lib/lots.js, requireFreeCutNumber in src/lib/khata.js). Only the admin closes a list.
 */

export const SETTINGS = "settings";
export const CUT_LIST_ID = "cutList";

const STITCH_CUTS = "stitch_cuts"; // STITCH_CUTS in src/lib/khata.js (not imported: khata.js imports this module)

const cutListDoc = (db, session) => db.collection(SETTINGS).findOne({ _id: CUT_LIST_ID }, { session });

/** The open list's number (1 until the first list is closed). */
export async function currentCutList(db, session) {
  return currentListOf(await cutListDoc(db, session));
}

const newestWithNumber = async (db, collection, field, inList, session) => {
  const [doc] = await db
    .collection(collection)
    .find({ ...inList, [field]: { $nin: ["", null] } }, { session, projection: { [field]: 1, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray();
  return doc ? { cutNumber: doc[field], createdAt: doc.createdAt } : null;
};

/** How many invoices + khata cuts a list has, and the cut number entered last in it. One query at a time (tx-safe). */
async function listContents(db, list, session) {
  const inList = cutListFilter(list);
  const lots = await db.collection("lots").countDocuments(inList, { session });
  const khataCuts = await db.collection(STITCH_CUTS).countDocuments(inList, { session });
  const lastLot = await newestWithNumber(db, "lots", "bundleNumber", inList, session);
  const lastKhataCut = await newestWithNumber(db, STITCH_CUTS, "cutNumber", inList, session);
  return { cuts: lots + khataCuts, lastCutNumber: newerCut(lastLot, lastKhataCut)?.cutNumber ?? "" };
}

/** `{ current, startedAt, cuts, lastCutNumber, history }` — what GET /api/cut-list returns. */
export async function cutListState(db, session) {
  const doc = await cutListDoc(db, session);
  const current = currentListOf(doc);
  const history = Array.isArray(doc?.history) ? doc.history : [];
  const { cuts, lastCutNumber } = await listContents(db, current, session);
  return { current, startedAt: history.at(-1)?.closedAt ?? null, cuts, lastCutNumber, history };
}

/**
 * Closes the open list and opens the next one (current + 1); returns the new state. 409 when the list has no
 * invoice or khata cut yet, or when `expected` (the list the admin saw) was already closed by someone else.
 */
export async function closeCutList(db, session, { expected = null, by }) {
  const doc = await cutListDoc(db, session);
  const current = currentListOf(doc);
  const { cuts, lastCutNumber } = await listContents(db, current, session);
  const problem = closeListProblem({ current, expected, cuts });
  if (problem) throw conflict(problem);

  const now = new Date();
  const history = Array.isArray(doc?.history) ? doc.history : [];
  const entry = closedListEntry({
    number: current,
    startedAt: history.at(-1)?.closedAt ?? null,
    closedAt: now,
    by,
    lastCut: lastCutNumber,
    cuts,
  });
  // Only from the state read above: a close that ran in between (no transactions) is not repeated.
  const result = await db
    .collection(SETTINGS)
    .updateOne(
      doc ? { _id: CUT_LIST_ID, current: doc.current ?? null } : { _id: CUT_LIST_ID },
      { $set: { current: current + 1, updatedAt: now }, $push: { history: entry } },
      { upsert: !doc, session }
    );
  if (doc && result.matchedCount === 0) throw conflict(`List ${current} was closed a moment ago — refresh the page`);
  return cutListState(db, session);
}
