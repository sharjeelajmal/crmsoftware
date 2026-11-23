import { getDb } from "@/lib/mongodb";
import { route, ok } from "@/lib/api";
import { cutListState } from "@/lib/cutLists";
import { ALL_ROLES } from "@/constants/roles";

/**
 * GET /api/cut-list — the open cut list (client, 2026-11-23): `{ current, startedAt, cuts, lastCutNumber, history }`.
 * Admin and cutting master (the cutting form shows "List 2 · next after cut 155"); only the admin closes a list.
 */
export const GET = route(
  async () => {
    const db = await getDb();
    return ok(await cutListState(db));
  },
  { roles: ALL_ROLES }
);
