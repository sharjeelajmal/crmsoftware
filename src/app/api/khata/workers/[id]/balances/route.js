import { getDb } from "@/lib/mongodb";
import { route, created, parseBody, requireObjectId, notFound } from "@/lib/api";
import { khataBalanceSchema } from "@/lib/validation";
import { KHATA_BALANCES, actorOf, buildWageAdjustment } from "@/lib/wages";

/**
 * POST /api/khata/workers/:id/balances  { owedBy: "owner" | "worker", amount, date?, note? } — admin only.
 * An old balance from the notebook (client, 2026-11-22: "copy pe likhe hain"). Money the owner still owes the worker
 * joins his baqaya (`khata_balances`, brought in by his next payment); money the worker owes the owner is an advance
 * (a `wage_adjustments` advance, cut like any advance — client, 2026-11-23). Returns the saved row with `kind`.
 */
export const POST = route(async (request, { session, ...context }) => {
  const _id = await requireObjectId(context);
  const input = await parseBody(request, khataBalanceSchema);
  const db = await getDb();
  const worker = await db.collection("workers").findOne({ _id });
  if (!worker) throw notFound("Worker");
  const now = new Date();
  if (input.owedBy === "worker") {
    const advance = buildWageAdjustment({
      worker,
      input: {
        type: "advance",
        amount: input.amount,
        date: input.date,
        note: input.note ? `Old balance · ${input.note}` : "Old balance",
      },
      session,
      now,
    });
    const { insertedId } = await db.collection("wage_adjustments").insertOne(advance);
    return created({ _id: insertedId, ...advance, kind: "advance" });
  }
  const doc = {
    workerId: worker._id,
    workerName: worker.name,
    amount: input.amount,
    date: input.date ? new Date(input.date) : now,
    note: input.note || "",
    by: actorOf(session),
    createdAt: now,
  };
  const { insertedId } = await db.collection(KHATA_BALANCES).insertOne(doc);
  return created({ _id: insertedId, ...doc, kind: "baqaya" });
});
