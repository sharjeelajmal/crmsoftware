import { withTransaction } from "@/lib/mongodb";
import { route, created, parseBody } from "@/lib/api";
import { wageSettleSchema } from "@/lib/validation";
import { dateRangeFromFilter } from "@/lib/dates";
import { DEFAULT_WAGE_PERIOD } from "@/constants/wages";
import { settleWorker } from "@/lib/wages";

/**
 * POST /api/wage-payments/settle  { workerId, filter, from?, to?, note? }
 * Admin only. "Pay the rest": pays one worker what is still due for the wage period (net payable − already paid),
 * covering the period's unpaid work entries. Refused when nothing is left to pay. Returns the payment.
 */
export const POST = route(async (request, { session }) => {
  const { workerId, filter = DEFAULT_WAGE_PERIOD, from, to, note } = await parseBody(request, wageSettleSchema);
  const range = dateRangeFromFilter({ filter, from, to });
  const payment = await withTransaction((db, tx) => settleWorker(db, tx, { workerId, range, note, session }));
  return created(payment);
});
