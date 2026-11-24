import { ObjectId } from "mongodb";
import { notFound, conflict } from "@/lib/api";
import { actorOf, KHATA_BALANCES, WAGE_PAYMENTS } from "@/lib/wages";
import { currentCutList } from "@/lib/cutLists";
import { round2 } from "@/constants/wages";
import { cutListFilter } from "@/constants/cutLists";

/**
 * Stitching khata — server helpers (client, 2026-11-19). The owner adds the cuts himself (`stitch_cuts`) and, each
 * evening, every worker's work on them; those are ordinary `work_entries` (with `cutId` / `cutNumber`, or `lotId`
 * for an invoice), so wages, payments and reports treat them like all other work. The rules live in
 * src/constants/wages.js (lockPreview, cutProgress, workRefLabel).
 */

export const STITCH_CUTS = "stitch_cuts";

/** Same cut number ignoring case ("20a" = "20A"). */
const SAME_NUMBER = { locale: "en", strength: 2 };

/** `cutList` = the cut list open now (src/lib/cutLists.js); it never changes afterwards. */
export function buildCut({ input, session, cutList = 1, now = new Date() }) {
  return {
    cutNumber: input.cutNumber,
    cutList,
    article: input.article || "",
    pieces: Math.trunc(Number(input.pieces)) || 0,
    date: input.date ? new Date(input.date) : now,
    note: input.note || "",
    by: actorOf(session),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 409 when another cut of the same cut list already has this number — a khata cut, or an invoice whose cut number it
 * is (that cut's work belongs on the invoice, so its labour stays in one place: the invoice, its dispatch cost and the
 * khata). Numbers start again in every list (client, 2026-11-23), so other lists don't count. `cutList` = the cut's
 * own list (default: the open list, for a new cut).
 */
export async function requireFreeCutNumber(db, cutNumber, { exceptId = null, cutList, session } = {}) {
  const list = cutList ?? (await currentCutList(db, session));
  const inList = cutListFilter(list);
  const clash = await db
    .collection(STITCH_CUTS)
    .findOne(
      { cutNumber, ...inList, ...(exceptId ? { _id: { $ne: new ObjectId(exceptId) } } : {}) },
      { collation: SAME_NUMBER, session }
    );
  if (clash) throw conflict(`Cut ${clash.cutNumber} already exists in list ${list}`);
  const invoice = await db
    .collection("lots")
    .findOne({ bundleNumber: cutNumber, ...inList }, { collation: SAME_NUMBER, session, projection: { lotNumber: 1 } });
  if (invoice) {
    throw conflict(
      `Cut ${cutNumber} is invoice ${invoice.lotNumber} in list ${list} — choose that invoice when you add the work`
    );
  }
}

export async function requireCut(db, cutId, session) {
  const cut = await db.collection(STITCH_CUTS).findOne({ _id: new ObjectId(cutId) }, { session });
  if (!cut) throw notFound("Cut");
  return cut;
}

const sumOf = (field) => ({ $sum: `$${field}` });
const unpaidAmount = { $sum: { $cond: [{ $ifNull: ["$paymentId", false] }, 0, "$amount"] } };

/** Per cut: how many entries and workers, labour, and what of it is still unpaid. */
export async function cutTotals(db, cutIds) {
  if (cutIds.length === 0) return new Map();
  const rows = await db
    .collection("work_entries")
    .aggregate([
      { $match: { cutId: { $in: cutIds.map((id) => new ObjectId(id)) } } },
      {
        $group: {
          _id: "$cutId",
          entries: { $sum: 1 },
          workers: { $addToSet: "$workerId" },
          amount: sumOf("amount"),
          unpaid: unpaidAmount,
        },
      },
    ])
    .toArray();
  return new Map(
    rows.map((row) => [
      String(row._id),
      { entries: row.entries, workers: row.workers.length, amount: round2(row.amount), unpaid: round2(row.unpaid) },
    ])
  );
}

/** Work entered per article × operation (amount, pieces, last day) — what articleStitchCosts is made from. */
export async function articleCostRows(db) {
  const rows = await db
    .collection("work_entries")
    .aggregate([
      { $match: { productName: { $nin: [null, ""] }, pieces: { $gt: 0 } } },
      {
        $group: {
          _id: { article: { $toLower: { $trim: { input: "$productName" } } }, operationId: "$operationId" },
          article: { $first: "$productName" },
          operationName: { $last: "$operationName" },
          amount: { $sum: "$amount" },
          pieces: { $sum: "$pieces" },
          lastDate: { $max: "$date" },
        },
      },
    ])
    .toArray();
  return rows.map((row) => ({
    article: row.article,
    operationId: String(row._id.operationId),
    operationName: row.operationName,
    amount: row.amount,
    pieces: row.pieces,
    lastDate: row.lastDate,
  }));
}

/** Every worker's baqaya (signed; see baqayaOf): his old balances plus what his locks left. Map workerId → amount. */
export async function workerBaqayas(db) {
  const [balances, locks] = await Promise.all([
    db
      .collection(KHATA_BALANCES)
      .aggregate([{ $group: { _id: "$workerId", amount: { $sum: "$amount" } } }])
      .toArray(),
    db
      .collection(WAGE_PAYMENTS)
      .aggregate([
        { $match: { kind: "lock", balanceChange: { $exists: true } } },
        { $group: { _id: "$workerId", amount: { $sum: "$balanceChange" } } },
      ])
      .toArray(),
  ]);
  const total = new Map();
  for (const row of [...balances, ...locks]) {
    const key = String(row._id);
    total.set(key, round2((total.get(key) ?? 0) + (Number(row.amount) || 0)));
  }
  return total;
}

/**
 * Per worker (the khata's worker boxes): unpaid wages, all-time wages, entries, the last work day and the last lock
 * (day it paid up to, and when).
 */
export async function workerTotals(db) {
  const [work, locks] = await Promise.all([
    db
      .collection("work_entries")
      .aggregate([
        {
          $group: {
            _id: "$workerId",
            entries: { $sum: 1 },
            amount: sumOf("amount"),
            unpaid: unpaidAmount,
            lastWork: { $max: "$date" },
          },
        },
      ])
      .toArray(),
    db
      .collection(WAGE_PAYMENTS)
      .aggregate([
        { $match: { kind: "lock" } },
        { $sort: { date: -1, createdAt: -1 } },
        { $group: { _id: "$workerId", upTo: { $first: "$date" }, at: { $first: "$createdAt" } } },
      ])
      .toArray(),
  ]);
  const lockOf = new Map(locks.map((row) => [String(row._id), { upTo: row.upTo, at: row.at }]));
  return new Map(
    work.map((row) => [
      String(row._id),
      {
        entries: row.entries,
        amount: round2(row.amount),
        unpaid: round2(row.unpaid),
        lastWork: row.lastWork,
        lastLock: lockOf.get(String(row._id)) ?? null,
      },
    ])
  );
}
