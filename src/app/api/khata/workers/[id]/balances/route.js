import { getDb } from "@/lib/mongodb";
import { route, created, parseBody, requireObjectId, notFound } from "@/lib/api";
import { khataBalanceSchema } from "@/lib/validation";
import { KHATA_BALANCES, actorOf } from "@/lib/wages";

/**
 * POST /api/khata/workers/:id/balances  { owedBy: "owner" | "worker", amount, date?, note? } — admin only.
 * An old balance from the notebook (client, 2026-11-22: "copy pe likhe hain"): the owner still owes the worker
 * (+amount) or the worker owes the owner (−amount). It joins his baqaya, which his next lock brings in.
 */
export const POST = route(async (request, { session, ...context }) => {
  const _id = await requireObjectId(context);
  const input = await parseBody(request, khataBalanceSchema);
  const db = await getDb();
  const worker = await db.collection("workers").findOne({ _id });
  if (!worker) throw notFound("Worker");
  const now = new Date();
  const doc = {
    workerId: worker._id,
    workerName: worker.name,
    amount: input.owedBy === "owner" ? input.amount : -input.amount,
    date: input.date ? new Date(input.date) : now,
    note: input.note || "",
    by: actorOf(session),
    createdAt: now,
  };
  const { insertedId } = await db.collection(KHATA_BALANCES).insertOne(doc);
  return created({ _id: insertedId, ...doc });
});
