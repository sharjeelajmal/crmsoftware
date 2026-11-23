import { withTransaction } from "@/lib/mongodb";
import { route, ok } from "@/lib/api";
import { cutListCloseSchema } from "@/lib/validation";
import { closeCutList } from "@/lib/cutLists";

/**
 * POST /api/cut-list/close  { current? } — admin only: the fabric list is finished, so the open cut list is closed and
 * the next one opens (cut numbers start again from 1). 409 when the list has no invoice or khata cut yet, or when
 * `current` was already closed. Returns the new state (as GET /api/cut-list).
 */
export const POST = route(async (request, { session }) => {
  const body = await request.text();
  const { current } = cutListCloseSchema.parse(body.trim() ? JSON.parse(body) : {});
  const state = await withTransaction((db, tx) =>
    closeCutList(db, tx, { expected: current ?? null, by: { id: session.sub, name: session.name ?? "" } })
  );
  return ok(state);
});
