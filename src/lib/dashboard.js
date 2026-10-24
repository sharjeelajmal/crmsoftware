import { endOfDay, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";
import { dateRangeFromFilter, dateQuery } from "@/lib/dates";
import { PRODUCTION_REASONS, producedPiecesInRange } from "@/lib/production";
import { ADVANCE_TYPES, round2, summarizeWages } from "@/constants/wages";
import { stitchOutQtyOf } from "@/constants/lots";
import { LOW_STOCK_THRESHOLD } from "@/features/inventory/utils";
import {
  IDLE_WARN_DAYS,
  LIST_LIMIT,
  PIPELINE_STAGES,
  TREND_DAYS,
  dayKey,
  fillDailySeries,
  idleDays,
  lastDayKeys,
  pipelineLoad,
  utcOffsetOf,
  waitingLongest,
} from "@/constants/dashboard";

/**
 * Everything the factory dashboard shows, in one round trip. Read-only: nothing here writes.
 * Day boundaries follow the server's local time, like every other report (src/lib/dates.js).
 */

const LOT_FIELDS = {
  lotNumber: 1,
  productName: 1,
  stage: 1,
  cutQty: 1,
  stitchOutQty: 1,
  stitchedQty: 1,
  washedQty: 1,
  createdAt: 1,
  updatedAt: 1,
};

const sumOf = (rows, field) => rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);

function stockHealth(products) {
  let pieces = 0;
  let value = 0;
  let low = 0;
  let out = 0;
  for (const product of products) {
    const remaining = Number(product.remaining) || 0;
    if (remaining > 0) {
      pieces += remaining;
      value += remaining * (Number(product.purchasePrice) || 0);
    }
    if (remaining <= 0) out += 1;
    else if (remaining < LOW_STOCK_THRESHOLD) low += 1;
  }
  const restock = products
    .filter((product) => (Number(product.remaining) || 0) < LOW_STOCK_THRESHOLD)
    .sort((a, b) => (Number(a.remaining) || 0) - (Number(b.remaining) || 0) || a.name.localeCompare(b.name))
    .slice(0, LIST_LIMIT)
    .map((product) => ({
      _id: product._id,
      name: product.name,
      category: product.category ?? "",
      remaining: Math.max(0, Number(product.remaining) || 0),
    }));
  return {
    products: products.length,
    pieces,
    value: Math.round(value),
    low,
    out,
    threshold: LOW_STOCK_THRESHOLD,
    restock,
  };
}

function stitchingBalance(lots) {
  const inStitching = lots.filter((lot) => lot.stage === "stitching");
  const received = sumOf(inStitching, "cutQty");
  const out = inStitching.reduce((sum, lot) => sum + stitchOutQtyOf(lot), 0);
  return { lots: inStitching.length, received, out, lying: received - out };
}

