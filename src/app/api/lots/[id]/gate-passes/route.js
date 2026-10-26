import { getDb, withTransaction } from "@/lib/mongodb";
import { route, ok, created, parseBody, requireObjectId, notFound, forbidden, conflict } from "@/lib/api";
import { gatePassIssueSchema } from "@/lib/validation";
import { canViewLot } from "@/lib/lots";
import { canIssueGatePass, GATE_PASS_LABELS } from "@/constants/gatepass";
import { issueGatePass, lotGatePasses } from "@/lib/gatepass";
import { ALL_ROLES } from "@/constants/roles";

/** GET /api/lots/:id/gate-passes — every pass issued for the lot (owner or admin), oldest first. */
export const GET = route(
  async (_request, { session, ...context }) => {
    const _id = await requireObjectId(context);
    const db = await getDb();
    const lot = await db.collection("lots").findOne({ _id }, { projection: { createdBy: 1 } });
    if (!lot) throw notFound("Lot");
    if (!canViewLot(lot, session)) throw forbidden();
    return ok(await lotGatePasses(db, _id));
  },
  { roles: ALL_ROLES }
);

/**
 * POST /api/lots/:id/gate-passes  { type: "cutting" | "stitching" | "washing", washType? }
 * Admin only. Issues a fresh pass (new number) — used for lots that moved before Phase 7 or for a reissue.
 */
export const POST = route(async (request, context) => {
  const _id = await requireObjectId(context);
  const { type, washType } = await parseBody(request, gatePassIssueSchema);
  const { session } = context;

  const pass = await withTransaction(async (db, tx) => {
    const lot = await db.collection("lots").findOne({ _id }, { session: tx });
    if (!lot) throw notFound("Lot");
    if (!canIssueGatePass(lot, type)) {
      throw conflict(`${GATE_PASS_LABELS[type]} can only be issued once the lot has reached ${type}`);
    }
    if (type === "washing" && washType) {
      await db.collection("lots").updateOne({ _id }, { $set: { washType, updatedAt: new Date() } }, { session: tx });
    }
    return issueGatePass(db, tx, { lot, type, washType, session });
  });

  return created(pass);
});
