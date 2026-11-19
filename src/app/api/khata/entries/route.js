import { withTransaction } from "@/lib/mongodb";
import { route, created, parseBody } from "@/lib/api";
import { khataEntrySchema } from "@/lib/validation";
import { buildWorkEntry, requireLot, requireOperations, requireWorker } from "@/lib/wages";
import { requireCut } from "@/lib/khata";
import { requireRunning } from "@/lib/lots";
import { lotCategory, rateCardOf } from "@/lib/operations";
import { cardRateOf } from "@/constants/operations";

/**
 * POST /api/khata/entries  { workerId, operationId, cutId | lotId, pieces, rate?, payType?, amount?, date?, note? }
 * Admin only. One line of the stitching khata: a worker did pieces of an operation on a khata cut or an invoice. The
 * wage is pieces × rate (the rate typed, else the invoice's rate card, else the operation's own rate), or the fixed
 * amount. A stopped invoice takes no work.
 */
export const POST = route(async (request, { session }) => {
  const input = await parseBody(request, khataEntrySchema);
  const entry = await withTransaction(async (db, tx) => {
    // One after the other: operations of a transaction share its session and must not run in parallel.
    const worker = await requireWorker(db, input.workerId, tx);
    const operation = (await requireOperations(db, [input.operationId], tx)).get(input.operationId);
    let lot = null;
    let cut = null;
    let rate = input.rate;
    if (input.lotId) {
      lot = await requireLot(db, input.lotId, tx);
      requireRunning(lot);
      rate ??= cardRateOf(await rateCardOf(db, await lotCategory(db, lot, tx), tx), operation._id) ?? undefined;
    } else {
      cut = await requireCut(db, input.cutId, tx);
    }
    const doc = buildWorkEntry({
      lot,
      cut,
      operation,
      worker,
      pieces: input.pieces,
      rate,
      payType: input.payType,
      amount: input.amount,
      date: input.date,
      note: input.note,
      session,
    });
    const { insertedId } = await db.collection("work_entries").insertOne(doc, { session: tx });
    return { _id: insertedId, ...doc };
  });
  return created(entry);
});
