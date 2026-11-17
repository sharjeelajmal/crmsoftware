import { ObjectId } from "mongodb";
import { withTransaction } from "@/lib/mongodb";
import { route, created, parseBody, notFound } from "@/lib/api";
import { wagePaySchema } from "@/lib/validation";
import { payEntries } from "@/lib/wages";

/**
 * POST /api/wage-payments  { entryIds, note? }
 * Admin only. Pays chosen work entries now (client, 2026-11-17: some operations are paid as soon as they are done):
 * one "work" payment per worker for the entries not paid yet, dated on their work day. Refused when all of them are
 * already paid. Returns the payments.
 */
export const POST = route(async (request, { session }) => {
  const { entryIds, note } = await parseBody(request, wagePaySchema);
  const payments = await withTransaction(async (db, tx) => {
    const entries = await db
      .collection("work_entries")
      .find({ _id: { $in: entryIds.map((id) => new ObjectId(id)) } }, { session: tx })
      .toArray();
    if (entries.length !== entryIds.length) throw notFound("Work entry");
    return payEntries(db, tx, { entries, note, session });
  });
  return created(payments);
});