export async function loadDashboard(db, now = new Date()) {
  const today = startOfDay(now);
  const monthStart = startOfMonth(now);
  const trendStart = startOfDay(subDays(now, TREND_DAYS - 1));
  const week = dateRangeFromFilter({ filter: "thisweek" }, now);
  const month = dateRangeFromFilter({ filter: "monthly" }, now);
  const byDay = (field) => ({ $dateToString: { format: "%Y-%m-%d", date: `$${field}`, timezone: utcOffsetOf(now) } });
  const isToday = (field) => ({ $and: [{ $gte: [field, today] }, { $lte: [field, endOfDay(now)] }] });

  const [
    activeLots,
    cutDaily,
    producedDaily,
    producedThisMonth,
    producedLastMonth,
    readyRows,
    events,
    gatePasses,
    products,
    purchaseRows,
    expenseRows,
    weekEntries,
    weekAdjustments,
    monthWageRows,
    activeWorkers,
    advanceRows,
  ] = await Promise.all([
    db
      .collection("lots")
      .find({ stage: { $in: [...PIPELINE_STAGES] } }, { projection: LOT_FIELDS })
      .toArray(),
    db
      .collection("lots")
      .aggregate([
        { $match: { createdAt: { $gte: trendStart } } },
        { $group: { _id: byDay("createdAt"), pieces: { $sum: "$cutQty" }, lots: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .collection("stock_movements")
      .aggregate([
        { $match: { reason: { $in: [...PRODUCTION_REASONS] }, at: { $gte: trendStart } } },
        { $group: { _id: byDay("at"), pieces: { $sum: "$qty" } } },
      ])
      .toArray(),
    producedPiecesInRange(db, { start: monthStart, end: now }),
    // Same stretch of last month (1st → this day and time) so the comparison is fair mid-month.
    producedPiecesInRange(db, { start: subMonths(monthStart, 1), end: subMonths(now, 1) }),
    db
      .collection("lots")
      .aggregate([
        { $match: { stage: "ready", stockApplied: true, stockAppliedAt: { $gte: monthStart } } },
        {
          $group: {
            _id: null,
            lots: { $sum: 1 },
            todayLots: { $sum: { $cond: [isToday("$stockAppliedAt"), 1, 0] } },
            todayPieces: { $sum: { $cond: [isToday("$stockAppliedAt"), "$readyQty", 0] } },
          },
        },
      ])
      .toArray(),
    db
      .collection("lot_events")
      .aggregate([
        { $sort: { at: -1 } },
        { $limit: LIST_LIMIT + 3 },
        {
          $lookup: {
            from: "lots",
            localField: "lotId",
            foreignField: "_id",
            as: "lot",
            pipeline: [{ $project: { lotNumber: 1, productName: 1 } }],
          },
        },
        { $unwind: "$lot" }, // events of deleted lots drop out
        { $limit: LIST_LIMIT + 1 },
        {
          $project: {
            type: 1,
            qty: 1,
            at: 1,
            byName: "$by.name",
            lotId: 1,
            lotNumber: "$lot.lotNumber",
            productName: "$lot.productName",
          },
        },
      ])
      .toArray(),
    db
      .collection("gate_passes")
      .find(
        {},
        {
          projection: {
            number: 1,
            type: 1,
            lotId: 1,
            lotNumber: 1,
            productName: 1,
            pieces: 1,
            partial: 1,
            washType: 1,
            issuedAt: 1,
          },
        }
      )
      .sort({ issuedAt: -1 })
      .limit(LIST_LIMIT)
      .toArray(),
    db
      .collection("products")
      .find({}, { projection: { name: 1, category: 1, remaining: 1, purchasePrice: 1 } })
      .toArray(),
    db
      .collection("purchases")
      .aggregate([
        { $match: dateQuery("purchaseDate", month) },
        {
          $group: {
            _id: null,
            month: { $sum: "$totalCost" },
            today: { $sum: { $cond: [isToday("$purchaseDate"), "$totalCost", 0] } },
          },
        },
      ])
      .toArray(),
    db
      .collection("expenses")
      .aggregate([{ $match: dateQuery("date", month) }, { $group: { _id: "$category", amount: { $sum: "$amount" } } }])
      .toArray(),
    db
      .collection("work_entries")
      .find(dateQuery("date", week), { projection: { workerId: 1, workerName: 1, pieces: 1, amount: 1 } })
      .toArray(),
    db
      .collection("wage_adjustments")
      .find(dateQuery("date", week), { projection: { workerId: 1, workerName: 1, type: 1, amount: 1, days: 1 } })
      .toArray(),
    db
      .collection("work_entries")
      .aggregate([{ $match: dateQuery("date", month) }, { $group: { _id: null, amount: { $sum: "$amount" } } }])
      .toArray(),
    db.collection("workers").countDocuments({ active: { $ne: false } }),
    // Advance still outstanding across all workers: advances given minus advance cuts (all time).
    db
      .collection("wage_adjustments")
      .aggregate([
        { $match: { type: { $in: [...ADVANCE_TYPES] } } },
        {
          $group: {
            _id: null,
            left: { $sum: { $cond: [{ $eq: ["$type", "advance"] }, "$amount", { $multiply: ["$amount", -1] }] } },
          },
        },
      ])
      .toArray(),
  ]);

  const trend = fillDailySeries(lastDayKeys(now, TREND_DAYS), { cut: cutDaily, produced: producedDaily });
  const cutOn = (key) => cutDaily.find((row) => row._id === key) || { pieces: 0, lots: 0 };
  const cutToday = cutOn(dayKey(now));
  const cutYesterday = cutOn(dayKey(subDays(now, 1)));
  const ready = readyRows[0] || { lots: 0, todayLots: 0, todayPieces: 0 };
  const stages = pipelineLoad(activeLots);
  const wages = summarizeWages(weekEntries, weekAdjustments);
  const purchases = purchaseRows[0] || { month: 0, today: 0 };
  const expensesByCategory = expenseRows
    .map((row) => ({ category: row._id || "Uncategorised", amount: Number(row.amount) || 0 }))
    .sort((a, b) => b.amount - a.amount);

  return {
    generatedAt: now,
    production: {
      cutToday: { lots: cutToday.lots, pieces: cutToday.pieces },
      cutYesterday: { lots: cutYesterday.lots, pieces: cutYesterday.pieces },
      readyToday: { lots: ready.todayLots, pieces: ready.todayPieces },
      readyLotsThisMonth: ready.lots,
      producedThisMonth,
      producedLastMonth,
      inProcess: {
        lots: activeLots.length,
        pieces: Object.values(stages).reduce((sum, stage) => sum + stage.pieces, 0),
        stalled: activeLots.filter((lot) => idleDays(lot, now) >= IDLE_WARN_DAYS).length,
      },
      stitching: stitchingBalance(activeLots),
      stages,
      waiting: waitingLongest(activeLots, now),
    },
    trend,
    activity: events,
    gatePasses,
    stock: stockHealth(products),
    money: {
      purchasesToday: purchases.today,
      purchasesMonth: purchases.month,
      expensesMonth: sumOf(expensesByCategory, "amount"),
      expensesByCategory,
      wagesMonth: Number(monthWageRows[0]?.amount) || 0,
    },
    wages: {
      week: {
        net: wages.totals.net,
        amount: wages.totals.amount,
        pieces: wages.totals.pieces,
        workers: wages.totals.workers,
      },
      activeWorkers,
      advanceLeft: round2(advanceRows[0]?.left ?? 0),
      topWorkers: [...wages.workers]
        .filter((worker) => worker.pieces > 0)
        .sort((a, b) => b.pieces - a.pieces || b.amount - a.amount)
        .slice(0, LIST_LIMIT)
        .map((worker) => ({
          workerId: worker.workerId,
          name: worker.workerName,
          pieces: worker.pieces,
          amount: worker.amount,
        })),
    },
  };
}
