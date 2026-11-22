import { withTransaction } from "@/lib/mongodb";
import { route, created, parseBody, requireObjectId } from "@/lib/api";
import { khataLockSchema } from "@/lib/validation";
import { lockWorker } from "@/lib/wages";

/**
 * POST /api/khata/workers/:id/lock  { upTo, advanceCut?, note? } — admin only. "Up to here he is paid": everything
 * the worker has not been paid for, done on or before `upTo`, is paid in one "lock" payment; the khata starts again
 * after it. `advanceCut` takes that much of his advance back there (an advance cut, dated `upTo`), so he gets the work
 * less the cut in hand. `cash`: what was handed over (default: all that is due, the baqaya included) — less or
 * more stays as his baqaya. Taken back like any payment (DELETE /api/wage-payments/:id), the advance cut with it.
 */
export const POST = route(async (request, context) => {
  const _id = await requireObjectId(context);
  const { upTo, advanceCut, cash, note } = await parseBody(request, khataLockSchema);
  const { session } = context;
  const payment = await withTransaction((db, tx) =>
    lockWorker(db, tx, { workerId: String(_id), upTo, advanceCut, cash, note, session })
  );
  return created(payment);
});
