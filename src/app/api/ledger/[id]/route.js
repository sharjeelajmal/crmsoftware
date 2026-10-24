import { getDb } from "@/lib/mongodb";
import { route, ok, parseBody, requireObjectId, notFound } from "@/lib/api";
import { ledgerEntryUpdateSchema } from "@/lib/validation";
import { LEDGER_COLLECTION, ledgerEditOps, resolveLotLink } from "@/lib/ledger";

/** GET /api/ledger/:id — one entry with its edit history (admin). */
export const GET = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  const db = await getDb();
  const entry = await db.collection(LEDGER_COLLECTION).findOne({ _id });
  if (!entry) throw notFound("Ledger entry");
  return ok(entry);
});

/**
 * PUT /api/ledger/:id — edits an entry; every change is appended to its `history`.
 * Send `lotId: null` to remove the lot link.
 */
export const PUT = route(async (request, context) => {
  const _id = await requireObjectId(context);
  const changes = await parseBody(request, ledgerEntryUpdateSchema);
  const { session } = context;
  const db = await getDb();

  const existing = await db.collection(LEDGER_COLLECTION).findOne({ _id });
  if (!existing) throw notFound("Ledger entry");

  let link;
  if ("lotId" in changes) {
    link = await resolveLotLink(db, changes.lotId);
    if (!link) throw notFound("Lot");
  }

  const ops = ledgerEditOps({ existing, changes, link, session });
  if (ops) await db.collection(LEDGER_COLLECTION).updateOne({ _id }, ops);
  return ok({ updated: true, changed: Boolean(ops) });
});

/** DELETE /api/ledger/:id — removes the entry (the register is manual; nothing else is affected). */
export const DELETE = route(async (_request, context) => {
  const _id = await requireObjectId(context);
  const db = await getDb();
  const { deletedCount } = await db.collection(LEDGER_COLLECTION).deleteOne({ _id });
  if (deletedCount === 0) throw notFound("Ledger entry");
  return ok({ deleted: true });
});
